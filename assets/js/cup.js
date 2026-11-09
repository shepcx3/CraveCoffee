// =============================================================
// CRAVE — spinning 3D takeaway cup (Three.js)
// =============================================================
import * as THREE from "three";

const stage = document.getElementById("cupStage");
const canvas = document.getElementById("cupCanvas");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function webglOK() {
  try {
    const c = document.createElement("canvas");
    return !!(window.WebGLRenderingContext && (c.getContext("webgl2") || c.getContext("webgl")));
  } catch { return false; }
}

if (!webglOK()) {
  document.documentElement.classList.add("no-webgl");
} else {
  init().catch((err) => {
    console.error(err);
    document.documentElement.classList.add("no-webgl");
  });
}

function loadImage(src) {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = rej;
    img.src = src;
  });
}

// ---------- textures drawn on a canvas ----------
async function makeCupTexture(maxAniso) {
  const logo = await loadImage("assets/img/logo.png");
  try { await document.fonts.load('64px "Bebas Neue"'); } catch {}

  const W = 2048, H = 1024;
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const g = c.getContext("2d");

  // matte black paper
  g.fillStyle = "#121010";
  g.fillRect(0, 0, W, H);

  // subtle paper fibre noise
  const noise = g.getImageData(0, 0, W, H);
  for (let i = 0; i < noise.data.length; i += 4) {
    const n = (Math.random() - 0.5) * 9;
    noise.data[i] += n; noise.data[i + 1] += n; noise.data[i + 2] += n;
  }
  g.putImageData(noise, 0, 0);

  // logo at the front (u = 0.5). Body height 2.6 units ≈ 1024px, circumference ≈ 5.5 units ≈ 2048px
  const logoH = 560;
  const logoW = logoH * (370 / 394);
  g.globalCompositeOperation = "lighten"; // logo's black square melts into the cup
  g.drawImage(logo, W / 2 - logoW / 2, 455 - logoH / 2, logoW, logoH);
  g.globalCompositeOperation = "source-over";

  // caramel pinstripes near the base, all the way around
  g.fillStyle = "#d58c3f";
  g.fillRect(0, H - 120, W, 7);
  g.fillRect(0, H - 100, W, 3);

  // wrap-around text on the back (u = 0 / 1 seam), drawn twice so it straddles the seam
  g.fillStyle = "#f3eadb";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.font = '120px "Bebas Neue", Impact, sans-serif';
  const back = (x) => {
    g.save();
    g.translate(x, 0);
    g.letterSpacing = "6px";
    g.fillText("KINGSTON", 0, 420);
    g.font = '52px "Bebas Neue", Impact, sans-serif';
    g.fillStyle = "#d58c3f";
    g.fillText("166 PRINCESS ST", 0, 510);
    g.restore();
    g.fillStyle = "#f3eadb";
    g.font = '120px "Bebas Neue", Impact, sans-serif';
  };
  back(0); back(W);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAniso;
  tex.wrapS = THREE.RepeatWrapping;
  return tex;
}

