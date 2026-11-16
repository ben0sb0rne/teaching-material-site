# Explore Dissolving — Day 2

The teaching side of the activity: what the lesson is, what each notebook
item is for, and what deliberately is not in the software.

This is the reading companion to `src/activities/explore-dissolving/notebook.js`,
where the items live as data. The tags below are carried on each item and are
never rendered on screen — a tag is for planning and marking, not for a
thirteen-year-old.

## The lesson

7th grade science, FOSS **Chemical Interactions, Investigation 7 Part 2
(Solubility)**. Day 2 of a two-day lab.

On Day 1 each group did the wet lab: 2 mL of a white powder into 30 mL of
water, stirred, observed, filtered, and evaporated 10-drop samples in a well
tray. Every group tested sodium chloride and calcium carbonate, plus one more
white substance from Investigation 1.

Day 2 is one 50-minute period, pairs on Chromebooks, redoing that lab in the
simulation — where they can see the particles.

| | |
|---|---|
| 0–5 min | Projector. The ball is a water particle, the bricks are surface particles, an unbreakable level is calcium carbonate. Then step the viewport out to the beaker and back in, on the board, so the class walks the magnification chain together before anyone opens a Chromebook. |
| 5–9 min | Students check their real well tray from Day 1. |
| 9–27 min | **Lab** tab: the wet lab again, in the sim. |
| 27–36 min | **Explain** tab, then a table argument over the claim. |
| 36–45 min | **Apply** tab. |
| 45–50 min | Paper exit ticket. |

## The six substances

Every one is a white powder, which is the lesson's own point: what tells them
apart is how they behave. Either station can hold any of them; tap a nameplate
while the beakers are dry to change the sample.

| Sample | Formula | What it does |
|---|---|---|
| Sodium chloride | NaCl | Dissolves. The lab's reference case. |
| Calcium carbonate | CaCO₃ | **Does not dissolve.** Clouds when stirred. |
| Sucrose | C₁₂H₂₂O₁₁ | Dissolves. The familiar one. |
| Sodium bicarbonate | NaHCO₃ | Dissolves, slowest of the five. |
| Magnesium sulfate | MgSO₄ | Dissolves. Epsom salts. |
| Calcium chloride | CaCl₂ | Dissolves fastest. |

The dissolving rates are **targets for the order a student sees, not physics**.
They want measuring on the shipping seed before anyone teaches off the numbers.

## The magnification chain

The posttests showed students reading the viewport as **one grain of salt**. It
is not: the field is **13.6 nm across**, and a grain of table salt is about
0.3 mm, so one grain is roughly **22,000 of these views wide**.

So the viewport opens on the beaker and steps inward. Tap the field, or press
**Z**; the readout names each step, and once water goes in the chain is over
and the key is refused.

| Step | What it is | Field | Scale bar |
|---|---|---|---|
| 1 | The beaker, as your eyes see it | 100 mm | 10 mm |
| 2 | Grains of powder, through a hand lens | 10 mm | 1 mm |
| 3 | One grain, under a microscope | 0.4 mm | 0.1 mm |
| 4 | Inside one grain — **a model** | 13.6 nm | 1 nm |

Two things in that table are worth pointing at in class.

**The bar runs in clean decades and the field does not.** 10 mm, 1 mm, 0.1 mm:
the bar barely changes length while the number on it falls ten-fold each step.
The third field is 0.4 mm rather than a tidy 1 mm because that is what puts one
grain of salt — the lesson's reference case — in the frame. At 1 mm it was
eight grains with "One grain" written under them.

**Step 3 shows no box for step 4, and that is the lesson.** Each step draws a
box where the next view comes from. The first two are easy. From 0.4 mm to
13.6 nm is a jump of **29,455**, and that box would be one hundredth of a
point across — it cannot be drawn at all. So the readout says the number
instead: *the next view is 1/22,000 of it.*

Step 4 is also where colour appears. The powder is drawn white at every real
magnification, because all six are white in the hand; the per-substance hues
are a convention the particle view needs and a claim nothing above it can
support.

### What each powder shows

Shape and size are the only things telling the six apart, which is the lesson's
own point — and the hand-lens step is where it lands. **Epsom salts resolves
into needles there**, which is exactly the cue the FOSS I-Check asks a student
to identify.

| Sample | Grain | Hand lens (10 mm) | Grain step (0.4 mm) |
|---|---|---|---|
| Sodium chloride | 0.3 mm | small cubes | **one grain** |
| Calcium carbonate | 5 µm | flat dust | dust |
| Sucrose | 0.5 mm | rounded chunks | part of one grain |
| Sodium bicarbonate | 70 µm | flat dust | a few grains |
| Magnesium sulfate | 1.5 mm | **needles** | part of one grain |
| Calcium chloride | 2.5 mm | large pellets | part of one grain |

Those grain sizes are **estimates, not measurements off the kit bottles**, and
they decide what step 3 draws. Calcium chloride moves most: ice melt is 2–3 mm
pellets, a lab granule nearer 0.5 mm. They live in `SUBSTANCE[*].grain` in
`activity.js` and are six numbers to change.

