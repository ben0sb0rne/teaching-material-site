#!/usr/bin/env python3
"""Generate placeholder layer rasters for Explore Dissolving from the sketches.

Every layer the activity draws as a raster is isolated out of the sketch that
best shows it, rendered at 2x on transparent ground, and written to
assets/layers/{layer-id}.webp at exactly its manifest box. Ben's Blender
renders replace these files one for one, so nothing in the code moves.

Rendering is headless Chrome — the only renderer on hand that does SVG
gradients, patterns, filters and real webfonts — and Pillow does the WebP.
Neither is needed at runtime.

    python3 tools/make-placeholders.py            # everything
    python3 tools/make-placeholders.py console    # just the ids that match

Frame counts for the sprite sheets live in instrument.js, which reads them.
"""

import json
import math
import re
import shutil
import subprocess
import sys
import tempfile
import time
import xml.etree.ElementTree as ET
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
SKETCHES = ROOT / "docs" / "sketches"
ACTIVITY = ROOT / "src" / "activities" / "explore-dissolving"
OUT = ACTIVITY / "assets" / "layers-placeholder"
SHIP = ACTIVITY / "assets" / "layers"
FONTS = ROOT / "src" / "kit" / "fonts"
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
SCALE = 2
SVG_NS = "http://www.w3.org/2000/svg"

ET.register_namespace("", SVG_NS)

# Which sketch shows each layer at the state we want to ship. Anything not
# listed comes from the loaded state.
STATE_FILE = {
    "water": "03-running-stirring",
    "turbidity": "03-running-stirring",
}

# Keycaps: the sketch that holds each state. key-freeze-down is in none of
# them, so it is synthesised from the up cap by the same offsets the other
# caps use (see press_cap).
KEY_SOURCES = {
    "key-freeze-up": ("01-loaded", "key-freeze", None),
    "key-freeze-down": ("01-loaded", "key-freeze", "press"),
    "key-stir-up": ("01-loaded", "key-stir", None),
    "key-stir-down": ("03-running-stirring", "key-stir", None),
    "key-reset-up": ("01-loaded", "key-reset", None),
    "key-reset-down": ("04-reset-draining", "key-reset", None),
    "key-dispense-ready": ("01-loaded", "key-dispense", None),
    "key-dispense-spent": ("02-filling", "key-dispense", None),
}

# Sprite sheets: frames laid side by side in one image.
SPRITES = {"stirbar": 12, "pour": 8, "powder": 8}

# The few shape constants the sketches define that are not in the manifest:
# the water stream's width, and the powder grain radii and spacing.
STREAM_W = 6.0
GRAIN_R = (2.4, 1.8)
GRAIN_GAP = 9.0
# Water is very nearly colourless, and what makes it visible is TONE, not hue.
# Two numbers govern it, and the first attempt got one right and one wrong.
#
#   hue   the old #BFD8EC read as rgb(207,220,228) through the glass: only 9%
#         saturated, but blue sat 21 points above red, and that gap is the
#         whole of why it said "swimming pool". A texture gap of ~14 lands
#         about 7 on screen, which reads as water rather than as dye.
#   tone  the wall behind the beaker is a near-white 239 grey. At the first
#         tint the water came out only 17 points darker than it, which at the
#         125px a beaker occupies is invisible — the beaker just looked empty.
#         ~38 points is what reads from the back of a classroom.
WATER_BLUE, WATER_LIT = "#B6C0C7", "#E4EAEE"   # the pour stream
WATER_TINT = (174, 182, 188)                   # the liquid in the beaker
WATER_ALPHA = 0.55          # a beaker of water is see-through, not a blue slab
POWDER = {"sugar": ("#F4F1EA", "#B8B2A5"), "caco3": ("#EFEADC", "#B3AD9E")}