function radialTexture(inner, outer, size = 256) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d");
  const grd = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grd.addColorStop(0, inner);
  grd.addColorStop(1, outer);
  g.fillStyle = grd;
  g.fillRect(0, 0, size, size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// ---------- main ----------
async function init() {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  camera.position.set(0, 0.9, 9.6);
  camera.lookAt(0, 0.55, 0);

  // ---- lights ----
  scene.add(new THREE.HemisphereLight(0xfff1e0, 0x1a120c, 0.65));
  const key = new THREE.DirectionalLight(0xffe2bf, 2.4);
  key.position.set(-4, 5, 6);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xf0a050, 3.2);
  rim.position.set(5, 2, -4);
  scene.add(rim);
  const rim2 = new THREE.DirectionalLight(0xffc98a, 1.6);
  rim2.position.set(-5, 1, -3);
  scene.add(rim2);
  const front = new THREE.PointLight(0xffffff, 6, 20, 2);
  front.position.set(0, 0.5, 5);
  scene.add(front);

  // ---- cup ----
  const cup = new THREE.Group();
  const tilt = new THREE.Group(); // pointer / scroll tilt wrapper
  tilt.add(cup);
  scene.add(tilt);

  const BOTTOM_Y = -1.3, TOP_Y = 1.3, R_BOTTOM = 0.72, R_TOP = 0.98;
  const bodyPts = [];
  const STEPS = 32;
  for (let i = 0; i <= STEPS; i++) {
    const t = i / STEPS;
    bodyPts.push(new THREE.Vector2(R_BOTTOM + (R_TOP - R_BOTTOM) * t, BOTTOM_Y + (TOP_Y - BOTTOM_Y) * t));
  }
  const tex = await makeCupTexture(renderer.capabilities.getMaxAnisotropy());
  const body = new THREE.Mesh(
    new THREE.LatheGeometry(bodyPts, 128, Math.PI, Math.PI * 2),
    new THREE.MeshStandardMaterial({ map: tex, roughness: 0.55, metalness: 0.05, side: THREE.DoubleSide })
  );
  cup.add(body);

  // base
  const base = new THREE.Mesh(
    new THREE.CircleGeometry(R_BOTTOM, 64),
    new THREE.MeshStandardMaterial({ color: 0x0e0c0c, roughness: 0.8 })
  );
  base.rotation.x = Math.PI / 2;
  base.position.y = BOTTOM_Y;
  cup.add(base);

  // base bead
  const bead = new THREE.Mesh(
    new THREE.TorusGeometry(R_BOTTOM + 0.005, 0.02, 12, 96),
    new THREE.MeshStandardMaterial({ color: 0x141111, roughness: 0.5 })
  );
  bead.rotation.x = Math.PI / 2;
  bead.position.y = BOTTOM_Y + 0.01;
  cup.add(bead);

  // lid
  const lidPts = [
    [0.955, 1.22], [1.0, 1.235], [1.035, 1.27], [1.045, 1.33], [1.04, 1.39],
    [1.015, 1.42], [0.97, 1.43], [0.95, 1.46], [0.94, 1.51], [0.915, 1.545],
    [0.86, 1.555], [0.80, 1.545], [0.74, 1.5], [0.6, 1.49], [0.3, 1.485], [0.0, 1.485],
  ].map(([r, y]) => new THREE.Vector2(r, y));
  const lidMat = new THREE.MeshPhysicalMaterial({
    color: 0xf1e9dc, roughness: 0.32, metalness: 0, clearcoat: 0.6, clearcoatRoughness: 0.35, side: THREE.DoubleSide,
  });
  const lid = new THREE.Mesh(new THREE.LatheGeometry(lidPts, 128), lidMat);
  cup.add(lid);

  // sip hole (front of lid)
  const sip = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.035, 0.16, 6, 12),
    new THREE.MeshStandardMaterial({ color: 0x1a120c, roughness: 0.9 })
  );
  sip.rotation.z = Math.PI / 2;
  sip.position.set(0, 1.548, 0.86);
  sip.rotation.y = 0;
  cup.add(sip);

  // ---- floating coffee beans ----
  const beanGeo = new THREE.SphereGeometry(1, 32, 20);
  beanGeo.scale(0.16, 0.115, 0.085);
  const beanMat = new THREE.MeshStandardMaterial({ color: 0x4a2a16, roughness: 0.38, metalness: 0.05 });
  const creaseGeo = new THREE.TorusGeometry(0.1, 0.012, 6, 32, Math.PI);
  creaseGeo.scale(1.25, 0.5, 1);
  const creaseMat = new THREE.MeshStandardMaterial({ color: 0x1a0d06, roughness: 0.9 });
  const beans = [];
  const BEAN_COUNT = 9;
  for (let i = 0; i < BEAN_COUNT; i++) {
    const b = new THREE.Group();
    const shell = new THREE.Mesh(beanGeo, beanMat);
    const crease = new THREE.Mesh(creaseGeo, creaseMat);
    crease.position.z = 0.078;
    crease.rotation.z = Math.PI / 2;
    crease.position.x = 0;
    b.add(shell, crease);
    const angle = (i / BEAN_COUNT) * Math.PI * 2;
    b.userData = {
      angle,
      radius: 1.75 + (i % 3) * 0.35,
      y: -1.0 + ((i * 7) % BEAN_COUNT) / BEAN_COUNT * 2.6,
      speed: 0.18 + (i % 4) * 0.05,
      spin: new THREE.Vector3(Math.random(), Math.random(), Math.random()).multiplyScalar(1.4),
      bob: Math.random() * Math.PI * 2,
    };
    b.scale.setScalar(0.9 + (i % 3) * 0.2);
    scene.add(b);
    beans.push(b);
  }

  // ---- steam ----
  const steamTex = radialTexture("rgba(255,245,230,0.55)", "rgba(255,245,230,0)");
  const steam = [];
  const STEAM_COUNT = 18;
  for (let i = 0; i < STEAM_COUNT; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: steamTex, transparent: true, depthWrite: false, opacity: 0 }));
    s.userData = { t: i / STEAM_COUNT, seed: Math.random() * 10 };
    scene.add(s);
    steam.push(s);
  }

  // ---- soft floor shadow ----
  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(3.2, 3.2),
    new THREE.MeshBasicMaterial({ map: radialTexture("rgba(0,0,0,0.75)", "rgba(0,0,0,0)"), transparent: true, depthWrite: false })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = BOTTOM_Y - 0.35;
  scene.add(shadow);

  // ---- sizing ----
  function resize() {
    const { clientWidth: w, clientHeight: h } = stage;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // keep the whole cup in frame on narrow screens
    camera.position.z = camera.aspect < 0.8 ? 9.6 / Math.max(camera.aspect, 0.5) * 0.8 : 9.6;
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(stage);
  resize();

  // ---- interaction: drag to spin ----
  let spinVel = 0;            // extra angular velocity from drag / scroll
  let dragging = false, lastX = 0;
  const pointer = new THREE.Vector2(0, 0);
  const pointerTarget = new THREE.Vector2(0, 0);

  stage.addEventListener("pointerdown", (e) => {
    dragging = true; lastX = e.clientX;
    stage.setPointerCapture(e.pointerId);
  });
  stage.addEventListener("pointermove", (e) => {
    const r = stage.getBoundingClientRect();
    pointerTarget.set(((e.clientX - r.left) / r.width) * 2 - 1, ((e.clientY - r.top) / r.height) * 2 - 1);
    if (!dragging) return;
    const dx = e.clientX - lastX;
    lastX = e.clientX;
    cup.rotation.y += dx * 0.012;
    spinVel = dx * 0.006;
  });
  const end = () => { dragging = false; };
  stage.addEventListener("pointerup", end);
  stage.addEventListener("pointercancel", end);
  stage.addEventListener("pointerleave", () => pointerTarget.set(0, 0));

  let lastScroll = window.scrollY;
  window.addEventListener("scroll", () => {
    const d = window.scrollY - lastScroll;
    lastScroll = window.scrollY;
    if (!reduceMotion) spinVel += d * 0.0009;
  }, { passive: true });

  // ---- only render while visible ----
  let visible = true;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(stage);

  const clock = new THREE.Clock();
  const AUTO = reduceMotion ? 0.12 : 0.55; // rad / s

  // intro: drop in
  let intro = reduceMotion ? 1 : 0;

  function frame() {
    requestAnimationFrame(frame);
    if (!visible) { clock.getDelta(); return; }
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;

    intro = Math.min(1, intro + dt * 0.7);
    const ease = 1 - Math.pow(1 - intro, 3);

    if (!dragging) {
      cup.rotation.y += AUTO * dt + spinVel;
      spinVel *= 0.94;
    }

    // float + tilt
    pointer.lerp(pointerTarget, 0.06);
    const scrollP = Math.min(window.scrollY / window.innerHeight, 1.2);
    const bob = reduceMotion ? 0 : Math.sin(t * 1.2) * 0.08;
    tilt.position.y = bob + (1 - ease) * 3 + scrollP * 0.8;
    tilt.rotation.x = 0.12 + pointer.y * 0.18 + scrollP * 0.5;
    tilt.rotation.z = -0.1 + pointer.x * -0.12 + Math.sin(t * 0.7) * 0.03;
    tilt.rotation.y = pointer.x * 0.25;
    const s = 0.9 + 0.1 * ease - scrollP * 0.15;
    tilt.scale.setScalar(s);

    shadow.position.y = BOTTOM_Y - 0.35 + scrollP * 0.4;
    shadow.material.opacity = (0.9 - bob * 2) * ease * (1 - scrollP * 0.8);
    shadow.scale.setScalar(1 - bob * 0.6);

    // beans orbit
    beans.forEach((b) => {
      const u = b.userData;
      const a = u.angle + t * u.speed * (reduceMotion ? 0.3 : 1) + cup.rotation.y * 0.15;
      b.position.set(Math.cos(a) * u.radius, u.y + Math.sin(t * 0.9 + u.bob) * 0.18 + tilt.position.y, Math.sin(a) * u.radius * 0.7);
      b.rotation.x += u.spin.x * dt;
      b.rotation.y += u.spin.y * dt;
      b.rotation.z += u.spin.z * dt;
      const sc = (0.9 + 0.2 * (b.position.z + 2) / 4) * ease;
      b.scale.setScalar(Math.max(sc, 0.001));
    });

    // steam wisps
    const lidTop = new THREE.Vector3(0, 1.62, 0);
    tilt.localToWorld(lidTop);
    steam.forEach((sp) => {
      const u = sp.userData;
      u.t += dt * 0.22;
      if (u.t > 1) { u.t -= 1; u.seed = Math.random() * 10; }
      const k = u.t;
      sp.position.set(
        lidTop.x + Math.sin(k * 5 + u.seed) * 0.25 * k + (u.seed - 5) * 0.03,
        lidTop.y + k * 1.15,
        lidTop.z + Math.cos(k * 4 + u.seed) * 0.15
      );
      const size = 0.3 + k * 0.8;
      sp.scale.set(size, size, 1);
      sp.material.opacity = Math.sin(k * Math.PI) * 0.16 * ease * Math.max(0, 1 - scrollP);
    });

    renderer.render(scene, camera);
  }
  frame();
  stage.classList.add("is-ready");
}