Two substances from Investigation 1 are deliberately absent: **citric acid and
ascorbic acid**. Every fizzing pair in Investigation 1 Part 2 needs one of
them, and this machine holds one substance per beaker, so it can never show a
reaction. Putting them on the menu would promise something the model cannot
deliver.

## The notebook

Twelve items across three pages, in three types. An item is **data**: it names
the event on the activity's bus that completes it, an optional condition, and
the line it writes into that page's Observations.

| Type | The student | Completes when |
|---|---|---|
| `observe` | does the thing | its trigger fires |
| `prediction` | commits a choice first | the trigger fires, after a pick |
| `choice` | picks one, or several when `min` is set | the pick, or the correct pick |

### Lab

| Item | Type | Tags |
|---|---|---|
| `lab-scale` | choice | Engage · CG5 |
| `lab-predict` | prediction | Engage · CG2 |
| `lab-surface` | observe | Explore · CG3 |
| `lab-dissolved` | observe | Explore · CG2 · CG4 |
| `lab-expert` | observe | Explore · CG1 |
| `lab-temps` | observe | Explore · CG3 |
| `lab-boil` | observe | Explore · CG2 |
| `ch-hot-caco3` | prediction · challenge | Explore · CG1 |
| `ch-freeze` | observe · challenge | Explore · CG3 |

### Explain

| Item | Type | Tags |
|---|---|---|
| `exp-filter` | choice | Explain · CG1 |
| `exp-caco3` | choice | Explain · CG1 |
| `ch-limits` | choice · challenge | Explain · ALD3 |

### Apply

| Item | Type | Tags |
|---|---|---|
| `app-kettle` | choice | Elaborate · CG4 |

### Tag legend

**5E phase:** Engage, Explore, Explain, Elaborate, Evaluate.

| | |
|---|---|
| **CG1** | Classify substances as soluble or insoluble, with evidence. |
| **CG2** | Dissolving is not a chemical reaction. |
| **CG3** | Temperature, stirring and particle motion. |
| **CG4** | Dissolved substances in our water — the environmental science agency goal. |
| **CG5** | The viewport is a model at particle scale, not a picture of a grain. |
| **ALD1** | Vocabulary and word roots. |
| **ALD2** | Argument talk. |
| **ALD3** | Cause-and-effect sentences. |

## What is on paper, and why

Four kinds of item are **not** in the software, by decision rather than by
omission: a fill-in-the-blank cause-and-effect sentence, the
claim-evidence-reasoning argument, a free-text action card, and the
self-rating check.

They are the four where the student is **writing rather than observing**. Each
would have needed its own widget — keyboard path, touch target, print style,
screen-reader text — for one item apiece, on a 309-point-wide page. And the
claim is better argued at a table than typed into a box: the lesson plan has
the class arguing it out, and calcium chloride warming a real beaker gives them
a genuine counterargument to "dissolving is not a chemical reaction".

So Evaluate, ALD1 and ALD2 are carried by the paper exit ticket. The Apply page
says so on screen.

## What the machine will not tell you

Worth knowing before standing in front of the class.

- **Calcium chloride does not warm the water on screen.** It says so in its
  identify line. Both beakers share one temperature, because the fair test the
  whole activity rests on is that nothing differs between them except the
  sample.
- **Sugar comes back unchanged from a boil.** Real sugar caramelises. The
  recovered line says so; the picture does not — it shows the glassy residue
  a dried sugar solution leaves, not caramel.
- **The residue crystals are placeholders.** Shape is right, detail is not:
  cubes for sodium chloride, needles for magnesium sulfate, rounded grains
  for sucrose, and one generic crystal for sodium bicarbonate and calcium
  chloride. A substance with no residue of its own keeps the poured powder.
- **Salt is modelled as one particle, not as ions.** That matches FOSS's own
  Investigation 1 background, which defines a particle as the formula unit.
- **There is no filter.** `exp-filter` brings in the result from the bench
  instead.
- **The grain sizes are estimates.** See the table above. They change what the
  grain step draws and nothing else — no rate, no count, no reading.
- **Chalk looks the same at both zoomed-out steps.** At 5 µm it is under a
  pixel either way, so both draw it as flat dust. That is honest — being that
  fine is why it clouds water rather than settling — but it means the hand-lens
  step teaches nothing about chalk except that you cannot resolve it.
- **Printing mid-zoom gives the particle view, not the step on screen.** The
  canvas the chain draws on is hidden for print, which is right for an absent
  student and surprising if you are looking at the beaker when you hit print.

## Running it

```bash
python3 tools/serve.py 8765
```

Then `http://localhost:8765/activities/explore-dissolving/`.

**The page must be visible.** A browser gives a hidden tab no animation frames,
so the model stops: the clock sits at 00.0 and the controls look dead while
every button still responds. This bites when the activity is on a second
monitor or behind another window.
