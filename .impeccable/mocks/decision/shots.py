# Export the sketches as PNGs to carry to another reviewer.
#
# Two things this has to get right. The sketches only *name* Jost and IBM Plex
# Mono, so headless Chrome would silently fall back to a system face and the
# screenshot would not be the design - the kit's own woff2 files are injected
# before rendering. And Chrome 148 writes the file then never exits, so this
# waits for the PNG to stop growing and kills it (same trick as
# tools/make-placeholders.py, where that was first worked out).
import pathlib, re, shutil, subprocess, sys, tempfile, time

HERE  = pathlib.Path(__file__).resolve().parent
ROOT  = HERE.parents[2]
FONTS = (ROOT / "src" / "kit" / "fonts").as_uri()
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
OUT = ROOT / "docs" / "review" / "explore-inheritance"
W, H, SCALE = 1366, 768, 2

FACES = f"""<style>
@font-face{{font-family:'Jost';src:url('{FONTS}/jost-latin.woff2') format('woff2');font-weight:100 900}}
@font-face{{font-family:'IBM Plex Mono';src:url('{FONTS}/plex-mono-latin.woff2') format('woff2');font-weight:400}}
@font-face{{font-family:'IBM Plex Mono';src:url('{FONTS}/plex-mono-semibold-latin.woff2') format('woff2');font-weight:600}}
</style>"""

SHOTS = [
    ("h-stage.html",    "01-stage-litter-8.png",   False, "Breeding stage, litter of 8"),
    ("h-stage.html",    "02-stage-key-open.png",   True,  "Breeding stage, Key open"),
    ("g-breeding-record.html", "03-record.png",    False, "Breeding record"),
    ("g-breeding-record.html", "04-record-key-open.png", True, "Breeding record, Key open"),
    ("h-stage-10.html", "05-stage-litter-10.png",  False, "Breeding stage, litter of 10"),
    ("h-stage-6.html",  "06-stage-litter-6.png",   False, "Breeding stage, litter of 6"),
]

def shoot(src, dest, key_open):
    html = (HERE / src).read_text(encoding="utf-8")
    html = html.replace("</head>", FACES + "</head>", 1)
    assert FACES in html, f"{src}: no </head> to inject fonts into"
    if key_open:
        html, n = re.subn(r'<details class="key">', '<details class="key" open>', html, count=1)
        assert n == 1, f"{src}: no key to open"
    work = pathlib.Path(tempfile.mkdtemp(prefix="shot-"))
    shot = work / "s.png"
    try:
        page = work / "p.html"
        page.write_text(html, encoding="utf-8")
        proc = subprocess.Popen([
            CHROME, "--headless=new", "--no-first-run", "--no-default-browser-check",
            "--disable-gpu", "--hide-scrollbars", "--allow-file-access-from-files",
            f"--force-device-scale-factor={SCALE}", "--window-size=%d,%d" % (W, H),
            "--user-data-dir=" + str(work / "u"), "--screenshot=" + str(shot),
            page.as_uri()], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        try:
            deadline, seen = time.time() + 90, -1
            while time.time() < deadline:
                if shot.exists():
                    size = shot.stat().st_size
                    if size > 0 and size == seen: break
                    seen = size
                time.sleep(0.25)
            else:
                raise RuntimeError(f"{src}: chrome never produced a screenshot")
        finally:
            proc.kill(); proc.wait()
        OUT.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(shot, OUT / dest)
        return (OUT / dest).stat().st_size
    finally:
        shutil.rmtree(work, ignore_errors=True)

if not pathlib.Path(CHROME).exists():
    sys.exit(f"Chrome not found at {CHROME}")
for src, dest, key_open, label in SHOTS:
    kb = shoot(src, dest, key_open) // 1024
    print(f"{dest:<26} {kb:>5} KB   {label}")
print(f"\n-> {OUT}")
