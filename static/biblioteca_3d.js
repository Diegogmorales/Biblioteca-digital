import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const container = document.getElementById('scene-container');
const loading = document.getElementById('loading');
const card = document.getElementById('book-card');
const cardTitle = document.getElementById('card-title');
const cardAuthor = document.getElementById('card-author');

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x241b16);
scene.fog = new THREE.Fog(0x241b16, 12, 23);

const camera = new THREE.PerspectiveCamera(37, innerWidth / innerHeight, 0.1, 100);
camera.position.set(0, 0.55, 10.8);

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
container.appendChild(renderer.domElement);

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

// Shelf
const shelf = new THREE.Group();
scene.add(shelf);

const wood = new THREE.MeshStandardMaterial({
  color: 0x6d3f27,
  roughness: 0.62,
  metalness: 0.02
});
const woodDark = new THREE.MeshStandardMaterial({
  color: 0x3b241a,
  roughness: 0.78
});

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

const palette = [
  0x6f2f35, 0x284a44, 0x7d5632, 0x36465d, 0x78606a,
  0x706344, 0x9a5037, 0x315b56, 0x8e4136, 0x385344,
  0x59415f, 0x39516b, 0x7c6338, 0x634534
];

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

function hexCss(hex) {
  return '#' + hex.toString(16).padStart(6,'0');
}

const books = [];
let selected = null;

function createBook(data, index, x) {
  const title = normalizeText(data.titulo ?? data.title, 'Sin título');
  const author = normalizeText(data.autor ?? data.author, '');
  const color = palette[index % palette.length];

  // varied but believable dimensions
  const w = 0.37 + ((index * 17) % 9) * 0.025;
  const h = 3.15 + ((index * 11) % 8) * 0.11;
  const d = 1.56 + ((index * 7) % 5) * 0.06;

  const group = new THREE.Group();
  group.position.set(x, -2.27 + h/2, 0.02);
  group.rotation.z = ((index % 5) - 2) * 0.012;
  group.userData = {
    isBook: true,
    title, author,
    homePosition: group.position.clone(),
    homeRotation: group.rotation.clone(),
    targetPosition: group.position.clone(),
    targetRotation: group.rotation.clone(),
    selected: false
  };

  // Pages, visible around the cover.
  const pages = new THREE.Mesh(
    new RoundedBoxGeometry(w*.90, h*.94, d*.93, 4, .035),
    new THREE.MeshStandardMaterial({
      color: 0xe8ddc8,
      roughness: .88
    })
  );
  pages.castShadow = true;
  pages.receiveShadow = true;
  group.add(pages);

  const bg = hexCss(color);
  const coverTex = makeCoverTexture(title, author, bg);
  const spineTex = makeSpineTexture(title, author, bg);

  const coverMat = new THREE.MeshStandardMaterial({
    map: coverTex,
    color: 0xffffff,
    roughness: .55,
    metalness: .01
  });

  const spineMat = new THREE.MeshStandardMaterial({
    map: spineTex,
    color: 0xffffff,
    roughness: .52,
    metalness: .01
  });

  // hardcover front/back boards, slightly proud of the pages
  const coverGeo = new RoundedBoxGeometry(w*1.05, h*1.015, .055, 5, .025);

  const front = new THREE.Mesh(coverGeo, coverMat);
  front.position.z = d/2 + .015;
  front.castShadow = true;
  group.add(front);

  const back = new THREE.Mesh(coverGeo, new THREE.MeshStandardMaterial({
    color,
    roughness: .58
  }));
  back.position.z = -d/2 - .015;
  back.castShadow = true;
  group.add(back);

  // Spine with tiny curvature/bevel feel.
  const spine = new THREE.Mesh(
    new RoundedBoxGeometry(.085, h*1.01, d*1.03, 5, .03),
    spineMat
  );
  spine.position.x = -w/2 - .018;
  spine.rotation.y = Math.PI/2;
  spine.castShadow = true;
  group.add(spine);

  // small hinge ridges to add relief
  const ridgeMat = new THREE.MeshStandardMaterial({ color, roughness: .44 });
  for (const yy of [-h*.39, h*.39]) {
    const ridge = new THREE.Mesh(
      new THREE.TorusGeometry(d*.47, .018, 8, 32, Math.PI),
      ridgeMat
    );
    ridge.rotation.set(Math.PI/2, 0, Math.PI/2);
    ridge.position.set(-w/2-.035, yy, 0);
    group.add(ridge);
  }

  group.userData.width = w;
  shelf.add(group);
  books.push(group);
  return group;
}

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

  // Pull forward and rotate so the front cover faces the camera.
  book.userData.targetPosition = new THREE.Vector3(0, 0.25, 4.1);
  book.userData.targetRotation = new THREE.Euler(0, 0, 0);

  cardTitle.textContent = book.userData.title;
  cardAuthor.textContent = book.userData.author;
  card.classList.add('is-visible');
}

function returnBook(book) {
  book.userData.selected = false;
  book.userData.targetPosition = book.userData.homePosition.clone();
  book.userData.targetRotation = book.userData.homeRotation.clone();
}

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

function findBookParent(obj) {
  let p = obj;
  while (p && !p.userData?.isBook) p = p.parent;
  return p?.userData?.isBook ? p : null;
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
  raycaster.setFromCamera(pointer, camera);
  const hit = raycaster.intersectObjects(books, true)[0];
  renderer.domElement.style.cursor = hit ? 'pointer' : 'default';
});

async function initBooks() {
  try {
    const res = await fetch('/api/biblioteca');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    let dataBooks = extractBooks(data);

    if (!dataBooks.length) {
      throw new Error('La API respondió, pero no encontré una lista de libros.');
    }

    dataBooks = dataBooks.slice(0, 18);

    // Build the row centered based on actual widths.
    const widths = dataBooks.map((_,i) => 0.37 + ((i * 17) % 9) * 0.025);
    const gap = .045;
    const total = widths.reduce((a,b)=>a+b,0) + gap*(widths.length-1);
    let x = -total/2;

    dataBooks.forEach((b,i) => {
      x += widths[i]/2;
      createBook(b, i, x);
      x += widths[i]/2 + gap;
    });

    loading.style.display = 'none';
  } catch (err) {
    console.error(err);
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
  }

  renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

initBooks();
animate();
