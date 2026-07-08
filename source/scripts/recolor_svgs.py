"""
Replace near-black fills/strokes in the 3 pillar SVGs with the site's ink color
so they read on a dark background.
"""
import re
from pathlib import Path

DARK = ['#040000', '#231815', '#000000', '#727171', '#898885']
INK = '#f3ebdc'

base = Path(__file__).resolve().parents[2] / 'docs' / 'assets'
for name in ['grid_v2.svg', 'kgraph_v2.svg', 'monitor_v2.svg']:
    p = base / name
    text = p.read_text(encoding='utf-8')
    original = text
    for dark in DARK:
        # case-insensitive replace on the 6-digit hex
        pat = re.compile(re.escape(dark), re.IGNORECASE)
        text = pat.sub(INK, text)
    if text != original:
        p.write_text(text, encoding='utf-8')
        print(f'  {name}: recolored')
    else:
        print(f'  {name}: no change')
