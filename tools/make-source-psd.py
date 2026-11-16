#!/usr/bin/env python3
"""Build the archival PSDs the finished art is painted in.

One file per shipping layer, already the right shape, so a photo can be
dropped in without anyone checking a number. Each carries:

  - a transparent layer to paint or paste into, on top
  - the generated placeholder underneath, scaled up, to align against
  - the size in the filename, so it is right there in Finder

Canvas is ARCHIVAL / SCALE times the shipping size — 4x the manifest box
against the shipped 2x — so an export to shipping size is a clean halving.
Sprite sheets get Photoshop guides on every frame boundary, which ImageMagick
cannot write, so they are injected into the PSD afterwards by hand.

    python3 tools/make-source-psd.py            # everything
    python3 tools/make-source-psd.py console    # just ids that match
"""

import json
import struct
import subprocess
import sys
import tempfile
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
ACTIVITY = ROOT / "src" / "activities" / "explore-dissolving"
PLACEHOLDER = ACTIVITY / "assets" / "layers-placeholder"
OUT = ROOT / "art-source"

SHIP = 2            # what the browser loads: 2x the manifest box
ARCHIVAL = 4        # what we paint in
SPRITES = {"stirbar": 12, "pour": 8, "powder": 8}
LED_PT = 15         # the socket pitch; the lamps have no box of their own


def boxes_by_name(manifest):
    """Every name a manifest row answers to, mapped to its box.

    Keycap rows name both states at once, the same way instrument.js
    registers them.
    """
    out = {}
    for row in manifest:
        for name in row["id"].split("/"):
            out[name.strip()] = row["box_1x"]
    return out


def plan():
    """One entry per file that ships: stem, pixel size, frame count."""
    manifest = json.loads((ACTIVITY / "layer-manifest.json").read_text())
    box = boxes_by_name(manifest)
    index = json.loads((PLACEHOLDER / "index.json").read_text())

    stems = {}
    for layer_id, stem in index.items():
        stems.setdefault(stem, layer_id)

    jobs = []
    for stem, layer_id in sorted(stems.items()):
        if layer_id.startswith("led-"):
            w = h = LED_PT
        elif layer_id in box:
            w, h = box[layer_id][2], box[layer_id][3]
        else:
            continue
        frames = SPRITES.get(layer_id.split("-")[1], 1) if layer_id.startswith("sprite-") else 1
        jobs.append({
            "stem": stem,
            "frames": frames,
            "w": round(w * ARCHIVAL * frames),
            "h": round(h * ARCHIVAL),
            "frame_w": round(w * ARCHIVAL),
        })
    return jobs


# ---- guides -------------------------------------------------------------

def guide_resource(xs):
    """Image resource 1032, the one Photoshop reads its guides out of.

    Positions are in 32nds of a pixel, and the trailing byte is the
    direction: 0 vertical, 1 horizontal. We only ever want verticals, on the
    frame boundaries of a sprite sheet.
    """
    body = struct.pack(">IIII", 1, 576, 576, len(xs))
    for x in xs:
        body += struct.pack(">IB", int(round(x * 32)), 0)
    block = b"8BIM" + struct.pack(">H", 1032) + b"\x00\x00" + struct.pack(">I", len(body)) + body
    if len(body) % 2:
        block += b"\x00"
    return block


