"""
Normalize all 3 SVGs to the SAME viewBox width/height by padding each one
(pushing edges outward around the existing content). This makes the `font-size: 45px`
labels render at identical pixel size across all three icons when displayed
in the same-sized container.

Target: max width × max height across the 3 SVGs, with content horizontally
centered inside the new viewBox.
"""
import xml.etree.ElementTree as ET
from pathlib import Path

ET.register_namespace('', 'http://www.w3.org/2000/svg')
BASE = Path(__file__).resolve().parents[2] / 'docs' / 'assets'
NAMES = ['grid_v2.svg', 'kgraph_v2.svg', 'monitor_v2.svg']

# 1) find max width + max height
dims = {}
for n in NAMES:
    vb = [float(x) for x in ET.parse(BASE/n).getroot().get('viewBox').split()]
    dims[n] = vb
max_w = max(d[2] for d in dims.values())
max_h = max(d[3] for d in dims.values())
print(f'target viewBox size: {max_w:.1f} x {max_h:.1f}')

# 2) for each SVG, expand viewBox to target by adding equal padding L/R, and
#    all extra height to the TOP (so label baseline position from bottom is preserved)
for n in NAMES:
    tree = ET.parse(BASE/n)
    root = tree.getroot()
    vx, vy, vw, vh = dims[n]
    dw = max_w - vw
    dh = max_h - vh
    new_vx = vx - dw/2        # centre horizontally
    new_vy = vy - dh           # add all extra height at the top
    new_vb = f'{new_vx:.2f} {new_vy:.2f} {max_w:.2f} {max_h:.2f}'
    root.set('viewBox', new_vb)
    tree.write(BASE/n, xml_declaration=True, encoding='utf-8')
    print(f'  {n}: pad L/R={dw/2:.1f}  pad top={dh:.1f}  -> {new_vb}')