# Indicator lamps, lit and unlit, per station. Unlit is a dim version of the
# substance's own colour; lit gets a bright core, and the CSS adds the glow.
LED = {
    "sugar": {"off": ("#4B2620", "#5E3027"), "on": ("#FF7A52", "#FFCDBC")},
    "caco3": {"off": ("#3B3B38", "#4C4C48"), "on": ("#E9E4D6", "#FFFFFF")},
}
LED_PT = 15                 # the socket pitch the register panel is drilled for


def q(el, tag):
    return el.iter("{%s}%s" % (SVG_NS, tag))


def sketch(name):
    tree = ET.parse(SKETCHES / (name + ".svg"))
    root = tree.getroot()
    parents = {c: p for p in root.iter() for c in p}
    return root, parents


def press_cap(group):
    """Turn an up keycap into a pressed one.

    The sketches press a cap by moving it 6 points down the screen and taking
    those 6 points off the base block underneath, so the bottom edge of the
    key stays put. key-stir has both states to read this off; key-freeze has
    only the up one, so it borrows the rule.
    """
    rects = list(q(group, "rect"))
    for i, r in enumerate(rects):
        r.set("y", str(float(r.get("y")) + 6))
        if i == 0:  # the base block, which the cap sinks into
            r.set("height", str(float(r.get("height")) - 6))
    for t in q(group, "text"):
        t.set("y", str(float(t.get("y")) + 6))


def flatten_water(group):
    """Full water, flat on top, and see-through.

    The sketch shows water mid-stir, so its surface carries the vortex dip.
    The dip belongs to the code — it drives the mask every frame — so the
    shipped texture is a full beaker with a level surface.

    It is also rendered part transparent. Water in a beaker is not a slab of
    pale blue: the graduations and the bench behind read straight through it,
    and without that it stops looking like a liquid at all.
    """
    for p in q(group, "path"):
        p.set("d", re.sub(r"Q[\d.]+ [\d.]+ (\d+ \d+)", r"L\1", p.get("d"), count=1))
        p.set("fill-opacity", str(WATER_ALPHA))


def beaker_interior():
    """Where water can actually sit, measured off the beaker that ships.

    The sketches draw the beaker's contents as a square-cornered slab. A real
    beaker's floor is thick and fillets up into the walls, so a slab both
    floats above the floor and drives square corners into a rounded well —
    which reads as a smear in each bottom corner. Rather than redraw the
    sketch every time the beaker is re-exported, the silhouette is taken from
    the beaker itself, the same way measure_geometry() takes the water line
    from the water.

    Returns the outer walls, the flat inner floor, and how far from each wall
    the floor stops being flat, all in texture pixels.
    """
    src = SHIP / "beaker.webp"
    if not src.exists():
        src = OUT / "beaker.webp"
    img = Image.open(src).convert("RGBA")
    w, h = img.size
    px = img.load()

    # Outer walls, read below the spout and above the foot so neither skews it.
    left, right = w, 0
    for y in range(int(h * 0.30), int(h * 0.78)):
        row = [x for x in range(w) if px[x, y][3] > 26]
        if row:
            left, right = min(left, row[0]), max(right, row[-1])

    def lum(x, y):
        r, g, b, a = px[x, y]
        k = a / 255.0
        return (0.3 * r + 0.59 * g + 0.11 * b) * k + 255 * (1 - k)

    # Walk up each column until it is open interior again: that is the floor.
    floors = {}
    for x in range(left + 4, right - 4):
        for y in range(h - 1, int(h * 0.78), -1):
            if lum(x, y) > 238:
                floors[x] = y
                break
    if not floors:
        return left, right, h - 1, 0
    flat = max(set(floors.values()), key=list(floors.values()).count)
    on_flat = sorted(x for x, y in floors.items() if y == flat)
    reach = max(on_flat[0] - left, right - on_flat[-1]) if on_flat else 0
    return left, right, flat, reach