def add_guides(path, xs):
    """Splice a guide resource into an existing PSD.

    The file is header, colour mode block, image resources, then everything
    else; only the image resources section moves, so the rest is copied
    through untouched.
    """
    raw = path.read_bytes()
    if raw[:4] != b"8BPS":
        raise ValueError("not a PSD: %s" % path)

    pos = 26                                        # fixed-size header
    cm_len = struct.unpack(">I", raw[pos:pos + 4])[0]
    pos += 4 + cm_len                               # colour mode data

    ir_len = struct.unpack(">I", raw[pos:pos + 4])[0]
    ir_start = pos + 4
    ir = raw[ir_start:ir_start + ir_len]
    rest = raw[ir_start + ir_len:]

    # Drop any guides already there, then append ours.
    kept, i = b"", 0
    while i < len(ir):
        sig, rid = ir[i:i + 4], struct.unpack(">H", ir[i + 4:i + 6])[0]
        j = i + 6
        name_len = ir[j]
        j += 1 + name_len
        if j % 2:
            j += 1
        size = struct.unpack(">I", ir[j:j + 4])[0]
        j += 4 + size + (size % 2)
        if not (sig == b"8BIM" and rid == 1032):
            kept += ir[i:j]
        i = j

    new_ir = kept + guide_resource(xs)
    path.write_bytes(
        raw[:ir_start - 4] + struct.pack(">I", len(new_ir)) + new_ir + rest
    )


def read_guides(path):
    """Read the guides back out, so the write can be checked."""
    raw = path.read_bytes()
    pos = 26
    pos += 4 + struct.unpack(">I", raw[pos:pos + 4])[0]
    ir_len = struct.unpack(">I", raw[pos:pos + 4])[0]
    ir = raw[pos + 4:pos + 4 + ir_len]
    i = 0
    while i < len(ir):
        rid = struct.unpack(">H", ir[i + 4:i + 6])[0]
        j = i + 6
        j += 1 + ir[j]
        if j % 2:
            j += 1
        size = struct.unpack(">I", ir[j:j + 4])[0]
        data = ir[j + 4:j + 4 + size]
        if rid == 1032:
            n = struct.unpack(">I", data[12:16])[0]
            out = []
            for k in range(n):
                off = 16 + k * 5
                loc = struct.unpack(">I", data[off:off + 4])[0]
                out.append(loc / 32)
            return out
        j += 4 + size + (size % 2)
        i = j
    return []


# ---- the files ----------------------------------------------------------

def build(job, tmp):
    stem, w, h = job["stem"], job["w"], job["h"]
    src = PLACEHOLDER / (stem + ".webp")

    ref = Image.open(src).convert("RGBA").resize((w, h), Image.LANCZOS)
    blank = Image.new("RGBA", (w, h), (0, 0, 0, 0))

    ref_png = tmp / (stem + "-ref.png")
    blank_png = tmp / (stem + "-blank.png")
    ref.save(ref_png)
    blank.save(blank_png)

    dest = OUT / ("SOURCE-%s-%dx%d.psd" % (stem, w, h))

    # First image is the flattened composite Photoshop shows before it reads
    # the layers; the rest become the layers, bottom up.
    subprocess.run([
        "magick",
        str(ref_png),
        "(", str(ref_png), "-set", "label", "placeholder-reference", ")",
        "(", str(blank_png), "-set", "label", "PHOTO-HERE", ")",
        str(dest),
    ], check=True)

    if job["frames"] > 1:
        xs = [job["frame_w"] * k for k in range(1, job["frames"])]
        add_guides(dest, xs)
        got = read_guides(dest)
        assert got == [float(x) for x in xs], (dest.name, got, xs)

    return dest


def main():
    want = sys.argv[1:]
    OUT.mkdir(exist_ok=True)
    jobs = [j for j in plan() if not want or any(w in j["stem"] for w in want)]

    with tempfile.TemporaryDirectory() as td:
        tmp = Path(td)
        total = 0
        for job in jobs:
            dest = build(job, tmp)
            size = dest.stat().st_size
            total += size
            note = "  %d guides" % (job["frames"] - 1) if job["frames"] > 1 else ""
            print("  %-34s %9s  %5.1f MB%s"
                  % (dest.name, "%dx%d" % (job["w"], job["h"]), size / 1e6, note))

    print()
    print("%d file(s), %.0f MB, in %s" % (len(jobs), total / 1e6, OUT.relative_to(ROOT)))


if __name__ == "__main__":
    main()
