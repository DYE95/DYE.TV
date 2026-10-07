import * as THREE from "three";
import RAPIER from "@dimforge/rapier3d-compat";

const STEP = 1 / 60;
const MAX_BODIES = 64;
const ARENA = 7.15;
const BOX = 0.68;
const KEY = "fallwerk-settings";

const PALETTE = {
  sphere: ["#e85d04", "#c2410c", "#f4a261"],
  box: ["#f3e6d8", "#e6d3b3", "#fff6ea"],
  cylinder: ["#7f9eae", "#5c7a8a", "#a8c0cc"],
};

const statusEl = document.getElementById("fwStatus");
const emptyEl = document.getElementById("fwEmpty");
const countEl = document.getElementById("fwCount");
const stage = document.getElementById("fwStage");
const gravInput = document.getElementById("grav");
const restInput = document.getElementById("rest");
const gravRead = document.getElementById("gravRead");
const restRead = document.getElementById("restRead");

const tuning = { gravity: 9.8, restitution: 0.18, active: "sphere" };
const bodies = [];
const floorColliders = [];
let seq = 1;
let dropIndex = 0;
let drag = null;
let orbit = null;

const ndc = new THREE.Vector2();
const raycaster = new THREE.Raycaster();
const tmp = new THREE.Vector3();
const hit = new THREE.Vector3();
const next = new THREE.Vector3();
const vel = new THREE.Vector3();
const local = new THREE.Vector3();
const rotated = new THREE.Vector3();
const quat = new THREE.Quaternion();
const offset = new THREE.Vector3();

function fail(message) {
  statusEl.classList.remove("hidden");
  statusEl.textContent = message;
}

function readSettings() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "null");
    if (!raw) return;
    if (typeof raw.gravity === "number") tuning.gravity = clamp(raw.gravity, 0, 24);
    if (typeof raw.restitution === "number") tuning.restitution = clamp(raw.restitution, 0, 1);
  } catch {
    /* ignore broken settings */
  }
}

function saveSettings() {
  localStorage.setItem(KEY, JSON.stringify({
    version: 1,
    gravity: tuning.gravity,
    restitution: tuning.restitution,
  }));
}

function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

function paintHud() {
  countEl.textContent = String(bodies.length);
  emptyEl.classList.toggle("hidden", bodies.length > 0);
  gravRead.textContent = tuning.gravity.toFixed(1);
  restRead.textContent = Math.round(tuning.restitution * 100) + "%";
  gravInput.value = String(tuning.gravity);
  restInput.value = String(tuning.restitution);
  document.querySelectorAll("[data-shape]").forEach((btn) => {
    btn.classList.toggle("on", btn.dataset.shape === tuning.active);
  });
}

function toolbarPoint() {
  const angle = dropIndex * 2.399963229728653;
  const radius = Math.min(0.42 * Math.sqrt(dropIndex + 1), 2.6);
  dropIndex = (dropIndex + 1) % 40;
  return [Math.cos(angle) * radius, 5.6 + (dropIndex % 3) * 0.22, Math.sin(angle) * radius];
}

readSettings();

let world;
let renderer;
let scene;
let camera;
let floorMesh;
const target = new THREE.Vector3(0, 0.55, 0);
const spherical = new THREE.Spherical();

try {
  await RAPIER.init();
  world = new RAPIER.World({ x: 0, y: -tuning.gravity, z: 0 });
  world.integrationParameters.numSolverIterations = 8;
} catch (err) {
  fail("Physik konnte nicht starten. " + (err && err.message ? err.message : ""));
  throw err;
}

scene = new THREE.Scene();
scene.background = new THREE.Color("#0c0908");
scene.fog = new THREE.Fog("#0c0908", 24, 46);
camera = new THREE.PerspectiveCamera(34, 1, 0.1, 90);
offset.set(10.4, 7.6, 10.8).sub(target);
spherical.setFromVector3(offset);
applyCamera();

renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
stage.appendChild(renderer.domElement);

