# Self-check for the stage connectors: every endpoint sits on a shape's edge,
# and no segment passes through any shape's interior.
import io, re, math, sys
src = io.open(sys.argv[1] if len(sys.argv)>1 else "h-stage.html", encoding="utf-8").read()
body = src.split('<svg viewBox',1)[1]          # skip the dog symbol defs

f = r'(-?[\d.]+)'
rects  = [(float(a),float(b),float(w),float(h),cls) for a,b,w,h,cls in
          re.findall(rf'<rect x="{f}" y="{f}" width="{f}" height="{f}" class="([^"]*)"', body)]
circles= [(float(a),float(b),float(r),cls) for a,b,r,cls in
          re.findall(rf'<circle cx="{f}" cy="{f}" r="{f}" class="([^"]*)"', body)]
# Connectors are cubics now. Keep the two endpoints for the anchor test and
# sample the curve for the crossing test - a curve can bulge into a shape its
# endpoints clear, which a straight-line test would never see.
cubics = [tuple(map(float,m)) for m in
          re.findall(rf'<path d="M{f},{f} C{f},{f} {f},{f} {f},{f}" class="path"', body)]
def bez(c,u):
    (x0,y0,x1,y1,x2,y2,x3,y3), v = c, 1-u
    return (v*v*v*x0 + 3*v*v*u*x1 + 3*v*u*u*x2 + u*u*u*x3,
            v*v*v*y0 + 3*v*v*u*y1 + 3*v*u*u*y2 + u*u*u*y3)
N = 48
samples = [[bez(c,i/N) for i in range(N+1)] for c in cubics]
paths  = [(c[0],c[1],c[6],c[7]) for c in cubics]
# the alleles' own tiles are decoration inside a box already counted
boxes  = [(x,y,w,h,c) for x,y,w,h,c in rects if 'tile' not in c and 'drawn' not in c]
assert len(paths) == 9, len(paths)
print(f"{len(paths)} connectors, {len(boxes)} boxes, {len(circles)} circles\n")

def on_box(px,py,x,y,w,h,tol=2.0):
    inside_x, inside_y = x-tol <= px <= x+w+tol, y-tol <= py <= y+h+tol
    return inside_x and inside_y and (min(abs(px-x),abs(px-x-w)) <= tol or
                                      min(abs(py-y),abs(py-y-h)) <= tol)
def on_circle(px,py,cx,cy,r,tol=2.0):
    return abs(math.hypot(px-cx,py-cy) - r) <= tol

def seg_hits_box(x1,y1,x2,y2,x,y,w,h,pad=-1.0):
    # Liang-Barsky against the box shrunk by |pad|, so merely touching an edge is fine
    x,y,w,h = x-pad, y-pad, w+2*pad, h+2*pad
    dx,dy = x2-x1, y2-y1
    t0,t1 = 0.0,1.0
    for p,q in ((-dx, x1-x),(dx, x+w-x1),(-dy, y1-y),(dy, y+h-y1)):
        if p == 0:
            if q < 0: return False
        else:
            t = q/p
            if p < 0:
                if t > t1: return False
                t0 = max(t0,t)
            else:
                if t < t0: return False
                t1 = min(t1,t)
    return t0 <= t1
def seg_hits_circle(x1,y1,x2,y2,cx,cy,r,pad=1.0):
    r -= pad
    dx,dy = x2-x1, y2-y1
    fx,fy = x1-cx, y1-cy
    a = dx*dx+dy*dy
    b = 2*(fx*dx+fy*dy)
    c = fx*fx+fy*fy-r*r
    disc = b*b-4*a*c
    if disc < 0: return False
    disc = math.sqrt(disc)
    for t in ((-b-disc)/(2*a), (-b+disc)/(2*a)):
        if 0 < t < 1: return True
    return False

bad = 0
for i,(x1,y1,x2,y2) in enumerate(paths,1):
    notes = []
    for nm,(px,py) in (("start",(x1,y1)),("end",(x2,y2))):
        anchored = ([c for x,y,w,h,c in boxes if on_box(px,py,x,y,w,h)] +
                    [c for cx,cy,r,c in circles if on_circle(px,py,cx,cy,r)])
        if anchored: notes.append(f"{nm}->{anchored[0]}")
        else:        notes.append(f"{nm} FLOATS"); bad += 1
    hit = set()
    for a,b in zip(samples[i-1], samples[i-1][1:]):
        for x,y,w,h,c in boxes:
            if seg_hits_box(a[0],a[1],b[0],b[1],x,y,w,h): hit.add(c)
        for cx,cy,r,c in circles:
            if seg_hits_circle(a[0],a[1],b[0],b[1],cx,cy,r): hit.add(c)
    for c in sorted(hit):
        notes.append(f"CROSSES {c}"); bad += 1
    print(f"{i}. ({x1:7.1f},{y1:5.1f}) -> ({x2:7.1f},{y2:5.1f})  " + "  ".join(notes))

print(f"\n{bad} problem(s)")
assert bad == 0, f"{bad} connector problem(s)"
