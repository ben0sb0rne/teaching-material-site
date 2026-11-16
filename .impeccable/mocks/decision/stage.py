# Explore Inheritance - the breeding stage. Geometry computed so the animation
# path (grid -> randomiser -> gamete -> centre -> tray) is a real polyline.
GROUND,PLATE,LIT='#EDE8DC','#F7F3E9','#FFFDF6'
RULE,INK,SOFT,ACCENT,TALLY='#6E7C8A','#0E141A','#46525F','#7A5A00','#0F6340'
DOM,REC='#14537B','#8E2A20'
W,H=1326,648
GENES=[('F','f'),('S','s'),('C','c'),('B','b')]          # beard, coat, curl, colour
MUM=[0,1,0,1]; DAD=[1,0,1,0]                              # which copy was drawn
CELL=36; CELL_W=CELL_H=CELL      # square, because these are Punnett-square cells
TILE=28                          # the loose allele tiles, square for the same reason
GRID_W=CELL_W*2
MUM_X,DAD_X=192,W-192-GRID_W
RAND_Y,RAIL_Y,GAM_Y=112,200,296
MUM_CX,DAD_CX=430,W-430
MID=W/2
TRAY_Y,TRAY_H,GAP,FILLED=372,250,10,3
import sys
SLOT=int(sys.argv[1]) if len(sys.argv)>1 else 8   # spec 4.2: teacher picks 6, 8 or 10
assert SLOT in (6,8,10), SLOT

# Everything in a slot is derived from the slot, so a litter of 10 narrows the
# contents instead of overflowing them. Dog bottoms stay on one line at
# TRAY_Y+139, which is where the 8-litter already put them.
SW      = (W-(SLOT-1)*GAP)/SLOT
DOG_W   = min(SW-9, 148)              # 148 is the vertical cap: a 111px band at 4:3
DOG_H   = DOG_W*0.75                  # the symbol's own 160:120
DOG_Y   = TRAY_Y+139-DOG_H
PAIR_W  = 2*13*0.6022                 # "Ff" at 13px IBM Plex Mono
PITCH   = min(34, (SW-16-PAIR_W)/3)   # never wider than the 8-litter spreads them
assert DOG_W <= SW, f"litter {SLOT}: dog {DOG_W:.0f} overflows slot {SW:.0f}"
assert 3*PITCH+PAIR_W <= SW-8, f"litter {SLOT}: genotypes {3*PITCH+PAIR_W:.0f} overflow slot {SW:.0f}"
assert PITCH > PAIR_W+4, f"litter {SLOT}: genotype pairs collide at pitch {PITCH:.1f}"
assert abs(SLOT*SW+(SLOT-1)*GAP - W) < .01

import math, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import key
KEY_HTML=key.HTML
KEY_CSS=key.css(PLATE,LIT,RULE,SOFT,INK)
o=[]
def curve(p0,t0,p3,t3):
    """Cubic from p0 to p3, leaving along unit tangent t0 and arriving along t3.
    Tangents are always axis-aligned, which is what kills the odd angles: a
    connector leaves an edge square to it and meets the next one square to it."""
    same = t0 == t3
    # parallel tangents want a symmetric S (half the along-axis gap, or the curve
    # doubles back); perpendicular ones want a sweep proportional to the span
    k = (abs((p3[0]-p0[0])*t0[0] + (p3[1]-p0[1])*t0[1])/2 if same
         else math.dist(p0,p3)*0.38)
    k = max(k, 14)
    p1 = (p0[0]+t0[0]*k, p0[1]+t0[1]*k)
    p2 = (p3[0]-t3[0]*k, p3[1]-t3[1]*k)
    return (f'<path d="M{p0[0]:g},{p0[1]:g} C{p1[0]:g},{p1[1]:g} '
            f'{p2[0]:g},{p2[1]:g} {p3[0]:g},{p3[1]:g}" class="path"/>')

def t(x,y,s,c='lbl',extra=''):
    o.append(f'<text x="{x:g}" y="{y:g}" class="{c}"{extra}>{s}</text>')
