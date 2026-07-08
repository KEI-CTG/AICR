# KEI · AI Convergence Research Group — Release v1.0

Deployment-ready bilingual website with hero randomization and PWA support.

## Entry points

| Lang | File | Default hero |
|------|------|--------------|
| EN   | `index.html`    | randomized per load |
| KO   | `index.ko.html` | randomized per load |

Language toggle (globe icon in top-right nav) cross-links the two pages and
preserves the current hero variant via a `?hero=image|video` URL parameter
(consumed on arrival so subsequent refresh still flips).

## Hero variants

Each page load picks one of two backgrounds, alternating on every refresh
(localStorage-backed):

- **image** — `assets/hero-bg.jpg` + SVG ripple filter + CSS drift animation
- **video** — `assets/hero_blue_v3.mp4` (two-layer crossfade for seamless loop)

Force a variant for testing: `?hero=image` or `?hero=video`.

## File layout

```
release/
├── index.html                      # EN landing
├── index.ko.html                   # KO landing
├── manifest.json                   # PWA manifest
├── README.md                       # this file
└── assets/
    ├── KEI_Wordmark.svg            # app icon (manifest + apple-touch-icon)
    ├── hero-bg.jpg                 # EN-side hero image
    ├── hero_blue_v3.mp4            # video variant
    ├── hero_blue_v3_poster.png     # video poster
    ├── grid_v2.svg                 # Env Data & Indicators pillar icon
    ├── kgraph_v2.svg               # Policy Knowledge Graph pillar icon
    ├── monitor_v2.svg              # AI Information Service pillar icon
    └── logo-mondrian.js            # pixel-grid wordmark mount module
```

## External runtime dependencies (CDN)

- Google Fonts: Archivo, Inter, JetBrains Mono, Space Grotesk
- jsDelivr: Paperlogy (both pages) · Pretendard, SandollAggro, Hakgyoansim (KO only)
- esm.sh: `p5@1.9.4` (loaded by `logo-mondrian.js`)

## Serving

Static site — any HTTP server works. The site uses ES modules and HTML5
video so it must be served over HTTP, not `file://`.

```bash
# from release/
python -m http.server 8765
# then open http://localhost:8765/index.html or /index.ko.html
```

## PWA install

Chrome/Edge shows an install icon in the address bar. Mobile: Share → Add
to Home Screen. Installed app opens in standalone mode with the dark theme
(`#070a14`) extended into the OS chrome.

## Notes

- Nav items `/briefs`, `/presentations`, `/papers` are placeholders — no
  target pages exist yet.
- Mondrian pixel-grid logo next to the Mission heading is fully
  self-generating (16 cells, fixed color distribution, auto-shuffle every
  3.5 s, smooth color lerp, click-to-reshuffle).
- Pillar icon SVGs are produced by the pipeline under `../source/`; see
  `../source/README.md` to regenerate from originals.
