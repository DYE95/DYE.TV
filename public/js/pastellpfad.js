import * as THREE from "three";

const COLS = 11;
const ROWS = 11;
const CELL = 4;
const WALL_T = 0.46;
const PLAYER_R = 0.34;
const EYE = 1.58;
const PICKUP_R = 0.95;
const EXIT_R = 0.92;
const WALK_SPEED = 4.65;
const SPRINT_SPEED = 7.25;
const STEP = 1 / 60;
const PITCH_LIMIT = Math.PI / 2 - 0.08;
const BEST_KEY = "pastellpfad.best.v1";

const COLORS = {
  ink: "#1c2b33",
  cream: "#f6edd8",
  creamDeep: "#ead9b4",
  grout: "#e3d0a4",
  coral: "#e36a4c",
  mint: "#14967c",
  mintDeep: "#0c6e5c",
  sky: "#8ecae6",
  cloud: "#f7f4ec",
  deep: "#14303a",
};

const DIRS = [
  { d: "n", dx: 0, dz: -1, opp: "s" },
  { d: "e", dx: 1, dz: 0, opp: "w" },
  { d: "s", dx: 0, dz: 1, opp: "n" },
  { d: "w", dx: -1, dz: 0, opp: "e" },
];

const EPS = 0.004;
const input = {
  keys: new Set(),
  stickX: 0,
  stickY: 0,
  lookX: 0,
  lookY: 0,
};
const gemGone = new Set();

function mulberry32(seed) {
  let a = seed >>> 0;
  return function rand() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function cellCenter(x, z) {
  return { x: (x + 0.5) * CELL, z: (z + 0.5) * CELL };
}

function neighbors(cells, x, z) {
  const open = [];
  const c = cells[z][x];
  if (!c.n) open.push({ x, z: z - 1 });
  if (!c.s) open.push({ x, z: z + 1 });
  if (!c.w) open.push({ x: x - 1, z });
  if (!c.e) open.push({ x: x + 1, z });
  return open;
}

function farthest(cells, sx, sz) {
  const dist = Array.from({ length: ROWS }, () => Array(COLS).fill(-1));
  const q = [{ x: sx, z: sz }];
  dist[sz][sx] = 0;
  let best = { x: sx, z: sz, d: 0 };
  for (let i = 0; i < q.length; i++) {
    const cur = q[i];
    for (const n of neighbors(cells, cur.x, cur.z)) {
      if (n.x < 0 || n.z < 0 || n.x >= COLS || n.z >= ROWS) continue;
      if (dist[n.z][n.x] !== -1) continue;
      dist[n.z][n.x] = dist[cur.z][cur.x] + 1;
      q.push(n);
      if (dist[n.z][n.x] > best.d) best = { x: n.x, z: n.z, d: dist[n.z][n.x] };
    }
  }
  return { dist, best };
}

function braid(cells, rand, count) {
  const options = [];
  for (let z = 0; z < ROWS; z++) {
    for (let x = 0; x < COLS; x++) {
      if (x < COLS - 1 && cells[z][x].e) options.push({ x, z, d: "e" });
      if (z < ROWS - 1 && cells[z][x].s) options.push({ x, z, d: "s" });
    }
  }
  for (let i = options.length - 1; i > 0; i--) {
    const j = (rand() * (i + 1)) | 0;
    const tmp = options[i];
    options[i] = options[j];
    options[j] = tmp;
  }
  let n = 0;
  for (const o of options) {
    if (n >= count) break;
    if (o.d === "e") {
      cells[o.z][o.x].e = false;
      cells[o.z][o.x + 1].w = false;
    } else {
      cells[o.z][o.x].s = false;
      cells[o.z + 1][o.x].n = false;
    }
    n++;
  }
}

function spawnYaw(cell) {
  if (!cell.e) return -Math.PI / 2;
  if (!cell.s) return Math.PI;
  if (!cell.n) return 0;
  return Math.PI / 2;
}

function buildWalls(cells, rand) {
  const walls = [];
  const h = WALL_T / 2;
  const push = (minX, maxX, minZ, maxZ) => {
    walls.push({ minX, maxX, minZ, maxZ, h: 2.75 + rand() * 0.62 });
  };
  for (let z = 0; z < ROWS; z++) {
    for (let x = 0; x < COLS; x++) {
      const c = cells[z][x];
      if (c.n) {
        const cz = z * CELL;
        push(x * CELL - h, (x + 1) * CELL + h, cz - h, cz + h);
      }
      if (c.w) {
        const cx = x * CELL;
        push(cx - h, cx + h, z * CELL - h, (z + 1) * CELL + h);
      }
    }
  }
  for (let x = 0; x < COLS; x++) {
    if (cells[ROWS - 1][x].s) {
      const cz = ROWS * CELL;
      push(x * CELL - h, (x + 1) * CELL + h, cz - h, cz + h);
    }
  }
  for (let z = 0; z < ROWS; z++) {
    if (cells[z][COLS - 1].e) {
      const cx = COLS * CELL;
      push(cx - h, cx + h, z * CELL - h, (z + 1) * CELL + h);
    }
  }
  return walls;
}

function generateMaze(seed) {
  const rand = mulberry32(seed);
  const cells = Array.from({ length: ROWS }, () =>
    Array.from({ length: COLS }, () => ({ n: true, e: true, s: true, w: true })),
  );
  const seen = Array.from({ length: ROWS }, () => Array(COLS).fill(false));
  const stack = [{ x: 0, z: 0 }];
  seen[0][0] = true;
  while (stack.length) {
    const cur = stack[stack.length - 1];
    const options = DIRS.filter(({ dx, dz }) => {
      const nx = cur.x + dx;
      const nz = cur.z + dz;
      return nx >= 0 && nz >= 0 && nx < COLS && nz < ROWS && !seen[nz][nx];
    });
    if (!options.length) {
      stack.pop();
      continue;
    }
    const pick = options[(rand() * options.length) | 0];
    const nx = cur.x + pick.dx;
    const nz = cur.z + pick.dz;
    cells[cur.z][cur.x][pick.d] = false;
    cells[nz][nx][pick.opp] = false;
    seen[nz][nx] = true;
    stack.push({ x: nx, z: nz });
  }
  braid(cells, rand, 7);
  const { dist, best } = farthest(cells, 0, 0);
  const gems = [];
  const candidates = [];
  for (let z = 0; z < ROWS; z++) {
    for (let x = 0; x < COLS; x++) {
      if ((x === 0 && z === 0) || (x === best.x && z === best.z)) continue;
      if (dist[z][x] < 3) continue;
      candidates.push({ x, z });
    }
  }
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = (rand() * (i + 1)) | 0;
    const tmp = candidates[i];
    candidates[i] = candidates[j];
    candidates[j] = tmp;
  }
  for (const c of candidates) {
    if (gems.some((g) => Math.abs(g.x - c.x) + Math.abs(g.z - c.z) < 3)) continue;
    gems.push({ id: gems.length, x: c.x, z: c.z, world: cellCenter(c.x, c.z) });
    if (gems.length >= 8) break;
  }
  return {
    seed,
    cells,
    walls: buildWalls(cells, rand),
    start: { x: 0, z: 0 },
    exit: { x: best.x, z: best.z },
    startWorld: cellCenter(0, 0),
    exitWorld: cellCenter(best.x, best.z),
    spawnYaw: spawnYaw(cells[0][0]),
    gems,
  };
}

