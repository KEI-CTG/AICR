"""
Crop SVG viewBox to actual drawing bounds.

For each input SVG:
  - parse all <path d="..."> using svgpathtools to get precise bbox
  - also inspect <rect>, <circle>, <ellipse>, <line>, <polyline>, <polygon>, <text>
  - compute overall min_x/max_x/min_y/max_y
  - rewrite the root <svg> viewBox attribute to "min_x min_y width height" + small padding
  - save to output path
"""
import re
import sys
import xml.etree.ElementTree as ET
from pathlib import Path
from svgpathtools import parse_path

SVG_NS = 'http://www.w3.org/2000/svg'
ET.register_namespace('', SVG_NS)

def local(tag):
    return tag.split('}')[-1] if '}' in tag else tag

def parse_floats(s):
    return [float(x) for x in re.findall(r'[-+]?\d*\.?\d+(?:[eE][-+]?\d+)?', s or '')]

def bbox_of_path(d):
    try:
        p = parse_path(d)
        if len(p) == 0:
            return None
        xmin, xmax, ymin, ymax = p.bbox()
        return (xmin, ymin, xmax, ymax)
    except Exception:
        # fallback: collect all numbers, pair them up
        nums = parse_floats(d)
        xs = nums[0::2]
        ys = nums[1::2]
        if not xs or not ys:
            return None
        return (min(xs), min(ys), max(xs), max(ys))

def bbox_of_polyish(points_attr):
    nums = parse_floats(points_attr)
    xs = nums[0::2]
    ys = nums[1::2]
    if not xs or not ys:
        return None
    return (min(xs), min(ys), max(xs), max(ys))

def merge(a, b):
    if a is None: return b
    if b is None: return a
    return (min(a[0], b[0]), min(a[1], b[1]), max(a[2], b[2]), max(a[3], b[3]))

def compute_bbox(root):
    bb = None
    for elem in root.iter():
        tag = local(elem.tag)
        if tag == 'path':
            bb = merge(bb, bbox_of_path(elem.get('d', '')))
        elif tag == 'rect':
            x = float(elem.get('x', 0))
            y = float(elem.get('y', 0))
            w = float(elem.get('width', 0))
            h = float(elem.get('height', 0))
            bb = merge(bb, (x, y, x + w, y + h))
        elif tag == 'circle':
            cx = float(elem.get('cx', 0))
            cy = float(elem.get('cy', 0))
            r = float(elem.get('r', 0))
            bb = merge(bb, (cx - r, cy - r, cx + r, cy + r))
        elif tag == 'ellipse':
            cx = float(elem.get('cx', 0))
            cy = float(elem.get('cy', 0))
            rx = float(elem.get('rx', 0))
            ry = float(elem.get('ry', 0))
            bb = merge(bb, (cx - rx, cy - ry, cx + rx, cy + ry))
        elif tag == 'line':
            x1 = float(elem.get('x1', 0)); y1 = float(elem.get('y1', 0))
            x2 = float(elem.get('x2', 0)); y2 = float(elem.get('y2', 0))
            bb = merge(bb, (min(x1,x2), min(y1,y2), max(x1,x2), max(y1,y2)))
        elif tag in ('polyline', 'polygon'):
            bb = merge(bb, bbox_of_polyish(elem.get('points', '')))
        elif tag == 'text':
            # approximate: use (x, y) as point; font-size as rough height
            x = float(elem.get('x', 0))
            y = float(elem.get('y', 0))
            # try to get font-size from style or attribute
            fs = 16
            style = elem.get('style', '')
            m = re.search(r'font-size\s*:\s*([\d.]+)', style)
            if m: fs = float(m.group(1))
            bb = merge(bb, (x, y - fs, x + fs * 2, y))
        elif tag == 'image':
            x = float(elem.get('x', 0))
            y = float(elem.get('y', 0))
            w = float(elem.get('width', 0))
            h = float(elem.get('height', 0))
            bb = merge(bb, (x, y, x + w, y + h))
    return bb

def crop_svg(in_path, out_path, pad_frac=0.04):
    tree = ET.parse(in_path)
    root = tree.getroot()
    bb = compute_bbox(root)
    if bb is None:
        print(f'  !! no bbox found for {in_path}')
        return None
    xmin, ymin, xmax, ymax = bb
    w = xmax - xmin
    h = ymax - ymin
    pad = max(w, h) * pad_frac
    xmin -= pad; ymin -= pad; w += 2*pad; h += 2*pad
    new_vb = f'{xmin:.2f} {ymin:.2f} {w:.2f} {h:.2f}'
    old_vb = root.get('viewBox')
    root.set('viewBox', new_vb)
    # remove any fixed width/height that would override viewBox scaling
    if 'width' in root.attrib: del root.attrib['width']
    if 'height' in root.attrib: del root.attrib['height']
    tree.write(out_path, xml_declaration=True, encoding='utf-8')
    print(f'  {in_path.name}: viewBox  {old_vb}  ->  {new_vb}')
    return bb

if __name__ == '__main__':
    base = Path(__file__).resolve().parents[2] / 'docs' / 'assets'
    for name in ['grid_v2.svg', 'kgraph_v2.svg', 'monitor_v2.svg']:
        p = base / name
        crop_svg(p, p)  # overwrite in place
