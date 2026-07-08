/**
 * KEI · AI  —  Pixel-Text Mondrian Logo
 * --------------------------------------------------------------
 * Self-contained module: loads p5.js from CDN, samples a rendered
 * "KEI · AI" wordmark into a pixel grid, animates text cells with
 * the Mondrian palette (same rule as logo-mondrian.js).
 *
 * Usage:
 *   <div id="my-pixel-text"></div>
 *   <script src="./assets/logo-pixel-text.js"></script>
 *   <script>
 *     mountPixelTextLogo('my-pixel-text', { cellSize: 6 });
 *   </script>
 *
 * Options (all optional):
 *   {
 *     cols:          84,
 *     rows:          18,
 *     cellSize:      13,
 *     text:          { left: 'KEI', right: 'AI' },
 *     leftExtraGaps: [0, 1],
 *     rightExtraGaps:[1],
 *     fontFamily:    "'Orbitron', sans-serif",
 *     fontWeight:    900,
 *     textScaleRows: 0.72,
 *     dotCells:      3,
 *     gapCells:      2,
 *     threshold:     140,
 *     supersample:   8,
 *     colorCounts:   { '#00ab84':3, '#ff8a2a':3, '#009fde':3, '#808080':3 },
 *     cellBg:        '#070a14',
 *     textStroke:    '#000000',
 *     gridStroke:    'rgba(255,255,255,.08)',
 *     showEmptyGrid:  false,
 *     showCellBorders:true,
 *     shuffleMs:     1400,
 *     transitionSpeed:0.14,
 *     excludeCorners:[{ word:'right', index:0, corner:'TR' }],
 *     interactive:   true,
 *   }
 */

(function(){
'use strict';

let p5LoadedPT = null;

function loadP5(){
  if (window.p5) return Promise.resolve(window.p5);
  if (p5LoadedPT) return p5LoadedPT;
  p5LoadedPT = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.9.4/p5.min.js';
    script.onload = () => resolve(window.p5);
    script.onerror = () => reject(new Error('Failed to load p5.js'));
    document.head.appendChild(script);
  });
  return p5LoadedPT;
}

const DEFAULTS = {
  cols:           84,
  rows:           18,
  cellSize:       13,
  text:           { left: 'KEI', right: 'AI' },
  leftExtraGaps:  [0, 1],
  rightExtraGaps: [1],
  fontFamily:     "'Orbitron', sans-serif",
  fontWeight:     900,
  textScaleRows:  0.72,
  dotCells:       3,
  gapCells:       2,
  threshold:      140,
  supersample:    8,
  colorCounts:    { '#00ab84': 3, '#ff8a2a': 3, '#009fde': 3, '#808080': 3 },
  cellBg:         '#070a14',
  textStroke:     '#000000',
  gridStroke:     'rgba(255,255,255,.08)',
  showEmptyGrid:  false,
  showCellBorders: true,
  cellBorderWeight: 0.5,          // stroke thickness for text cell borders
  shuffleMs:      1400,
  transitionSpeed: 0.14,
  excludeCorners: [{ word: 'right', index: 0, corner: 'TR' }],
  interactive:    true,
  // When set, bypass font sampling and assemble textMask from bitmap glyphs.
  // Format:
  //   { letters: { K: ["#...#", ...], ... },
  //     sequence: ['K','E','I','·','A','I'],
  //     gaps: { 'K-E': 1, 'E-I': 1, ... },  // cell count between each pair
  //     dotSize: 2, topMargin: 1 }
  bitmap:         null,
};

