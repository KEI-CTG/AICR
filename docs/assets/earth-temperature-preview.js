import * as THREE from "./vendor/three.module.min.js";

const root = document.querySelector("[data-earth-temp-globe]");
const statusNode = document.querySelector("[data-status]");

const WMS = "https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi";
const LAYERS = {
  earth: "BlueMarble_ShadedRelief_Bathymetry",
  temperature: "MERRA2_2m_Air_Temperature_Assimilated_Monthly",
  coastlines: "Coastlines",
};
const DATES = {
  earth: null,
  temperature: "2026-01-01",
};

function wmsUrl({ layer, time, format = "image/png", transparent = true, width = 2048, height = 1024 }) {
  const params = new URLSearchParams({
    SERVICE: "WMS",
    VERSION: "1.3.0",
    REQUEST: "GetMap",
    CRS: "EPSG:4326",
    BBOX: "-90,-180,90,180",
    WIDTH: String(width),
    HEIGHT: String(height),
    LAYERS: layer,
    STYLES: "default",
    FORMAT: format,
    TRANSPARENT: transparent ? "true" : "false",
  });
  if (time) params.set("TIME", time);
  return `${WMS}?${params.toString()}`;
}

const SOURCES = {
  earth: wmsUrl({ layer: LAYERS.earth, format: "image/jpeg", transparent: false }),
  temperature: wmsUrl({ layer: LAYERS.temperature, time: DATES.temperature, format: "image/png", transparent: true }),
  coastlines: wmsUrl({ layer: LAYERS.coastlines, format: "image/png", transparent: true }),
};

const SOURCE_TEMP_STOPS = [
  [0, [31, 107, 173]],
  [0.25, [124, 204, 176]],
  [0.5, [255, 252, 182]],
  [0.75, [241, 137, 69]],
  [1, [183, 0, 54]],
];


function setStatus(message) {
  if (statusNode) statusNode.textContent = message;
}

function loadTexture(loader, url, colorSpace = THREE.SRGBColorSpace) {
  return new Promise((resolve, reject) => {
    loader.load(
      url,
      (texture) => {
        texture.colorSpace = colorSpace;
        texture.anisotropy = 8;
        texture.magFilter = THREE.LinearFilter;
        texture.minFilter = THREE.LinearMipmapLinearFilter;
        texture.generateMipmaps = true;
        resolve(texture);
      },
      undefined,
      reject
    );
  });
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = url;
  });
}

function interpolateStops(stops, t) {
  for (let i = 1; i < stops.length; i += 1) {
    const [rightT, rightColor] = stops[i];
    const [leftT, leftColor] = stops[i - 1];
    if (t <= rightT) {
      const local = (t - leftT) / Math.max(0.0001, rightT - leftT);
      return [
        Math.round(leftColor[0] + (rightColor[0] - leftColor[0]) * local),
        Math.round(leftColor[1] + (rightColor[1] - leftColor[1]) * local),
        Math.round(leftColor[2] + (rightColor[2] - leftColor[2]) * local),
      ];
    }
  }
  return stops[stops.length - 1][1];
}

function buildPalette(stops) {
  return Array.from({ length: 256 }, (_, index) => interpolateStops(stops, index / 255));
}

function buildNearestPaletteLookup(palette) {
  const lookup = new Uint8Array(32 * 32 * 32);
  for (let r = 0; r < 32; r += 1) {
    for (let g = 0; g < 32; g += 1) {
      for (let b = 0; b < 32; b += 1) {
        const rr = r * 8 + 4;
        const gg = g * 8 + 4;
        const bb = b * 8 + 4;
        let best = 0;
        let bestDistance = Infinity;
        for (let i = 0; i < palette.length; i += 1) {
          const color = palette[i];
          const dr = rr - color[0];
          const dg = gg - color[1];
          const db = bb - color[2];
          const distance = dr * dr + dg * dg + db * db;
          if (distance < bestDistance) {
            bestDistance = distance;
            best = i;
          }
        }
        lookup[(r << 10) | (g << 5) | b] = best;
      }
    }
  }
  return lookup;
}