def fit_to_beaker(dest, tint=None):
    """Reshape a beaker-interior texture to the glass, in place.

    The placeholder contents are a flat wash, so nothing is lost by redrawing
    the silhouette: only the shape changes, and the colour only if a tint is
    given. The top edge is left exactly where the sketch put it, because that
    is the full-beaker water line and measure_geometry() reads it.
    """
    img = Image.open(dest).convert("RGBA")
    bbox = img.getbbox()
    if not bbox:
        return
    w, h = img.size
    px = img.load()
    seen = {}
    for y in range(bbox[1], bbox[3], 3):
        for x in range(bbox[0], bbox[2], 3):
            p = px[x, y]
            if p[3] > 8:
                seen[p] = seen.get(p, 0) + 1
    if not seen:
        return
    # Only the liquid is retinted. Turbidity shares this silhouette but not
    # this colour: it is suspended solid, and painting it the water's grey is
    # what stopped a stirred calcium carbonate beaker looking cloudy at all.
    colour = max(seen, key=seen.get)
    if tint:
        colour = tint + (colour[3],)

    left, right, floor, reach = beaker_interior()
    out = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    ImageDraw.Draw(out).rounded_rectangle(
        [left, bbox[1], right, floor],
        radius=max(1, reach),
        fill=colour,
        corners=(False, False, True, True))   # only the two that sit in the well
    webp(out, dest)


def strip_rules(group):
    """Take the ruled lines off the notebook paper.

    The writing is laid out on a rhythm the CSS owns, so the ruling is drawn
    there too and the two cannot drift apart. Printed lines in the art would
    only ever agree with the text by luck.
    """
    for line in list(q(group, "line")):
        group.remove(line)


def full_strength(group):
    """Turbidity at full opacity; the code owns how cloudy it looks."""
    for p in q(group, "path"):
        p.set("opacity", "1")


MUTATE = {"water": flatten_water, "turbidity": full_strength, "notebook": strip_rules}

# Layers whose silhouette is the beaker's interior rather than the sketch's.
FIT_TO_BEAKER = {"water", "turbidity"}

# Layers that are the same picture at both stations. One file serves both, and
# index.json points each station's layer id at it. Drop a station-specific file
# in beside it later and that one wins.
SHARED = ("bracket", "head", "stirplate", "beaker", "viewport-ring",
          "register-panel", "water", "turbidity", "glass-viewport",
          "glass-counter", "sprite-pour", "sprite-stirbar")


def isolate(src, layer_id, box, mutate=None):
    """One layer, alone, in an SVG cropped to its manifest box.

    Ancestor <g> transforms are kept — the beaker group and everything in it
    sits inside a translate/scale, and a layer pulled out without that lands
    in the wrong place at the wrong size.
    """
    root, parents = sketch(src)
    target = None
    for el in root.iter():
        if el.get("id") == layer_id:
            target = el
            break
    if target is None:
        raise SystemExit("no layer %r in %s" % (layer_id, src))

    chain = []
    node = parents.get(target)
    while node is not None and node is not root:
        chain.append(node)
        node = parents.get(node)
    chain.reverse()

    x, y, w, h = box
    out = ET.Element("{%s}svg" % SVG_NS, {
        "viewBox": "%g %g %g %g" % (x, y, w, h),
        "width": str(w * SCALE), "height": str(h * SCALE),
    })
    for defs in q(root, "defs"):
        out.append(defs)

    holder = out
    for g in chain:
        wrap = ET.SubElement(holder, "{%s}g" % SVG_NS)
        if g.get("transform"):
            wrap.set("transform", g.get("transform"))
        holder = wrap

    copy = ET.fromstring(ET.tostring(target))
    if mutate:
        mutate(copy)
    holder.append(copy)
    return ET.tostring(out, encoding="unicode")


