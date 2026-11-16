# Spec 7 asks for both worked vectors as an assert-based self-check. This is it,
# plus the round-trip property the name question turns on.
ALPHA = 'ACDEFGHJKMNPQRTUWXY3479'
assert len(ALPHA) == 23 and len(set(ALPHA)) == 23
M, MUL, ADD, MAXV = 23**4, 7919, 104729, 207359

def encode(collar, name, sex, gen, dom):          # dom = dominant-allele count per gene
    f, s_, c, b = dom
    geno = f + 3*s_ + 9*c + 27*b
    value = (((collar*40 + name)*2 + sex)*4 + gen)*81 + geno
    assert 0 <= value <= MAXV, value
    s = (value*MUL + ADD) % M
    d = [(s // 23**k) % 23 for k in (3, 2, 1, 0)]
    d.append((-(sum((i+1)*x for i, x in enumerate(d))) * 14) % 23)
    return ''.join(ALPHA[x] for x in d), value, s, d

def decode(code):
    assert len(code) == 5 and all(ch in ALPHA for ch in code), 'Enter all 5 characters.'
    d = [ALPHA.index(ch) for ch in code]
    assert sum((i+1)*x for i, x in enumerate(d)) % 23 == 0, "That code doesn't check out."
    s = sum(x*23**k for x, k in zip(d[:4], (3, 2, 1, 0)))
    value = ((s - ADD) * pow(MUL, -1, M)) % M
    assert value <= MAXV, "That code doesn't check out."
    geno, rest = value % 81, value // 81
    gen, rest = rest % 4, rest // 4
    sex, rest = rest % 2, rest // 2
    return dict(collar=rest // 40, name=rest % 40, sex=sex, gen=gen,
                dom=[geno % 3, geno//3 % 3, geno//9 % 3, geno//27 % 3])

# the two vectors from spec 7.1, with the fields they claim
NAMES  = ['Biscuit', 'Pepper']                     # index IS the stored value
COLLAR = ['red', 'green', 'blue']
for code, collar, name, sex, gen, dom in [('YKJH7', 0, 0, 0, 1, [1,1,1,1]),
                                          ('HP9PA', 2, 1, 1, 1, [1,1,1,1])]:
    got, value, s, d = encode(collar, name, sex, gen, dom)
    assert got == code, f'{code}: encoded {got}'
    back = decode(code)
    assert back == dict(collar=collar, name=name, sex=sex, gen=gen, dom=dom), back
    print(f'{code}  value {value:>6}  s {s:>6}  digits {d[:4]}  check {d[4]:>2}  '
          f'-> {NAMES[back["name"]]}, {COLLAR[back["collar"]]} collar, '
          f'{"male" if back["sex"] else "female"}, F{back["gen"]}')

# names survive every code in the space, or they survive none
seen = {}
for v in range(MAXV + 1):
    geno, rest = v % 81, v // 81
    gen, rest = rest % 4, rest // 4
    sex, rest = rest % 2, rest // 2
    code, *_ = encode(rest // 40, rest % 40, sex, gen,
                      [geno % 3, geno//3 % 3, geno//9 % 3, geno//27 % 3])
    assert code not in seen, f'collision: {code} for {v} and {seen[code]}'
    seen[code] = v
print(f'\n{len(seen)} codes, no collisions: name and collar round-trip for every dog in the space')

# every single-character typo and adjacent swap is caught
bad = 0
for code in ('YKJH7', 'HP9PA'):
    for i in range(5):
        for ch in ALPHA:
            if ch == code[i]: continue
            try: decode(code[:i] + ch + code[i+1:]); bad += 1
            except AssertionError: pass
    for i in range(4):
        if code[i] == code[i+1]: continue
        sw = code[:i] + code[i+1] + code[i] + code[i+2:]
        try: decode(sw); bad += 1
        except AssertionError: pass
assert bad == 0, f'{bad} typos slipped through'
print('every single-character typo and adjacent swap rejected')

for reserved in ('XXXXX', 'YYYYY'):
    try: decode(reserved); raise SystemExit(f'{reserved} decoded as a real dog')
    except AssertionError: pass
try:
    decode('AAAAA'); print('AAAAA is a real dog, as spec 8.1 says - do not reserve it')
except AssertionError: raise SystemExit('AAAAA should be a valid code')
print('XXXXX and YYYYY fail the check digit by construction; AAAAA is a real dog')
