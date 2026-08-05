import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

const container = document.getElementById('scene-container');
const loading = document.getElementById('loading');
const card = document.getElementById('book-card');
const cardTitle = document.getElementById('card-title');
const cardAuthor = document.getElementById('card-author');

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x241b16);
scene.fog = new THREE.Fog(0x241b16, 12, 23);

const camera = new THREE.PerspectiveCamera(37, innerWidth / innerHeight, 0.1, 100);
const cameraHome = new THREE.Vector3(0, 0.55, 10.8);
camera.position.copy(cameraHome);
camera.lookAt(0, 0.15, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
container.appendChild(renderer.domElement);

// ---------------------------------------------------------------------------
// Post-processing: SELECTIVE bloom. A naive full-scene UnrealBloomPass
// blooms *anything* bright enough — which included the cream spine/cover
// text, turning crisp letters into soft halos. Instead we bloom only
// objects placed on the BLOOM layer (the little light-bulb accent below),
// while every book, its text, and the shelf render at full sharpness.
// Technique: render the bloom layer alone (everything else swapped to
// black) into its own composer, then additively combine that glow texture
// with the normal, fully-sharp render in a final composite pass.
// ---------------------------------------------------------------------------
const BLOOM_LAYER = 1;
const bloomLayer = new THREE.Layers();
bloomLayer.set(BLOOM_LAYER);

const darkMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
const materialCache = {};

function darkenNonBloomed(obj) {
  if (obj.isMesh && bloomLayer.test(obj.layers) === false) {
    materialCache[obj.uuid] = obj.material;
    obj.material = darkMaterial;
  }
}
function restoreMaterial(obj) {
  if (materialCache[obj.uuid]) {
    obj.material = materialCache[obj.uuid];
    delete materialCache[obj.uuid];
  }
}

const renderPass = new RenderPass(scene, camera);

const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(innerWidth, innerHeight),
  0.85,   // strength — fine here since only the light accent reaches this pass
  0.6,    // radius
  0.15    // threshold — low on purpose, this pass only ever sees the bloom layer
);

const bloomComposer = new EffectComposer(renderer);
bloomComposer.renderToScreen = false;
bloomComposer.addPass(renderPass);
bloomComposer.addPass(bloomPass);