function overlaps(x, z, r, w) {
  const cx = Math.max(w.minX, Math.min(x, w.maxX));
  const cz = Math.max(w.minZ, Math.min(z, w.maxZ));
  const dx = x - cx;
  const dz = z - cz;
  return dx * dx + dz * dz < r * r;
}

function pushOut(x, z, r, w, axis, delta) {
  if (axis === "x") {
    if (delta > 0) return { x: Math.min(x, w.minX - r - EPS), z };
    if (delta < 0) return { x: Math.max(x, w.maxX + r + EPS), z };
    const toMin = x - (w.minX - r - EPS);
    const toMax = w.maxX + r + EPS - x;
    return { x: toMin < toMax ? w.minX - r - EPS : w.maxX + r + EPS, z };
  }
  if (delta > 0) return { x, z: Math.min(z, w.minZ - r - EPS) };
  if (delta < 0) return { x, z: Math.max(z, w.maxZ + r + EPS) };
  const toMin = z - (w.minZ - r - EPS);
  const toMax = w.maxZ + r + EPS - z;
  return { x, z: toMin < toMax ? w.minZ - r - EPS : w.maxZ + r + EPS };
}

function resolveAxis(x, z, r, walls, axis, delta) {
  let cx = x;
  let cz = z;
  if (axis === "x") cx += delta;
  else cz += delta;
  let blocked = false;
  for (let pass = 0; pass < 4; pass++) {
    let hit = false;
    for (const w of walls) {
      if (!overlaps(cx, cz, r, w)) continue;
      hit = true;
      blocked = true;
      const next = pushOut(cx, cz, r, w, axis, delta);
      cx = next.x;
      cz = next.z;
    }
    if (!hit) break;
  }
  return { x: cx, z: cz, blocked };
}

function moveWithCollision(x, z, dx, dz, r, walls) {
  const dist = Math.hypot(dx, dz);
  const steps = Math.max(1, Math.ceil(dist / (r * 0.45)));
  const sx = dx / steps;
  const sz = dz / steps;
  let cx = x;
  let cz = z;
  let hit = false;
  let moved = 0;
  for (let i = 0; i < steps; i++) {
    const beforeX = cx;
    const beforeZ = cz;
    const ax = resolveAxis(cx, cz, r, walls, "x", sx);
    const az = resolveAxis(ax.x, ax.z, r, walls, "z", sz);
    cx = az.x;
    cz = az.z;
    if (ax.blocked || az.blocked) hit = true;
    moved += Math.hypot(cx - beforeX, cz - beforeZ);
  }
  return { x: cx, z: cz, hit, moved, wanted: dist };
}

function wishVector(yaw, forward, strafe) {
  const mag = Math.hypot(forward, strafe);
  if (mag < 1e-5) return { x: 0, z: 0, analog: 0 };
  const f = forward / mag;
  const s = strafe / mag;
  const fx = -Math.sin(yaw);
  const fz = -Math.cos(yaw);
  const rx = Math.cos(yaw);
  const rz = -Math.sin(yaw);
  return { x: fx * f + rx * s, z: fz * f + rz * s, analog: Math.min(1, mag) };
}

function rightOf(yaw) {
  return { x: Math.cos(yaw), z: -Math.sin(yaw) };
}

function formatTime(seconds) {
  const safe = Math.max(0, seconds);
  const m = Math.floor(safe / 60);
  const s = Math.floor(safe % 60);
  const cs = Math.floor((safe * 100) % 100);
  return m + ":" + String(s).padStart(2, "0") + "." + String(cs).padStart(2, "0");
}

let audioCtx = null;
let master = null;
let sfx = null;
let muted = false;

function unlockAudio() {
  const Ctor = window.AudioContext || window.webkitAudioContext;
  if (!Ctor) return;
  if (!audioCtx) {
    audioCtx = new Ctor({ latencyHint: "interactive" });
    master = audioCtx.createGain();
    sfx = audioCtx.createGain();
    sfx.gain.value = 0.42;
    master.gain.value = muted ? 0 : 1;
    sfx.connect(master);
    master.connect(audioCtx.destination);
  }
  if (audioCtx.state === "suspended") void audioCtx.resume();
}

function toggleMuted() {
  muted = !muted;
  if (master && audioCtx) master.gain.setTargetAtTime(muted ? 0 : 1, audioCtx.currentTime, 0.02);
  return muted;
}

