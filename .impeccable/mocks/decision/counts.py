# The breeding record's counts strip: NINE cells, one per trait VALUE, grouped
# the way Teacher Master CC groups its nine - a trait heading spanning its own
# values. Re-runnable: it replaces whatever counts blocks the file currently has.
import io, re, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import key                      # python3 -I drops the script's own dir

REC = ("/Users/ben/Library/CloudStorage/OneDrive-Personal/Documents/Coding Projects/"
       "Teaching Material Site/.impeccable/mocks/decision/g-breeding-record.html")

GROUPS = [("Beard", ["Yes","No"]), ("Coat", ["Short","Long"]),
          ("Curl", ["Curly","Wavy","Straight"]), ("Colour", ["Black","Chocolate"])]
VALUES = [v for _,vs in GROUPS for v in vs]
assert len(VALUES) == 9, len(VALUES)

# Counts that follow from the crosses in spec 4.1, not invented:
#   P  = Juniper FF ss CC bb  x  Ranger ff SS cc BB  (the two parents themselves)
#   F1 = all Ff Ss Cc Bb     -> every dominant shows, and all eight are wavy
#   F2 = Ff Ss Cc Bb selfed  -> ~3:1 on the simple genes, ~1:2:1 on curl
ROWS = [[1,1, 1,1, 1,0,1, 1,1],
        [8,0, 8,0, 0,8,0, 8,0],
        [6,2, 5,3, 2,4,2, 6,2]]
for i,n in enumerate(ROWS):
    assert len(n) == 9, (i, len(n))
    tot = [n[0]+n[1], n[2]+n[3], n[4]+n[5]+n[6], n[7]+n[8]]
    assert len(set(tot)) == 1, f"row {i}: traits must tally to one litter, got {tot}"

STRIP_TOP, PITCH, STRIP_H = 26, 150, 104
X, W, H = 420, 478, 88               # between the kept card (ends 414) and the immigrant (starts 904)
TOP = STRIP_TOP + (STRIP_H - H)//2   # centred in the generation strip
Y_GRP, Y_VAL, Y_NUM = 24, 46, 80     # row boundaries, relative to the box top

# Spec 12.1: 12px is the floor for functional text, and a tally header is
# functional. Nine EQUAL cells at 12px need ~509px and only 478 are available,
# so columns are sized to their own content - which is what CC does too (its
# "Appendages" columns are wider than its "Tail shape" ones). IBM Plex Mono is
# monospace: one advance, measured at 10px as 6.022px, scales exactly.
ADV, PAD, VPX, GPX = 6.022/10, 6, 12, 12
def wide(px, text, extra=0.0): return len(text)*px*(ADV+extra)
WIDTHS = []
for name, vals in GROUPS:
    need = max(max(wide(VPX,v) for v in vals), wide(GPX,name,0.06)/len(vals))
    WIDTHS += [need + PAD]*len(vals)
slack = W - sum(WIDTHS)
assert slack >= 0, f"nine cells need {sum(WIDTHS):.0f}px, only {W} available"
WIDTHS = [w + slack/len(WIDTHS) for w in WIDTHS]
EDGE = [X + sum(WIDTHS[:i]) for i in range(len(WIDTHS)+1)]

def block(top, nums):
    o = [f'<rect x="{X}" y="{top}" width="{W}" height="{H}" class="ctbox"/>',
         f'<line x1="{X}" y1="{top+Y_GRP}" x2="{X+W}" y2="{top+Y_GRP}" class="hair"/>']
    i = 0
    for gi,(name, vals) in enumerate(GROUPS):
        x0, span = EDGE[i], EDGE[i+len(vals)] - EDGE[i]
        o.append(f'<text x="{x0+span/2:g}" y="{top+Y_GRP-7}" class="ctg">{name}</text>')
        if gi:   # full-height rule between traits, hairline between values of one
            o.append(f'<line x1="{x0:g}" y1="{top}" x2="{x0:g}" y2="{top+H}" class="grule"/>')
        for j,v in enumerate(vals):
            if j: o.append(f'<line x1="{EDGE[i+j]:g}" y1="{top+Y_GRP}" '
                           f'x2="{EDGE[i+j]:g}" y2="{top+H}" class="hair"/>')
            cx = (EDGE[i+j] + EDGE[i+j+1]) / 2
            o.append(f'<text x="{cx:g}" y="{top+Y_VAL-5}" class="ctv">{v}</text>')
            o.append(f'<text x="{cx:g}" y="{top+Y_NUM}" class="ctn">{nums[i+j]}</text>')
        i += len(vals)
    return "\n".join(o)

