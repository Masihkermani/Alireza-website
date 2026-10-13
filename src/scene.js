import * as THREE from 'three';
import { stages } from './stages.js';

const FLOORS = 9;
const FLOOR_H = 1;

const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const clamp01 = (x) => Math.min(1, Math.max(0, x));

// Interpolate every stage property at story progress p (0..1). Each keyframe
// "holds" for the middle part of its segment so the text has time to be read.
function sample(p) {
  const seg = clamp01(p) * (stages.length - 1);
  const i = Math.min(stages.length - 2, Math.floor(seg));
  const t = smooth(0.3, 0.8, seg - i);
  const a = stages[i];
  const b = stages[i + 1];
  const out = {};
  for (const k of Object.keys(a)) {
    if (typeof a[k] === 'number') out[k] = a[k] + (b[k] - a[k]) * t;
    else if (typeof a[k] === 'string' && a[k].startsWith('#')) out[k] = new THREE.Color(a[k]).lerp(new THREE.Color(b[k]), t);
  }
  return out;
}

function footprint(i) {
  // Stacked, slightly twisting slabs with a cantilevered top.
  const w = 6.2 - (i > 6 ? 0.8 : 0) + Math.sin(i * 0.9) * 0.4;
  const d = 4.2 + (i % 3 === 0 ? 0.4 : 0);
  return { w, d, rot: i * 0.045, x: Math.sin(i * 0.6) * 0.35 };
}

function addPlan(group, mat) {
  const { w, d } = footprint(0);
  const pts = [];
  const seg = (x1, z1, x2, z2) => pts.push(x1, 0, z1, x2, 0, z2);
  const rect = (hw, hd) => {
    seg(-hw, -hd, hw, -hd); seg(hw, -hd, hw, hd); seg(hw, hd, -hw, hd); seg(-hw, hd, -hw, -hd);
  };
  rect(w / 2, d / 2);
  rect(w / 2 - 0.18, d / 2 - 0.18);
  // Partitions
  seg(-0.6, -d / 2 + 0.18, -0.6, 0.3);
  seg(-w / 2 + 0.18, 0.3, 0.4, 0.3);
  seg(1.4, -d / 2 + 0.18, 1.4, d / 2 - 0.18);
  seg(1.4, -0.4, w / 2 - 0.18, -0.4);
  // Core (stairs)
  for (let s = 0; s < 7; s++) seg(-0.4 + s * 0.22, -1.6, -0.4 + s * 0.22, -0.8);
  // Door swings
  const arc = (cx, cz, r, a0) => {
    for (let k = 0; k < 10; k++) {
      const t0 = a0 + (k / 10) * (Math.PI / 2);
      const t1 = a0 + ((k + 1) / 10) * (Math.PI / 2);
      seg(cx + Math.cos(t0) * r, cz + Math.sin(t0) * r, cx + Math.cos(t1) * r, cz + Math.sin(t1) * r);
    }
  };
  arc(-0.6, 0.3, 0.7, 0);
  arc(1.4, -0.4, 0.6, Math.PI / 2);
  // Structural grid with bubbles, extending beyond the building
  for (let gx = -3; gx <= 3; gx += 1.5) seg(gx, -d / 2 - 1.4, gx, d / 2 + 1.4);
  for (let gz = -2; gz <= 2; gz += 2) seg(-w / 2 - 1.4, gz, w / 2 + 1.4, gz);
  // Dimension line
  seg(-w / 2, d / 2 + 0.8, w / 2, d / 2 + 0.8);
  seg(-w / 2, d / 2 + 0.6, -w / 2, d / 2 + 1);
  seg(w / 2, d / 2 + 0.6, w / 2, d / 2 + 1);
  // North arrow
  seg(w / 2 + 2, -d / 2, w / 2 + 2, -d / 2 - 1);
  seg(w / 2 + 1.8, -d / 2 - 0.7, w / 2 + 2, -d / 2 - 1);
  seg(w / 2 + 2.2, -d / 2 - 0.7, w / 2 + 2, -d / 2 - 1);

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  const lines = new THREE.LineSegments(g, mat);
  lines.position.y = 0.02;
  group.add(lines);
}