function tone(freq, dur, type, gain, slideTo, delay) {
  if (!audioCtx || !sfx || muted) return;
  const t = audioCtx.currentTime + (delay || 0);
  const osc = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(40, slideTo), t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g);
  g.connect(sfx);
  osc.start(t);
  osc.stop(t + dur + 0.03);
}

function playPickup() {
  const wobble = 0.94 + Math.random() * 0.12;
  tone(540 * wobble, 0.09, "triangle", 0.16);
  tone(820 * wobble, 0.16, "sine", 0.1, 980 * wobble);
}
function playWin() {
  tone(392, 0.16, "triangle", 0.14, undefined, 0);
  tone(523, 0.16, "triangle", 0.14, undefined, 0.1);
  tone(659, 0.22, "triangle", 0.15, undefined, 0.2);
  tone(784, 0.42, "sine", 0.12, undefined, 0.32);
}
function playThud() { tone(150, 0.07, "sine", 0.07, 70); }
function playStep() { tone(170 + Math.random() * 50, 0.04, "triangle", 0.03, 80); }

function readBest() {
  try {
    const n = Number(localStorage.getItem(BEST_KEY));
    return Number.isFinite(n) && n > 0 ? n : null;
  } catch {
    return null;
  }
}

function revealStart(maze) {
  const explored = maze.cells.map((row) => row.map(() => false));
  for (let dz = -1; dz <= 1; dz++) {
    for (let dx = -1; dx <= 1; dx++) {
      const x = maze.start.x + dx;
      const z = maze.start.z + dz;
      if (explored[z] && explored[z][x] != null) explored[z][x] = true;
    }
  }
  return explored;
}

const state = {
  phase: "menu",
  maze: null,
  elapsed: 0,
  gems: 0,
  best: readBest(),
  freshBest: false,
  px: 0,
  pz: 0,
  yaw: 0,
  explored: [],
  taken: [],
};
const listeners = new Set();
function emit() { listeners.forEach((fn) => fn()); }
function patch(next) { Object.assign(state, next); emit(); }

function boot(maze) {
  gemGone.clear();
  input.keys.clear();
  input.stickX = 0;
  input.stickY = 0;
  input.lookX = 0;
  input.lookY = 0;
  patch({
    maze,
    phase: "menu",
    elapsed: 0,
    gems: 0,
    best: readBest(),
    freshBest: false,
    px: maze.startWorld.x,
    pz: maze.startWorld.z,
    yaw: maze.spawnYaw,
    explored: revealStart(maze),
    taken: maze.gems.map(() => false),
  });
}

function icon(name) {
  const paths = {
    timer: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2M9 2h6"/>',
    gem: '<path d="M6 3h12l4 6-10 12L2 9z"/>',
    pause: '<path d="M8 5h3v14H8zM13 5h3v14h-3z"/>',
    play: '<path d="M8 5v14l11-7z"/>',
    vol: '<path d="M4 10v4h4l5 4V6L8 10zM16 9a4 4 0 010 6"/>',
    mute: '<path d="M4 10v4h4l5 4V6L8 10zM17 10l5 5M22 10l-5 5"/>',
    redo: '<path d="M3 12a9 9 0 109-9M21 3v6h-6"/>',
    mouse: '<rect x="7" y="3" width="10" height="18" rx="5"/><path d="M12 7v4"/>',
  };
  return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + paths[name] + "</svg>";
}

const app = document.getElementById("app");
const stage = document.createElement("div");
stage.id = "stage";
const hudRoot = document.createElement("div");
app.appendChild(stage);
app.appendChild(hudRoot);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
stage.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(72, 1, 0.08, 180);
camera.rotation.order = "YXZ";
const clock = new THREE.Clock();
const disposables = [];

function track(obj) { disposables.push(obj); return obj; }

