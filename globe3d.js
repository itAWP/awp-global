// Global Connectivity, after mont-fort: the camera breaks down through an
// overcast into a low, satellite-like view of a steel-blue earth while a large
// statement scrolls past, then glides over Jakarta, Mauritius and Dubai in turn
// (the seas around each hub light up and a gold route draws between them) and
// finally rises to the horizon to show the whole network.
import * as THREE from "three";

const HUBS = [
  { name: "Jakarta", lat: -6.2, lon: 106.8 },
  { name: "Mauritius", lat: -20.2, lon: 57.5 },
  { name: "Dubai", lat: 25.2, lon: 55.3 },
];

// Camera keyframes: where the camera hangs (lat, lon, altitude above the
// surface; mAlt on phones, whose narrow screens need more distance) and what
// it looks at (lat, lon, and how far out from the centre).
const KEYS = [
  { at: 0, lat: -13, lon: 97, alt: 0.5, mAlt: 0.8, lLat: -2, lLon: 101, lR: 1 },        // inside the clouds
  { at: 0.17, lat: -24, lon: 84, alt: 0.6, mAlt: 1.25, lLat: -3, lLon: 92, lR: 1 },       // overview + statement
  { at: 0.35, lat: -16, lon: 104, alt: 0.48, mAlt: 0.85, lLat: -5, lLon: 108, lR: 1 },   // Jakarta
  { at: 0.53, lat: -31, lon: 55, alt: 0.48, mAlt: 0.85, lLat: -18, lLon: 59, lR: 1 },    // Mauritius
  { at: 0.71, lat: 12, lon: 51, alt: 0.48, mAlt: 0.85, lLat: 24, lLon: 57, lR: 1 },      // Dubai
  { at: 0.9, lat: -30, lon: 78, alt: 1.55, mAlt: 3.2, lLat: 2, lLon: 79, lR: 0.9 },     // network on the horizon
];
const STOPS = KEYS.slice(1);   // the nav / step targets
const CLEAR_AT = 0.1;          // the overcast has fully parted by here

const latLon = (lat, lon, r = 1, out = new THREE.Vector3()) => {
  const th = THREE.MathUtils.degToRad(90 - lat), ph = THREE.MathUtils.degToRad(lon + 180);
  return out.set(-Math.cos(ph) * Math.sin(th) * r, Math.cos(th) * r, Math.sin(ph) * Math.sin(th) * r);
};
const sstep = (a, b, v) => { const t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t); };

