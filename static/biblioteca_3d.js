import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const container = document.getElementById('scene-container');
const cubiculoLabel = document.getElementById('cubiculo-label');
const card = document.getElementById('book-card');
const titleEl = document.getElementById('book-title');
const authorEl = document.getElementById('book-author');
const closeButton = document.getElementById('close-book');

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x151311, 9, 16);

const camera = new THREE.PerspectiveCamera(42, innerWidth / innerHeight, 0.1, 100);
camera.position.set(0, 1.2, 8.2);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
container.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.target.set(0, 1.15, 0);
controls.minDistance = 5.2;
controls.maxDistance = 11;
controls.maxPolarAngle = Math.PI * 0.62;

scene.add(new THREE.HemisphereLight(0xfff0db, 0x17130f, 2.3));
const keyLight = new THREE.DirectionalLight(0xffe0b8, 4.2);
keyLight.position.set(4, 7, 6);
keyLight.castShadow = true;
scene.add(keyLight);

const warmLight = new THREE.PointLight(0xffa85c, 35, 9, 2);
warmLight.position.set(-3.2, 3.8, 3.3);
scene.add(warmLight);

const shelf = new THREE.Group();
scene.add(shelf);

const wood = new THREE.MeshStandardMaterial({ color: 0x4a2d1d, roughness: 0.78, metalness: 0.02 });
const darkWood = new THREE.MeshStandardMaterial({ color: 0x25170f, roughness: 0.9 });

function box(w, h, d, material, x, y, z) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  shelf.add(mesh);
  return mesh;
}

// Un único cubículo: suficiente para validar estética + interacción.
box(6.6, 0.22, 1.45, wood, 0, 0.04, 0);
box(6.6, 0.22, 1.45, wood, 0, 3.15, 0);
box(0.24, 3.25, 1.45, wood, -3.2, 1.6, 0);
box(0.24, 3.25, 1.45, wood, 3.2, 1.6, 0);
box(6.15, 2.95, 0.16, darkWood, 0, 1.58, -0.62);

const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(30, 30),
  new THREE.MeshStandardMaterial({ color: 0x18130f, roughness: 1 })
);
floor.rotation.x = -Math.PI / 2;
floor.position.y = -0.08;
floor.receiveShadow = true;
scene.add(floor);

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const books = [];
let selectedBook = null;

function seededColor(id) {
  const palette = [0x6f2d2a, 0x244b46, 0x30435d, 0x765a2f, 0x4c344f, 0x4f4b35, 0x7a4934, 0x2f535d];
  return palette[Math.abs(Number(id) || 0) % palette.length];
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight, maxLines = 6) {
  const words = String(text || '').split(/\s+/);
  let line = '';
  let lines = 0;
  for (let i = 0; i < words.length; i++) {
    const test = line + words[i] + ' ';
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line.trim(), x, y);
      line = words[i] + ' ';
      y += lineHeight;
      lines++;
      if (lines >= maxLines - 1) break;
    } else {
      line = test;
    }
  }
  if (lines < maxLines) ctx.fillText(line.trim(), x, y);
}

function makeCoverTexture(book, color) {
  const canvas = document.createElement('canvas');
  canvas.width = 768;
  canvas.height = 1100;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = `#${color.toString(16).padStart(6, '0')}`;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = 'rgba(255,255,255,.12)';
  ctx.fillRect(52, 52, canvas.width - 104, canvas.height - 104);

  ctx.fillStyle = '#f7efe4';
  ctx.font = '700 66px Georgia';
  ctx.textBaseline = 'top';
  wrapText(ctx, book.titulo, 86, 150, 600, 78, 7);

  ctx.font = '32px Arial';
  ctx.fillStyle = 'rgba(255,255,255,.80)';
  wrapText(ctx, book.autor || 'Autor no indicado', 86, 885, 590, 42, 3);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return texture;
}