function addSketchLines(group, mat) {
  // Overshooting construction lines, the signature of a hand sketch.
  const pts = [];
  const H = FLOORS * FLOOR_H;
  const { w, d } = footprint(0);
  const o = 1.6;
  const seg = (a, b) => pts.push(...a, ...b);
  seg([-w / 2 - o, 0, -d / 2], [w / 2 + o, 0, -d / 2]);
  seg([-w / 2 - o, 0, d / 2], [w / 2 + o, 0, d / 2]);
  seg([-w / 2, 0, -d / 2 - o], [-w / 2, 0, d / 2 + o]);
  seg([w / 2, 0, -d / 2 - o], [w / 2, 0, d / 2 + o]);
  for (const [x, z] of [[-w / 2, -d / 2], [w / 2, -d / 2], [-w / 2, d / 2], [w / 2, d / 2]]) {
    seg([x, -0.8, z], [x, H + 1.4, z]);
  }
  seg([-w / 2 - o, H, d / 2], [w / 2 + o, H, d / 2]);
  // Ground hatch
  for (let k = -6; k <= 6; k++) seg([k * 0.9 - 0.4, 0, d / 2 + 1.6], [k * 0.9 + 0.4, 0, d / 2 + 2.4]);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  group.add(new THREE.LineSegments(g, mat));
}