scene.add(new THREE.HemisphereLight("#f3efe6", "#1a1210", 0.55));
scene.add(new THREE.AmbientLight("#f3e6d8", 0.18));
const sun = new THREE.DirectionalLight("#fff4e8", 2.35);
sun.position.set(7, 12, 5);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
sun.shadow.bias = -0.00025;
sun.shadow.normalBias = 0.03;
sun.shadow.camera.near = 2;
sun.shadow.camera.far = 32;
sun.shadow.camera.left = -12;
sun.shadow.camera.right = 12;
sun.shadow.camera.top = 12;
sun.shadow.camera.bottom = -12;
scene.add(sun);
const fill = new THREE.DirectionalLight("#c9d4de", 0.35);
fill.position.set(-6, 4, -4);
scene.add(fill);

const ground = new THREE.Mesh(
  new THREE.CircleGeometry(30, 48),
  new THREE.MeshStandardMaterial({ color: "#100c0b", roughness: 1 }),
);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -0.56;
ground.receiveShadow = true;
scene.add(ground);

buildPlatform();
seed();
paintHud();
statusEl.classList.add("hidden");
resize();
window.addEventListener("resize", resize);

const canvas = renderer.domElement;
canvas.addEventListener("pointerdown", onPointerDown);
canvas.addEventListener("pointermove", onPointerMove);
window.addEventListener("pointerup", onPointerUp);
window.addEventListener("pointercancel", onPointerUp);
canvas.addEventListener("wheel", onWheel, { passive: false });
window.addEventListener("keydown", onKey);

document.querySelectorAll("[data-shape]").forEach((btn) => {
  btn.addEventListener("click", () => spawn(btn.dataset.shape));
});
document.getElementById("btnStack").addEventListener("click", dropStack);
document.getElementById("btnClear").addEventListener("click", clearWorld);
document.getElementById("btnReset").addEventListener("click", resetTuning);
gravInput.addEventListener("input", () => {
  tuning.gravity = Number(gravInput.value);
  world.gravity.y = -tuning.gravity;
  for (const entry of bodies) entry.body.wakeUp();
  paintHud();
  saveSettings();
});
restInput.addEventListener("input", () => {
  tuning.restitution = Number(restInput.value);
  applyRestitution();
  paintHud();
  saveSettings();
});

let acc = 0;
let last = performance.now();
renderer.setAnimationLoop((now) => {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  acc += dt;
  while (acc >= STEP) {
    stepDrag();
    world.step();
    acc -= STEP;
  }
  syncMeshes();
  cullFallen();
  renderer.render(scene, camera);
});

function standing() {
  return bodies.filter((entry) => entry.body.isValid() && entry.body.translation().y > -1).length;
}
let collapsed = false;
function collapse() {
  if (collapsed) return;
  collapsed = true;
  for (const entry of bodies) {
    if (!entry.body.isValid()) continue;
    entry.body.wakeUp();
    const t = entry.body.translation();
    entry.body.applyImpulse({ x: (t.x >= 0 ? 8 : -8), y: 5, z: (t.z >= 0 ? 7 : -7) }, true);
  }
  const status = document.getElementById("fwStatus");
  if (status) {
    status.classList.remove("hidden");
    status.textContent = "Einsturz.";
  }
}
window.emberFinish = () => {
  collapse();
  const n = standing();
  const status = document.getElementById("fwStatus");
  if (status) {
    status.classList.remove("hidden");
    status.textContent = "Runde zu. " + n + " haben den Einsturz überstanden.";
  }
  return n;
};
if (new URLSearchParams(location.search).get("spur") === "1") {
  seed();
  setTimeout(collapse, 8000);
}

function applyCamera() {
  offset.setFromSpherical(spherical);
  camera.position.copy(target).add(offset);
  camera.lookAt(target);
}

function resize() {
  const w = stage.clientWidth || 1;
  const h = stage.clientHeight || 1;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h, false);
}

function floorTexture() {
  const canvas2d = document.createElement("canvas");
  canvas2d.width = 512;
  canvas2d.height = 512;
  const ctx = canvas2d.getContext("2d");
  ctx.fillStyle = "#1a1210";
  ctx.fillRect(0, 0, 512, 512);
  ctx.strokeStyle = "#3a2a24";
  ctx.lineWidth = 2;
  for (let i = 0; i <= 512; i += 64) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, 512);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(512, i);
    ctx.stroke();
  }
  const texture = new THREE.CanvasTexture(canvas2d);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 4);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function addFixedBox(hx, hy, hz, x, y, z, meshArgs) {
  const body = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(x, y, z));
  const collider = world.createCollider(
    RAPIER.ColliderDesc.cuboid(hx, hy, hz).setFriction(0.9).setRestitution(tuning.restitution),
    body,
  );
  floorColliders.push(collider);
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(meshArgs[0], meshArgs[1], meshArgs[2]),
    new THREE.MeshStandardMaterial({
      color: meshArgs[3] || "#241812",
      roughness: 0.9,
      map: meshArgs[4] || null,
    }),
  );
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.userData.floor = true;
  scene.add(mesh);
  return mesh;
}