function mountGlobe(section) {
  const canvas = section.querySelector(".globe3d-canvas");
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isSmall = window.matchMedia("(max-width: 768px)").matches;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, isSmall ? 1.5 : 2));
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(isSmall ? 46 : 34, 1, 0.01, 50);

  // R = land detail, G = water mask, B = clouds (packed into one JPEG)
  const earthTex = new THREE.TextureLoader().load("./assets/globe-earth.jpg?v=20261023b");
  earthTex.anisotropy = renderer.capabilities.getMaxAnisotropy();

  const hubPos = HUBS.map(h => latLon(h.lat, h.lon));
  const hubOn = [0, 0, 0];

  const surfaceVert = /* glsl */`
    varying vec2 vUv; varying vec3 vN; varying vec3 vView; varying vec3 vPos;
    void main() {
      vUv = uv; vPos = position;
      vec4 mv = modelViewMatrix * vec4(position, 1.0);
      vN = normalize(normalMatrix * normal); vView = -mv.xyz;
      gl_Position = projectionMatrix * mv;
    }`;

  const globe = new THREE.Mesh(
    new THREE.SphereGeometry(1, 160, 120),
    new THREE.ShaderMaterial({
      uniforms: { map: { value: earthTex }, hubs: { value: hubPos }, hubOn: { value: hubOn } },
      vertexShader: surfaceVert,
      fragmentShader: /* glsl */`
        uniform sampler2D map; uniform vec3 hubs[3]; uniform float hubOn[3];
        varying vec2 vUv; varying vec3 vN; varying vec3 vView; varying vec3 vPos;
        void main() {
          vec3 t = texture2D(map, vUv).rgb;
          float water = smoothstep(0.25, 0.75, t.g);
          vec3 land = mix(vec3(0.09, 0.13, 0.18), vec3(0.34, 0.41, 0.49), pow(t.r, 1.1));
          vec3 sea = mix(vec3(0.15, 0.23, 0.32), vec3(0.22, 0.31, 0.41), t.r * 1.6);
          vec3 col = mix(land, sea, water);
          // like mont-fort's highlighted seas: the water around each hub turns pale
          for (int i = 0; i < 3; i++) {
            float hl = hubOn[i] * (1.0 - smoothstep(0.08, 0.3, distance(vPos, hubs[i])));
            col = mix(col, vec3(0.50, 0.60, 0.70) + t.r * 0.12, water * hl * 0.75);
            col *= 1.0 + (1.0 - water) * hl * 0.15;
          }
          // faint cloud shadow baked into the surface
          col *= 1.0 - 0.22 * t.b;
          vec3 n = normalize(vN), v = normalize(vView);
          float dif = max(dot(n, normalize(vec3(-0.45, 0.6, 0.65))), 0.0);
          col *= 0.55 + 0.6 * dif;
          float rim = pow(1.0 - max(dot(n, v), 0.0), 2.5);
          col = mix(col, vec3(0.72, 0.82, 0.92), rim * 0.55);
          gl_FragColor = vec4(col, 1.0);
        }`,
    })
  );
  scene.add(globe);

  // drifting cloud layer just above the surface
  const cloudMat = new THREE.ShaderMaterial({
    uniforms: { map: { value: earthTex }, shift: { value: 0 }, cover: { value: 1 } },
    vertexShader: surfaceVert,
    fragmentShader: /* glsl */`
      uniform sampler2D map; uniform float shift; uniform float cover;
      varying vec2 vUv; varying vec3 vN; varying vec3 vView;
      void main() {
        float c = texture2D(map, vUv + vec2(shift, 0.0)).b;
        vec3 n = normalize(vN);
        float dif = max(dot(n, normalize(vec3(-0.45, 0.6, 0.65))), 0.0);
        float a = smoothstep(0.12, 0.85, c) * 0.72;
        vec3 col = vec3(0.86, 0.91, 0.96) * (0.7 + 0.35 * dif);
        // on arrival the camera is still inside a grey overcast that then parts
        vec3 overcast = vec3(0.70, 0.76, 0.81) * (0.86 + 0.28 * c);
        gl_FragColor = vec4(mix(col, overcast, cover), mix(a, 0.97, cover));
      }`,
    transparent: true, depthWrite: false,
  });
  const cloudLayer = new THREE.Mesh(new THREE.SphereGeometry(1.008, 128, 96), cloudMat);
  scene.add(cloudLayer);

  // soft atmosphere halo around the limb
  scene.add(new THREE.Mesh(
    new THREE.SphereGeometry(1.07, 96, 64),
    new THREE.ShaderMaterial({
      vertexShader: /* glsl */`
        varying vec3 vN; varying vec3 vView;
        void main() {
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vN = normalize(normalMatrix * normal); vView = -mv.xyz;
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */`
        varying vec3 vN; varying vec3 vView;
        void main() {
          float f = dot(normalize(vN), normalize(vView));
          float a = pow(smoothstep(0.0, 0.42, -f), 1.2) * 0.85;
          gl_FragColor = vec4(0.84, 0.91, 0.98, a);
        }`,
      side: THREE.BackSide, transparent: true, depthWrite: false,
    })
  ));

  // gold routes between the hubs, drawn as the camera travels them
  const TUBE_SEG = 160, RAD_SEG = 6;
  const routeMat = new THREE.MeshBasicMaterial({ color: 0xe0c48a, transparent: true, opacity: 0.95 });
  const routes = [[0, 1], [1, 2], [2, 0]].map(([a, b]) => {
    const A = hubPos[a], B = hubPos[b];
    const lift = 0.02 + A.angleTo(B) * 0.07;
    const pts = [];
    for (let i = 0; i <= 64; i++) {
      const t = i / 64;
      const p = A.clone().lerp(B, t).normalize();
      pts.push(p.multiplyScalar(1.004 + Math.sin(Math.PI * t) * lift));
    }
    const curve = new THREE.CatmullRomCurve3(pts);
    const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, TUBE_SEG, isSmall ? 0.003 : 0.0019, RAD_SEG, false), routeMat);
    mesh.geometry.setDrawRange(0, 0);
    scene.add(mesh);
    return { curve, mesh };
  });
  const indexPerSeg = RAD_SEG * 6;

  const glowTex = (() => {
    const c = document.createElement("canvas"); c.width = c.height = 64;
    const g = c.getContext("2d");
    const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, "rgba(255,244,214,1)"); grad.addColorStop(0.3, "rgba(232,200,140,0.6)"); grad.addColorStop(1, "rgba(232,200,140,0)");
    g.fillStyle = grad; g.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(c);
  })();
  const comet = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, transparent: true, depthWrite: false, opacity: 0 }));
  comet.scale.setScalar(0.06);
  scene.add(comet);

  // ---------- text, nav and city labels ----------
  const steps = [...section.querySelectorAll(".a3d-step")];
  const panel = section.querySelector(".globe3d-panel");
  const statement = section.querySelector(".globe3d-statement");
  const navItems = [...section.querySelectorAll(".a3d-nav-item")];
  const markNo = section.querySelector(".a3d-mark-no");
  const cities = [...section.querySelectorAll(".globe3d-city")];
  let current = -1;
  // step 0 is the overview, carried by the big statement; 1-4 use the panel
  const setStep = (i) => {
    if (i === current) return;
    current = i;
    steps.forEach((s, k) => s.classList.toggle("is-active", k === i - 1));
    navItems.forEach((n, k) => n.classList.toggle("is-active", k === i));
    panel.classList.toggle("is-hidden", i === 0);
    if (markNo && i > 0) markNo.textContent = String(i).padStart(2, "0");
  };
  setStep(0);

  const readProgress = () => {
    const rect = section.getBoundingClientRect();
    const travel = rect.height - window.innerHeight;
    return travel > 0 ? Math.min(1, Math.max(0, -rect.top / travel)) : 0;
  };
  navItems.forEach((n, k) => n.addEventListener("click", () => {
    const top = section.getBoundingClientRect().top + window.scrollY;
    const y = top + (section.offsetHeight - window.innerHeight) * STOPS[k].at;
    if (window.lenis) window.lenis.scrollTo(y, { duration: 1.6 }); else window.scrollTo({ top: y, behavior: "smooth" });
  }));

  // ---------- camera ----------
  const camPos = new THREE.Vector3(), look = new THREE.Vector3(), tmp = new THREE.Vector3();
  const lerp = THREE.MathUtils.lerp;
  const pose = (P) => {
    let i = 0;
    while (i < KEYS.length - 2 && P > KEYS[i + 1].at) i++;
    const a = KEYS[i], b = KEYS[i + 1];
    const t = sstep(a.at, b.at, P);
    // rise a little between hubs so the route reads as a journey
    const hop = i >= 2 && i <= 3 ? Math.sin(Math.PI * t) * 0.3 : 0;
    const alt = isSmall ? lerp(a.mAlt, b.mAlt, t) : lerp(a.alt, b.alt, t);
    latLon(lerp(a.lat, b.lat, t), lerp(a.lon, b.lon, t), 1 + alt + hop, camPos);
    latLon(lerp(a.lLat, b.lLat, t), lerp(a.lLon, b.lLon, t), lerp(a.lR, b.lR, t), look);
    camera.position.copy(camPos);
    camera.lookAt(look);
  };

  const resize = () => {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // keep the focal point clear of the text: right of it on desktop, above it on phones
    if (isSmall) camera.setViewOffset(w, h, 0, h * 0.2, w, h);
    else camera.setViewOffset(w, h, -w * 0.17, 0, w, h);
    camera.updateProjectionMatrix();
  };
  window.addEventListener("resize", resize);
  resize();

  const projectLabels = () => {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    cities.forEach((el, i) => {
      const p = hubPos[i];
      // hidden once the city turns past the limb
      const facing = tmp.copy(camera.position).sub(p).dot(p) > 0.02;
      tmp.copy(p).project(camera);
      const visible = facing && tmp.z < 1 && Math.abs(tmp.x) < 1.05 && Math.abs(tmp.y) < 1.05;
      el.style.opacity = visible && cloudMat.uniforms.cover.value < 0.35 ? "1" : "0";
      el.classList.toggle("is-current", hubOn[i] > 0.5);
      el.style.transform = `translate(${((tmp.x + 1) / 2 * w).toFixed(1)}px, ${((1 - tmp.y) / 2 * h).toFixed(1)}px)`;
    });
  };

  // ---------- loop ----------
  const restP = KEYS[KEYS.length - 1].at;
  let shown = reduced ? restP : 0;
  let running = false, last = performance.now();
  const frame = (now) => {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    const progress = reduced ? restP : readProgress();
    shown += (progress - shown) * Math.min(1, dt * 5);
    const P = shown;

    // which keyframe we are nearest to
    let step = 0;
    STOPS.forEach((k, i) => { if (i > 0 && P >= (STOPS[i - 1].at + k.at) / 2) step = i; });
    setStep(step);

    cloudMat.uniforms.cover.value = 1 - sstep(0.015, CLEAR_AT, P);
    // the statement scrolls up across the screen during the overview
    if (statement) {
      const st = Math.min(1, Math.max(0, (P - 0.05) / 0.22));
      const h = canvas.clientHeight;
      statement.style.transform = `translateY(${(h * (1 - st) - statement.offsetHeight * st * 1.1).toFixed(1)}px)`;
      statement.style.opacity = st > 0 && st < 1 ? "1" : "0";
    }

    // hubs light up as the camera arrives; all three glow in the network view
    HUBS.forEach((_, i) => {
      const k = STOPS[i + 1].at;
      const on = Math.max(1 - sstep(0.06, 0.12, Math.abs(P - k)), sstep(0.8, 0.88, P));
      hubOn[i] += (on - hubOn[i]) * Math.min(1, dt * 4);
    });

    // routes: Jakarta → Mauritius, Mauritius → Dubai, then Dubai → Jakarta closes the loop
    const spans = [[STOPS[1].at, STOPS[2].at], [STOPS[2].at, STOPS[3].at], [STOPS[3].at, STOPS[4].at]];
    let cometOn = 0;
    routes.forEach((r, i) => {
      const f = sstep(spans[i][0] + 0.02, spans[i][1] - 0.02, P);
      r.mesh.geometry.setDrawRange(0, Math.floor(f * TUBE_SEG) * indexPerSeg);
      if (f > 0.01 && f < 0.99) { comet.position.copy(r.curve.getPointAt(f)); cometOn = 1; }
    });
    comet.material.opacity += (cometOn - comet.material.opacity) * Math.min(1, dt * 6);

    if (!reduced) cloudMat.uniforms.shift.value = (now / 1000) * 0.0025;
    pose(P);
    renderer.render(scene, camera);
    projectLabels();
    if (running) requestAnimationFrame(frame);
  };

  new IntersectionObserver(([entry]) => {
    const was = running;
    running = entry.isIntersecting;
    if (running && !was) { last = performance.now(); resize(); requestAnimationFrame(frame); }
  }, { rootMargin: "200px 0px" }).observe(section);
}

const globeSection = document.querySelector(".globe3d");
if (globeSection) mountGlobe(globeSection);
