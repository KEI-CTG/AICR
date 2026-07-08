# Source assets & build pipeline

Original user-supplied SVGs and the Python scripts that produce the
deployment-ready versions in `../release/assets/`.

## Folder layout

```
source/
├── README.md                   # this file
├── svg_original/               # pristine SVGs exported from design tool
│   ├── grid_v2.svg             # Environmental Data & Indicators
│   ├── kgraph_v2.svg           # Policy Knowledge Graph
│   └── monitor_v2.svg          # AI Information Service
└── scripts/                    # processing pipeline (run in order)
    ├── crop_svgs.py            # vector-bbox crop (fast, rough)
    ├── crop_svgs_pixel.py      # pixel-accurate bbox crop (preferred)
    ├── recolor_svgs.py         # dark (#040000/#231815/#727171/#898885) → ink #f3ebdc
    ├── normalize_viewbox.py    # pad all 3 viewBoxes to identical WxH
    ├── shift_label_down.py     # move the text label lower inside viewBox
    ├── bump_label_size.py      # enlarge label font-size + scale tspan x/y
    ├── resize_labels.py        # (alt) font-size change plus line-spacing
    └── align_labels.py         # set viewBox bottom to (last baseline + gap)
```

## Dependencies

```bash
pip install svgpathtools cairosvg pillow
```

## Regenerate pillar icons

The scripts **mutate files in place** in the target directory. Each script's
`BASE` path is computed relative to the script's own location via
`Path(__file__).resolve().parents[2] / 'release' / 'assets'`, so you can run
them from anywhere without editing the code — as long as the standard
`source/scripts/` ↔ `release/assets/` folder relationship is kept.

```bash
cd <project root>

# 1) Reset target from originals
cp source/svg_original/*.svg release/assets/

# 2) Run the pipeline in this order
python source/scripts/crop_svgs_pixel.py        # tight viewBox
python source/scripts/recolor_svgs.py            # dark → ink
python source/scripts/align_labels.py            # viewBox bottom = baseline + 35
python source/scripts/shift_label_down.py        # text baseline y += 60
python source/scripts/normalize_viewbox.py       # equalize WxH across the 3
python source/scripts/bump_label_size.py         # font-size 45 → 50, scale tspan coords
```

## Typical edits

| Change wanted | Script to edit |
|---|---|
| Icon size on page | CSS `.pillar__icon max-width` in the HTML |
| Dark line color | `recolor_svgs.py` → change `INK` |
| Label text position | `shift_label_down.py` → change `DY` |
| Label font-size | `bump_label_size.py` → change `NEW_FS` |
| Gap below label | `align_labels.py` → change `LABEL_BOTTOM_GAP` |

## Color mapping reference

Dark-on-light artwork → site dark theme:

| Original | Replaced with | Site role |
|---|---|---|
| `#040000` | `#f3ebdc` (ink) | text/lines |
| `#231815` | `#f3ebdc` (ink) | dark outlines |
| `#727171` | `#f3ebdc` (ink) | medium grays (kgraph) |
| `#898885` | `#f3ebdc` (ink) | light grays (kgraph) |

kgraph_v2-only extra mapping (to match site brand palette):

| Original | Replaced with |
|---|---|
| `#0f2b4d` (navy) | `#009fde` (site blue) |
| `#424298` (purple) | `#00ab84` (site green) |
| `#5fbd9c` (teal) | `#00e5c5` (site cyan) |
| `#e2c837` (yellow) | `#ff8a2a` (AI amber) |