function buildSketch(opts){
  const C = Object.assign({}, DEFAULTS, opts || {});
  // Merge nested defaults for text / colorCounts if user overrode
  if (opts && opts.text) C.text = Object.assign({}, DEFAULTS.text, opts.text);
  if (opts && opts.colorCounts) C.colorCounts = Object.assign({}, DEFAULTS.colorCounts, opts.colorCounts);

  function buildColorPool(n, p){
    const hexes = Object.keys(C.colorCounts);
    const total = hexes.reduce((sum, h) => sum + C.colorCounts[h], 0);
    const pool = [];
    for (const hex of hexes){
      const scaled = Math.round(C.colorCounts[hex] / total * n);
      for (let i = 0; i < scaled; i++) pool.push(hex);
    }
    const biggest = hexes.reduce((a, b) =>
      C.colorCounts[a] >= C.colorCounts[b] ? a : b);
    while (pool.length < n) pool.push(biggest);
    if (pool.length > n) pool.length = n;
    for (let i = pool.length - 1; i > 0; i--){
      const j = p.floor(p.random(i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return pool;
  }

  return (p) => {
    const W = C.cols * C.cellSize;
    const H = C.rows * C.cellSize;
    let cells = [];
    let textMask = [];
    let bbox = null;
    let lastShuffle = 0;

    p.setup = () => {
      p.createCanvas(W, H);
      buildMask();
      buildCells();
      const cropW = (bbox.maxC - bbox.minC + 1) * C.cellSize;
      const cropH = (bbox.maxR - bbox.minR + 1) * C.cellSize;
      const offX = bbox.minC * C.cellSize;
      const offY = bbox.minR * C.cellSize;
      for (const cell of cells){
        cell.x -= offX;
        cell.y -= offY;
      }
      p.resizeCanvas(cropW, cropH);
      // p5 hardcodes inline style.width/height after resize, which blocks
      // responsive CSS sizing. Clear them so the stylesheet wins.
      if (p.canvas){
        p.canvas.style.width = '';
        p.canvas.style.height = '';
      }
      assignTargets();
      for (const cell of cells) cell.curr = cell.target;
      lastShuffle = p.millis();
    };

    p.draw = () => {
      if (p.millis() - lastShuffle > C.shuffleMs){
        assignTargets();
        lastShuffle = p.millis();
      }
      drawAll();
    };

    // Assemble the textMask directly from hand-drawn bitmap glyphs.
    // Each glyph is an array of strings where '#' = text cell, anything else = empty.
    function buildMaskFromBitmap(){
      const bm = C.bitmap;
      const letters = bm.letters || {};
      const sequence = bm.sequence || ['K','E','I','·','A','I'];
      const gaps = bm.gaps || {};
      const dotSize = bm.dotSize || 2;
      const topMargin = (bm.topMargin != null) ? bm.topMargin : 1;

      textMask = Array.from({ length: C.rows }, () => Array(C.cols).fill(false));

      const glyphW = (g) => g === '·' ? dotSize : (letters[g] ? letters[g][0].length : 0);
      const gapFor = (a, b) => gaps[a + '-' + b] != null ? gaps[a + '-' + b] : 1;

      // Total width
      let totalW = 0;
      for (let i = 0; i < sequence.length; i++){
        totalW += glyphW(sequence[i]);
        if (i < sequence.length - 1) totalW += gapFor(sequence[i], sequence[i + 1]);
      }
      let x = Math.floor((C.cols - totalW) / 2);

      for (let i = 0; i < sequence.length; i++){
        const g = sequence[i];
        if (g === '·'){
          const dy = Math.floor((C.rows - dotSize) / 2);
          for (let r = 0; r < dotSize; r++){
            for (let c = 0; c < dotSize; c++){
              const R = dy + r, C2 = x + c;
              if (R >= 0 && R < C.rows && C2 >= 0 && C2 < C.cols) textMask[R][C2] = true;
            }
          }
          x += dotSize;
        } else if (letters[g]){
          const glyph = letters[g];
          for (let r = 0; r < glyph.length; r++){
            const line = glyph[r];
            for (let c = 0; c < line.length; c++){
              if (line[c] === '#'){
                const R = topMargin + r, C2 = x + c;
                if (R >= 0 && R < C.rows && C2 >= 0 && C2 < C.cols) textMask[R][C2] = true;
              }
            }
          }
          x += glyph[0].length;
        }
        if (i < sequence.length - 1) x += gapFor(sequence[i], sequence[i + 1]);
      }
    }

    function buildMask(){
      if (C.bitmap){
        buildMaskFromBitmap();
        return;
      }
      const s = C.supersample;
      const sw = C.cols * s;
      const sh = C.rows * s;
      const canvas = document.createElement('canvas');
      canvas.width = sw;
      canvas.height = sh;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, sw, sh);
      ctx.fillStyle = '#fff';
      const fontPx = sh * C.textScaleRows;
      ctx.font = `${C.fontWeight} ${fontPx}px ${C.fontFamily}`;
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'left';

      const layoutWord = (word, extras) => {
        let cursor = 0;
        const letters = [];
        let visLeft = Infinity, visRight = -Infinity;
        for (let i = 0; i < word.length; i++){
          const m = ctx.measureText(word[i]);
          const localLeft  = cursor - m.actualBoundingBoxLeft;
          const localRight = cursor + m.actualBoundingBoxRight;
          letters.push({ char: word[i], cursor, localLeft, localRight });
          visLeft  = Math.min(visLeft,  localLeft);
          visRight = Math.max(visRight, localRight);
          cursor += m.width;
          if (i < word.length - 1) cursor += (extras[i] || 0) * s;
        }
        return {
          width: visRight - visLeft,
          visLeft,
          letters,
          draw: (leftEdgeX, midY) => {
            const origin = leftEdgeX - visLeft;
            for (const l of letters){
              ctx.fillText(l.char, origin + l.cursor, midY);
              l.drawLeft  = origin + l.localLeft;
              l.drawRight = origin + l.localRight;
            }
          },
        };
      };

      const leftLayout  = layoutWord(C.text.left,  C.leftExtraGaps);
      const rightLayout = layoutWord(C.text.right, C.rightExtraGaps);
      const dotSize = C.dotCells * s;
      const gap     = C.gapCells * s;
      const total  = leftLayout.width + gap + dotSize + gap + rightLayout.width;
      const startX = (sw - total) / 2;
      const midY   = sh / 2;

      leftLayout.draw(startX, midY);
      const rawDotX = startX + leftLayout.width + gap;
      const dotX = Math.round(rawDotX / s) * s;
      const dotY = Math.round((midY - dotSize / 2) / s) * s;
      ctx.fillRect(dotX, dotY, dotSize, dotSize);
      rightLayout.draw(dotX + dotSize + gap, midY);

      const img = ctx.getImageData(0, 0, sw, sh).data;
      textMask = [];
      for (let r = 0; r < C.rows; r++){
        const row = [];
        for (let c = 0; c < C.cols; c++){
          let sum = 0;
          for (let dy = 0; dy < s; dy++){
            for (let dx = 0; dx < s; dx++){
              const idx = ((r * s + dy) * sw + (c * s + dx)) * 4;
              sum += img[idx];
            }
          }
          row.push(sum / (s * s) > C.threshold);
        }
        textMask.push(row);
      }

      // Apply post-sampling corner removals
      const layouts = { left: leftLayout, right: rightLayout };
      for (const spec of (C.excludeCorners || [])){
        const layout = layouts[spec.word];
        if (!layout) continue;
        const letter = layout.letters[spec.index];
        if (!letter || letter.drawLeft == null) continue;
        const colStart = Math.max(0, Math.floor(letter.drawLeft / s));
        const colEnd   = Math.min(C.cols - 1, Math.ceil(letter.drawRight / s) - 1);
        const goingDown  = spec.corner[0] === 'T';
        const goingRight = spec.corner[1] === 'R';
        let edgeRow = -1;
        if (goingDown){
          for (let r = 0; r < C.rows && edgeRow < 0; r++){
            for (let c = colStart; c <= colEnd; c++){
              if (textMask[r][c]){ edgeRow = r; break; }
            }
          }
        } else {
          for (let r = C.rows - 1; r >= 0 && edgeRow < 0; r--){
            for (let c = colStart; c <= colEnd; c++){
              if (textMask[r][c]){ edgeRow = r; break; }
            }
          }
        }
        if (edgeRow < 0) continue;
        let pickCol = -1;
        if (goingRight){
          for (let c = colEnd; c >= colStart; c--){
            if (textMask[edgeRow][c]){ pickCol = c; break; }
          }
        } else {
          for (let c = colStart; c <= colEnd; c++){
            if (textMask[edgeRow][c]){ pickCol = c; break; }
          }
        }
        if (pickCol >= 0) textMask[edgeRow][pickCol] = false;
      }
    }

    function buildCells(){
      let minR = C.rows, maxR = -1, minC = C.cols, maxC = -1;
      for (let r = 0; r < C.rows; r++){
        for (let c = 0; c < C.cols; c++){
          if (textMask[r][c]){
            if (r < minR) minR = r;
            if (r > maxR) maxR = r;
            if (c < minC) minC = c;
            if (c > maxC) maxC = c;
          }
        }
      }
      bbox = { minR, maxR, minC, maxC };
      cells = [];
      for (let r = 0; r < C.rows; r++){
        for (let c = 0; c < C.cols; c++){
          const inBbox = r >= bbox.minR && r <= bbox.maxR &&
                         c >= bbox.minC && c <= bbox.maxC;
          cells.push({
            x: c * C.cellSize,
            y: r * C.cellSize,
            isText: textMask[r][c],
            inBbox,
            curr: p.color(C.cellBg),
            target: p.color(C.cellBg),
          });
        }
      }
    }

    function assignTargets(){
      const textCells = cells.filter(c => c.isText);
      const pool = buildColorPool(textCells.length, p);
      textCells.forEach((c, i) => { c.target = p.color(pool[i]); });
      for (const c of cells) if (!c.isText) c.target = p.color(C.cellBg);
    }

    function drawAll(){
      // Use clear() for a transparent canvas; otherwise paint the solid cellBg.
      if (C.cellBg === 'transparent' || C.cellBg === null){
        p.clear();
      } else {
        p.background(C.cellBg);
      }
      if (C.showEmptyGrid){
        p.noFill();
        p.strokeWeight(0.5);
        p.stroke(C.gridStroke);
        for (const cell of cells){
          if (cell.isText || !cell.inBbox) continue;
          p.rect(cell.x, cell.y, C.cellSize, C.cellSize);
        }
      }
      if (C.showCellBorders){
        p.strokeWeight(C.cellBorderWeight);
        p.stroke(C.textStroke);
      } else {
        p.noStroke();
      }
      for (const cell of cells){
        if (!cell.isText) continue;
        cell.curr = p.lerpColor(cell.curr, cell.target, C.transitionSpeed);
        p.fill(cell.curr);
        p.rect(cell.x, cell.y, C.cellSize, C.cellSize);
      }
    }

    if (C.interactive){
      p.mousePressed = () => {
        if (p.mouseX >= 0 && p.mouseX <= p.width &&
            p.mouseY >= 0 && p.mouseY <= p.height){
          assignTargets();
          lastShuffle = p.millis();
        }
      };
    }
  };
}

async function mountPixelTextLogo(target, options = {}){
  const container = typeof target === 'string' ? document.getElementById(target) : target;
  if (!container){
    console.warn('[pixel-text-logo] container not found:', target);
    return null;
  }
  try {
    const P5 = await loadP5();
    const fontFamily = (options.fontFamily || DEFAULTS.fontFamily);
    const fontWeight = (options.fontWeight || DEFAULTS.fontWeight);
    // Wait for the font to actually be usable before sampling
    if (document.fonts){
      try { await document.fonts.load(`${fontWeight} 20px ${fontFamily}`); } catch (e) {}
    }
    container.innerHTML = '';
    const instance = new P5(buildSketch(options), container);
    return { remove: () => instance.remove() };
  } catch (e) {
    console.error('[pixel-text-logo] failed to mount:', e);
    return null;
  }
}

window.mountPixelTextLogo = mountPixelTextLogo;

})();
