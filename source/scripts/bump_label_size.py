"""
Bump label font-size from 45 to 50 AND scale every tspan's x/y proportionally
so letters don't overlap at the larger size.
"""
import re
import xml.etree.ElementTree as ET
from pathlib import Path

ET.register_namespace('', 'http://www.w3.org/2000/svg')
BASE = Path(__file__).resolve().parents[2] / 'docs' / 'assets'

OLD_FS = 45
NEW_FS = 50
SCALE  = NEW_FS / OLD_FS   # 1.111

def bump(p):
    # 1) update font-size inside <style>
    text = p.read_text(encoding='utf-8')
    text = re.sub(r'font-size:\s*' + str(OLD_FS) + r'(?:\.\d+)?px', f'font-size: {NEW_FS}px', text)
    p.write_text(text, encoding='utf-8')

    # 2) scale tspan x and y values
    tree = ET.parse(p)
    root = tree.getroot()
    for e in root.iter():
        if e.tag.split('}')[-1] == 'tspan':
            for attr in ('x', 'y'):
                v = e.get(attr)
                if v is not None:
                    try:
                        e.set(attr, f'{float(v) * SCALE:.3f}')
                    except ValueError:
                        pass
    tree.write(p, xml_declaration=True, encoding='utf-8')
    print(f'  {p.name}: font-size {OLD_FS}→{NEW_FS}, tspan x/y scaled by {SCALE:.3f}')

for name in ['grid_v2.svg', 'kgraph_v2.svg', 'monitor_v2.svg']:
    bump(BASE / name)