def tile(x,y,ch,dom,dash=False,faint=False):
    k='tile'+(' dom' if dom else ' rec')+(' dash' if dash else '')+(' faint' if faint else '')
    o.append(f'<rect x="{x:g}" y="{y:g}" width="{TILE}" height="{TILE}" class="{k}"/>')
    o.append(f'<text x="{x+TILE/2:g}" y="{y+TILE/2+6:g}" class="al {"d" if dom else "r"}{" faint" if faint else ""}">{ch}</text>')

for side,(gx,cx,dog_x,pick,who,gam) in enumerate([
        (MUM_X,MUM_CX,16,MUM,('Mother','Maple'),'egg'),
        (DAD_X,DAD_CX,W-186,DAD,('Father','Rocket'),'sperm')]):
    s=1 if side==0 else -1                 # +1 = this parent's flow runs rightward
    o.append(f'<use href="#dog" x="{dog_x}" y="46" width="170" height="128"/>')
    t(dog_x+85,192,who[0])              # role above, name below - one label, two registers
    t(dog_x+85,213,who[1],'nml')
    # genotype: TWO cells per gene, the way Teacher Master AA sets it
    t(gx+GRID_W/2,30,'Genotype')
    o.append(f'<rect x="{gx}" y="38" width="{GRID_W}" height="{CELL_H*4}" class="grid"/>')
    for i,(a,b) in enumerate(GENES):
        y=38+i*CELL_H
        if i: o.append(f'<line x1="{gx}" y1="{y}" x2="{gx+GRID_W}" y2="{y}" class="hair"/>')
        o.append(f'<line x1="{gx+CELL_W}" y1="{y}" x2="{gx+CELL_W}" y2="{y+CELL_H}" class="hair"/>')
        for j,ch in enumerate((a,b)):
            t(gx+CELL_W*j+CELL_W/2,y+CELL/2+6,ch,'al '+('d' if ch.isupper() else 'r'))
        # the copy that was drawn is ringed in its own cell: nothing is removed
        o.append(f'<rect x="{gx+CELL_W*pick[i]+4:g}" y="{y+4:g}" width="{CELL_W-8}" height="{CELL_H-8}" class="drawn"/>')
    # randomiser - the one named place where chance happens
    o.append(f'<circle cx="{cx}" cy="{RAND_Y}" r="46" class="drum"/>')
    t(cx,RAND_Y+5,'Random','drumlbl')
    # Every connector runs edge to edge between two named shapes: nothing starts
    # in mid-air and nothing is crossed. The grid's inner edge meets the drum's,
    # then the drum's two exits diverge - discard outward, gamete inward - so the
    # rail and the gamete never share a lane.
    o.append(curve((gx+GRID_W*(s>0),38+CELL_H*2),(s,0),(cx-46*s,RAND_Y),(s,0)))
    # discard rail - outward of the drum, clear of the gamete's lane
    rx=cx-38*s-(184 if s>0 else 0)
    o.append(f'<rect x="{rx:g}" y="{RAIL_Y}" width="184" height="46" class="rail"/>')
    t(cx-130*s,RAIL_Y+62,f'Other {gam}s','lbl')
    t(cx-130*s,RAIL_Y+83,'kept, not lost','nml')
    # the discarded copy drops out of the bottom; the kept one carries on sideways
    o.append(curve((cx,RAND_Y+46),(0,1),(cx-130*s,RAIL_Y),(0,1)))
    for i,(a,b) in enumerate(GENES):          # same order as the genotype grid
        drop=1-pick[i]
        tile(rx+10+i*44,RAIL_Y+9,(a,b)[drop],(a,b)[drop].isupper())
    # the gamete: the half-set that stayed, inward of the drum
    gam_cx=cx+54*s
    gw=4*34+14
    o.append(curve((cx,RAND_Y+46),(0,1),(gam_cx,GAM_Y-34),(0,1)))
    o.append(f'<rect x="{gam_cx-gw/2:g}" y="{GAM_Y-34}" width="{gw}" height="52" class="gamete"/>')
    for i,(a,b) in enumerate(GENES):
        ch=(a,b)[pick[i]]
        tile(gam_cx-gw/2+9+i*34,GAM_Y-22,ch,ch.isupper())
    t(gam_cx,GAM_Y+36,gam.upper(),'gamlbl')
    # gamete's inner edge to the meeting circle's, level, so it reads as travel
    o.append(curve((gam_cx+(gw/2)*s,GAM_Y-8),(s,0),(MID-42*s,GAM_Y-8),(s,0)))