function smoothScalarField(source, mask, width, height, passes = 1) {
  let current = source;
  let temp = new Float32Array(source.length);
  const kernel = [1, 4, 6, 4, 1];
  const kernelCenter = 2;
  const kernelWeight = 16;

  for (let pass = 0; pass < passes; pass += 1) {
    for (let y = 0; y < height; y += 1) {
      const row = y * width;
      for (let x = 0; x < width; x += 1) {
        const index = row + x;
        if (!mask[index]) {
          temp[index] = current[index];
          continue;
        }
        let sum = 0;
        let weightSum = 0;
        for (let k = 0; k < kernel.length; k += 1) {
          const wrappedX = (x + k - kernelCenter + width) % width;
          const sampleIndex = row + wrappedX;
          if (!mask[sampleIndex]) continue;
          const weight = kernel[k];
          sum += current[sampleIndex] * weight;
          weightSum += weight;
        }
        temp[index] = weightSum ? sum / weightSum : current[index];
      }
    }

    const next = new Float32Array(source.length);
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const index = y * width + x;
        if (!mask[index]) {
          next[index] = temp[index];
          continue;
        }
        let sum = 0;
        let weightSum = 0;
        for (let k = 0; k < kernel.length; k += 1) {
          const clampedY = Math.max(0, Math.min(height - 1, y + k - kernelCenter));
          const sampleIndex = clampedY * width + x;
          if (!mask[sampleIndex]) continue;
          const weight = kernel[k];
          sum += temp[sampleIndex] * weight;
          weightSum += weight;
        }
        next[index] = weightSum ? sum / weightSum : temp[index];
      }
    }
    current = next;
  }

  return current;
}