const mixShader = {
  uniforms: {
    baseTexture: { value: null },
    bloomTexture: { value: bloomComposer.renderTarget2.texture }
  },
  vertexShader: /* glsl */`
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */`
    uniform sampler2D baseTexture;
    uniform sampler2D bloomTexture;
    varying vec2 vUv;
    void main() {
      vec4 base = texture2D(baseTexture, vUv);
      vec4 bloom = texture2D(bloomTexture, vUv);
      gl_FragColor = vec4(base.rgb + bloom.rgb, base.a);
    }
  `
};

const mixPass = new ShaderPass(new THREE.ShaderMaterial({
  uniforms: mixShader.uniforms,
  vertexShader: mixShader.vertexShader,
  fragmentShader: mixShader.fragmentShader
}), 'baseTexture');
mixPass.needsSwap = true;

const composer = new EffectComposer(renderer);
composer.addPass(renderPass);
composer.addPass(mixPass);
composer.addPass(new OutputPass());

// Lighting
scene.add(new THREE.HemisphereLight(0xf3dfc2, 0x271c17, 1.25));

const key = new THREE.DirectionalLight(0xffe4c2, 3.1);
key.position.set(-3.5, 6.5, 7);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
key.shadow.camera.left = -8;
key.shadow.camera.right = 8;
key.shadow.camera.top = 7;
key.shadow.camera.bottom = -7;
scene.add(key);

const warm = new THREE.PointLight(0xd88750, 22, 10, 2);
warm.position.set(3.8, 1.5, 4);
scene.add(warm);

// The only object that actually blooms: a small emissive "bulb" marking the
// warm light's position. Everything else in the scene — books, text, wood —
// is excluded from the bloom pass by layer, so it stays perfectly sharp.
const bulb = new THREE.Mesh(
  new THREE.SphereGeometry(0.09, 16, 16),
  new THREE.MeshBasicMaterial({ color: 0xffbf8a })
);
bulb.position.copy(warm.position);
bulb.layers.enable(BLOOM_LAYER);
scene.add(bulb);

// Cool rim light from behind/above — separates the books from the dark
// background and adds the contrast that turns "flat" into "dimensional".
const rim = new THREE.DirectionalLight(0x8fb4d8, 1.1);
rim.position.set(-2.2, 3.4, -6.5);
scene.add(rim);

// A second, dimmer rim on the opposite side for a touch of stereo depth.
const rim2 = new THREE.DirectionalLight(0x5f7fae, 0.35);
rim2.position.set(4.5, 1.2, -5);
scene.add(rim2);

// ---------------------------------------------------------------------------
// Wood: procedural grain texture instead of a flat color, so the shelf reads
// as real material rather than a painted box.
// ---------------------------------------------------------------------------
function makeWoodTexture({ base = '#6d3f27', dark = '#3b241a', grainAlpha = 0.16, ringiness = 0.35 } = {}) {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 512;
  const ctx = c.getContext('2d');

  ctx.fillStyle = base;
  ctx.fillRect(0, 0, c.width, c.height);

  // Long horizontal grain streaks with varied opacity/width.
  const streaks = 130;
  for (let i = 0; i < streaks; i++) {
    const y = Math.random() * c.height;
    const h = 0.6 + Math.random() * 2.2;
    const a = Math.random() * grainAlpha;
    ctx.fillStyle = Math.random() > 0.5 ? `rgba(0,0,0,${a})` : `rgba(255,220,180,${a * 0.7})`;
    ctx.fillRect(0, y, c.width, h);
  }

  // Occasional soft "ring" arcs for a bit of grown-wood irregularity.
  for (let i = 0; i < 5; i++) {
    ctx.strokeStyle = `rgba(0,0,0,${ringiness * 0.12})`;
    ctx.lineWidth = 1 + Math.random() * 2;
    ctx.beginPath();
    const cy = Math.random() * c.height;
    const amp = 30 + Math.random() * 60;
    ctx.moveTo(0, cy);
    for (let x = 0; x <= c.width; x += 32) {
      ctx.lineTo(x, cy + Math.sin(x * 0.01 + i) * amp * 0.15);
    }
    ctx.stroke();
  }

  // fine grain noise
  for (let i = 0; i < 6000; i++) {
    const a = Math.random() * 0.05;
    ctx.fillStyle = `rgba(20,10,5,${a})`;
    ctx.fillRect(Math.random() * c.width, Math.random() * c.height, 1, 2 + Math.random() * 3);
  }

  // gentle vignette toward dark edges
  const grad = ctx.createRadialGradient(c.width/2, c.height/2, c.width*0.2, c.width/2, c.height/2, c.width*0.75);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(1, dark + '55');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, c.width, c.height);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return tex;
}

const woodTexLight = makeWoodTexture({ base: '#6d3f27', dark: '#3b241a', grainAlpha: 0.18 });
woodTexLight.repeat.set(3, 1);
const woodTexDark = makeWoodTexture({ base: '#3b241a', dark: '#20130d', grainAlpha: 0.22 });
woodTexDark.repeat.set(2.4, 1.6);

const wood = new THREE.MeshStandardMaterial({
  map: woodTexLight,
  color: 0xffffff,
  roughness: 0.62,
  metalness: 0.02
});
const woodDark = new THREE.MeshStandardMaterial({
  map: woodTexDark,
  color: 0xffffff,
  roughness: 0.78
});

// Shelf
const shelf = new THREE.Group();
scene.add(shelf);

function box(w,h,d, mat, x,y,z, cast=true) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w,h,d), mat);
  m.position.set(x,y,z);
  m.castShadow = cast;
  m.receiveShadow = true;
  shelf.add(m);
  return m;
}

box(9.3, .32, 2.65, wood, 0, -2.55, 0);
box(9.3, .30, 2.65, wood, 0,  3.10, 0);
box(.34, 5.95, 2.65, wood, -4.48, .27, 0);
box(.34, 5.95, 2.65, wood,  4.48, .27, 0);
box(8.9, 5.5, .20, woodDark, 0, .28, -1.18, false);

// subtle inner floor lip
box(8.9, .10, 2.35, woodDark, 0, -2.33, .02);

// ---------------------------------------------------------------------------
// Color: instead of cycling a short fixed-length palette (which repeats
// visibly past ~14 books), derive a color from a hash of title+author so a
// large library (hundreds of books) still reads as varied — while staying
// inside the same warm/muted hue families as the original palette.
// ---------------------------------------------------------------------------
const hueFamilies = [
  [4, 18],     // brick / oxblood reds
  [18, 34],    // burnt sienna / rust
  [34, 46],    // ochre / mustard
  [160, 182],  // deep teal
  [200, 222],  // slate blue
  [265, 285],  // muted plum
  [95, 118],   // olive green
];

function hashString(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function colorForBook(title, author, index) {
  const seed = hashString(`${title}::${author}::${index}`);
  const family = hueFamilies[seed % hueFamilies.length];
  const hueT = ((seed >>> 8) % 1000) / 1000;
  const hue = family[0] + hueT * (family[1] - family[0]);
  const sat = 32 + ((seed >>> 16) % 22);       // 32–54%, muted rather than neon
  const light = 26 + ((seed >>> 20) % 14);     // 26–40%, deep enough for gold text to pop
  return new THREE.Color(`hsl(${hue.toFixed(1)}, ${sat}%, ${light}%)`);
}

function normalizeText(v, fallback='') {
  return (v ?? fallback).toString().trim();
}

// Adapts to common API shapes: array, object of shelves, {libros:[...]}, etc.
function extractBooks(data) {
  if (Array.isArray(data)) {
    if (data.length && typeof data[0] === 'object' && (
      'titulo' in data[0] || 'title' in data[0] || 'autor' in data[0] || 'author' in data[0]
    )) return data;
    for (const item of data) {
      const found = extractBooks(item);
      if (found.length) return found;
    }
    return [];
  }
  if (data && typeof data === 'object') {
    for (const key of ['libros','books']) {
      if (Array.isArray(data[key])) return data[key];
    }
    for (const value of Object.values(data)) {
      const found = extractBooks(value);
      if (found.length) return found;
    }
  }
  return [];
}

function wrapLines(ctx, text, maxWidth, maxLines) {
  const words = text.split(/\s+/);
  const lines = [];
  let line = '';
  for (const word of words) {
    const test = line ? line + ' ' + word : word;
    if (ctx.measureText(test).width <= maxWidth) {
      line = test;
    } else {
      if (line) lines.push(line);
      line = word;
      if (lines.length >= maxLines - 1) break;
    }
  }
  if (line && lines.length < maxLines) lines.push(line);
  return lines;
}

function makeSpineTexture(title, author, bgHex) {
  // High resolution texture to avoid blurry/stretched spine text.
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 2048;
  const ctx = c.getContext('2d');

  ctx.fillStyle = bgHex;
  ctx.fillRect(0,0,c.width,c.height);

  // paper/grain effect
  for (let i=0; i<10000; i++) {
    const a = Math.random() * .035;
    ctx.fillStyle = `rgba(255,255,255,${a})`;
    ctx.fillRect(Math.random()*c.width, Math.random()*c.height, 1, 1);
  }

  // faint top/bottom foil rules — small detail that reads as "real hardcover"
  ctx.strokeStyle = 'rgba(241,223,191,.4)';
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(30, 60); ctx.lineTo(c.width-30, 60); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(30, c.height-60); ctx.lineTo(c.width-30, c.height-60); ctx.stroke();

  ctx.save();
  ctx.translate(c.width/2, c.height/2);
  ctx.rotate(Math.PI/2);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const cleanTitle = title || 'Sin título';
  const fontSize = cleanTitle.length > 36 ? 54 : cleanTitle.length > 22 ? 66 : 78;
  ctx.font = `700 ${fontSize}px Georgia`;
  ctx.fillStyle = '#f1dfbf';
  ctx.shadowColor = 'rgba(0,0,0,.35)';
  ctx.shadowBlur = 4;
  ctx.fillText(cleanTitle.slice(0, 52), 0, -26, 1450);

  ctx.font = '500 38px Arial';
  ctx.fillStyle = 'rgba(244,230,205,.78)';
  ctx.shadowBlur = 0;
  ctx.fillText((author || '').slice(0, 48), 0, 62, 1450);
  ctx.restore();

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return tex;
}

function makeCoverTexture(title, author, bgHex) {
  const c = document.createElement('canvas');
  c.width = 1200;
  c.height = 1800;
  const ctx = c.getContext('2d');

  ctx.fillStyle = bgHex;
  ctx.fillRect(0,0,c.width,c.height);

  // linen-like micro texture
  ctx.globalAlpha = .07;
  ctx.strokeStyle = '#ffffff';
  for (let y=0; y<c.height; y+=9) {
    ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(c.width,y); ctx.stroke();
  }
  for (let x=0; x<c.width; x+=13) {
    ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,c.height); ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // soft top-left sheen — subtle, sells "cloth/leather under light"
  const sheen = ctx.createRadialGradient(c.width*0.2, c.height*0.15, 0, c.width*0.2, c.height*0.15, c.width*0.9);
  sheen.addColorStop(0, 'rgba(255,255,255,.10)');
  sheen.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = sheen;
  ctx.fillRect(0,0,c.width,c.height);

  ctx.strokeStyle = 'rgba(238,218,185,.85)';
  ctx.lineWidth = 4;
  ctx.strokeRect(72,72,c.width-144,c.height-144);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#f5e7ce';
  ctx.font = '700 88px Georgia';
  const lines = wrapLines(ctx, title || 'Sin título', 920, 6);
  let y = 470 - ((lines.length-1)*55);
  for (const line of lines) {
    ctx.fillText(line, c.width/2, y);
    y += 112;
  }

  ctx.font = '500 46px Arial';
  ctx.fillStyle = 'rgba(245,231,206,.78)';
  const authorLines = wrapLines(ctx, author || '', 860, 3);
  y = 1215;
  for (const line of authorLines) {
    ctx.fillText(line, c.width/2, y);
    y += 62;
  }

  ctx.fillStyle = 'rgba(245,231,206,.5)';
  ctx.fillRect(390, 1510, 420, 3);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return tex;
}

function hexCss(color) {
  return '#' + color.getHexString();
}

const books = [];
let selected = null;
let hovered = null;

function createBook(data, index, x) {
  const title = normalizeText(data.titulo ?? data.title, 'Sin título');
  const author = normalizeText(data.autor ?? data.author, '');
  const color = colorForBook(title, author, index);

  // Local axes:
  // X = thickness (what you see as spine width on the shelf)
  // Y = height
  // Z = depth of the book
  const w = 0.34 + ((index * 17) % 7) * 0.022;
  const h = 3.05 + ((index * 11) % 7) * 0.10;
  const d = 1.45 + ((index * 7) % 5) * 0.055;

  const group = new THREE.Group();
  group.position.set(x, -2.27 + h/2, 0.02);
  group.rotation.z = ((index % 5) - 2) * 0.009;
  group.userData = {
    isBook: true,
    title, author,
    homePosition: group.position.clone(),
    homeRotation: group.rotation.clone(),
    targetPosition: group.position.clone(),
    targetRotation: group.rotation.clone(),
    targetScale: 1,
    selected: false,
    hovered: false
  };

  const pagesMat = new THREE.MeshStandardMaterial({
    color: 0xe8ddc8,
    roughness: .92
  });

  const pages = new THREE.Mesh(
    new RoundedBoxGeometry(w*.88, h*.94, d*.90, 4, .025),
    pagesMat
  );
  pages.castShadow = true;
  pages.receiveShadow = true;
  group.add(pages);

  const bg = hexCss(color);
  const coverTex = makeCoverTexture(title, author, bg);
  const spineTex = makeSpineTexture(title, author, bg);

  const coverMat = new THREE.MeshStandardMaterial({
    map: coverTex,
    roughness: .58,
    metalness: 0
  });

  const plainCoverMat = new THREE.MeshStandardMaterial({
    color,
    roughness: .60,
    metalness: 0
  });

  const spineMat = new THREE.MeshStandardMaterial({
    map: spineTex,
    roughness: .56,
    metalness: 0
  });

  // REAL hardcover orientation:
  // front/back boards are on the X faces and extend across the full depth.
  const boardGeo = new RoundedBoxGeometry(.045, h*1.015, d*1.03, 4, .018);

  const front = new THREE.Mesh(boardGeo, coverMat);
  front.position.x = w/2 + .012;
  front.castShadow = true;
  group.add(front);

  const back = new THREE.Mesh(boardGeo, plainCoverMat);
  back.position.x = -w/2 - .012;
  back.castShadow = true;
  group.add(back);

  // Spine is the face visible while the book is on the shelf.
  const spine = new THREE.Mesh(
    new RoundedBoxGeometry(w*1.03, h*1.01, .055, 4, .018),
    spineMat
  );
  spine.position.z = d/2 + .012;
  spine.castShadow = true;
  group.add(spine);

  // Small top/bottom cover overhang for a little physical relief.
  const edgeMat = new THREE.MeshStandardMaterial({ color, roughness: .52 });
  for (const yy of [-h*.505, h*.505]) {
    const edge = new THREE.Mesh(
      new THREE.BoxGeometry(w*1.04, .035, d*1.02),
      edgeMat
    );
    edge.position.y = yy;
    edge.castShadow = true;
    group.add(edge);
  }

  group.userData.width = w;
  shelf.add(group);
  books.push(group);
  return group;
}

// ---------------------------------------------------------------------------
// Contact shadow: a soft radial-gradient disc that fades in under the
// selected book once it's pulled forward, so it doesn't look like it's
// floating in space.
// ---------------------------------------------------------------------------
function makeShadowTexture() {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 256;
  const ctx = c.getContext('2d');
  const grad = ctx.createRadialGradient(128,128,0,128,128,128);
  grad.addColorStop(0, 'rgba(0,0,0,.55)');
  grad.addColorStop(0.7, 'rgba(0,0,0,.22)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0,0,256,256);
  return new THREE.CanvasTexture(c);
}

const contactShadow = new THREE.Mesh(
  new THREE.PlaneGeometry(2.2, 1.3),
  new THREE.MeshBasicMaterial({
    map: makeShadowTexture(),
    transparent: true,
    opacity: 0,
    depthWrite: false
  })
);
contactShadow.rotation.x = -Math.PI / 2;
contactShadow.position.set(0, -2.32, 3.15);
scene.add(contactShadow);

function setSelected(book) {
  if (selected && selected !== book) returnBook(selected);

  if (!book) {
    if (selected) returnBook(selected);
    selected = null;
    card.classList.remove('is-visible');
    return;
  }

  selected = book;
  book.userData.selected = true;
  book.userData.targetScale = 1;

  // Pull the book forward and rotate 90° so the front cover faces camera.
  // This keeps the selected book at a natural readable size.
  book.userData.targetPosition = new THREE.Vector3(0, 0.15, 3.15);
  book.userData.targetRotation = new THREE.Euler(0, -Math.PI / 2, 0);

  cardTitle.textContent = book.userData.title;
  cardAuthor.textContent = book.userData.author;
  card.classList.add('is-visible');
}

function returnBook(book) {
  book.userData.selected = false;
  book.userData.targetPosition = book.userData.homePosition.clone();
  book.userData.targetRotation = book.userData.homeRotation.clone();
  book.userData.targetScale = 1;
}

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const pointerNDC = new THREE.Vector2();

function findBookParent(obj) {
  let p = obj;
  while (p && !p.userData?.isBook) p = p.parent;
  return p?.userData?.isBook ? p : null;
}

function setHovered(book) {
  if (hovered === book) return;
  if (hovered && !hovered.userData.selected) {
    hovered.userData.hovered = false;
    hovered.userData.targetPosition = hovered.userData.homePosition.clone();
    hovered.userData.targetScale = 1;
  }
  hovered = book;
  if (hovered && !hovered.userData.selected) {
    hovered.userData.hovered = true;
    const lifted = hovered.userData.homePosition.clone();
    lifted.y += 0.14;
    lifted.z += 0.12;
    hovered.userData.targetPosition = lifted;
    hovered.userData.targetScale = 1.035;
  }
}

renderer.domElement.addEventListener('pointerup', (e) => {
  pointer.x = (e.clientX / innerWidth) * 2 - 1;
  pointer.y = -(e.clientY / innerHeight) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);

  const hits = raycaster.intersectObjects(books, true);
  const book = hits.length ? findBookParent(hits[0].object) : null;

  if (book) {
    setSelected(book === selected ? null : book);
  } else {
    setSelected(null);
  }
});

renderer.domElement.addEventListener('pointermove', (e) => {
  pointer.x = (e.clientX / innerWidth) * 2 - 1;
  pointer.y = -(e.clientY / innerHeight) * 2 + 1;
  pointerNDC.copy(pointer);

  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(books, true);
  const book = hits.length ? findBookParent(hits[0].object) : null;

  setHovered(book);
  renderer.domElement.style.cursor = book ? 'pointer' : 'default';
});

renderer.domElement.addEventListener('pointerleave', () => setHovered(null));

async function initBooks() {
  // Guard against a silent infinite hang: if the API never responds, this
  // aborts the fetch and shows a real error instead of leaving "Cargando…"
  // on screen forever with no feedback.
  const FETCH_TIMEOUT_MS = 20000;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    loading.textContent = 'Cargando biblioteca…';

    const res = await fetch('/api/biblioteca', { signal: controller.signal });
    clearTimeout(timeoutId);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();
    let dataBooks = extractBooks(data);

    if (!dataBooks.length) {
      throw new Error('La API respondió, pero no encontré una lista de libros.');
    }

    // NOTE: capped at 12 for this prototype shelf. When this moves to the
    // full site with ~540 books, this slice (and the single-row layout
    // below) needs to become multiple shelves — flag for that follow-up.
    dataBooks = dataBooks.slice(0, 12);

    loading.textContent = `Armando ${dataBooks.length} libros…`;

    // Build the row centered based on actual widths.
    const widths = dataBooks.map((_,i) => 0.34 + ((i * 17) % 7) * 0.022);
    const gap = .08;
    const total = widths.reduce((a,b)=>a+b,0) + gap*(widths.length-1);
    let x = -total/2;

    dataBooks.forEach((b,i) => {
      x += widths[i]/2;
      createBook(b, i, x);
      x += widths[i]/2 + gap;
    });

    loading.style.display = 'none';
  } catch (err) {
    clearTimeout(timeoutId);
    console.error(err);
    if (err.name === 'AbortError') {
      loading.textContent = `La API no respondió en ${FETCH_TIMEOUT_MS / 1000}s. Reintentando…`;
      // Give the backend a moment, then try once more automatically.
      setTimeout(initBooks, 2000);
      return;
    }
    loading.textContent = 'No pude cargar los libros';
  }
}

const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), .033);
  const speed = 1 - Math.pow(.001, dt);

  for (const book of books) {
    book.position.lerp(book.userData.targetPosition, speed);
    book.rotation.x += (book.userData.targetRotation.x - book.rotation.x) * speed;
    book.rotation.y += (book.userData.targetRotation.y - book.rotation.y) * speed;
    book.rotation.z += (book.userData.targetRotation.z - book.rotation.z) * speed;
    const s = book.scale.x + (book.userData.targetScale - book.scale.x) * speed;
    book.scale.setScalar(s);
  }

  // Fade the contact shadow in under the selected book, out otherwise.
  const targetShadowOpacity = selected ? 0.85 : 0;
  contactShadow.material.opacity += (targetShadowOpacity - contactShadow.material.opacity) * speed;

  // Gentle camera parallax toward the pointer — keeps the scene feeling
  // dimensional instead of a static photo.
  const targetX = cameraHome.x + pointerNDC.x * 0.35;
  const targetY = cameraHome.y + pointerNDC.y * 0.18;
  camera.position.x += (targetX - camera.position.x) * speed * 0.6;
  camera.position.y += (targetY - camera.position.y) * speed * 0.6;
  camera.lookAt(0, 0.15, 0);

  // Pass 1: render only the bloom-layer objects (the bulb accent) — every
  // book, spine, and cover is temporarily swapped to black so it contributes
  // nothing to the glow texture and stays crisp in the final composite.
  scene.traverse(darkenNonBloomed);
  bloomComposer.render();
  scene.traverse(restoreMaterial);

  // Pass 2: normal full-quality render, additively combined with the glow.
  composer.render();
}

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  composer.setSize(innerWidth, innerHeight);
  bloomComposer.setSize(innerWidth, innerHeight);
  bloomPass.setSize(innerWidth, innerHeight);
});

initBooks();
animate();