# fertilisation happens at the centre of the lane
o.append(f'<circle cx="{MID:g}" cy="{GAM_Y-8}" r="42" class="meet"/>')
t(MID,GAM_Y-3,'They meet','drumlbl')
t(MID,GAM_Y-58,'Fertilisation','lbl')

# the litter tray
t(10,TRAY_Y-12,'This litter','lbl lstart')
t(W-10,TRAY_Y-12,f'{FILLED} of {SLOT}','lbl lend')
# the drop lands in the slot that fills next, never in the gutter between two
o.append(curve((MID,GAM_Y+34),(0,1),(FILLED*(SW+GAP)+SW/2,TRAY_Y),(0,1)))
for i in range(SLOT):
    x=i*(SW+GAP)
    filled=i<FILLED
    o.append(f'<rect x="{x:g}" y="{TRAY_Y}" width="{SW:g}" height="{TRAY_H}" class="slot{"" if filled else " empty"}"/>')
    if filled:
        o.append(f'<use href="#dog" x="{x+SW/2-DOG_W/2:g}" y="{DOG_Y:g}" width="{DOG_W:g}" height="{DOG_H:g}"/>')
        t(x+SW/2,TRAY_Y+164,['Biscuit ♀','Pepper ♂','Mochi ♀'][i],'nm')
        for j,(a,b) in enumerate(GENES):
            ch=''.join(sorted(((a,b)[MUM[j]],(a,b)[DAD[j]]), key=str.islower))
            t(x+SW/2-1.5*PITCH+j*PITCH,TRAY_Y+196,ch,'pair')
    else:
        t(x+SW/2,TRAY_Y+TRAY_H/2,str(i+1),'slotn')

CSS=f'''*{{box-sizing:border-box;margin:0;padding:0}}
html,body{{width:1366px;height:768px;overflow:hidden}}
body{{background:{GROUND};color:{INK};font:400 15px/1.35 Jost,system-ui,sans-serif;display:flex;flex-direction:column}}
.hd{{height:54px;display:flex;align-items:center;gap:22px;padding:0 24px;border-bottom:1px solid {RULE};flex:0 0 auto}}
.ttl{{font-size:19px}}.ttl b{{color:{ACCENT};font-weight:500}}
.instr{{font-size:17px}}
.gen{{margin-left:auto;font:600 12px/1 'IBM Plex Mono',monospace;letter-spacing:.12em;color:{SOFT}}}
.wrap{{flex:1;padding:0 20px;min-height:0}}
.wrap svg{{display:block;width:{W}px;height:{H}px}}
text{{text-anchor:middle}}
.lstart{{text-anchor:start}}
.lend{{text-anchor:end}}
.lbl{{font:600 12px 'IBM Plex Mono',monospace;letter-spacing:.1em;fill:{SOFT};text-transform:uppercase}}
.nml{{font:400 15px Jost,sans-serif;fill:{INK};text-transform:none}}
.nm{{font:400 13px Jost,sans-serif;fill:{INK}}}
/* alleles never pass through text-transform: F and f are different alleles */
.al{{font:600 17px 'IBM Plex Mono',monospace;fill:{INK};text-transform:none}}
.al.d{{fill:{DOM}}}.al.r{{fill:{REC}}}.al.faint{{opacity:.45}}
.pair{{font:600 13px 'IBM Plex Mono',monospace;fill:{INK};text-transform:none}}
.grid{{fill:{LIT};stroke:{RULE};stroke-width:1}}
.hair{{stroke:#BFC7CF;stroke-width:1}}
.drawn{{fill:none;stroke:{ACCENT};stroke-width:2}}
.tile{{fill:{LIT};stroke:{RULE};stroke-width:1}}
.tile.dom{{stroke:{DOM}}}.tile.rec{{stroke:{REC}}}
.tile.faint{{opacity:.45}}
.drum{{fill:{LIT};stroke:{RULE};stroke-width:2}}
.drumlbl{{font:600 12px 'IBM Plex Mono',monospace;letter-spacing:.08em;fill:{SOFT};text-transform:uppercase}}
.rail{{fill:none;stroke:{RULE};stroke-width:1;stroke-dasharray:5 4}}
.gamete{{fill:{PLATE};stroke:{RULE};stroke-width:1.5}}
.gamlbl{{font:600 13px 'IBM Plex Mono',monospace;letter-spacing:.16em;fill:{ACCENT}}}
.meet{{fill:none;stroke:{ACCENT};stroke-width:2;stroke-dasharray:6 5}}
.path{{fill:none;stroke:{RULE};stroke-width:3;stroke-linecap:round;marker-end:url(#ar)}}
.slot{{fill:{PLATE};stroke:{RULE};stroke-width:1}}
.slot.empty{{fill:none;stroke-dasharray:5 5}}
.slotn{{font:600 15px 'IBM Plex Mono',monospace;fill:{SOFT}}}
.foot{{flex:0 0 62px;display:flex;align-items:center;gap:12px;padding:0 24px;border-top:1px solid {RULE}}}
.flbl{{font:600 12px 'IBM Plex Mono',monospace;letter-spacing:.08em;color:{SOFT};text-transform:uppercase}}
.sp{{flex:1}}
.btn{{height:48px;padding:0 26px;background:#F5C518;color:{INK};font:500 15px/48px Jost,sans-serif}}
.btn2{{height:48px;padding:0 22px;border:1px solid {RULE};font:400 15px/46px Jost,sans-serif}}
{KEY_CSS}'''

