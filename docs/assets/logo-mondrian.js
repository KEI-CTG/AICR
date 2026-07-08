/**
 * Mondrian / Pixel-Grid Logo — p5.js generative square-cell art
 * --------------------------------------------------------------
 * Self-contained module: loads p5.js from CDN, paints a uniform N×N grid of
 * square cells. Each cell lerps smoothly from its current color to a target
 * color, so regenerations fade rather than snap. Supports click-to-shuffle
 * and auto-shuffle on an interval.
 *
 * Usage:
 *   <div id="my-mondrian"></div>
 *   <script type="module">
 *     import { mountMondrianLogo } from './assets/logo-mondrian.js';
 *     mountMondrianLogo('my-mondrian');
 *   </script>
 *
 * Optional options:
 *   {
 *     size: 200,                      // canvas px (square)
 *     gridSteps: 8,                   // N → N×N uniform square cells
 *     colors: ['#D40920', '#1356A2', '#F7D842'],  // accent color palette
 *     requiredColors: [],             // colors that MUST appear ≥1 time per frame
 *     exactCounts: null,              // { '#hex': n, ... } — overrides random mode,
 *                                     //   assigns exactly N cells of each color
 *     bgColor: '#F2F5F1',             // empty cell color
 *     strokeColor: '#000000',         // cell border color
 *     strokeWeight: 2,                // cell border thickness
 *     numColored: null,               // null = random 3-6, or fixed number
 *                                     // (auto-bumped to ≥ requiredColors.length)
 *     autoShuffleMs: 0,               // 0 = manual only, N = re-shuffle every N ms
 *     transitionSpeed: 0.06,          // color lerp per frame (0..1); smaller = slower
 *     interactive: true,              // click to shuffle
 *   }
 */

let p5Loaded = null;

async function loadP5(){
  if (window.p5) return window.p5;
  if (p5Loaded) return p5Loaded;
  p5Loaded = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.9.4/p5.min.js';
    script.onload = () => resolve(window.p5);
    script.onerror = (e) => reject(new Error('Failed to load p5.js'));
    document.head.appendChild(script);
  });
  return p5Loaded;
}

function buildSketch(opts){
  return (p) => {
    const size             = opts.size || 200;
    const gridSteps        = opts.gridSteps || 8;          // N×N uniform cells
    const colors           = opts.colors || ['#D40920', '#1356A2', '#F7D842'];
    const requiredColors   = opts.requiredColors || [];
    const exactCounts      = opts.exactCounts || null;     // { '#hex': count, ... }
    const bgColor          = opts.bgColor || '#F2F5F1';
    const strokeColor      = opts.strokeColor || '#000000';
    const sw               = opts.strokeWeight || 2;
    const fixedNumColored  = opts.numColored;
    const interactive      = opts.interactive !== false;
    const autoShuffleMs    = opts.autoShuffleMs || 0;      // 0 = no auto-shuffle
    const transitionSpeed  = opts.transitionSpeed ?? 0.06; // lerp amount per frame

    // cells: [{ x, y, w, curr: p5.Color, target: p5.Color }]
    let cells = [];
    let lastShuffle = 0;

    p.setup = () => {
      p.createCanvas(size, size);
      buildGrid();
      assignTargets();
      // snap current → target on first frame (no fade-in from black)
      for (const c of cells) c.curr = c.target;
      lastShuffle = p.millis();
    };

    p.draw = () => {
      if (autoShuffleMs > 0 && p.millis() - lastShuffle > autoShuffleMs){
        assignTargets();
        lastShuffle = p.millis();
      }
      drawAll();
    };

    function buildGrid(){
      cells = [];
      const step = size / gridSteps;
      for (let row = 0; row < gridSteps; row++){
        for (let col = 0; col < gridSteps; col++){
          const bg = p.color(bgColor);
          cells.push({
            x: col * step,
            y: row * step,
            w: step,
            curr: bg,
            target: bg,
          });
        }
      }
    }

    function assignTargets(){
      // reset all targets to bg
      for (const c of cells) c.target = p.color(bgColor);

      // --- Mode A: exact counts per color (pool exactly fills cells) ---------
      if (exactCounts){
        const pool = [];
        for (const hex of Object.keys(exactCounts)){
          const n = exactCounts[hex] | 0;
          for (let i = 0; i < n; i++) pool.push(hex);
        }
        // pad with bg if pool < cells, truncate if pool > cells
        while (pool.length < cells.length) pool.push(bgColor);
        if (pool.length > cells.length) pool.length = cells.length;
        // shuffle
        for (let i = pool.length - 1; i > 0; i--){
          const j = p.floor(p.random(i + 1));
          [pool[i], pool[j]] = [pool[j], pool[i]];
        }
        for (let i = 0; i < cells.length; i++){
          cells[i].target = p.color(pool[i]);
        }
        return;
      }

      // --- Mode B: random fill with required-color guarantees ----------------
      let numColored = fixedNumColored != null
        ? fixedNumColored
        : p.floor(p.random(3, 6));
      numColored = Math.max(numColored, requiredColors.length);
      numColored = Math.min(numColored, cells.length);

      const pool = [...requiredColors];
      while (pool.length < numColored){
        pool.push(colors[p.floor(p.random(colors.length))]);
      }
      for (let i = pool.length - 1; i > 0; i--){
        const j = p.floor(p.random(i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
      }

      const idx = cells.map((_, i) => i);
      for (let i = 0; i < numColored; i++){
        const pick = p.floor(p.random(idx.length));
        const cellIdx = idx.splice(pick, 1)[0];
        cells[cellIdx].target = p.color(pool[i]);
      }
    }

    function drawAll(){
      p.background(bgColor);
      if (sw > 0){
        p.strokeWeight(sw);
        p.stroke(strokeColor);
      } else {
        p.noStroke();
      }
      for (const c of cells){
        c.curr = p.lerpColor(c.curr, c.target, transitionSpeed);
        p.fill(c.curr);
        p.rect(c.x, c.y, c.w, c.w);
      }
    }

    if (interactive){
      p.mousePressed = () => {
        if (p.mouseX >= 0 && p.mouseX <= size && p.mouseY >= 0 && p.mouseY <= size){
          assignTargets();
          lastShuffle = p.millis();
        }
      };
    }
  };
}

/**
 * Mount the Mondrian logo into a target element.
 * @param {string|HTMLElement} target - element id or element
 * @param {object} [options] - see file header for keys
 * @returns {Promise<{remove: () => void}>} controller with remove method
 */
async function mountMondrianLogo(target, options = {}){
  const container = typeof target === 'string' ? document.getElementById(target) : target;
  if (!container){
    console.warn('[logo2] container not found:', target);
    return null;
  }
  try {
    const P5 = await loadP5();
    container.innerHTML = '';
    const instance = new P5(buildSketch(options), container);
    return { remove: () => instance.remove() };
  } catch (e) {
    console.error('[logo2] failed to load p5.js:', e);
    return null;
  }
}

window.mountMondrianLogo = mountMondrianLogo;
