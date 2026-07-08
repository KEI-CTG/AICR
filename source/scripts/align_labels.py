"""
(1) Adjust each SVG's viewBox so its label text sits the same distance from the
    bottom of the viewBox -> labels visually align across the three icons
    when rendered with object-fit:contain + object-position:bottom.
(2) Recolor kgraph_v2 internal colors to the site palette.
"""
import re
import xml.etree.ElementTree as ET
from pathlib import Path

ET.register_namespace('', 'http://www.w3.org/2000/svg')

BASE = Path(__file__).resolve().parents[2] / 'docs' / 'assets'
LABEL_BOTTOM_GAP = 35.0   # tight — labels sit lower in viewBox; descenders ~11 fit

def adjust_label_bottom(svg_path):
    tree = ET.parse(svg_path)
    root = tree.getroot()
    vb = [float(x) for x in root.get('viewBox').split()]
    vx, vy, vw, vh = vb

    # find the label <text> element and walk tspans for max y offset
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
                    ct = child.tag.split('}')[-1]
                    if ct == 'tspan':
                        y = child.get('y')
                        if y is not None:
                            try:
                                max_tspan_y = max(max_tspan_y, float(y))
                            except ValueError:
                                pass
                break
    if text_base_y is None:
        print(f'  {svg_path.name}: no label text found; skipping')
        return

    last_line_baseline = text_base_y + max_tspan_y
    new_bottom = last_line_baseline + LABEL_BOTTOM_GAP
    new_vh = new_bottom - vy
    new_vb = f'{vx:.2f} {vy:.2f} {vw:.2f} {new_vh:.2f}'
    root.set('viewBox', new_vb)
    tree.write(svg_path, xml_declaration=True, encoding='utf-8')
    print(f'  {svg_path.name}: vb.h {vh:.1f} -> {new_vh:.1f}  (last baseline {last_line_baseline:.1f} + {LABEL_BOTTOM_GAP} gap)')

def recolor(svg_path, mapping):
    text = svg_path.read_text(encoding='utf-8')
    changed = False
    for old, new in mapping.items():
        pat = re.compile(re.escape(old), re.IGNORECASE)
        if pat.search(text):
            text = pat.sub(new, text)
            changed = True
    if changed:
        svg_path.write_text(text, encoding='utf-8')
        print(f'  {svg_path.name}: recolored via {mapping}')

if __name__ == '__main__':
    # Task 1: unify label bottom distance
    for name in ['grid_v2.svg', 'kgraph_v2.svg', 'monitor_v2.svg']:
        adjust_label_bottom(BASE / name)

    # Task 2: kgraph_v2 inner colors → site palette
    kgraph_map = {
        '#0f2b4d': '#009fde',  # dark navy -> site blue
        '#424298': '#00ab84',  # purple -> site green
        '#5fbd9c': '#00e5c5',  # teal -> site cyan
        '#e2c837': '#ff8a2a',  # yellow -> site amber
    }
    recolor(BASE / 'kgraph_v2.svg', kgraph_map)