DOGDEF='''<svg width="0" height="0" style="position:absolute"><defs><g id="dogshapes">
<rect x="60" y="78" width="10" height="28" rx="4" fill="#8E6338"/><rect x="110" y="78" width="10" height="28" rx="4" fill="#8E6338"/>
<rect x="48" y="50" width="90" height="38" rx="19" fill="#B4875A"/>
<rect x="72" y="80" width="11" height="28" rx="4" fill="#B4875A"/><rect x="122" y="80" width="11" height="28" rx="4" fill="#B4875A"/>
<rect x="44" y="38" width="24" height="34" rx="11" fill="#B4875A"/><circle cx="40" cy="36" r="17" fill="#B4875A"/>
<rect x="12" y="35" width="30" height="16" rx="8" fill="#B4875A"/>
<path d="M134 62 Q153 52 149 31" fill="none" stroke="#B4875A" stroke-width="13" stroke-linecap="round"/>
<path d="M43 26 Q58 24 58 42 Q58 60 50 62 Q42 60 43 42 Z" fill="#8E6338"/>
</g><symbol id="dog" viewBox="0 0 160 120">
<use href="#dogshapes" stroke="#46525F" stroke-width="5" stroke-linejoin="round"/><use href="#dogshapes"/>
<circle cx="31" cy="31" r="3.2" fill="#fff" stroke="#46525F" stroke-width="1"/><circle cx="30.4" cy="31" r="2" fill="#111"/><circle cx="13" cy="39" r="3.4" fill="#111"/>
<rect x="47" y="40" width="7" height="26" rx="3" fill="#2F6FD6" stroke="#46525F" stroke-width="1"/></symbol></defs></svg>'''

print(f'''<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>Breeding Stage</title><style>
{CSS}
</style></head><body>
{DOGDEF}
<div class="hd"><div class="ttl">Explore <b>Inheritance</b></div>
<div class="instr">Each parent passes on one copy of every gene.</div>
<div class="gen">BREEDING F1 &middot; PUPPY {FILLED+1} OF {SLOT}</div></div>
<div class="wrap"><svg viewBox="0 0 {W} {H}">
<defs><marker id="ar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
<path d="M0,1 L9,5 L0,9 z" fill="{RULE}"/></marker></defs>
{chr(10).join(o)}
</svg></div>
<div class="foot">{KEY_HTML}<span class="flbl">Watch which copy goes where</span><div class="sp"></div>
 <div class="btn2">Skip</div><div class="btn">Keep this puppy</div></div>
</body></html>''')
