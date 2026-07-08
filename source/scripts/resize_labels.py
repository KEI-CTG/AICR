"""
Bigger labels + lower in viewBox:
 - font-size 45 -> 55 (bump by ~22%)
 - tspan y offset 67 -> 82 (line-height proportional)
 - LABEL_BOTTOM_GAP reduced so text sits closer to the bottom
"""
import re
from pathlib import Path
import xml.etree.ElementTree as ET

ET.register_namespace('', 'http://www.w3.org/2000/svg')
BASE = Path(__file__).resolve().parents[2] / 'docs' / 'assets'

OLD_FS = 45
NEW_FS = 55
OLD_LINE_Y = 67
NEW_LINE_Y = 82
NEW_GAP = 50.0   # was 80

def update_svg(p):
    text = p.read_text(encoding='utf-8')
    # 1) font-size in <style>
    text = re.sub(r'font-size:\s*' + str(OLD_FS) + r'px', f'font-size: {NEW_FS}px', text)
    # 2) tspan y="67" → y="82"
    text = re.sub(r'y="' + str(OLD_LINE_Y) + r'"', f'y="{NEW_LINE_Y}"', text)
    p.write_text(text, encoding='utf-8')

    # 3) adjust viewBox bottom based on new last-line baseline
    tree = ET.parse(p)
    root = tree.getroot()
    vb = [float(x) for x in root.get('viewBox').split()]
    vx, vy, vw, vh = vb

    text_base_y = None
    max_tspan_y = 0.0
    for e in root.iter():
        t = e.tag.split('}')[-1]
        if t == 'text':
            tr = e.get('transform', '')
            m = re.search(r'translate\(\s*([-\d.]+)\s*[,\s]\s*([-\d.]+)\s*\)', tr)
            if m:
                text_base_y = float(m.group(2))
                for child in e.iter():
                    if child.tag.split('}')[-1] == 'tspan':
                        y = child.get('y')
                        if y is not None:
                            try: max_tspan_y = max(max_tspan_y, float(y))
                            except ValueError: pass
                break
    if text_base_y is None:
        return
    last_baseline = text_base_y + max_tspan_y
    new_bottom = last_baseline + NEW_GAP
    new_vh = new_bottom - vy
    new_vb = f'{vx:.2f} {vy:.2f} {vw:.2f} {new_vh:.2f}'
    root.set('viewBox', new_vb)
    tree.write(p, xml_declaration=True, encoding='utf-8')
    print(f'  {p.name}: fs {OLD_FS}→{NEW_FS}  line {OLD_LINE_Y}→{NEW_LINE_Y}  vb.h → {new_vh:.1f} (last baseline {last_baseline:.1f} + {NEW_GAP})')

for name in ['grid_v2.svg', 'kgraph_v2.svg', 'monitor_v2.svg']:
    update_svg(BASE / name)