function buildPlatform() {
  const tex = floorTexture();
  floorMesh = addFixedBox(8, 0.25, 8, 0, -0.25, 0, [16, 0.5, 16, "#ffffff", tex]);
  const lips = [
    [8.15, 0.16, 0.11, 0, 0.32, ARENA, 16.3, 0.32, 0.22],
    [8.15, 0.16, 0.11, 0, 0.32, -ARENA, 16.3, 0.32, 0.22],
    [0.11, 0.16, 8.15, ARENA, 0.32, 0, 0.22, 0.32, 16.3],
    [0.11, 0.16, 8.15, -ARENA, 0.32, 0, 0.22, 0.32, 16.3],
  ];
  for (const lip of lips) {
    addFixedBox(lip[0], lip[1], lip[2], lip[3], lip[4], lip[5], [lip[6], lip[7], lip[8], "#241812"]);
  }
}

function applyRestitution() {
  for (const collider of floorColliders) collider.setRestitution(tuning.restitution);
  for (const entry of bodies) entry.collider.setRestitution(tuning.restitution);
}

function trim() {
  while (bodies.length > MAX_BODIES) {
    const idx = bodies.findIndex((entry) => !drag || entry !== drag.entry);
    if (idx < 0) break;
    removeEntry(bodies[idx]);
  }
}

function removeEntry(entry) {
  if (drag && drag.entry === entry) endDrag();
  const idx = bodies.indexOf(entry);
  if (idx >= 0) bodies.splice(idx, 1);
  if (entry.body.isValid()) world.removeRigidBody(entry.body);
  scene.remove(entry.mesh);
  entry.mesh.geometry.dispose();
  entry.mesh.material.dispose();
  paintHud();
}

function spawn(shape, at, rotation, size) {
  tuning.active = shape;
  const id = seq++;
  const base = shape === "sphere" ? 0.42 : shape === "box" ? BOX : 0.38;
  const tilt = shape === "box" ? ((id * 17) % 7) - 3 : 0;
  const pos = at || toolbarPoint();
  const rot = rotation || [tilt * 0.04, ((id * 47) % 100) / 100 * Math.PI, tilt * 0.03];
  const sized = size || base * (0.94 + ((id * 13) % 8) * 0.012);
  const color = PALETTE[shape][id % PALETTE[shape].length];
  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(rot[0], rot[1], rot[2]));
  const desc = RAPIER.RigidBodyDesc.dynamic()
    .setTranslation(pos[0], pos[1], pos[2])
    .setRotation({ x: q.x, y: q.y, z: q.z, w: q.w })
    .setLinearDamping(shape === "sphere" ? 0.04 : 0.08)
    .setAngularDamping(shape === "box" ? 0.5 : 0.2)
    .setCanSleep(true)
    .setCcdEnabled(true);
  const body = world.createRigidBody(desc);
  const friction = shape === "sphere" ? 0.35 : shape === "box" ? 0.88 : 0.55;
  let colliderDesc;
  let geometry;
  let halfY;
  if (shape === "sphere") {
    colliderDesc = RAPIER.ColliderDesc.ball(sized);
    geometry = new THREE.SphereGeometry(sized, 32, 24);
    halfY = sized;
  } else if (shape === "box") {
    const half = sized / 2;
    colliderDesc = RAPIER.ColliderDesc.cuboid(half, half, half);
    geometry = new THREE.BoxGeometry(sized, sized, sized);
    halfY = half;
  } else {
    const halfH = sized * 0.85;
    colliderDesc = RAPIER.ColliderDesc.cylinder(halfH, sized);
    geometry = new THREE.CylinderGeometry(sized, sized, sized * 1.7, 28);
    halfY = halfH;
  }
  colliderDesc.setFriction(friction).setRestitution(tuning.restitution);
  const collider = world.createCollider(colliderDesc, body);
  const mesh = new THREE.Mesh(
    geometry,
    new THREE.MeshStandardMaterial({
      color,
      roughness: shape === "sphere" ? 0.32 : shape === "cylinder" ? 0.38 : 0.62,
      metalness: shape === "cylinder" ? 0.42 : 0.04,
    }),
  );
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  const entry = { id, shape, size: sized, halfY, body, collider, mesh };
  mesh.userData.entry = entry;
  scene.add(mesh);
  bodies.push(entry);
  trim();
  paintHud();
  return entry;
}

