// The Values: two glass monoliths (the pillars from the hero image) standing in
// the cloud sea. The section pins while you scroll; the camera orbits the
// pillars and a gold light settles on a different face for each value, while
// the text panel and step nav switch values — same language as The Ascent.
import * as THREE from "three";

function mountValues3D(section) {
  const canvas = section.querySelector(".values3d-canvas");
  const steps = Array.from(section.querySelectorAll(".a3d-step"));
  const navItems = Array.from(section.querySelectorAll(".a3d-nav-item"));
  const markNo = section.querySelector(".a3d-mark-no");
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isSmall = window.matchMedia("(max-width: 768px)").matches;
  const COUNT = steps.length;

  // ---------- renderer / scene ----------
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isSmall ? 1.5 : 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xe6edf4, 30, 110);
  const pmrem = new THREE.PMREMGenerator(renderer);
  // Reflection environment: a blue sky dome over a white cloud horizon, so the
  // glass mirrors sky the way the pillars in the hero image do.
  const envScene = new THREE.Scene();
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(50, 32, 16),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      vertexShader: "varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: [
        "varying vec3 vP;",
        "void main(){",
        "  float y = vP.y;",
        "  vec3 zenith = vec3(0.16, 0.33, 0.58), sky = vec3(0.55, 0.71, 0.88), horizon = vec3(0.97, 0.98, 1.0), below = vec3(0.80, 0.86, 0.92);",
        "  vec3 c = y > 0.0 ? mix(horizon, mix(sky, zenith, smoothstep(0.35, 1.0, y)), smoothstep(0.0, 0.35, y)) : mix(horizon, below, smoothstep(0.0, -0.4, y));",
        "  gl_FragColor = vec4(c, 1.0);",
        "}",
      ].join("\n"),
    })
  );
  envScene.add(dome);
  scene.environment = pmrem.fromScene(envScene, 0.02).texture;
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 300);

  scene.add(new THREE.HemisphereLight(0xffffff, 0x8aa2bf, 0.95));
  // Key light casts real shadows from the pillars onto the plinths and rock.
  const sun = new THREE.DirectionalLight(0xffffff, 2.6);
  sun.position.set(-14, 22, 12);
  sun.castShadow = true;
  sun.shadow.mapSize.set(isSmall ? 1024 : 2048, isSmall ? 1024 : 2048);
  Object.assign(sun.shadow.camera, { left: -12, right: 12, top: 14, bottom: -8, near: 1, far: 70 });
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.03;
  sun.shadow.radius = 4;
  scene.add(sun);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const goldLight = new THREE.PointLight(0xe6c47e, 0, 18, 1.6);
  scene.add(goldLight);

  // ---------- snowy rock summit the pillars stand on ----------
  const vnoise = (x, y, z) => {
    const s = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719) * 43758.5453;
    return s - Math.floor(s);
  };
  const smoothNoise = (x, y, z) => {
    const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
    const xf = x - xi, yf = y - yi, zf = z - zi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), w = zf * zf * (3 - 2 * zf);
    const l = (a, b, t) => a + (b - a) * t;
    const c = (dx, dy, dz) => vnoise(xi + dx, yi + dy, zi + dz);
    return l(l(l(c(0, 0, 0), c(1, 0, 0), u), l(c(0, 1, 0), c(1, 1, 0), u), v),
             l(l(c(0, 0, 1), c(1, 0, 1), u), l(c(0, 1, 1), c(1, 1, 1), u), v), w);
  };
  const rockGeo = new THREE.IcosahedronGeometry(1, isSmall ? 5 : 6);
  const rp = rockGeo.attributes.position, tmpv = new THREE.Vector3();
  for (let i = 0; i < rp.count; i++) {
    tmpv.fromBufferAttribute(rp, i);
    let n = 0, a = 0.5, f = 1.6;
    for (let o = 0; o < 4; o++) { n += (smoothNoise(tmpv.x * f + 3, tmpv.y * f, tmpv.z * f) - 0.5) * a; a *= 0.5; f *= 2.1; }
    tmpv.multiplyScalar(1 + n * 0.7);
    // a peak that narrows upward: wide in the clouds, a small ledge on top
    const taper = 1 - Math.max(0, tmpv.y) * 0.35;
    tmpv.set(tmpv.x * 6.8 * taper, tmpv.y * 6.5, tmpv.z * 5.6 * taper);
    if (tmpv.y > 4.6) tmpv.y = 4.6 + (tmpv.y - 4.6) * 0.06;   // flattened ledge for the plinths
    rp.setXYZ(i, tmpv.x, tmpv.y, tmpv.z);
  }
  rockGeo.computeVertexNormals();
  const rn = rockGeo.attributes.normal;
  const rockColors = new Float32Array(rp.count * 3);
  const snowC = new THREE.Color(0xf2f6fa), rockC = new THREE.Color(0x7d90a6), darkC = new THREE.Color(0x4d6079), tc = new THREE.Color();
  for (let i = 0; i < rp.count; i++) {
    const up = rn.getY(i);
    const n = smoothNoise(rp.getX(i) * 0.9, rp.getY(i) * 0.9, rp.getZ(i) * 0.9);
    tc.copy(darkC).lerp(rockC, Math.min(1, Math.max(0, up + 0.6 + (n - 0.5) * 0.4)));
    const snow = Math.min(1, Math.max(0, (up - 0.62 + (n - 0.5) * 0.3) * 3.5));
    tc.lerp(snowC, snow);
    rockColors.set([tc.r, tc.g, tc.b], i * 3);
  }
  rockGeo.setAttribute("color", new THREE.BufferAttribute(rockColors, 3));
  const rock = new THREE.Mesh(rockGeo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, metalness: 0 }));
  rock.position.set(0.3, -4.6, -0.6);
  rock.castShadow = true;
  rock.receiveShadow = true;
  scene.add(rock);
  const LEDGE = rock.position.y + 4.6;   // top of the flattened ledge

  // ---------- monoliths ----------
  // Sky reflection baked into a vertical gradient with a diagonal sheen, so each
  // pane reads as mirrored glass rather than a flat tinted box.
  const glassMap = (() => {
    const c = document.createElement("canvas"); c.width = 64; c.height = 512;
    const g = c.getContext("2d");
    const v = g.createLinearGradient(0, 0, 0, 512);
    v.addColorStop(0, "#eef5fb"); v.addColorStop(0.35, "#a9c3de"); v.addColorStop(0.7, "#6f92b9"); v.addColorStop(1, "#8fb0d1");
    g.fillStyle = v; g.fillRect(0, 0, 64, 512);
    g.globalAlpha = 0.35; g.fillStyle = "#ffffff";
    g.beginPath(); g.moveTo(0, 140); g.lineTo(64, 60); g.lineTo(64, 110); g.lineTo(0, 200); g.closePath(); g.fill();
    g.globalAlpha = 0.18;
    g.beginPath(); g.moveTo(0, 260); g.lineTo(64, 200); g.lineTo(64, 215); g.lineTo(0, 280); g.closePath(); g.fill();
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  })();
  const glass = new THREE.MeshPhysicalMaterial({
    color: 0xffffff, map: glassMap, metalness: 0.35, roughness: 0.04, transparent: true, opacity: 0.88,
    envMapIntensity: 1.0, clearcoat: 1, clearcoatRoughness: 0.03, side: THREE.DoubleSide, depthWrite: false,
  });
  const stone = new THREE.MeshStandardMaterial({ color: 0xdfe5ec, roughness: 0.7, metalness: 0 });
  const metal = new THREE.MeshStandardMaterial({ color: 0xc3ccd6, roughness: 0.28, metalness: 0.9 });
  const goldMat = new THREE.LineBasicMaterial({ color: 0xd9bb7c, transparent: true, opacity: 0 });

  const bar = (sx, sy, sz, x, y, z, parent) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), metal);
    m.position.set(x, y, z); m.castShadow = true; parent.add(m);
  };
  const monolith = (w, h, d, x, z, rotY) => {
    const g = new THREE.Group();
    const box = new THREE.BoxGeometry(w, h, d);
    const pane = new THREE.Mesh(box, glass);
    pane.position.y = h / 2;
    pane.castShadow = true;
    g.add(pane);
    // brushed-metal frame on the edges
    const t = 0.09;
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) bar(t, h, t, sx * w / 2, h / 2, sz * d / 2, g);
    for (const y of [0, h]) for (const sz of [-1, 1]) bar(w + t, t, t, 0, y, sz * d / 2, g);
    for (const y of [0, h]) for (const sx of [-1, 1]) bar(t, t, d, sx * w / 2, y, 0, g);
    const gold = new THREE.LineSegments(new THREE.EdgesGeometry(box), goldMat.clone());
    gold.position.y = h / 2;
    gold.scale.setScalar(1.012);
    g.add(gold);
    // stepped stone plinth sitting on the rock ledge
    let y = 0;
    [[w + 0.3, 0.25, d + 0.45], [w + 0.75, 0.3, d + 0.9], [w + 1.25, 0.4, d + 1.4]].forEach(([bw, bh, bd]) => {
      const step = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, bd), stone);
      step.position.y = y - bh / 2;
      step.castShadow = true; step.receiveShadow = true;
      g.add(step);
      y -= bh;
    });
    g.position.set(x, LEDGE - y, z);   // plinth base rests on the ledge
    g.rotation.y = rotY;
    scene.add(g);
    return { group: g, gold, w, h, d };
  };
  const tall = monolith(2.4, 12.5, 0.55, -1.7, 0.4, 0.28);
  const short = monolith(2.0, 9.4, 0.55, 2.3, -1.6, -0.32);


  // ---------- gold glow that moves to a different face per value ----------
  const glowTex = (() => {
    const c = document.createElement("canvas"); c.width = c.height = 128;
    const g = c.getContext("2d");
    const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad.addColorStop(0, "rgba(255,236,190,1)"); grad.addColorStop(0.28, "rgba(214,170,90,0.75)"); grad.addColorStop(1, "rgba(214,170,90,0)");
    g.fillStyle = grad; g.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
  })();
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, transparent: true, depthWrite: false, opacity: 0 }));
  glow.scale.setScalar(8);
  scene.add(glow);

  scene.updateMatrixWorld(true);
  const local = (m, x, y, z) => m.group.localToWorld(new THREE.Vector3(x, y, z));
  // 0 trust: face of the tall pillar · 1 expertise: its edge, higher up
  // 2 results: the shorter pillar · 3 personalized: the space between them
  const glowSpots = [
    local(tall, 0, 7.5, tall.d / 2 + 0.4),
    local(tall, tall.w / 2 + 0.3, 10.5, 0),
    local(short, 0, 6.5, short.d / 2 + 0.4),
    new THREE.Vector3(0.4, LEDGE + 5.2, -0.4),
  ];
  const glowTargets = [[tall], [tall], [short], [tall, short]];

  // ---------- clouds ----------
  const loader = new THREE.TextureLoader();
  const cloudTex = [1, 2, 3, 4].map(n => { const t = loader.load(`./img/clouds/cloud-${n}.webp`); t.colorSpace = THREE.SRGBColorSpace; return t; });
  const clouds = [];
  const rnd = (a, b) => a + Math.random() * (b - a);
  const addCloud = (x, y, z, w, opacity) => {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: cloudTex[clouds.length % 4], transparent: true, opacity, depthWrite: false, fog: true }));
    sp.position.set(x, y, z); sp.scale.set(w, w * 0.45, 1);
    sp.userData.drift = rnd(0.1, 0.35) * (Math.random() < 0.5 ? -1 : 1);
    scene.add(sp); clouds.push(sp);
  };
  for (let i = 0; i < (isSmall ? 26 : 42); i++) {
    const a = rnd(0, Math.PI * 2), r = rnd(8, 55);
    addCloud(Math.cos(a) * r, rnd(-3.5, -1.2), Math.sin(a) * r, rnd(14, 28), rnd(0.8, 0.98));
  }
  for (let i = 0; i < (isSmall ? 8 : 14); i++) {
    const a = rnd(0, Math.PI * 2), r = rnd(8.5, 12);
    addCloud(Math.cos(a) * r, rnd(-1.6, -0.2), Math.sin(a) * r * 0.85, rnd(9, 15), rnd(0.55, 0.8));
  }
  for (let i = 0; i < (isSmall ? 5 : 9); i++) {
    const a = rnd(0, Math.PI * 2), r = rnd(9, 16);
    addCloud(Math.cos(a) * r, rnd(4, 9), Math.sin(a) * r, rnd(6, 10), rnd(0.18, 0.32));
  }

  // ---------- steps ----------
  let current = -1;
  const setStep = (index) => {
    if (index === current) return;
    current = index;
    if (markNo) markNo.textContent = String(index + 1).padStart(2, "0");
    steps.forEach((s, i) => {
      s.classList.toggle("is-active", i === index);
      if (i === index) s.setAttribute("aria-current", "step"); else s.removeAttribute("aria-current");
    });
    navItems.forEach((n, i) => {
      n.classList.toggle("is-active", i === index);
      if (i === index) n.setAttribute("aria-current", "step"); else n.removeAttribute("aria-current");
    });
  };
  const START = 0.06, SPAN = 0.88;
  navItems.forEach((item, i) => {
    item.addEventListener("click", () => {
      const travel = section.offsetHeight - window.innerHeight;
      const top = section.getBoundingClientRect().top + window.scrollY;
      const target = top + travel * (START + SPAN * ((i + 0.5) / COUNT));
      if (window.lenis) window.lenis.scrollTo(target, { duration: 1.6 });
      else window.scrollTo({ top: target, behavior: "smooth" });
    });
  });

  // ---------- camera ----------
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  if (!isSmall && !reduced) {
    window.addEventListener("pointermove", (e) => {
      pointer.tx = e.clientX / window.innerWidth - 0.5;
      pointer.ty = e.clientY / window.innerHeight - 0.5;
    }, { passive: true });
  }
  const look = new THREE.Vector3(0.2, LEDGE + 4.8, -0.4);
  const updateCamera = (p, dt) => {
    pointer.x += (pointer.tx - pointer.x) * Math.min(1, dt * 3);
    pointer.y += (pointer.ty - pointer.y) * Math.min(1, dt * 3);
    const angle = -0.55 + p * 2.3 + pointer.x * 0.3;
    const radius = isSmall ? 30 : 23;
    camera.position.set(Math.sin(angle) * radius, 5.5 + p * 3 - pointer.y * 2, Math.cos(angle) * radius);
    camera.lookAt(look);
  };

  const resize = () => {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.fov = w < h ? 52 : 40;
    if (w > 768) camera.setViewOffset(w, h, -w * 0.17, 0, w, h);
    else camera.setViewOffset(w, h, 0, h * 0.14, w, h);
    camera.updateProjectionMatrix();
  };
  window.addEventListener("resize", resize);
  resize();

  // ---------- loop ----------
  let shown = reduced ? 0.5 : 0, glowIdx = 0;
  const glowPos = glowSpots[0].clone();
  const readProgress = () => {
    const rect = section.getBoundingClientRect();
    const travel = rect.height - window.innerHeight;
    return travel > 0 ? Math.min(1, Math.max(0, -rect.top / travel)) : 0;
  };

  let running = false, last = performance.now();
  const frame = (now) => {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    const progress = reduced ? 0.5 : readProgress();
    shown += (progress - shown) * Math.min(1, dt * 5);

    const t = Math.min(0.999, Math.max(0, (shown - START) / SPAN));
    const index = Math.min(COUNT - 1, Math.floor(t * COUNT));
    setStep(index);

    // glow and gold edges ease toward the current value
    glowIdx = index;
    glowPos.lerp(glowSpots[glowIdx], Math.min(1, dt * 3));
    glow.position.copy(glowPos);
    goldLight.position.copy(glowPos);
    const pulse = 0.85 + Math.sin(now / 900) * 0.15;
    glow.material.opacity += (1.0 * pulse - glow.material.opacity) * Math.min(1, dt * 3);
    goldLight.intensity += (60 - goldLight.intensity) * Math.min(1, dt * 3);
    [tall, short].forEach(m => {
      const on = glowTargets[glowIdx].includes(m) ? 0.9 : 0.12;
      m.gold.material.opacity += (on - m.gold.material.opacity) * Math.min(1, dt * 3);
    });

    if (!reduced) clouds.forEach(c => {
      c.position.x += c.userData.drift * dt;
      if (c.position.x > 55) c.position.x = -55;
      if (c.position.x < -55) c.position.x = 55;
    });

    updateCamera(shown, dt);
    renderer.render(scene, camera);
    if (running) requestAnimationFrame(frame);
  };

  // Only render while the section is near the viewport.
  new IntersectionObserver(([entry]) => {
    const was = running;
    running = entry.isIntersecting;
    if (running && !was) { last = performance.now(); requestAnimationFrame(frame); }
  }, { rootMargin: "200px 0px" }).observe(section);
}

const valuesSection = document.querySelector(".values3d");
if (valuesSection) mountValues3D(valuesSection);
