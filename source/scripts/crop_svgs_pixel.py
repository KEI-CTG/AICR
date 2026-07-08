"""
Render each SVG to a bitmap, find the tight bbox of non-transparent pixels,
then translate that pixel bbox back into the SVG's viewBox coordinate space
and rewrite viewBox to that tight area (with small padding).
"""
import re
import xml.etree.ElementTree as ET
from pathlib import Path
import cairosvg
from PIL import Image
import io

ET.register_namespace('', 'http://www.w3.org/2000/svg')

def render(svg_path, size=1200):
    data = Path(svg_path).read_bytes()
    png = cairosvg.svg2png(bytestring=data, output_width=size)
    return Image.open(io.BytesIO(png)).convert('RGBA')

def tight_bbox(img):
    # find bbox of non-transparent AND non-white-ish pixels
    # just use alpha channel bbox — anything drawn has some alpha
    bbox = img.getbbox()  # returns (l, t, r, b) of non-zero region
    return bbox

def crop_to_content(svg_path, padding_frac=0.04, render_size=1400):
    tree = ET.parse(svg_path)
    root = tree.getroot()
    vb = root.get('viewBox')
    parts = [float(x) for x in vb.split()]
    if len(parts) != 4:
        return None
    vx, vy, vw, vh = parts

    # render to bitmap
    img = render(svg_path, size=render_size)
    px_w, px_h = img.size
    bbox = tight_bbox(img)
    if not bbox:
        return None
    l, t, r, b = bbox

    # map pixel bbox → viewBox coords
    sx = vw / px_w
    sy = vh / px_h
    new_x = vx + l * sx
    new_y = vy + t * sy
    new_w = (r - l) * sx
    new_h = (b - t) * sy

    pad = max(new_w, new_h) * padding_frac
    new_x -= pad; new_y -= pad
    new_w += 2 * pad; new_h += 2 * pad

    new_vb = f'{new_x:.2f} {new_y:.2f} {new_w:.2f} {new_h:.2f}'
    print(f'  {svg_path.name}: {vb}  ->  {new_vb}  ({new_w:.0f}x{new_h:.0f}, aspect={new_w/new_h:.2f}:1)')
    root.set('viewBox', new_vb)
    if 'width' in root.attrib: del root.attrib['width']
    if 'height' in root.attrib: del root.attrib['height']
    tree.write(svg_path, xml_declaration=True, encoding='utf-8')
    return new_vb

if __name__ == '__main__':
    base = Path(__file__).resolve().parents[2] / 'docs' / 'assets'
    for name in ['grid_v2.svg', 'kgraph_v2.svg', 'monitor_v2.svg']:
        crop_to_content(base / name)