function toonGradient() {
  const canvas = document.createElement("canvas");
  canvas.width = 4;
  canvas.height = 1;
  const g = canvas.getContext("2d");
  ["#b84330", "#e36a4c", "#f19a82", "#ffe0d6"].forEach((hex, i) => {
    g.fillStyle = hex;
    g.fillRect(i, 0, 1, 1);
  });
  const tex = new THREE.CanvasTexture(canvas);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

let world = null;

function clearWorld() {
  scene.clear();
  while (disposables.length) {
    const item = disposables.pop();
    if (item.dispose) item.dispose();
  }
  world = null;
}

function buildWorld(maze) {
  clearWorld();
  scene.background = new THREE.Color(COLORS.sky);
  scene.fog = new THREE.Fog(COLORS.sky, 26, 72);
  scene.add(new THREE.HemisphereLight(COLORS.sky, COLORS.grout, 0.78));
  scene.add(new THREE.AmbientLight(0xffffff, 0.16));

  const sun = new THREE.DirectionalLight(0xffffff, 1.7);
  sun.position.set((COLS * CELL) / 2 + 18, 28, (ROWS * CELL) / 2 + 8);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 2;
  sun.shadow.camera.far = 90;
  sun.shadow.camera.left = -30;
  sun.shadow.camera.right = 30;
  sun.shadow.camera.top = 30;
  sun.shadow.camera.bottom = -30;
  sun.shadow.bias = -0.0006;
  sun.target.position.set((COLS * CELL) / 2, 0, (ROWS * CELL) / 2);
  scene.add(sun);
  scene.add(sun.target);
  const fill = new THREE.DirectionalLight(0xffffff, 0.38);
  fill.position.set(-12, 14, -8);
  scene.add(fill);

  const ground = new THREE.Mesh(
    track(new THREE.PlaneGeometry(COLS * CELL + 36, ROWS * CELL + 36)),
    track(new THREE.MeshLambertMaterial({ color: COLORS.grout })),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.set((COLS * CELL) / 2, -0.02, (ROWS * CELL) / 2);
  ground.receiveShadow = true;
  scene.add(ground);

  const grad = track(toonGradient());
  const walls = maze.walls;
  const bodyGeo = track(new THREE.BoxGeometry(1, 1, 1));
  const bodyMat = track(new THREE.MeshToonMaterial({ gradientMap: grad, color: COLORS.coral }));
  const body = new THREE.InstancedMesh(bodyGeo, bodyMat, walls.length);
  body.castShadow = true;
  body.receiveShadow = true;
  const capMat = track(new THREE.MeshLambertMaterial({ color: COLORS.cream }));
  const caps = new THREE.InstancedMesh(bodyGeo, capMat, walls.length);
  caps.receiveShadow = true;
  const matrix = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const p = new THREE.Vector3();
  const s = new THREE.Vector3();
  walls.forEach((w, i) => {
    const sx = w.maxX - w.minX;
    const sz = w.maxZ - w.minZ;
    const cx = (w.minX + w.maxX) / 2;
    const cz = (w.minZ + w.maxZ) / 2;
    p.set(cx, w.h / 2, cz);
    s.set(sx, w.h, sz);
    matrix.compose(p, q, s);
    body.setMatrixAt(i, matrix);
    p.set(cx, w.h + 0.07, cz);
    s.set(Math.max(0.18, sx * 0.84), 0.14, Math.max(0.18, sz * 0.84));
    matrix.compose(p, q, s);
    caps.setMatrixAt(i, matrix);
  });
  scene.add(body);
  scene.add(caps);

  const tileMat = track(new THREE.MeshLambertMaterial());
  const tiles = new THREE.InstancedMesh(bodyGeo, tileMat, COLS * ROWS);
  tiles.receiveShadow = true;
  const a = new THREE.Color(COLORS.cream);
  const b = new THREE.Color(COLORS.creamDeep);
  const mint = new THREE.Color("#c9efe2");
  const tileScale = new THREE.Vector3(CELL * 0.84, 0.1, CELL * 0.84);
  let i = 0;
  for (let z = 0; z < ROWS; z++) {
    for (let x = 0; x < COLS; x++) {
      p.set((x + 0.5) * CELL, 0.05, (z + 0.5) * CELL);
      matrix.compose(p, q, tileScale);
      tiles.setMatrixAt(i, matrix);
      const exit = x === maze.exit.x && z === maze.exit.z;
      tiles.setColorAt(i, exit ? mint : (x + z) % 2 === 0 ? a : b);
      i++;
    }
  }
  scene.add(tiles);

  const gems = maze.gems.map((gem) => {
    const group = new THREE.Group();
    group.position.set(gem.world.x, 0.95, gem.world.z);
    const mesh = new THREE.Mesh(
      track(new THREE.OctahedronGeometry(0.3, 0)),
      track(new THREE.MeshStandardMaterial({
        color: COLORS.mint,
        emissive: COLORS.mintDeep,
        emissiveIntensity: 0.65,
        roughness: 0.28,
        metalness: 0.08,
        flatShading: true,
      })),
    );
    mesh.castShadow = true;
    const ring = new THREE.Mesh(
      track(new THREE.RingGeometry(0.22, 0.36, 6)),
      track(new THREE.MeshBasicMaterial({ color: COLORS.mint })),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = -0.82;
    group.add(mesh);
    group.add(ring);
    scene.add(group);
    return { gem, group };
  });

  const exit = new THREE.Group();
  exit.position.set(maze.exitWorld.x, 0, maze.exitWorld.z);
  const glow = new THREE.PointLight(COLORS.mint, 4.5, 11, 2);
  glow.position.y = 1.7;
  exit.add(glow);
  const ringMat = track(new THREE.MeshStandardMaterial({
    color: COLORS.mint,
    emissive: COLORS.mint,
    emissiveIntensity: 0.7,
    roughness: 0.32,
    metalness: 0.05,
    flatShading: true,
  }));
  const ring = new THREE.Mesh(track(new THREE.TorusGeometry(1.02, 0.09, 6, 18)), ringMat);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 1.4;
  exit.add(ring);
  const postMat = track(new THREE.MeshToonMaterial({ gradientMap: grad, color: COLORS.coral }));
  const postGeo = track(new THREE.CylinderGeometry(0.16, 0.22, 1.44, 6));
  [-1.12, 1.12].forEach((side) => {
    const post = new THREE.Mesh(postGeo, postMat);
    post.position.set(side, 0.72, 0);
    post.castShadow = true;
    exit.add(post);
  });
  const floorRing = new THREE.Mesh(
    track(new THREE.RingGeometry(0.48, 0.78, 8)),
    track(new THREE.MeshBasicMaterial({ color: COLORS.mint })),
  );
  floorRing.rotation.x = -Math.PI / 2;
  floorRing.position.y = 0.11;
  exit.add(floorRing);
  scene.add(exit);

  const clouds = new THREE.Group();
  const rand = mulberry32(maze.seed ^ 0x9e3779b9);
  const cloudMat = track(new THREE.MeshLambertMaterial({ color: COLORS.cloud, flatShading: true }));
  const puff = track(new THREE.IcosahedronGeometry(1, 0));
  const cloudData = Array.from({ length: 6 }, () => ({
    x: rand() * COLS * CELL,
    y: 11 + rand() * 5,
    z: rand() * ROWS * CELL,
    s: 0.85 + rand() * 0.9,
    p: rand() * Math.PI * 2,
  }));
  cloudData.forEach((d) => {
    const g = new THREE.Group();
    const specs = [
      { s: d.s, x: -0.7 * d.s, y: 0, z: 0 },
      { s: d.s * 1.15, x: 0.15, y: -0.1, z: 0 },
      { s: d.s * 0.75, x: 0.9 * d.s, y: 0.15, z: 0.1 },
    ];
    specs.forEach((spec) => {
      const m = new THREE.Mesh(puff, cloudMat);
      m.scale.setScalar(spec.s);
      m.position.set(spec.x, spec.y, spec.z);
      g.add(m);
    });
    g.position.set(d.x, d.y, d.z);
    clouds.add(g);
  });
  scene.add(clouds);

  camera.position.set(maze.startWorld.x, EYE, maze.startWorld.z);
  camera.rotation.set(0, maze.spawnYaw, 0);
  world = { maze, gems, ring, ringMat, clouds, cloudData };
}

const sim = {
  x: 0,
  z: 0,
  yaw: 0,
  pitch: 0,
  speed: 0,
  wishX: 0,
  wishZ: -1,
  bob: 0,
  elapsed: 0,
  acc: 0,
  hudAcc: 0,
  stepAcc: 0,
  thudCd: 0,
  reduce: false,
};

function resetSim(maze) {
  sim.x = maze.startWorld.x;
  sim.z = maze.startWorld.z;
  sim.yaw = maze.spawnYaw;
  sim.pitch = 0;
  sim.speed = 0;
  sim.wishX = 0;
  sim.wishZ = -1;
  sim.bob = 0;
  sim.elapsed = 0;
  sim.acc = 0;
  sim.hudAcc = 0;
  sim.stepAcc = 0;
  sim.thudCd = 0;
  sim.reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function simulate(dt) {
  const maze = state.maze;
  sim.thudCd = Math.max(0, sim.thudCd - dt);
  if (state.phase !== "play") {
    sim.speed = 0;
    return;
  }
  sim.elapsed += dt;
  const keys = input.keys;
  let forward = 0;
  let strafe = 0;
  if (keys.has("KeyW") || keys.has("ArrowUp")) forward += 1;
  if (keys.has("KeyS") || keys.has("ArrowDown")) forward -= 1;
  if (keys.has("KeyD") || keys.has("ArrowRight")) strafe += 1;
  if (keys.has("KeyA") || keys.has("ArrowLeft")) strafe -= 1;
  strafe = Math.max(-1, Math.min(1, strafe + input.stickX));
  forward = Math.max(-1, Math.min(1, forward + input.stickY));
  const wishNow = wishVector(sim.yaw, forward, strafe);
  if (wishNow.analog > 0.001) {
    sim.wishX = wishNow.x;
    sim.wishZ = wishNow.z;
  }
  const sprint = keys.has("ShiftLeft") || keys.has("ShiftRight");
  const cap = (sprint ? SPRINT_SPEED : WALK_SPEED) * wishNow.analog;
  const rate = wishNow.analog > 0.05 ? 34 : 20;
  const diff = cap - sim.speed;
  sim.speed += Math.sign(diff) * Math.min(Math.abs(diff), rate * dt);
  if (sim.speed > 0.03) {
    const dx = sim.wishX * sim.speed * dt;
    const dz = sim.wishZ * sim.speed * dt;
    const hit = moveWithCollision(sim.x, sim.z, dx, dz, PLAYER_R, maze.walls);
    if (hit.hit && hit.wanted - hit.moved > 0.01 && sim.speed > 1.4 && sim.thudCd <= 0) {
      playThud();
      sim.thudCd = 0.38;
    }
    sim.x = hit.x;
    sim.z = hit.z;
    if (!sim.reduce) sim.bob += dt * sim.speed * 1.15;
    if (sim.speed > 1.15) {
      sim.stepAcc += dt * (sim.speed / WALK_SPEED);
      if (sim.stepAcc >= 0.52) {
        sim.stepAcc = 0;
        playStep();
      }
    }
  }
  const cx = Math.floor(sim.x / CELL);
  const cz = Math.floor(sim.z / CELL);
  if (cx >= 0 && cz >= 0 && cx < COLS && cz < ROWS) {
    let changed = false;
    for (let gz = cz - 1; gz <= cz + 1; gz++) {
      for (let gx = cx - 1; gx <= cx + 1; gx++) {
        if (gx < 0 || gz < 0 || gx >= COLS || gz >= ROWS) continue;
        if (!state.explored[gz][gx]) {
          state.explored[gz][gx] = true;
          changed = true;
        }
      }
    }
    if (changed) {
      state.explored = state.explored.map((row) => row.slice());
      emit();
    }
  }
  for (const gem of maze.gems) {
    if (gemGone.has(gem.id)) continue;
    const dx = gem.world.x - sim.x;
    const dz = gem.world.z - sim.z;
    if (dx * dx + dz * dz <= PICKUP_R * PICKUP_R) {
      gemGone.add(gem.id);
      if (!state.taken[gem.id]) {
        const taken = state.taken.slice();
        taken[gem.id] = true;
        state.taken = taken;
        state.gems += 1;
        emit();
      }
      playPickup();
    }
  }
  const ex = maze.exitWorld.x - sim.x;
  const ez = maze.exitWorld.z - sim.z;
  if (ex * ex + ez * ez <= EXIT_R * EXIT_R) {
    const freshBest = state.best == null || sim.elapsed < state.best;
    if (freshBest) {
      try { localStorage.setItem(BEST_KEY, String(sim.elapsed)); } catch { /* private mode */ }
    }
    patch({
      phase: "won",
      elapsed: sim.elapsed,
      freshBest,
      best: freshBest ? sim.elapsed : state.best,
      px: sim.x,
      pz: sim.z,
      yaw: sim.yaw,
    });
    playWin();
    window.emberReport?.(state.gems || 0);
    document.exitPointerLock?.();
    return;
  }
}

function frame() {
  const dtIn = Math.min(clock.getDelta(), 0.1);
  if (state.phase === "play" && (input.lookX !== 0 || input.lookY !== 0)) {
    sim.yaw -= input.lookX * 0.0055;
    sim.pitch = Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, sim.pitch - input.lookY * 0.0055));
    input.lookX = 0;
    input.lookY = 0;
  }
  sim.acc += dtIn;
  let guard = 0;
  while (sim.acc >= STEP && guard < 6) {
    simulate(STEP);
    sim.acc -= STEP;
    guard++;
  }
  const t = clock.elapsedTime;
  if (world) {
    world.gems.forEach(({ gem, group }) => {
      const gone = gemGone.has(gem.id);
      group.position.y = 0.95 + Math.sin(t * 2.1 + gem.id * 1.3) * 0.12;
      if (!gone) group.rotation.y += dtIn * 1.5;
      const current = group.scale.x;
      const next = gone ? Math.max(0, current - dtIn * 4.5) : 1;
      group.scale.setScalar(next);
      group.visible = next > 0.02;
    });
    world.ring.rotation.z += dtIn * 0.55;
    world.ringMat.emissiveIntensity = 0.55 + Math.sin(t * 3) * 0.25;
    world.clouds.children.forEach((child, i) => {
      const d = world.cloudData[i];
      child.position.x = d.x + Math.sin(t * 0.12 + d.p) * 2.2;
      child.position.z = d.z + Math.cos(t * 0.1 + d.p) * 1.6;
    });
  }
  const right = rightOf(sim.yaw);
  const bobAmp = sim.reduce || state.phase !== "play" ? 0 : Math.min(1, sim.speed / WALK_SPEED);
  const sway = Math.sin(sim.bob * 8.5) * 0.04 * bobAmp;
  const side = Math.cos(sim.bob * 4.25) * 0.018 * bobAmp;
  const menu = state.phase === "menu" ? Math.sin(t * 1.2) * 0.035 : 0;
  camera.position.set(sim.x + right.x * side, EYE + sway + menu, sim.z + right.z * side);
  camera.rotation.y = sim.yaw;
  camera.rotation.x = sim.pitch;
  camera.rotation.z = sim.reduce ? 0 : side * -0.35;
  sim.hudAcc += dtIn;
  if (sim.hudAcc >= 0.08 && state.phase === "play") {
    sim.hudAcc = 0;
    state.elapsed = sim.elapsed;
    state.px = sim.x;
    state.pz = sim.z;
    state.yaw = sim.yaw;
    emit();
    window.emberHold?.(state.gems || 0);
  }
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

window.emberFinish = () => state.gems || 0;

function resize() {
  const w = stage.clientWidth || window.innerWidth;
  const h = stage.clientHeight || window.innerHeight;
  camera.aspect = w / Math.max(1, h);
  camera.updateProjectionMatrix();
  renderer.setSize(w, h, false);
}
window.addEventListener("resize", resize);

const MOVE = new Set(["KeyW", "KeyA", "KeyS", "KeyD", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"]);
window.addEventListener("keydown", (e) => {
  if (MOVE.has(e.code)) e.preventDefault();
  input.keys.add(e.code);
  if (e.code === "Escape" && state.phase === "play") patch({ phase: "paused" });
});
window.addEventListener("keyup", (e) => input.keys.delete(e.code));
window.addEventListener("blur", () => input.keys.clear());
document.addEventListener("visibilitychange", () => {
  if (document.hidden) input.keys.clear();
  else if (audioCtx && audioCtx.state === "suspended") void audioCtx.resume();
});
window.addEventListener("mousemove", (e) => {
  if (document.pointerLockElement == null || state.phase !== "play") return;
  const dx = Math.max(-90, Math.min(90, e.movementX));
  const dy = Math.max(-90, Math.min(90, e.movementY));
  sim.yaw -= dx * 0.00235;
  sim.pitch = Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, sim.pitch - dy * 0.00235));
});
let hadLock = false;
document.addEventListener("pointerlockchange", () => {
  const locked = document.pointerLockElement != null;
  if (locked) hadLock = true;
  if (!locked && hadLock && state.phase === "play") patch({ phase: "paused" });
  emit();
});

function requestLookLock() {
  const canvas = renderer.domElement;
  try {
    const pending = canvas.requestPointerLock({ unadjustedMovement: true });
    if (pending && typeof pending.then === "function") {
      pending.catch(() => { try { canvas.requestPointerLock(); } catch { /* unavailable */ } });
    }
  } catch {
    try { canvas.requestPointerLock(); } catch { /* unavailable */ }
  }
}

function coarseNow() {
  return window.matchMedia("(pointer: coarse)").matches || window.innerWidth < 820;
}

function drawMap(canvas) {
  const maze = state.maze;
  if (!canvas || !maze) return;
  const ctx = canvas.getContext("2d");
  const css = window.innerWidth >= 720 ? 176 : 128;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.floor(css * dpr);
  canvas.height = Math.floor(css * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, css, css);
  const grid = css - 18;
  const cell = grid / COLS;
  const ox = (css - cell * COLS) / 2;
  const oy = (css - cell * ROWS) / 2 + 4;
  ctx.fillStyle = COLORS.cream;
  ctx.font = "800 11px Segoe UI, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("N", css / 2, 12);
  for (let z = 0; z < ROWS; z++) {
    for (let x = 0; x < COLS; x++) {
      if (!state.explored[z] || !state.explored[z][x]) continue;
      const x0 = ox + x * cell;
      const y0 = oy + z * cell;
      ctx.fillStyle = x === maze.exit.x && z === maze.exit.z ? "#c9efe2" : COLORS.cream;
      ctx.fillRect(x0 + 0.6, y0 + 0.6, cell - 1.2, cell - 1.2);
      const c = maze.cells[z][x];
      ctx.strokeStyle = COLORS.coral;
      ctx.lineWidth = 2;
      ctx.beginPath();
      if (c.n) { ctx.moveTo(x0, y0); ctx.lineTo(x0 + cell, y0); }
      if (c.s) { ctx.moveTo(x0, y0 + cell); ctx.lineTo(x0 + cell, y0 + cell); }
      if (c.w) { ctx.moveTo(x0, y0); ctx.lineTo(x0, y0 + cell); }
      if (c.e) { ctx.moveTo(x0 + cell, y0); ctx.lineTo(x0 + cell, y0 + cell); }
      ctx.stroke();
    }
  }
  if (state.explored[maze.exit.z] && state.explored[maze.exit.z][maze.exit.x]) {
    ctx.strokeStyle = COLORS.mint;
    ctx.lineWidth = 2;
    ctx.strokeRect(ox + maze.exit.x * cell + cell * 0.28, oy + maze.exit.z * cell + cell * 0.28, cell * 0.44, cell * 0.44);
  }
  for (const gem of maze.gems) {
    if (state.taken[gem.id] || !state.explored[gem.z] || !state.explored[gem.z][gem.x]) continue;
    ctx.fillStyle = COLORS.mint;
    ctx.beginPath();
    ctx.arc(ox + (gem.x + 0.5) * cell, oy + (gem.z + 0.5) * cell, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
  const mx = ox + (state.px / CELL) * cell;
  const my = oy + (state.pz / CELL) * cell;
  ctx.save();
  ctx.translate(mx, my);
  ctx.rotate(-state.yaw);
  ctx.fillStyle = COLORS.mint;
  ctx.beginPath();
  ctx.moveTo(0, -6.5);
  ctx.lineTo(4.5, 5);
  ctx.lineTo(-4.5, 5);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

let renderedPhase = "";
let mapCanvas = null;
let timeEl = null;
let gemEl = null;
let soundBtn = null;

function beginPlay() {
  unlockAudio();
  if (state.phase === "menu" || state.phase === "won") patch({ phase: "play" });
  if (!coarseNow()) requestLookLock();
}
function resumePlay() {
  unlockAudio();
  if (state.phase === "paused") patch({ phase: "play" });
  if (!coarseNow()) requestLookLock();
}
function newMaze() {
  const seed = ((Math.random() * 1e9) | 0) ^ ((state.maze && state.maze.seed) || 1);
  const maze = generateMaze(seed >>> 0);
  boot(maze);
  buildWorld(maze);
  resetSim(maze);
}

function mountStick(parent) {
  const stick = document.createElement("div");
  stick.className = "stick";
  stick.setAttribute("aria-label", "Steuerung laufen");
  const knob = document.createElement("div");
  knob.className = "knob";
  stick.appendChild(knob);
  let origin = null;
  const end = () => {
    origin = null;
    input.stickX = 0;
    input.stickY = 0;
    knob.style.transform = "";
  };
  stick.addEventListener("pointerdown", (e) => {
    stick.setPointerCapture(e.pointerId);
    origin = { x: e.clientX, y: e.clientY };
  });
  stick.addEventListener("pointermove", (e) => {
    if (!origin) return;
    const dx = e.clientX - origin.x;
    const dy = e.clientY - origin.y;
    const max = 46;
    const mag = Math.hypot(dx, dy) || 1;
    const clamped = Math.min(max, mag);
    const nx = dx / mag;
    const ny = dy / mag;
    input.stickX = (nx * clamped) / max;
    input.stickY = (-ny * clamped) / max;
    knob.style.transform = "translate(" + nx * clamped + "px," + ny * clamped + "px)";
  });
  stick.addEventListener("pointerup", end);
  stick.addEventListener("pointercancel", end);
  parent.appendChild(stick);
}

function renderHud(force) {
  const coarse = coarseNow();
  const phase = state.phase;
  const locked = document.pointerLockElement != null;
  const playing = phase === "play" || phase === "paused";
  if (!force && renderedPhase === phase && hudRoot.childElementCount) {
    if (timeEl) timeEl.textContent = formatTime(state.elapsed);
    if (gemEl) gemEl.textContent = state.gems + "/" + (state.maze ? state.maze.gems.length : 0);
    if (mapCanvas) drawMap(mapCanvas);
    const catcher = hudRoot.querySelector(".lock-catch");
    if (phase === "play" && !coarse && !locked && !catcher) renderHud(true);
    if ((coarse || locked || phase !== "play") && catcher) catcher.remove();
    return;
  }
  renderedPhase = phase;
  hudRoot.replaceChildren();
  timeEl = null;
  gemEl = null;
  mapCanvas = null;
  soundBtn = null;

  if (phase === "play" && !coarse && !locked) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "lock-catch";
    btn.setAttribute("aria-label", "Klicken, um die Maus zu fangen");
    btn.addEventListener("click", () => requestLookLock());
    hudRoot.appendChild(btn);
  }
  if (phase === "play" && coarse) {
    const pad = document.createElement("div");
    pad.className = "lookpad";
    let last = null;
    pad.addEventListener("pointerdown", (e) => {
      if (e.target.closest("button")) return;
      pad.setPointerCapture(e.pointerId);
      last = { x: e.clientX, y: e.clientY };
    });
    pad.addEventListener("pointermove", (e) => {
      if (!last) return;
      input.lookX += e.clientX - last.x;
      input.lookY += e.clientY - last.y;
      last = { x: e.clientX, y: e.clientY };
    });
    const up = () => { last = null; };
    pad.addEventListener("pointerup", up);
    pad.addEventListener("pointercancel", up);
    hudRoot.appendChild(pad);
  }
  if (playing) {
    const hud = document.createElement("div");
    hud.className = "hud";
    const top = document.createElement("div");
    top.className = "toprow";
    const chips = document.createElement("div");
    chips.className = "chips";
    const timeChip = document.createElement("div");
    timeChip.className = "chip";
    timeChip.innerHTML = icon("timer");
    timeEl = document.createElement("span");
    timeEl.textContent = formatTime(state.elapsed);
    timeChip.appendChild(timeEl);
    const gemChip = document.createElement("div");
    gemChip.className = "chip";
    gemChip.innerHTML = icon("gem");
    gemEl = document.createElement("span");
    gemEl.textContent = state.gems + "/" + state.maze.gems.length;
    gemChip.appendChild(gemEl);
    chips.appendChild(timeChip);
    chips.appendChild(gemChip);
    const actions = document.createElement("div");
    actions.className = "actions";
    soundBtn = document.createElement("button");
    soundBtn.type = "button";
    soundBtn.className = "iconbtn";
    soundBtn.innerHTML = icon(muted ? "mute" : "vol");
    soundBtn.setAttribute("aria-label", muted ? "Ton an" : "Stumm schalten");
    soundBtn.addEventListener("click", () => {
      unlockAudio();
      const now = toggleMuted();
      soundBtn.innerHTML = icon(now ? "mute" : "vol");
      soundBtn.setAttribute("aria-label", now ? "Ton an" : "Stumm schalten");
    });
    actions.appendChild(soundBtn);
    if (phase === "play") {
      const pause = document.createElement("button");
      pause.type = "button";
      pause.className = "iconbtn";
      pause.innerHTML = icon("pause");
      pause.setAttribute("aria-label", "Pause");
      pause.addEventListener("click", () => {
        document.exitPointerLock?.();
        patch({ phase: "paused" });
      });
      actions.appendChild(pause);
    }
    top.appendChild(chips);
    top.appendChild(actions);
    hud.appendChild(top);
    if (phase === "play") {
      const cross = document.createElement("div");
      cross.className = "cross";
      hud.appendChild(cross);
    }
    const mapwrap = document.createElement("div");
    mapwrap.className = "mapwrap";
    mapCanvas = document.createElement("canvas");
    mapCanvas.setAttribute("aria-label", "Minikarte der erkundeten Wege");
    mapwrap.appendChild(mapCanvas);
    const label = document.createElement("p");
    label.textContent = "Karte";
    mapwrap.appendChild(label);
    hud.appendChild(mapwrap);
    drawMap(mapCanvas);
    if (phase === "play" && !coarse) {
      const hint = document.createElement("p");
      hint.className = "hintfade";
      hint.textContent = "Esc zum Pausieren";
      hud.appendChild(hint);
    }
    hudRoot.appendChild(hud);
    if (phase === "play" && coarse) mountStick(hudRoot);
  }

  if (phase === "menu" || phase === "paused" || phase === "won") {
    const veil = document.createElement("div");
    veil.className = "veil";
    const panel = document.createElement("div");
    panel.className = "panel";
    const kicker = document.createElement("p");
    kicker.className = "kicker";
    kicker.textContent = "Low-Poly Labyrinth";
    const title = document.createElement("h1");
    panel.appendChild(kicker);
    panel.appendChild(title);
    if (phase === "menu") {
      title.textContent = "Pastellpfad";
      const lead = document.createElement("p");
      lead.className = "lead";
      lead.textContent = "Finde den leuchtenden Ausgang. Die Karte merkt sich nur Wege, die du schon gesehen hast. Kristalle liegen freiwillig in den Gängen.";
      const go = document.createElement("button");
      go.type = "button";
      go.className = "primary";
      go.innerHTML = icon("play") + " Spiel starten";
      go.disabled = !state.maze;
      go.addEventListener("click", beginPlay);
      panel.appendChild(lead);
      panel.appendChild(go);
      if (state.best != null) {
        const best = document.createElement("p");
        best.className = "best";
        best.textContent = "Beste Zeit " + formatTime(state.best);
        panel.appendChild(best);
      }
      const tips = document.createElement("ul");
      tips.className = "tips";
      tips.innerHTML = coarse
        ? "<li>Linker Stick — laufen</li><li>Rechte Fläche — umsehen</li>"
        : "<li><span class=\"key\">WASD</span> Laufen, Umschalt sprintet</li><li>" + icon("mouse") + " Maus umsehen, Klick fängt den Zeiger</li>";
      const gemTip = document.createElement("li");
      gemTip.innerHTML = icon("gem") + " Kristalle einsammeln, Tor erreichen";
      tips.appendChild(gemTip);
      panel.appendChild(tips);
    } else if (phase === "paused") {
      title.textContent = "Pause";
      const lead = document.createElement("p");
      lead.className = "lead";
      lead.textContent = "Die Zeit steht. Die Wände bleiben, wo sie sind.";
      const go = document.createElement("button");
      go.type = "button";
      go.className = "primary";
      go.innerHTML = icon("play") + " Weiter";
      go.addEventListener("click", resumePlay);
      const again = document.createElement("button");
      again.type = "button";
      again.className = "secondary";
      again.innerHTML = icon("redo") + " Neues Labyrinth";
      again.addEventListener("click", newMaze);
      panel.appendChild(lead);
      panel.appendChild(go);
      panel.appendChild(again);
    } else {
      title.textContent = "Geschafft";
      const lead = document.createElement("p");
      lead.className = "lead";
      lead.textContent = "Du hast den Ausgang gefunden.";
      const stats = document.createElement("dl");
      stats.className = "stats";
      stats.innerHTML =
        "<div class=\"stat\"><dt>Zeit</dt><dd>" + formatTime(state.elapsed) + "</dd></div>" +
        "<div class=\"stat\"><dt>Kristalle</dt><dd class=\"mint\">" + state.gems + "/" + state.maze.gems.length + "</dd></div>";
      const best = document.createElement("p");
      best.className = "best";
      best.textContent = state.freshBest ? "Neue beste Zeit" : state.best != null ? "Beste Zeit " + formatTime(state.best) : "";
      const again = document.createElement("button");
      again.type = "button";
      again.className = "primary";
      again.innerHTML = icon("redo") + " Nochmal";
      again.addEventListener("click", newMaze);
      panel.appendChild(lead);
      panel.appendChild(stats);
      panel.appendChild(best);
      panel.appendChild(again);
    }
    const home = document.createElement("a");
    home.className = "home";
    home.href = "/";
    home.textContent = "Zurück zu DYE.TV";
    panel.appendChild(home);
    veil.appendChild(panel);
    hudRoot.appendChild(veil);
  }
}
listeners.add(() => renderHud());

const seed = (Math.random() * 1e9) | 0;
const maze = generateMaze(seed);
boot(maze);
buildWorld(maze);
resetSim(maze);
resize();
requestAnimationFrame(frame);
