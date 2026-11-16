# The key, shared by the stage and the record because both show sex symbols and
# alleles. One definition, so the wording cannot drift between two screens.
# At build time this becomes a kit component, not a copied block.
HTML = '''<details class="key"><summary>Key</summary><div class="kp">
  <div><span class="kh">Symbols</span>
    <p><b class="sym">&#9792;</b> female</p><p><b class="sym">&#9794;</b> male</p></div>
  <div><span class="kh">Letters</span>
    <p><b class="al d">F</b> capital &mdash; dominant, one copy shows</p>
    <p><b class="al r">f</b> lowercase &mdash; recessive, needs both</p></div>
  <div><span class="kh">This litter&rsquo;s genes</span>
    <p><b class="al d">F</b><b class="al r">f</b> beard &nbsp; <b class="al d">S</b><b class="al r">s</b> short coat &nbsp; <b class="al d">B</b><b class="al r">b</b> black</p>
    <p><b class="al d">C</b><b class="al r">c</b> curl &mdash; <b class="al">CC</b> curly, <b class="al">Cc</b> wavy, <b class="al">cc</b> straight</p></div>
</div></details>'''

def css(PLATE, LIT, RULE, SOFT, INK):
    # <details> is the platform's own disclosure: keyboard-reachable, no script.
    # A legend belongs behind one (CLAUDE.md, the one-screen rule).
    return f'''.key{{position:relative}}
.key summary{{height:48px;min-width:72px;padding:0 20px;border:1px solid {RULE};
  font:400 15px/46px Jost,sans-serif;text-align:center;cursor:pointer;list-style:none}}
.key summary::-webkit-details-marker{{display:none}}
.key[open] summary{{background:{LIT}}}
.kp{{position:absolute;bottom:calc(100% + 10px);left:0;width:714px;padding:16px 20px;
  background:{PLATE};border:1px solid {RULE};display:flex;gap:28px}}
.kp>div:nth-child(1){{flex:0 0 96px}}
.kp>div:nth-child(2){{flex:0 0 210px}}
.kp>div:nth-child(3){{flex:1}}
.kh{{display:block;margin-bottom:7px;font:600 12px 'IBM Plex Mono',monospace;
  letter-spacing:.1em;color:{SOFT};text-transform:uppercase}}
.kp p{{margin:3px 0;font:400 13px/1.5 Jost,sans-serif;color:{INK}}}
/* alleles never pass through text-transform: F and f are different alleles */
.kp .al{{font:600 15px 'IBM Plex Mono',monospace;text-transform:none}}
.kp .al.d{{color:#14537B}}.kp .al.r{{color:#8E2A20}}
.kp .sym{{font-size:17px;color:{INK}}}'''