export function createScene(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(stages[0].bg);
  scene.fog = new THREE.Fog(scene.background, 40, 90);

  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 300);

  // Lights
  const hemi = new THREE.HemisphereLight('#ffffff', '#8a8070', 0.8);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight('#fff4e0', 2);
  sun.position.set(14, 22, 10);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -20, right: 20, top: 20, bottom: -20, near: 1, far: 80 });
  sun.shadow.bias = -0.0005;
  scene.add(sun);

  // Shared materials
  const lineMat = new THREE.LineBasicMaterial({ color: stages[0].line, transparent: true });
  const mullionMat = new THREE.LineBasicMaterial({ color: '#555', transparent: true });
  const planMat = new THREE.LineBasicMaterial({ color: '#cfe3ff', transparent: true, opacity: 0 });
  const sketchMat = new THREE.LineBasicMaterial({ color: stages[0].line, transparent: true });
  const slabMat = new THREE.MeshStandardMaterial({ color: '#f4f2ee', roughness: 0.85, transparent: true });

  const building = new THREE.Group();
  scene.add(building);

  const clay = new THREE.Color('#f4f2ee');
  const glassTint = new THREE.Color('#5d7f8f');
  const concrete = new THREE.Color('#b9b3a9');
  const warm = new THREE.Color('#ffc979');

  const floors = [];
  for (let i = 0; i < FLOORS; i++) {
    const { w, d, rot, x } = footprint(i);
    const fl = new THREE.Group();
    fl.position.set(x, i * FLOOR_H, 0);
    fl.rotation.y = rot;

    const slabGeo = new THREE.BoxGeometry(w + 0.25, 0.14, d + 0.25).translate(0, 0.07, 0);
    const slab = new THREE.Mesh(slabGeo, slabMat);
    slab.castShadow = slab.receiveShadow = true;

    const glassMat = new THREE.MeshStandardMaterial({
      color: clay.clone(), roughness: 0.15, metalness: 0.1, transparent: true,
      emissive: warm.clone(), emissiveIntensity: 0,
    });
    const glassGeo = new THREE.BoxGeometry(w - 0.1, FLOOR_H - 0.14, d - 0.1).translate(0, 0.14 + (FLOOR_H - 0.14) / 2, 0);
    const glass = new THREE.Mesh(glassGeo, glassMat);
    glass.castShadow = glass.receiveShadow = true;

    const boxGeo = new THREE.BoxGeometry(w, FLOOR_H, d).translate(0, FLOOR_H / 2, 0);
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(boxGeo), lineMat);

    const mp = [];
    for (let mx = -w / 2 + 0.6; mx < w / 2; mx += 0.6) {
      for (const z of [d / 2 - 0.04, -d / 2 + 0.04]) mp.push(mx, 0.14, z, mx, FLOOR_H, z);
    }
    for (let mz = -d / 2 + 0.6; mz < d / 2; mz += 0.6) {
      for (const xx of [w / 2 - 0.04, -w / 2 + 0.04]) mp.push(xx, 0.14, mz, xx, FLOOR_H, mz);
    }
    const mg = new THREE.BufferGeometry();
    mg.setAttribute('position', new THREE.Float32BufferAttribute(mp, 3));
    const mullions = new THREE.LineSegments(mg, mullionMat);

    fl.add(slab, glass, edges, mullions);
    building.add(fl);
    floors.push({ group: fl, glass, glassMat, slab, mullions, lit: Math.random() < 0.25 ? 0.08 : 0.45 + Math.random() * 0.55 });
  }
  // Roof slab
  const top = footprint(FLOORS - 1);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(top.w + 0.6, 0.2, top.d + 0.6), slabMat);
  roof.castShadow = true;
  const roofGroup = new THREE.Group();
  roofGroup.add(roof, new THREE.LineSegments(new THREE.EdgesGeometry(roof.geometry), lineMat));
  roofGroup.position.set(top.x, FLOORS * FLOOR_H + 0.1, 0);
  roofGroup.rotation.y = top.rot;
  building.add(roofGroup);

  const planGroup = new THREE.Group();
  addPlan(planGroup, planMat);
  building.add(planGroup);

  const sketchGroup = new THREE.Group();
  addSketchLines(sketchGroup, sketchMat);
  building.add(sketchGroup);

  // Ground, grid and context
  const shadowMat = new THREE.ShadowMaterial({ opacity: 0 });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), shadowMat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const grid = new THREE.GridHelper(60, 60, '#cfe3ff', '#cfe3ff');
  grid.material.transparent = true;
  grid.material.opacity = 0;
  scene.add(grid);

  const ctxMat = new THREE.MeshStandardMaterial({ color: '#ecebe7', roughness: 0.9, transparent: true, opacity: 0 });
  const ctxWin = new THREE.MeshStandardMaterial({ color: '#000', emissive: warm, emissiveIntensity: 0, transparent: true, opacity: 0 });
  const context = new THREE.Group();
  const blocks = [
    [-13, 0, 5, 4, 3, 5], [-12, 0, -8, 5, 4.5, 4], [13, 0, -6, 4.5, 5.5, 4.5], [12, 0, 8, 4, 2.5, 5],
    [0, 0, -14, 8, 3, 3.5], [-2, 0, 14, 6, 2, 3.5], [-19, 0, -1, 4, 6, 4.5], [19, 0, 2, 4, 4, 5],
  ];
  for (const [x, , z, w, h, d] of blocks) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d).translate(0, h / 2, 0), ctxMat);
    m.position.set(x, 0, z);
    m.castShadow = m.receiveShadow = true;
    const strip = new THREE.Mesh(new THREE.BoxGeometry(w + 0.02, 0.08, d + 0.02).translate(0, h * 0.6, 0), ctxWin);
    strip.position.copy(m.position);
    context.add(m, strip);
  }
  // Trees
  const treeMat = new THREE.MeshStandardMaterial({ color: '#7d8f6a', roughness: 1, transparent: true, opacity: 0 });
  for (let k = 0; k < 14; k++) {
    const a = (k / 14) * Math.PI * 2;
    const r = 8.5 + (k % 3) * 0.8;
    const t = new THREE.Mesh(new THREE.IcosahedronGeometry(0.55 + (k % 2) * 0.25, 1), treeMat);
    t.position.set(Math.cos(a) * r, 1.2, Math.sin(a) * r * 0.8);
    t.castShadow = true;
    context.add(t);
  }
  scene.add(context);

  // State
  let progress = 0;
  let lastBg = '';
  let pointerX = 0;
  let pointerY = 0;
  const target = new THREE.Vector3();
  const clock = new THREE.Clock();

  function resize() {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // Pull back on portrait screens so the tower fits
    camera.fov = w < h ? 50 : 35;
    // Frame the building away from the text: to the side opposite the
    // reading start on desktop (left for RTL), up on mobile
    const rtl = document.documentElement.dir === 'rtl';
    if (w >= h) camera.setViewOffset(w, h, (rtl ? 1 : -1) * w * 0.15, 0, w, h);
    else camera.setViewOffset(w, h, 0, h * 0.1, w, h);
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  window.addEventListener('pointermove', (e) => {
    pointerX = (e.clientX / window.innerWidth) * 2 - 1;
    pointerY = (e.clientY / window.innerHeight) * 2 - 1;
  });
  resize();

  function render() {
    const s = sample(progress);
    const time = clock.getElapsedTime();

    scene.background.copy(s.bg);
    scene.fog.color.copy(s.bg);
    const hex = `#${s.bg.getHexString()}`;
    if (hex !== lastBg) document.documentElement.style.setProperty('--scene-bg', (lastBg = hex));

    lineMat.color.copy(s.line);
    lineMat.opacity = s.lineOpacity;
    sketchMat.color.copy(s.line);
    sketchMat.opacity = s.sketch;
    sketchGroup.visible = s.sketch > 0.01;
    planMat.color.copy(s.line);
    planMat.opacity = s.plan;
    planGroup.visible = s.plan > 0.01;
    grid.material.opacity = s.grid;
    grid.visible = s.grid > 0.01;

    slabMat.opacity = s.mesh;
    slabMat.color.copy(clay).lerp(concrete, s.real);
    slabMat.depthWrite = s.mesh > 0.95;
    mullionMat.color.set(s.real > 0.5 ? '#2c2f33' : '#b8b4ad');
    mullionMat.opacity = Math.max(s.real * 0.9, s.lineOpacity * 0.5) * (s.mesh > 0.01 ? 1 : 0);

    const built = s.build * FLOORS;
    floors.forEach((f, i) => {
      const k = clamp01(built - i);
      f.group.visible = k > 0.005;
      f.group.scale.y = Math.max(k, 0.001);
      f.glassMat.color.copy(clay).lerp(glassTint, s.real);
      f.glassMat.opacity = s.mesh * (1 - s.real * 0.35);
      f.glassMat.depthWrite = s.real < 0.5 && s.mesh > 0.95;
      f.glassMat.metalness = 0.1 + s.real * 0.5;
      f.glassMat.emissiveIntensity = s.night * f.lit * 1.6;
      f.glass.visible = f.slab.visible = s.mesh > 0.01;
    });
    roofGroup.visible = s.build > 0.98;
    roofGroup.children[0].visible = s.mesh > 0.01;

    ctxMat.opacity = s.context;
    ctxMat.color.set('#ecebe7').lerp(new THREE.Color('#cfccc6'), s.real).lerp(new THREE.Color('#262c38'), s.night);
    ctxWin.opacity = s.context * s.night;
    ctxWin.emissiveIntensity = s.night * 0.5;
    treeMat.opacity = s.context * s.real;
    context.visible = s.context > 0.01;
    shadowMat.opacity = s.shadow;

    sun.intensity = s.sun;
    sun.color.set('#ffffff').lerp(new THREE.Color('#ffd9a8'), s.real).lerp(new THREE.Color('#7f9cff'), s.night);
    hemi.intensity = 0.9 - s.night * 0.55;

    // Building turns through the story; idle sway keeps it alive.
    building.rotation.y = progress * Math.PI * 1.6 - 0.5 + Math.sin(time * 0.3) * 0.03;

    const theta = 0.6 + pointerX * 0.12;
    const phi = Math.max(0.02, s.phi + pointerY * 0.04);
    target.set(0, s.targetY, 0);
    camera.position.set(
      target.x + s.radius * Math.sin(phi) * Math.sin(theta),
      target.y + s.radius * Math.cos(phi),
      target.z + s.radius * Math.sin(phi) * Math.cos(theta),
    );
    camera.lookAt(target);

    renderer.render(scene, camera);
  }

  let running = true;
  function loop() {
    if (running) render();
    requestAnimationFrame(loop);
  }
  loop();

  return {
    setProgress(p) { progress = clamp01(p); },
    setRunning(v) { running = v; },
  };
}
