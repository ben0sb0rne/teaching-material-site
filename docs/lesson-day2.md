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
| 0–5 min | Projector. The ball is a water particle, the bricks are surface particles, an unbreakable level is calcium carbonate. |
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
  recovered line says so; the picture does not.
- **Salt is modelled as one particle, not as ions.** That matches FOSS's own
  Investigation 1 background, which defines a particle as the formula unit.
- **There is no filter.** `exp-filter` brings in the result from the bench
  instead.

## Running it

```bash
python3 tools/serve.py 8765
```

Then `http://localhost:8765/activities/explore-dissolving/`.

**The page must be visible.** A browser gives a hidden tab no animation frames,
so the model stops: the clock sits at 00.0 and the controls look dead while
every button still responds. This bites when the activity is on a second
monitor or behind another window.