s = io.open(REC, encoding="utf-8").read()

# A counts block is its ctbox rect plus every following element that belongs to
# it; the first element that does not (the descent wedge) ends it.
OWN = re.compile(r'\s*<(?:text|line|rect)\b[^>]*class="(?:ctbox|ctg|ctv|ctl|ctn|hair|grule)"[^>]*(?:/>|>[^<]*</text>)')
out, cut, found = [], 0, 0
for m in re.finditer(r'<rect x="\d+" y="\d+" width="\d+" height="\d+" class="ctbox"/>', s):
    if m.start() < cut: continue
    end = m.end()
    while (nxt := OWN.match(s, end)): end = nxt.end()
    out.append(s[cut:m.start()])
    out.append(block(STRIP_TOP + found*PITCH + (STRIP_H-H)//2, ROWS[found]))
    cut, found = end, found + 1
assert found == 3, f"expected 3 counts blocks, found {found}"
out.append(s[cut:])
s = "".join(out)

# The column header names what the column holds, like Sex / Phenotype / Genotype
# beside it. "This litter" was true of F1-F3 and false of P, whose two counts are
# the founding pair; the footer already carries the per-row meaning.
HDR = "Dogs with each trait"
def hdr(m):
    return (f'<text x="{X+W/2:g}" y="18" class="hd3">{HDR}</text>'
            if int(m.group(1)) > 400 else m.group(0))
s, n = re.subn(r'<text x="(\d+)" y="18" class="hd3">[^<]*</text>', hdr, s)
assert n == 4 and HDR in s, f"header row changed shape: {n} labels"

CSS = """.ctg{font:600 12px 'IBM Plex Mono',monospace;letter-spacing:.06em;fill:#46525F;text-transform:uppercase}
.ctv{font:600 12px 'IBM Plex Mono',monospace;fill:#46525F;text-transform:uppercase}
.grule{stroke:#6E7C8A;stroke-width:1}"""
s = re.sub(r"\n\.ctg\{.*?\n\.grule\{[^}]*\}", "", s, flags=re.S)       # drop a previous run's
anchor = ".ctn{font:600 18px 'IBM Plex Mono',monospace;fill:#0F6340}"
assert s.count(anchor) == 1
s = s.replace(anchor, anchor + "\n" + CSS)

# The record shows sex symbols and alleles too, so it carries the same key -
# the same one, from key.py, so two screens cannot drift apart.
s = re.sub(r'<details class="key">.*?</details>', '', s, flags=re.S)
s = re.sub(r'\n\.key\{.*?\.kp \.sym\{[^}]*\}', '', s, flags=re.S)
foot = '<div class="foot">'
assert s.count(foot) == 1
s = s.replace(foot, foot + key.HTML)
tail = "</style>"
assert s.count(tail) == 1
s = s.replace(tail, "\n" + key.css('#F7F3E9', '#FFFDF6', '#6E7C8A', '#46525F', '#0E141A') + tail)

io.open(REC, "w", encoding="utf-8").write(s)
print(f"rebuilt {found} blocks -> {len(VALUES)} cells at {VPX}px, {slack:.0f}px spare")
print("   " + "  ".join(f"{v}:{WIDTHS[k]:.0f}" for k,v in enumerate(VALUES)))
