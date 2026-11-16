| Layer id | Render | Notes | 1x (x, y, w, h) | 2x (x, y, w, h) | 2.4x master (x, y, w, h) |
|---|---|---|---|---|---|
| `wall` | raster-tile | Wall tile, repeats in both directions | 0, 0, 100, 100 | 0, 0, 200, 200 | 0, 0, 240, 240 |
| `wall-trim` | raster-strip | Black trim band, repeats horizontally | 0, 900, 100, 63 | 0, 1800, 200, 126 | 0, 2160, 240, 151.2 |
| `bench` | raster-strip | Black epoxy bench, repeats horizontally, extends down | 0, 963, 100, 37 | 0, 1926, 200, 74 | 0, 2311.2, 240, 88.8 |
| `console` | raster | Instrument body with all display bezels (cut-outs left dark) | 50, 50, 1100, 650 | 100, 100, 2200, 1300 | 120, 120, 2640, 1560 |
| `display-readout` | code | ID readout cut-out | 75, 90, 512, 130 | 150, 180, 1024, 260 | 180, 216, 1228.8, 312 |
| `display-clock` | code | Clock cut-out | 613, 90, 120, 130 | 1226, 180, 240, 260 | 1471.2, 216, 288, 312 |
| `glass-readout` | raster-overlay | Reflection/fingerprint overlay, placeholder | 75, 90, 512, 130 | 150, 180, 1024, 260 | 180, 216, 1228.8, 312 |
| `glass-clock` | raster-overlay | Reflection/fingerprint overlay, placeholder | 613, 90, 120, 130 | 1226, 180, 240, 260 | 1471.2, 216, 288, 312 |
| `key-freeze-up / key-freeze-down` | raster x2 | Freeze keycap, both states | 749, 90, 120, 65 | 1498, 180, 240, 130 | 1797.6, 216, 288, 156 |
| `key-stir-up / key-stir-down` | raster x2 | Stir keycap, both states | 877, 90, 120, 65 | 1754, 180, 240, 130 | 2104.8, 216, 288, 156 |
| `key-reset-up / key-reset-down` | raster x2 | Reset keycap, both states | 1005, 90, 120, 65 | 2010, 180, 240, 130 | 2412, 216, 288, 156 |
| `key-dispense-ready / key-dispense-spent` | raster x2 | Amber when ready; pressed and grey after dispensing | 749, 165, 376, 55 | 1498, 330, 752, 110 | 1797.6, 396, 902.4, 132 |
| `nameplate-left` | raster | Engraved aluminum plate, text and colour dot included | 75, 240, 512, 65 | 150, 480, 1024, 130 | 180, 576, 1228.8, 156 |
| `viewport-ring-left` | raster | Metal ring, transparent centre | 75, 330, 338, 338 | 150, 660, 676, 676 | 180, 792, 811.2, 811.2 |
| `viewport-field-left` | code | Particle simulation canvas (circle, r = 156.5) | 87.5, 342.5, 313, 313 | 175, 685, 626, 626 | 210, 822, 751.2, 751.2 |
| `glass-viewport-left` | raster-overlay | Lens reflection overlay, placeholder | 87.5, 342.5, 313, 313 | 175, 685, 626, 626 | 210, 822, 751.2, 751.2 |
| `register-panel-left` | raster | LED panel with engraved DISSOLVED and 50 LED sockets | 430, 330, 157, 338 | 860, 660, 314, 676 | 1032, 792, 376.8, 811.2 |
| `register-leds-left` | code | 5 x 10 grid; each LED 15 pt across with 7.5 pt gaps | 456, 378, 105, 217.5 | 912, 756, 210, 435 | 1094.4, 907.2, 252, 522 |
| `display-counter-left` | code | Counter cut-out | 440, 608, 137, 50 | 880, 1216, 274, 100 | 1056, 1459.2, 328.8, 120 |
| `glass-counter-left` | raster-overlay | Overlay, placeholder | 440, 608, 137, 50 | 880, 1216, 274, 100 | 1056, 1459.2, 328.8, 120 |
| `head-left` | raster | Low-profile head with water nozzle, powder chute and probe | 144, 700, 200, 165 | 288, 1400, 400, 330 | 345.6, 1680, 480, 396 |
| `bracket-left` | raster | Metal bracket from console to stir plate | 114, 700, 13, 246 | 228, 1400, 26, 492 | 273.6, 1680, 31.2, 590.4 |
| `stirplate-left` | raster | Magnetic stir plate with speed knob | 114, 918, 236, 28 | 228, 1836, 472, 56 | 273.6, 2203.2, 566.4, 67.2 |
| `beaker-left` | raster | Empty 250 mL beaker glass with graduations (transparent) | 162.75, 730, 162.5, 187.5 | 325.5, 1460, 325, 375 | 390.6, 1752, 390, 450 |
| `water-left` | raster-masked | Full beaker of water; code masks it bottom-up | 162.75, 730, 162.5, 187.5 | 325.5, 1460, 325, 375 | 390.6, 1752, 390, 450 |
| `turbidity-left` | raster-masked | Milky cloud texture inside the water; code sets opacity | 162.75, 730, 162.5, 187.5 | 325.5, 1460, 325, 375 | 390.6, 1752, 390, 450 |
| `pile-left` | raster-masked | Powder mound on the beaker floor; code masks it for refills | 162.75, 730, 162.5, 187.5 | 325.5, 1460, 325, 375 | 390.6, 1752, 390, 450 |
| `sprite-stirbar-left` | sprite | Stir bar spin loop, 12 frames | 212.75, 890, 62.5, 27.5 | 425.5, 1780, 125, 55 | 510.6, 2136, 150, 66 |
| `sprite-pour-left` | sprite | Water stream loop from nozzle to beaker floor | 238, 728, 18, 184.5 | 476, 1456, 36, 369 | 571.2, 1747.2, 43.2, 442.8 |
| `sprite-powder-left` | sprite | Powder stream loop from chute to beaker floor | 262, 729, 26, 183.5 | 524, 1458, 52, 367 | 628.8, 1749.6, 62.4, 440.4 |
| `nameplate-right` | raster | Engraved aluminum plate, text and colour dot included | 613, 240, 512, 65 | 1226, 480, 1024, 130 | 1471.2, 576, 1228.8, 156 |
| `viewport-ring-right` | raster | Metal ring, transparent centre | 613, 330, 338, 338 | 1226, 660, 676, 676 | 1471.2, 792, 811.2, 811.2 |
| `viewport-field-right` | code | Particle simulation canvas (circle, r = 156.5) | 625.5, 342.5, 313, 313 | 1251, 685, 626, 626 | 1501.2, 822, 751.2, 751.2 |
| `glass-viewport-right` | raster-overlay | Lens reflection overlay, placeholder | 625.5, 342.5, 313, 313 | 1251, 685, 626, 626 | 1501.2, 822, 751.2, 751.2 |
| `register-panel-right` | raster | LED panel with engraved DISSOLVED and 50 LED sockets | 968, 330, 157, 338 | 1936, 660, 314, 676 | 2323.2, 792, 376.8, 811.2 |
| `register-leds-right` | code | 5 x 10 grid; each LED 15 pt across with 7.5 pt gaps | 994, 378, 105, 217.5 | 1988, 756, 210, 435 | 2385.6, 907.2, 252, 522 |
| `display-counter-right` | code | Counter cut-out | 978, 608, 137, 50 | 1956, 1216, 274, 100 | 2347.2, 1459.2, 328.8, 120 |
| `glass-counter-right` | raster-overlay | Overlay, placeholder | 978, 608, 137, 50 | 1956, 1216, 274, 100 | 2347.2, 1459.2, 328.8, 120 |
| `head-right` | raster | Low-profile head with water nozzle, powder chute and probe | 682, 700, 200, 165 | 1364, 1400, 400, 330 | 1636.8, 1680, 480, 396 |
| `bracket-right` | raster | Metal bracket from console to stir plate | 652, 700, 13, 246 | 1304, 1400, 26, 492 | 1564.8, 1680, 31.2, 590.4 |
| `stirplate-right` | raster | Magnetic stir plate with speed knob | 652, 918, 236, 28 | 1304, 1836, 472, 56 | 1564.8, 2203.2, 566.4, 67.2 |
| `beaker-right` | raster | Empty 250 mL beaker glass with graduations (transparent) | 700.75, 730, 162.5, 187.5 | 1401.5, 1460, 325, 375 | 1681.8, 1752, 390, 450 |
| `water-right` | raster-masked | Full beaker of water; code masks it bottom-up | 700.75, 730, 162.5, 187.5 | 1401.5, 1460, 325, 375 | 1681.8, 1752, 390, 450 |
| `turbidity-right` | raster-masked | Milky cloud texture inside the water; code sets opacity | 700.75, 730, 162.5, 187.5 | 1401.5, 1460, 325, 375 | 1681.8, 1752, 390, 450 |
| `pile-right` | raster-masked | Powder mound on the beaker floor; code masks it for refills | 700.75, 730, 162.5, 187.5 | 1401.5, 1460, 325, 375 | 1681.8, 1752, 390, 450 |
| `sprite-stirbar-right` | sprite | Stir bar spin loop, 12 frames | 750.75, 890, 62.5, 27.5 | 1501.5, 1780, 125, 55 | 1801.8, 2136, 150, 66 |
| `sprite-pour-right` | sprite | Water stream loop from nozzle to beaker floor | 776, 728, 18, 184.5 | 1552, 1456, 36, 369 | 1862.4, 1747.2, 43.2, 442.8 |
| `sprite-powder-right` | sprite | Powder stream loop from chute to beaker floor | 800, 729, 26, 183.5 | 1600, 1458, 52, 367 | 1920, 1749.6, 62.4, 440.4 |
| `notebook-paper` | raster | Blank page, rings and ruled lines | 1185, 50, 365, 913 | 2370, 100, 730, 1826 | 2844, 120, 876, 2191.2 |
| `notebook-text` | code | All notebook writing (handwritten font) | 1213, 80, 309, 863 | 2426, 160, 618, 1726 | 2911.2, 192, 741.6, 2071.2 |