PAGE = """<!doctype html><meta charset="utf-8"><style>
@font-face{font-family:'Jost';src:url('%s/jost-latin.woff2') format('woff2');font-weight:100 900}
@font-face{font-family:'IBM Plex Mono';src:url('%s/plex-mono-latin.woff2') format('woff2');font-weight:400}
@font-face{font-family:'IBM Plex Mono';src:url('%s/plex-mono-semibold-latin.woff2') format('woff2');font-weight:600}
@font-face{font-family:'Patrick Hand';src:url('%s/patrick-hand-latin.woff2') format('woff2')}
html,body{margin:0;padding:0;background:transparent}svg{display:block}
</style>%s"""


def render(svg_text, w, h, dest):
    """Rasterise one SVG document to a transparent PNG with Chrome.

    Chrome 148 writes the screenshot and then never exits, so this waits for
    the file to stop growing and kills it rather than waiting on the process.
    """
    work = Path(tempfile.mkdtemp(prefix="ph-"))
    shot = work / "s.png"
    try:
        f = str(FONTS.as_uri())
        (work / "p.html").write_text(PAGE % (f, f, f, f, svg_text), encoding="utf-8")
        proc = subprocess.Popen([
            CHROME, "--headless=new", "--no-first-run", "--no-default-browser-check",
            "--disable-gpu", "--hide-scrollbars", "--allow-file-access-from-files",
            "--force-device-scale-factor=1", "--default-background-color=00000000",
            "--window-size=%d,%d" % (w, h),
            "--user-data-dir=" + str(work / "u"),
            "--screenshot=" + str(shot),
            (work / "p.html").as_uri(),
        ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        try:
            deadline, seen = time.time() + 90, -1
            while time.time() < deadline:
                if shot.exists():
                    size = shot.stat().st_size
                    if size > 0 and size == seen:
                        break
                    seen = size
                time.sleep(0.25)
            else:
                raise RuntimeError("chrome never produced a screenshot")
        finally:
            proc.kill()
            proc.wait()

        img = Image.open(shot).convert("RGBA")
        if img.size != (w, h):
            img = img.crop((0, 0, w, h))
        webp(img, dest)
    finally:
        shutil.rmtree(work, ignore_errors=True)


def webp(img, dest):
    dest.parent.mkdir(parents=True, exist_ok=True)
    img.save(dest, "WEBP", lossless=True, method=5)


def glass(w, h, dest):
    """A placeholder lens overlay: just enough to see it line up.

    Ben replaces these with fingerprints and reflections, so all this has to
    do is prove the layer is in the right place without dirtying the art.
    """
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    for i in range(-h, w, max(12, (w + h) // 7)):
        d.line([(i, h), (i + h, 0)], fill=(255, 255, 255, 16), width=max(6, h // 14))
    img = img.filter(ImageFilter.GaussianBlur(max(2, h / 40)))
    ImageDraw.Draw(img).rectangle([0, 0, w - 1, h - 1], outline=(255, 255, 255, 12))
    webp(img, dest)


def shared_base(layer_id):
    """The file a layer writes to. Station twins fold onto one name."""
    bare = re.sub(r"-(sugar|caco3)$", "", layer_id)
    return bare if bare in SHARED else layer_id


def led(station, lit, dest):
    """One indicator lamp, as the register panel is drilled for it.

    Lit gets a hot core falling off to the substance's colour, which is what
    a diode looks like close up; the halo around it belongs to the CSS, so it
    can stay crisp at any scale.
    """
    fill, rim = LED[station]["on" if lit else "off"]
    r, c = 6.3, LED_PT / 2
    body = ('<radialGradient id="g" cx="38%%" cy="34%%" r="72%%">'
            '<stop offset="0" stop-color="#FFFFFF"/>'
            '<stop offset=".45" stop-color="%s"/>'
            '<stop offset="1" stop-color="%s"/></radialGradient>' % (fill, fill)) if lit else ""
    doc = ('<svg xmlns="%s" viewBox="0 0 %g %g" width="%d" height="%d">'
           '<defs>%s</defs>'
           '<circle cx="%g" cy="%g" r="%g" fill="%s" stroke="%s" stroke-width="2.4"/>'
           '</svg>'
           % (SVG_NS, LED_PT, LED_PT, LED_PT * SCALE, LED_PT * SCALE, body,
              c, c, r, "url(#g)" if lit else fill, rim))
    render(doc, LED_PT * SCALE, LED_PT * SCALE, dest)


def sprite_sheet(kind, station, box, dest):
    """All frames of one sprite, side by side in a single document.

    One Chrome render per sheet rather than one per frame, which is both
    faster and the only way the frames are guaranteed to share a baseline.
    """
    x, y, w, h = box
    n = SPRITES[kind]
    frames = []

    if kind == "stirbar":
        # The bar itself, foreshortening as it turns. Scaling x about the
        # box centre needs no measurement of the bar: it is centred there.
        bar = isolate("01-loaded", "sprite-stirbar-" + station, box)
        inner = re.sub(r"^.*?</defs>|</svg>$", "", bar, flags=re.S)
        cx = x + w / 2
        for i in range(n):
            # |cos| and not cos: a bar end-on is the same picture either way.
            # The floor keeps it from vanishing to a line.
            s = max(0.18, abs(math.cos(i / n * math.pi)))
            frames.append('<g transform="translate(%g 0) scale(%g 1) translate(%g 0)">%s</g>'
                          % (cx, s, -cx, inner))
    elif kind == "pour":
        cx = x + w / 2
        for i in range(n):
            shift = i / n * GRAIN_GAP * 4
            parts = ['<rect x="%g" y="%g" width="%g" height="%g" rx="%g" fill="%s"/>'
                     % (cx - STREAM_W / 2, y, STREAM_W, h, STREAM_W / 2, WATER_BLUE)]
            # Highlights scrolling down the stream are what sell it as moving
            # water rather than a blue stick.
            seg = GRAIN_GAP * 4
            k = y - seg + (shift % seg)
            while k < y + h:
                top, bot = max(y, k), min(y + h, k + seg * 0.42)
                if bot > top:
                    parts.append('<rect x="%g" y="%g" width="2" height="%g" fill="%s"/>'
                                 % (cx - 1, top, bot - top, WATER_LIT))
                k += seg
            frames.append("".join(parts))
    else:  # powder
        cx = x + w / 2
        fill, edge = POWDER[station]
        period = GRAIN_GAP * 2
        for i in range(n):
            shift = i / n * period
            parts = []
            k = y - period
            j = 0
            while k < y + h + period:
                gy = k + shift
                if y <= gy <= y + h:
                    r = GRAIN_R[j % 2]
                    parts.append('<circle cx="%g" cy="%g" r="%g" fill="%s" stroke="%s" '
                                 'stroke-width=".6"/>'
                                 % (cx + (j % 3 - 1) * 2, gy, r, fill, edge))
                k += GRAIN_GAP
                j += 1
            frames.append("".join(parts))

    doc = ['<svg xmlns="%s" viewBox="0 0 %g %g" width="%d" height="%d">'
           % (SVG_NS, w * n, h, w * n * SCALE, h * SCALE)]
    for i, body in enumerate(frames):
        doc.append('<g transform="translate(%g %g)">%s</g>' % (i * w - x, -y, body))
    doc.append("</svg>")
    render("".join(doc), int(w * n * SCALE), int(h * SCALE), dest)


def measure_geometry():
    """Record where the water surface sits inside the beaker box.

    A full beaker stops at the 250 mL graduation, not at the rim, so "water
    level 1.0" is some way down from the top of the layer box. That distance
    belongs to the art rather than to the manifest, so it is measured off the
    rendered texture instead of typed in: re-render water with the line
    somewhere else and the vortex and the fill still land on the surface.
    """
    geo = {}
    for f in sorted(OUT.glob("water*.webp")):
        img = Image.open(f).convert("RGBA")
        bbox = img.getbbox()
        if not bbox:
            continue
        # The sides as well as the top and the floor: the clip polygon spans
        # the whole layer box, so anything in that box that is not the water
        # texture itself needs to be told where the glass is.
        v = {"surfaceFrac": round(bbox[1] / img.height, 5),
             "floorFrac": round(bbox[3] / img.height, 5),
             "leftFrac": round(bbox[0] / img.width, 5),
             "rightFrac": round(bbox[2] / img.width, 5)}
        # Both stations draw the same texture, so one file answers to both
        # names — the same fold shared_base() does on the way out.
        for key in (["water-sugar", "water-caco3"] if f.stem == "water" else [f.stem]):
            geo[key] = v
    if geo:
        dest = OUT / "geometry.json"
        old = json.loads(dest.read_text()) if dest.exists() else {}
        old.update(geo)
        dest.write_text(json.dumps(old, indent=2, sort_keys=True) + "\n")
        for k, v in sorted(geo.items()):
            print("  %-28s surface %.3f  floor %.3f" % (k, v["surfaceFrac"], v["floorFrac"]))


def boxes_by_name(manifest):
    """Every name a manifest row answers to, mapped to its box.

    Keycap rows name both states at once ("key-freeze-up / key-freeze-down"),
    which is how instrument.js registers them too.
    """
    out = {}
    for row in manifest:
        for name in row["id"].split("/"):
            out[name.strip()] = row["box_1x"]
    return out


def check(folder):
    """Compare an exported set against the manifest.

    Every file is SCALE x its box, and a sprite sheet is that again per
    frame. Returns the number of files that are the wrong size, so a shell
    can act on it; files not made yet are reported but are not failures,
    because a set is allowed to be part-finished.
    """
    where = ACTIVITY / "assets" / folder
    if not where.is_dir():
        print("no such set: %s" % where.relative_to(ROOT))
        return 1

    box = boxes_by_name(json.loads((ACTIVITY / "layer-manifest.json").read_text()))

    # A set holding only images borrows the default set's index, exactly as
    # the browser does.
    idx = where / "index.json"
    index = json.loads((idx if idx.exists() else OUT / "index.json").read_text())

    # One layer id per file is enough: station twins share a box size.
    stems = {}
    for layer_id, stem in index.items():
        stems.setdefault(stem, layer_id)

    good, wrong, absent, unknown = [], [], [], []
    for stem, layer_id in sorted(stems.items()):
        # The lamps have no box of their own: the register names the grid and
        # the socket pitch is what one lamp is drawn at.
        if layer_id.startswith("led-"):
            w = h = LED_PT
        elif layer_id in box:
            w, h = box[layer_id][2], box[layer_id][3]
        else:
            unknown.append(stem)
            continue
        frames = SPRITES.get(layer_id.split("-")[1], 1) if layer_id.startswith("sprite-") else 1
        want = (round(w * SCALE * frames), round(h * SCALE))
        path = where / (stem + ".webp")
        if not path.exists():
            absent.append((stem, want))
            continue
        got = Image.open(path).size
        (good if got == want else wrong).append((stem, got, want))

    for stem, got, _ in good:
        print("  %-24s %-12s ok" % (stem, "%dx%d" % got))
    for stem, want in absent:
        print("  %-24s %-12s not in this set, wants %dx%d" % (stem, "--", want[0], want[1]))
    for stem, got, want in wrong:
        print("  %-24s %-12s WANTS %dx%d" % (stem, "%dx%d" % got, want[0], want[1]))
    for stem in unknown:
        print("  %-24s %-12s named in index.json but in no manifest box" % (stem, "?"))

    stray = sorted(f.stem for f in where.glob("*.webp") if f.stem not in stems)
    for stem in stray:
        print("  %-24s %-12s here but nothing loads it — misnamed?" % (stem, "--"))

    print()
    print("%d ok, %d off-spec, %d not made yet, %d stray   (%s)"
          % (len(good), len(wrong), len(absent), len(stray), where.relative_to(ROOT)))
    return len(wrong)


def main():
    want = sys.argv[1:]
    if want and want[0] == "--check":
        sys.exit(1 if check(want[1] if len(want) > 1 else "layers") else 0)
    manifest = json.loads((ACTIVITY / "layer-manifest.json").read_text())
    jobs = []
    index, queued = {}, set()

    def add(layer_id, build):
        """Queue one layer.

        `build` is handed the file stem to write, because station twins that
        are the same picture fold onto a single file — the second one simply
        points at what the first already rendered.
        """
        stem = shared_base(layer_id)
        index[layer_id] = stem
        if stem in queued:
            return
        queued.add(stem)
        if not want or any(w in layer_id for w in want):
            jobs.append((stem, build(OUT / (stem + ".webp"))))

    for m in manifest:
        lid, kind, box = m["id"], m["render"], m["box_1x"]
        w, h = int(box[2] * SCALE), int(box[3] * SCALE)

        if kind == "code":
            continue
        if kind == "raster-overlay":
            add(lid, lambda out, w=w, h=h: (lambda: glass(w, h, out)))
            continue
        if kind == "sprite":
            k, station = lid.split("-")[1], lid.rsplit("-", 1)[1]
            add(lid, lambda out, k=k, s=station, b=box:
                (lambda: sprite_sheet(k, s, b, out)))
            continue
        if lid.startswith("key-"):
            continue  # handled below, two files each

        base = lid.split("-")[0]
        src = STATE_FILE.get(base, "01-loaded")
        add(lid, lambda out, lid=lid, src=src, b=box, w=w, h=h, base=base:
            (lambda: (render(isolate(src, lid, b, MUTATE.get(base)), w, h, out),
                      fit_to_beaker(out, WATER_TINT if base == 'water' else None)
                      if base in FIT_TO_BEAKER else None)))

    for dest, (src, group, mode) in KEY_SOURCES.items():
        # Keycaps share one manifest row per key, listed under both state ids
        # at once: "key-freeze-up / key-freeze-down".
        box = next(m["box_1x"] for m in manifest if dest in m["id"].split(" / "))
        w, h = int(box[2] * SCALE), int(box[3] * SCALE)
        add(dest, lambda out, src=src, group=group, b=box, w=w, h=h, mode=mode:
            (lambda: render(isolate(src, group, b, press_cap if mode == "press" else None),
                            w, h, out)))

    # Indicator lamps. Not manifest layers — the register is drawn in code —
    # so they are named directly and the CSS reaches for them by name.
    for station in LED:
        for state in ("off", "on"):
            add("led-%s-%s" % (station, state),
                lambda out, s=station, lit=(state == "on"): (lambda: led(s, lit, out)))

    print("%d placeholder(s) -> %s" % (len(jobs), OUT.relative_to(ROOT)))
    errors = []

    def run(job):
        lid, fn = job
        try:
            fn()
            size = (OUT / (lid + ".webp")).stat().st_size
            return "  %-28s %6.1f KB" % (lid, size / 1024)
        except Exception as exc:  # keep going; report at the end
            errors.append((lid, exc))
            return "  %-28s FAILED %s" % (lid, exc)

    with ThreadPoolExecutor(max_workers=5) as pool:
        for line in pool.map(run, jobs):
            print(line)

    measure_geometry()

    # Which file each layer id should load. Written whole only on a full run;
    # a partial run would otherwise forget every layer it was not asked for.
    if not want:
        (OUT / "index.json").write_text(
            json.dumps(index, indent=2, sort_keys=True) + "\n")
        shared = sum(1 for k, v in index.items() if k != v)
        print("  index.json: %d ids -> %d files (%d share a twin)"
              % (len(index), len(set(index.values())), shared))

    if errors:
        raise SystemExit("%d layer(s) failed" % len(errors))


if __name__ == "__main__":
    main()