function stackBoxes(origin) {
  const keep = tuning.active;
  const s = BOX;
  const pitch = s + 0.012;
  const spots = [];
  const push = (x, y, z) => spots.push([origin[0] + x, origin[1] + y, origin[2] + z]);
  for (const i of [-1, 0, 1]) {
    for (const j of [-1, 0, 1]) push(i * pitch, s / 2 + 0.01, j * pitch);
  }
  for (const i of [0, 1]) {
    for (const j of [0, 1]) push((i - 0.5) * pitch, s / 2 + pitch + 0.02, (j - 0.5) * pitch);
  }
  push(0, s / 2 + pitch * 2 + 0.03, 0);
  for (const spot of spots) spawn("box", spot, [0, 0, 0], s);
  tuning.active = keep;
  paintHud();
}

function seed() {
  stackBoxes([0, 0, 0]);
  const top = bodies[bodies.length - 1];
  const t = top.body.translation();
  spawn("sphere", [t.x, t.y + top.halfY + 0.34 + 0.04, t.z], [0, 0, 0], 0.34);
  const radius = 0.36;
  spawn("cylinder", [2.7, radius * 0.85 + 0.01, 2.05], [0, 0.45, 0], radius);
  tuning.active = "sphere";
  paintHud();
}

function dropStack() {
  const slot = bodies.length === 0 ? 0 : (bodies.length % 3) - 1;
  const x = slot * 3.4;
  const z = bodies.length === 0 ? 0 : slot === 0 ? 2.6 : 0;
  const y = bodies.length === 0 ? 0 : 6.2;
  stackBoxes([x, y, z]);
}

function clearWorld() {
  endDrag();
  while (bodies.length) removeEntry(bodies[0]);
}

function resetTuning() {
  tuning.gravity = 9.8;
  tuning.restitution = 0.18;
  world.gravity.y = -tuning.gravity;
  applyRestitution();
  for (const entry of bodies) entry.body.wakeUp();
  paintHud();
  saveSettings();
}

function eventNdc(event) {
  const rect = canvas.getBoundingClientRect();
  ndc.x = ((event.clientX - rect.left) / (rect.width || 1)) * 2 - 1;
  ndc.y = -((event.clientY - rect.top) / (rect.height || 1)) * 2 + 1;
}

function pick() {
  raycaster.setFromCamera(ndc, camera);
  const list = bodies.map((entry) => entry.mesh);
  list.push(floorMesh);
  const hits = raycaster.intersectObjects(list, false);
  return hits[0] || null;
}

function beginDrag(entry, point, pointerId) {
  const body = entry.body;
  if (!body.isValid()) return;
  const t = body.translation();
  const r = body.rotation();
  tmp.set(t.x, t.y, t.z);
  quat.set(r.x, r.y, r.z, r.w);
  local.copy(point).sub(tmp).applyQuaternion(quat.invert());
  const plane = new THREE.Plane();
  camera.getWorldDirection(hit);
  plane.setFromNormalAndCoplanarPoint(hit, point.clone());
  body.setBodyType(RAPIER.RigidBodyType.KinematicPositionBased, true);
  body.wakeUp();
  drag = {
    entry,
    pointerId,
    plane,
    last: tmp.clone(),
    prev: tmp.clone(),
  };
  canvas.style.cursor = "grabbing";
}

function endDrag() {
  if (!drag) return;
  const body = drag.entry.body;
  if (body.isValid()) {
    vel.copy(drag.last).sub(drag.prev).divideScalar(STEP);
    const mag = vel.length();
    if (mag > 8) vel.multiplyScalar(8 / mag);
    body.setBodyType(RAPIER.RigidBodyType.Dynamic, true);
    body.setLinvel({ x: vel.x, y: vel.y, z: vel.z }, true);
    body.setAngvel({ x: 0, y: 0, z: 0 }, true);
    body.wakeUp();
  }
  drag = null;
  canvas.style.cursor = "";
}

