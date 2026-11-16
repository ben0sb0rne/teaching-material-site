# Source art — Explore Dissolving

The files the finished textures get painted in. One per shipping layer,
already the right shape, so nothing here needs a resolution checked before
work starts.

Everything is `SOURCE-` prefixed and carries its canvas size in the filename,
which is why there is no table in this file to go stale.

## What is in each one

| Layer | |
|---|---|
| `PHOTO-HERE` | empty and transparent, on top — drop the photo in here |
| `placeholder-reference` | the generated stand-in, scaled up, to align against |

The reference layer is soft, because it is a 2× upscale of a placeholder that
was never meant to be looked at closely. It is there for position and
proportion, not for detail. Delete it before exporting, or hide it — either
way it must not reach the export.

## Resolution

The canvas is **4× the manifest box**, against the **2×** the browser loads.
Export at **50%** and the result is the shipping size exactly, resampled by a
clean halving rather than an awkward ratio.

That is the only number worth remembering: *finished art is half the canvas
it was painted on.*

## Where the export goes

`src/activities/explore-dissolving/assets/layers/{name}.webp`, where `{name}`
is whatever sits between `SOURCE-` and the size in the filename —
`SOURCE-beaker-650x750.psd` exports to `beaker.webp`.

That folder is the finished set. Anything not in it yet keeps showing its
placeholder, so there is no need to do them in any order or all at once.

Then check the export landed at the right size:

```bash
python3 tools/make-placeholders.py --check
```

It reports anything the wrong size, anything still to make, and any file in
the folder that nothing loads — which is how a misnamed export shows up.

## The sprite sheets

Four files are animation strips, with Photoshop **guides on every frame
boundary**:

| | frames |
|---|---|
| `SOURCE-sprite-stirbar-3000x110.psd` | 12 |
| `SOURCE-sprite-pour-576x738.psd` | 8 |
| `SOURCE-sprite-powder-sugar-832x734.psd` | 8 |
| `SOURCE-sprite-powder-caco3-832x734.psd` | 8 |

Frames run left to right and play in that order. The strip is one image at
export: the engine steps the background position across it, so the frames
must stay exactly equal in width and butt up against each other with no
gutter.

## The beakers are composited with multiply

`beaker-sugar` and `beaker-caco3` carry `"blend": "multiply"` in the manifest,
so the activity darkens what is behind them rather than painting over it.
That is how glass behaves, and it means **the transparency does not have to be
masked by hand** — shoot or paint the glass against white and the white
disappears by itself.

The rules that follow from it:

- **White is invisible.** Anything at 255 leaves the background untouched.
- **Only darkening is possible.** Multiply cannot lighten, so a specular
  highlight brighter than the wall behind it will not show. Glass really
  wants a second layer in screen for the highlights, and there is not one
  yet — say the word if the beaker looks dead without it.
- **Leave the PSD layer on Normal.** The blend happens at render time, not in
  the file; setting the layer to Multiply in Photoshop would double it.
- The graduations and the rim read as dark marks on light glass, which is
  exactly what multiply is good at.

The layer already draws **in front of** the water, the powder and the stir
bar, so it is the near wall of the glass, not the far one. What is painted
here is what a student looks through.

## Two things to know

**`notebook-paper` is at the corrected size.** Its box moved so the binding
rings stop being clipped, and this canvas is the new one — 1460 × 3700, which
exports to 730 × 1850. The placeholder still in the activity is the old
height and is the one file `--check` currently flags.

**Transparency matters on more layers than you would think.** The four glass
overlays, `water`, `turbidity` and `viewport-ring` are composited over what
sits behind them. Flattening one onto white will look right in Photoshop and
wrong in the activity.

## Regenerating

```bash
python3 tools/make-source-psd.py            # all of them
python3 tools/make-source-psd.py console    # just ids that match
```

Rebuilds from the manifest, so if a box moves the canvas follows. It
overwrites, so anything already painted here should be somewhere else first.