function initScene({ earthTexture, tempTexture, coastlineTexture }) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
  camera.position.set(0, 0, 6.35);

  const renderer = new THREE.WebGLRenderer({
    alpha: true,
    antialias: true,
    powerPreference: "high-performance",
    preserveDrawingBuffer: true,
  });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  root.appendChild(renderer.domElement);

  const group = new THREE.Group();
  group.rotation.z = -0.18;
  group.rotation.x = 0.34;
  scene.add(group);

  const earth = new THREE.Mesh(
    new THREE.SphereGeometry(1.58, 160, 96),
    new THREE.MeshStandardMaterial({
      map: earthTexture,
      roughness: 0.88,
      metalness: 0,
      emissive: new THREE.Color(0x071424),
      emissiveIntensity: 0.08,
    })
  );
  earth.rotation.y = 0.08;
  group.add(earth);

  const temp = new THREE.Mesh(
    new THREE.SphereGeometry(1.592, 160, 96),
    new THREE.MeshBasicMaterial({
      map: tempTexture,
      transparent: true,
      opacity: 0.88,
      depthWrite: false,
    })
  );
  temp.rotation.y = earth.rotation.y;
  group.add(temp);

  const coast = new THREE.Mesh(
    new THREE.SphereGeometry(1.599, 160, 96),
    new THREE.MeshBasicMaterial({
      map: coastlineTexture,
      transparent: true,
      opacity: 0.48,
      depthWrite: false,
    })
  );
  coast.rotation.y = earth.rotation.y;
  group.add(coast);

  const atmosphere = new THREE.Mesh(
    new THREE.SphereGeometry(1.67, 128, 64),
    new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: THREE.BackSide,
      uniforms: { glowColor: { value: new THREE.Color(0x9eefff) } },
      vertexShader: `
        varying vec3 vNormal;
        void main(){
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 glowColor;
        varying vec3 vNormal;
        void main(){
          float rim = pow(0.73 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.25);
          gl_FragColor = vec4(glowColor, clamp(rim, 0.0, 0.38));
        }
      `,
    })
  );
  group.add(atmosphere);

  scene.add(new THREE.HemisphereLight(0xf2fbff, 0x09101f, 1.35));
  const key = new THREE.DirectionalLight(0xffffff, 2.4);
  key.position.set(-3.4, 2.6, 4.3);
  scene.add(key);
  const warm = new THREE.DirectionalLight(0xffb15f, 0.72);
  warm.position.set(3.4, -2.1, 2.6);
  scene.add(warm);

  let size = 0;
  let dragging = false;
  let lastX = 0;
  let frames = 0;
  let centerPixel = [0, 0, 0, 0];
  let edgePixel = [0, 0, 0, 0];

  function resize() {
    const rect = root.getBoundingClientRect();
    const next = Math.max(1, Math.round(Math.min(rect.width, rect.height || rect.width)));
    if (next === size) return;
    size = next;
    renderer.setSize(size, size, false);
    camera.aspect = 1;
    camera.updateProjectionMatrix();
  }

  function samplePixels() {
    try {
      const gl = renderer.getContext();
      const center = new Uint8Array(4);
      const edge = new Uint8Array(4);
      gl.readPixels(Math.floor(size / 2), Math.floor(size / 2), 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, center);
      gl.readPixels(Math.floor(size * 0.16), Math.floor(size / 2), 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, edge);
      centerPixel = Array.from(center);
      edgePixel = Array.from(edge);
    } catch (error) {
      centerPixel = [-1, -1, -1, -1];
      edgePixel = [-1, -1, -1, -1];
    }
  }

  function render(now = 0) {
    resize();
    if (!dragging) {
      const delta = 0.0005;
      earth.rotation.y += delta;
      temp.rotation.y += delta;
      coast.rotation.y += delta;
    }
    atmosphere.rotation.y = earth.rotation.y;
    group.rotation.x = 0.34 + Math.sin(now * 0.00022) * 0.014;
    renderer.render(scene, camera);
    frames += 1;
    if (frames % 24 === 0) samplePixels();
    window.__earthTemperaturePreviewState = {
      frames,
      rotationY: earth.rotation.y,
      size,
      centerPixel,
      edgePixel,
      colorMode: "raw NASA GIBS WMS scale",
      layers: LAYERS,
      dates: DATES,
      urls: SOURCES,
    };
    root.dataset.frames = String(frames);
    root.dataset.rotationY = earth.rotation.y.toFixed(6);
    root.dataset.centerPixel = centerPixel.join(",");
    root.dataset.edgePixel = edgePixel.join(",");
    root.dataset.size = String(size);
    root.dataset.colorMode = "raw-scale";
    window.requestAnimationFrame(render);
  }

  root.addEventListener("pointerdown", (event) => {
    dragging = true;
    lastX = event.clientX;
    root.setPointerCapture(event.pointerId);
  });
  root.addEventListener("pointermove", (event) => {
    if (!dragging) return;
    const dx = event.clientX - lastX;
    lastX = event.clientX;
    const amount = dx * 0.008;
    earth.rotation.y += amount;
    temp.rotation.y += amount;
    coast.rotation.y += amount;
  });
  root.addEventListener("pointerup", (event) => {
    dragging = false;
    root.releasePointerCapture(event.pointerId);
  });
  root.addEventListener("pointercancel", () => {
    dragging = false;
  });

  new ResizeObserver(resize).observe(root);
  setStatus("NASA GIBS layers loaded");
  render(0);
}

async function boot() {
  if (!root) return;
  setStatus("Loading NASA GIBS layers...");
  const loader = new THREE.TextureLoader();
  loader.setCrossOrigin("anonymous");
  try {
    const [earthTexture, tempTexture, coastlineTexture] = await Promise.all([
      loadTexture(loader, SOURCES.earth),
      loadTexture(loader, SOURCES.temperature),
      loadTexture(loader, SOURCES.coastlines),
    ]);
    root.dataset.remapMode = "none";
    initScene({ earthTexture, tempTexture, coastlineTexture });
  } catch (error) {
    console.warn("Could not load NASA GIBS layers:", error);
    setStatus("Could not load NASA GIBS layers");
  }
}

boot();