function makeSpineTexture(book, color) {
  const canvas = document.createElement('canvas');
  canvas.width = 260;
  canvas.height = 1100;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = `#${color.toString(16).padStart(6, '0')}`;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = 'rgba(255,255,255,.09)';
  ctx.fillRect(12, 12, canvas.width - 24, canvas.height - 24);

  ctx.save();
  ctx.translate(130, 975);
  ctx.rotate(-Math.PI / 2);
  ctx.fillStyle = '#f6eee2';
  ctx.font = '700 48px Georgia';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  const text = `${book.titulo} — ${book.autor || ''}`;
  ctx.fillText(text.slice(0, 42), 0, 0, 860);
  ctx.restore();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createBook(book, index, count) {
  const color = seededColor(book.id_libro);
  const thickness = 0.18 + (index % 4) * 0.025;
  const height = 2.25 + ((index * 7) % 5) * 0.08;
  const coverWidth = 1.35;

  const coverTexture = makeCoverTexture(book, color);
  const spineTexture = makeSpineTexture(book, color);

  const paper = new THREE.MeshStandardMaterial({ color: 0xd8cab8, roughness: 0.95 });
  const cover = new THREE.MeshStandardMaterial({ map: coverTexture, roughness: 0.72 });
  const backCover = new THREE.MeshStandardMaterial({ color, roughness: 0.72 });
  const spineMat = new THREE.MeshStandardMaterial({ map: spineTexture, roughness: 0.76 });

  // BoxGeometry: +X, -X, +Y, -Y, +Z, -Z.
  // +X = portada. +Z = lomo visible en la estantería.
  const geometry = new THREE.BoxGeometry(thickness, height, coverWidth);
  const mesh = new THREE.Mesh(geometry, [cover, backCover, paper, paper, spineMat, spineMat]);

  const totalWidth = Math.min(5.45, count * 0.28);
  const spacing = totalWidth / Math.max(count, 1);
  const x = -totalWidth / 2 + spacing / 2 + index * spacing;
  mesh.position.set(x, 0.16 + height / 2, 0.06);
  mesh.rotation.z = ((index % 5) - 2) * 0.008;
  mesh.castShadow = true;
  mesh.receiveShadow = true;

  mesh.userData = {
    isBook: true,
    book,
    homePosition: mesh.position.clone(),
    homeRotation: mesh.rotation.clone(),
    targetPosition: mesh.position.clone(),
    targetRotationY: mesh.rotation.y,
    targetRotationZ: mesh.rotation.z,
    selected: false
  };

  scene.add(mesh);
  books.push(mesh);
}

function selectBook(mesh) {
  if (selectedBook && selectedBook !== mesh) returnBook(selectedBook);
  selectedBook = mesh;
  mesh.userData.selected = true;

  // Sale de la biblioteca y gira 90° para mostrar la portada.
  mesh.userData.targetPosition.set(0, 1.45, 2.35);
  mesh.userData.targetRotationY = -Math.PI / 2;
  mesh.userData.targetRotationZ = 0;

  titleEl.textContent = mesh.userData.book.titulo;
  authorEl.textContent = mesh.userData.book.autor || 'Autor no indicado';
  card.hidden = false;
  controls.enabled = false;
}

function returnBook(mesh) {
  if (!mesh) return;
  mesh.userData.selected = false;
  mesh.userData.targetPosition.copy(mesh.userData.homePosition);
  mesh.userData.targetRotationY = mesh.userData.homeRotation.y;
  mesh.userData.targetRotationZ = mesh.userData.homeRotation.z;
  if (selectedBook === mesh) selectedBook = null;
  card.hidden = true;
  controls.enabled = true;
}

closeButton.addEventListener('click', () => returnBook(selectedBook));

renderer.domElement.addEventListener('pointerdown', (event) => {
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);

  const hits = raycaster.intersectObjects(books, false);
  if (hits.length) {
    const hit = hits[0].object;
    if (selectedBook === hit) returnBook(hit);
    else selectBook(hit);
  }
});

async function loadBooks() {
  try {
    const response = await fetch('/api/biblioteca');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();

    // Tomamos automáticamente el primer cubículo con libros.
    const entry = Object.entries(data).find(([, cubiculo]) => cubiculo.libros?.length);
    if (!entry) throw new Error('No se encontraron libros en la base de datos.');

    const [clave, cubiculo] = entry;
    const sample = cubiculo.libros.slice(0, 18);
    cubiculoLabel.textContent = `Prototipo · Cubículo ${clave} · ${cubiculo.genero} · ${sample.length} libros`;
    sample.forEach((book, i) => createBook(book, i, sample.length));
  } catch (error) {
    console.error(error);
    cubiculoLabel.textContent = 'No se pudo cargar la biblioteca';
  }
}

function animate() {
  requestAnimationFrame(animate);
  controls.update();

  for (const mesh of books) {
    mesh.position.lerp(mesh.userData.targetPosition, 0.095);
    mesh.rotation.y += (mesh.userData.targetRotationY - mesh.rotation.y) * 0.095;
    mesh.rotation.z += (mesh.userData.targetRotationZ - mesh.rotation.z) * 0.095;
  }

  renderer.render(scene, camera);
}

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

loadBooks();
animate();
