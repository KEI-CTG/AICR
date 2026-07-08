"""
Shift each label text down by DY units (creates more gap between drawing and label)
and extend the viewBox bottom to fit.
"""
import re
import xml.etree.ElementTree as ET
from pathlib import Path

ET.register_namespace('', 'http://www.w3.org/2000/svg')
BASE = Path(__file__).resolve().parents[2] / 'docs' / 'assets'

DY = 60.0                 # push label down this many viewBox units
LABEL_BOTTOM_GAP = 35.0   # retain existing gap below last line

def shift(p):
    tree = ET.parse(p)
    root = tree.getroot()
    vb = [float(x) for x in root.get('viewBox').split()]
    vx, vy, vw, vh = vb

    text_new_y = None
    max_tspan_y = 0.0
    for e in root.iter():
        t = e.tag.split('}')[-1]
        if t == 'text':
            tr = e.get('transform', '')
            m = re.search(r'translate\(\s*([-\d.]+)\s*[,\s]\s*([-\d.]+)\s*\)', tr)
            if m:
                cx = float(m.group(1))
                cy = float(m.group(2))
                text_new_y = cy + DY
                new_tr = f'translate({cx} {text_new_y})'
                e.set('transform', new_tr)
                for child in e.iter():
                    if child.tag.split('}')[-1] == 'tspan':
                        y = child.get('y')
                        if y is not None:
                            try: max_tspan_y = max(max_tspan_y, float(y))
                            except ValueError: pass
                break
    if text_new_y is None:
        return

    last_baseline = text_new_y + max_tspan_y
    new_bottom = last_baseline + LABEL_BOTTOM_GAP
    new_vh = new_bottom - vy
    new_vb = f'{vx:.2f} {vy:.2f} {vw:.2f} {new_vh:.2f}'
    root.set('viewBox', new_vb)
    tree.write(p, xml_declaration=True, encoding='utf-8')
    print(f'  {p.name}: text.y +{DY:.0f}  (now baseline {last_baseline:.1f})  vb.h → {new_vh:.1f}')

for name in ['grid_v2.svg', 'kgraph_v2.svg', 'monitor_v2.svg']:
    shift(BASE / name)