function stepDrag() {
  if (!drag) return;
  const body = drag.entry.body;
  if (!body.isValid()) {
    endDrag();
    return;
  }
  raycaster.setFromCamera(ndc, camera);
  if (!raycaster.ray.intersectPlane(drag.plane, hit)) return;
  const t = body.translation();
  const r = body.rotation();
  quat.set(r.x, r.y, r.z, r.w);
  rotated.copy(local).applyQuaternion(quat);
  next.copy(hit).sub(rotated);
  tmp.set(t.x, t.y, t.z);
  vel.copy(next).sub(tmp);
  const mag = vel.length();
  const maxStep = 0.35;
  if (mag > maxStep) {
    vel.multiplyScalar(maxStep / mag);
    next.copy(tmp).add(vel);
  }
  if (next.y < drag.entry.halfY + 0.02) next.y = drag.entry.halfY + 0.02;
  drag.prev.copy(drag.last);
  drag.last.copy(next);
  body.setNextKinematicTranslation({ x: next.x, y: next.y, z: next.z });
  body.setNextKinematicRotation({ x: r.x, y: r.y, z: r.z, w: r.w });
}

function onPointerDown(event) {
  if (event.button !== 0) return;
  eventNdc(event);
  const found = pick();
  const entry = found && found.object.userData.entry;
  if (entry) {
    event.preventDefault();
    canvas.setPointerCapture(event.pointerId);
    beginDrag(entry, found.point, event.pointerId);
    return;
  }
  orbit = {
    pointerId: event.pointerId,
    x: event.clientX,
    y: event.clientY,
    moved: false,
    floor: Boolean(found && found.object.userData.floor),
    point: found ? found.point.clone() : null,
  };
}

function onPointerMove(event) {
  eventNdc(event);
  if (drag && drag.pointerId === event.pointerId) return;
  if (orbit && orbit.pointerId === event.pointerId) {
    const dx = event.clientX - orbit.x;
    const dy = event.clientY - orbit.y;
    if (Math.hypot(dx, dy) > 4) orbit.moved = true;
    if (!orbit.moved) return;
    spherical.theta -= dx * 0.005;
    spherical.phi = clamp(spherical.phi + dy * 0.005, 0.42, Math.PI / 2 - 0.05);
    spherical.radius = clamp(spherical.radius, 4.2, 22);
    orbit.x = event.clientX;
    orbit.y = event.clientY;
    applyCamera();
    return;
  }
  const found = pick();
  canvas.style.cursor = found && found.object.userData.entry ? "grab" : "";
}

function onPointerUp(event) {
  if (drag && drag.pointerId === event.pointerId) {
    endDrag();
    return;
  }
  if (!orbit || orbit.pointerId !== event.pointerId) return;
  const wasClick = !orbit.moved && orbit.floor && orbit.point;
  const point = orbit.point;
  orbit = null;
  if (wasClick) {
    spawn(tuning.active, [
      clamp(point.x, -6.2, 6.2),
      5.2,
      clamp(point.z, -6.2, 6.2),
    ]);
  }
}

function onWheel(event) {
  event.preventDefault();
  const dir = Math.sign(event.deltaY) || 0;
  spherical.radius = clamp(spherical.radius * (1 + dir * 0.08), 4.2, 22);
  applyCamera();
}

function onKey(event) {
  if (event.repeat) return;
  if (event.target instanceof HTMLElement && event.target.closest("input, textarea, button")) return;
  if (event.key === "1") spawn("sphere");
  if (event.key === "2") spawn("box");
  if (event.key === "3") spawn("cylinder");
}

function syncMeshes() {
  for (const entry of bodies) {
    if (!entry.body.isValid()) continue;
    const t = entry.body.translation();
    const r = entry.body.rotation();
    entry.mesh.position.set(t.x, t.y, t.z);
    entry.mesh.quaternion.set(r.x, r.y, r.z, r.w);
  }
}

function cullFallen() {
  const gone = [];
  for (const entry of bodies) {
    if (!entry.body.isValid()) continue;
    if (entry.body.translation().y < -8) gone.push(entry);
  }
  for (const entry of gone) removeEntry(entry);
}
