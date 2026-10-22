// The Ascent → The Values: one continuous scroll-driven 3D journey.
// 1. Climb: the camera orbits the peak while a gold route draws up a spiral
//    trail and each process step lights up at its marker.
// 2. Discover: from the summit the camera swings down into a valley at the
//    foot of the mountain, where two glass pillars stand on the ground.
// 3. Values: the camera circles the pillars; a gold light settles on a
//    different face for each value.
// 4. Rise: the camera lifts back up into the clouds, toward the next section.
import * as THREE from "three";

function mountJourney(section) {
  const canvas = section.querySelector(".ascent3d-canvas");
  const labelsEl = section.querySelector(".camp-labels");
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isSmall = window.matchMedia("(max-width: 768px)").matches;

  // Scroll phases (fractions of the pinned section)
  const CLIMB_END = 0.48, VALUES_START = 0.57, VALUES_END = 0.84;

  // ---------- noise ----------
  const hash = (x, y) => {
    const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
    return s - Math.floor(s);
  };
  const smooth = t => t * t * (3 - 2 * t);
  const valueNoise = (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y);
    const xf = x - xi, yf = y - yi;
    const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
    const u = smooth(xf), v = smooth(yf);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  };
  const ridged = (x, y) => {
    let sum = 0, amp = 0.5, freq = 1;
    for (let o = 0; o < 5; o++) {
      const n = 1 - Math.abs(valueNoise(x * freq, y * freq) * 2 - 1);
      sum += n * n * amp;
      amp *= 0.5; freq *= 2.03;
    }
    return sum;
  };
  const sstep = (a, b, v) => { const t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t); };

  // ---------- terrain ----------
  const PEAK = 19;
  // Pyramid-like horn: faces meet in sharp ridges, slightly concave like real alpine peaks.
  const horn = (x, z, cx, cz, R, h, rot = 0, faces = 4, k = 1.35) => {
    const dx = x - cx, dz = z - cz;
    let d = 0;
    for (let i = 0; i < faces; i++) {
      const a = rot + (i / faces) * Math.PI * 2;
      d = Math.max(d, dx * Math.cos(a) + dz * Math.sin(a));
    }
    const r = Math.hypot(dx, dz);
    const m = d * 0.72 + r * 0.28;
    return h * Math.pow(Math.max(0, 1 - m / R), k);
  };
  const rawHeight = (x, z) => {
    const wx = x + (valueNoise(x * 0.045 + 7.3, z * 0.045) - 0.5) * 7;
    const wz = z + (valueNoise(x * 0.045, z * 0.045 + 3.9) - 0.5) * 7;
    let y = horn(wx, wz, 0, 0, 21, PEAK, 0.35);
    y += 3.2 * Math.exp(-(wx * wx + wz * wz) / (2 * 15 * 15));
    y += horn(wx, wz, 26, 20, 17, 12.5, 0.1);
    y += horn(wx, wz, 19, -13, 15, 10, 0.8, 3);
    y += horn(wx, wz, -21, -12, 16, 9.5, 0.5);
    y += horn(wx, wz, 4, -36, 20, 10, 0.2, 5);
    y += horn(wx, wz, -36, 16, 17, 6, 0.6);
    const crag = ridged(wx * 0.08 + 3.1, wz * 0.08 + 1.7);
    y += (crag - 0.35) * (0.5 + y * 0.32);
    const ang = Math.atan2(wz, wx), r = Math.hypot(wx, wz);
    const g = 1 - Math.abs(valueNoise(ang * 11 + valueNoise(r * 0.2, ang) * 2, r * 0.18) * 2 - 1);
    y -= Math.pow(g, 4) * 0.9 * Math.min(1, y / 6);
    y += (ridged(x * 0.45 + 9, z * 0.45 + 4) - 0.45) * 0.35 * (0.2 + y / PEAK);
    return y - 2.4;
  };
  // The valley: a sheltered hollow well out from the peak. A low snowy floor is
  // ringed by rolling hills, and snow drifts bank up against the pillars' base
  // so part of the foundation sits buried in the ground.
  const VALLEY = new THREE.Vector3(-27, 1.2, 37);
  const bump = (x, z, cx, cz, r, h) => h * Math.exp(-((x - cx) ** 2 + (z - cz) ** 2) / (2 * r * r));
  const height = (x, z) => {
    const y = rawHeight(x, z);
    const dx = x - VALLEY.x, dz = z - VALLEY.z;
    const d = Math.hypot(dx, dz);
    const ang = Math.atan2(dz, dx);
    const floor = VALLEY.y + (valueNoise(x * 0.35, z * 0.35) - 0.5) * 0.3;
    // hills rising around the hollow, uneven so it reads as natural ground
    // sample noise around a circle (cos/sin) so there is no seam where the angle wraps
    const rim = 7.5 * sstep(9, 22, d) * (0.65 + 0.7 * valueNoise(Math.cos(ang) * 1.8 + 4, Math.sin(ang) * 1.8 + 2));
    // drifts piled against the base (temple is rotated, so these sit at its sides/back)
    const drift = bump(x, z, VALLEY.x + 3.0, VALLEY.z - 2.2, 2.2, 1.5)
                + bump(x, z, VALLEY.x - 3.2, VALLEY.z - 1.2, 1.9, 1.1)
                + bump(x, z, VALLEY.x + 0.4, VALLEY.z - 3.4, 2.4, 1.3);
    const valleyH = floor + rim + drift;
    const k = 1 - sstep(24, 36, d);
    return y + (valleyH - y) * k;
  };

  // ---------- renderer / scene ----------
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isSmall ? 1.5 : 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.3;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xe8edf2, 42, 165);
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 400);

  scene.add(new THREE.HemisphereLight(0xffffff, 0x7d97b6, 1.25));
  // Key light from the left; it also casts the pillars' shadows in the valley.
  const sun = new THREE.DirectionalLight(0xffffff, 3.2);
  sun.position.copy(VALLEY).add(new THREE.Vector3(-16, 42, -8));   // high sun: short shadows that stay in the hollow
  sun.target.position.copy(VALLEY);
  sun.castShadow = true;
  sun.shadow.mapSize.set(isSmall ? 1024 : 2048, isSmall ? 1024 : 2048);
  Object.assign(sun.shadow.camera, { left: -16, right: 16, top: 18, bottom: -10, near: 5, far: 120 });
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.04;
  sun.shadow.radius = 4;
  scene.add(sun, sun.target);

  // Fine rock/snow relief as a tileable normal map generated on the fly.
  const makeNormalMap = (size = 256, period = 16) => {
    const h = new Float32Array(size * size);
    const lat = (i, j) => hash(((i % period) + period) % period, ((j % period) + period) % period);
    const vn = (x, y) => {
      const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
      const u = smooth(xf), v = smooth(yf);
      const a = lat(xi, yi), b = lat(xi + 1, yi), c = lat(xi, yi + 1), d = lat(xi + 1, yi + 1);
      return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
    };
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      let s = 0, amp = 0.5, f = 1;
      for (let o = 0; o < 4; o++) {
        s += (1 - Math.abs(vn(x / size * period * f, y / size * period * 3 * f) * 2 - 1)) * amp;
        amp *= 0.5; f *= 2;
      }
      h[y * size + x] = s;
    }
    const c = document.createElement("canvas"); c.width = c.height = size;
    const ctx = c.getContext("2d"); const img = ctx.createImageData(size, size);
    const at = (x, y) => h[((y + size) % size) * size + ((x + size) % size)];
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const dx = (at(x + 1, y) - at(x - 1, y)) * 3, dy = (at(x, y + 1) - at(x, y - 1)) * 3;
      const len = Math.hypot(dx, dy, 1);
      const k = (y * size + x) * 4;
      img.data[k] = (-dx / len * 0.5 + 0.5) * 255; img.data[k + 1] = (-dy / len * 0.5 + 0.5) * 255;
      img.data[k + 2] = (1 / len * 0.5 + 0.5) * 255; img.data[k + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(26, 26);
    return t;
  };

  const SIZE = 160, SEG = isSmall ? 220 : 380;
  const geo = new THREE.PlaneGeometry(SIZE, SIZE, SEG, SEG);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const summit = new THREE.Vector3(0, -Infinity, 0);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    const y = height(x, z);
    pos.setY(i, y);
    if (Math.hypot(x, z) < 8 && y > summit.y) summit.set(x, y, z);
  }
  geo.computeVertexNormals();

  // Snow vs rock per pixel from slope plus noise: snow on gentler ground, blue-grey rock on steep faces.
  const terrainMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.82, metalness: 0, normalMap: makeNormalMap(), normalScale: new THREE.Vector2(0.55, 0.55) });
  terrainMat.onBeforeCompile = (shader) => {
    shader.uniforms.uSnow = { value: new THREE.Color(0xf6f9fc) };
    shader.uniforms.uRock = { value: new THREE.Color(0xa3b1c1) };
    shader.uniforms.uRockDark = { value: new THREE.Color(0x71849b) };
    shader.uniforms.uHaze = { value: new THREE.Color(0xe6edf4) };
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vWPos;\nvarying vec3 vWNrm;")
      .replace("#include <worldpos_vertex>", "#include <worldpos_vertex>\nvWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;\nvWNrm = normalize(mat3(modelMatrix) * objectNormal);");
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", [
        "#include <common>",
        "varying vec3 vWPos; varying vec3 vWNrm;",
        "uniform vec3 uSnow; uniform vec3 uRock; uniform vec3 uRockDark; uniform vec3 uHaze;",
        "float h21(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }",
        "float vnoise(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f*f*(3.0-2.0*f);",
        "  return mix(mix(h21(i), h21(i+vec2(1.0,0.0)), u.x), mix(h21(i+vec2(0.0,1.0)), h21(i+vec2(1.0,1.0)), u.x), u.y); }",
        "float fbm(vec2 p){ float s = 0.0, a = 0.5; for (int i = 0; i < 5; i++){ s += vnoise(p) * a; p *= 2.07; a *= 0.5; } return s; }"
      ].join("\n"))
      .replace("#include <color_fragment>", [
        "#include <color_fragment>",
        "float slope = normalize(vWNrm).y;",
        "float n = fbm(vWPos.xz * 0.55);",
        "float streak = fbm(vec2(vWPos.x * 0.35 + vWPos.z * 0.2, vWPos.y * 1.8));",
        "float snowF = smoothstep(0.40, 0.58, slope + (n - 0.5) * 0.32 + (streak - 0.5) * 0.30 + clamp(vWPos.y, 0.0, 20.0) * 0.006);",
        "vec3 rockC = mix(uRockDark, uRock, smoothstep(0.25, 0.75, fbm(vWPos.xz * 1.7 + vWPos.y)));",
        "diffuseColor.rgb = mix(rockC, uSnow, snowF);",
        "diffuseColor.rgb = mix(diffuseColor.rgb, uHaze, smoothstep(2.0, -1.5, vWPos.y) * 0.85);"
      ].join("\n"));
  };
  const terrain = new THREE.Mesh(geo, terrainMat);
  terrain.receiveShadow = true;
  scene.add(terrain);

  // ---------- the trail ----------
  const TRAIL_A0 = Math.PI / 2 - 0.35;
  const TRAIL_SWEEP = Math.PI * 1.15;
  const trailAngle = t => TRAIL_A0 + t * TRAIL_SWEEP;
  const pts = [];
  const N = 320;
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const a = trailAngle(t);
    const r = 15 * Math.pow(1 - t, 0.9) + Math.sin(t * Math.PI * 9) * 1.4 * (1 - t);
    const cx = summit.x * t, cz = summit.z * t;
    const x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r;
    pts.push(new THREE.Vector3(x, height(x, z) + 0.25, z));
  }
  const curve = new THREE.CatmullRomCurve3(pts);
  const TUBE_SEG = 600, RAD_SEG = 6;
  scene.add(new THREE.Mesh(new THREE.TubeGeometry(curve, TUBE_SEG, 0.06, RAD_SEG, false), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35 })));
  const trailGold = new THREE.Mesh(new THREE.TubeGeometry(curve, TUBE_SEG, 0.09, RAD_SEG, false), new THREE.MeshBasicMaterial({ color: 0xe6cf9c }));
  scene.add(trailGold);
  const indexPerSeg = RAD_SEG * 6;

  const radialTex = (stops, size = 64) => {
    const c = document.createElement("canvas"); c.width = c.height = size;
    const g = c.getContext("2d");
    const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    stops.forEach(([o, col]) => grad.addColorStop(o, col));
    g.fillStyle = grad; g.fillRect(0, 0, size, size);
    return new THREE.CanvasTexture(c);
  };
  const climber = new THREE.Sprite(new THREE.SpriteMaterial({
    map: radialTex([[0, "rgba(255,244,214,1)"], [0.35, "rgba(241,223,180,0.8)"], [1, "rgba(241,223,180,0)"]]),
    depthTest: false, transparent: true,
  }));
  climber.scale.setScalar(1.6);
  scene.add(climber);

  // ---------- camps ----------
  const stops = [0, 0.27, 0.52, 0.76, 1];
  const names = ["01 · Discovery & Mandate", "02 · Analysis & Due Diligence", "03 · Strategy & Structuring", "04 · Execution", "05 · Stewardship & Review"];
  const camps = stops.map((f, i) => {
    const p = curve.getPointAt(f);
    const marker = new THREE.Mesh(new THREE.SphereGeometry(0.32, 20, 16), new THREE.MeshStandardMaterial({ color: 0x13294b, emissive: 0x000000, roughness: 0.4 }));
    marker.position.copy(p).add(new THREE.Vector3(0, 0.2, 0));
    scene.add(marker);
    const label = document.createElement("span");
    label.className = "camp-label";
    label.textContent = names[i];
    labelsEl.appendChild(label);
    return { f, p: marker.position, marker, label };
  });
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.2, 8), new THREE.MeshStandardMaterial({ color: 0xf1dfb4 }));
  pole.position.copy(summit).add(new THREE.Vector3(0, 1.3, 0));
  scene.add(pole);
  const flagShape = new THREE.Shape(); flagShape.moveTo(0, 0); flagShape.lineTo(1.2, -0.35); flagShape.lineTo(0, -0.7);
  const flag = new THREE.Mesh(new THREE.ShapeGeometry(flagShape), new THREE.MeshStandardMaterial({ color: 0xb8975a, side: THREE.DoubleSide }));
  flag.position.copy(summit).add(new THREE.Vector3(0.04, 2.4, 0));
  scene.add(flag);

  // ---------- the pillars in the valley ----------
  // Glass mirrors a blue sky dome (given to the glass only, so the snow keeps its look).
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = new THREE.Scene();
  envScene.add(new THREE.Mesh(new THREE.SphereGeometry(50, 32, 16), new THREE.ShaderMaterial({
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
  })));
  const glassEnv = pmrem.fromScene(envScene, 0.02).texture;
  // Like the hero image: two very slender, clear glass panes in thin silver
  // frames that mirror bright sky, clouds and peaks, standing on a stepped
  // architectural base of fluted marble blocks and cantilevered slabs.
  // Glassmorphism: frosted, translucent panes. On desktop they truly refract and
  // blur what is behind them (transmission + roughness); phones get a lighter
  // see-through frosted material.
  const paneMat = () => isSmall
    ? new THREE.MeshPhysicalMaterial({
        color: 0xdcebf8, metalness: 0, roughness: 0.18, transparent: true, opacity: 0.36,
        envMap: glassEnv, envMapIntensity: 1.1, clearcoat: 1, clearcoatRoughness: 0.08,
        side: THREE.DoubleSide, depthWrite: false,
      })
    : new THREE.MeshPhysicalMaterial({
        color: 0xeaf3fb, metalness: 0, roughness: 0.16, transmission: 1, thickness: 0.35, ior: 1.38,
        attenuationColor: new THREE.Color(0xbcd6ee), attenuationDistance: 3.5,
        envMap: glassEnv, envMapIntensity: 1.5, clearcoat: 1, clearcoatRoughness: 0.06,
        specularIntensity: 1, transparent: true, side: THREE.DoubleSide,
      });
  const frameMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.35, roughness: 0.2, metalness: 0.4, envMap: glassEnv });

  // Fluted marble: vertical grooves painted into the colour map.
  const fluteMap = (() => {
    const c = document.createElement("canvas"); c.width = 256; c.height = 64;
    const g = c.getContext("2d");
    g.fillStyle = "#e9edf1"; g.fillRect(0, 0, 256, 64);
    for (let x = 0; x < 256; x += 16) {
      const grad = g.createLinearGradient(x, 0, x + 16, 0);
      grad.addColorStop(0, "#f7f9fb"); grad.addColorStop(0.45, "#dfe5eb"); grad.addColorStop(0.75, "#b9c3ce"); grad.addColorStop(1, "#f2f5f8");
      g.fillStyle = grad; g.fillRect(x, 0, 16, 64);
    }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
  })();
  const marble = (repeatX) => {
    const map = fluteMap.clone(); map.needsUpdate = true; map.repeat.set(repeatX, 1);
    return new THREE.MeshStandardMaterial({ map, roughness: 0.55, metalness: 0 });
  };
  const slabMat = new THREE.MeshStandardMaterial({ color: 0xe4e9ee, roughness: 0.6 });
  const snowMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.95 });
  const goldLine = new THREE.LineBasicMaterial({ color: 0xd9bb7c, transparent: true, opacity: 0 });
  const PILLAR_SCALE = 0.72;   // tops out close to the summit's height, like the hero image

  const temple = new THREE.Group();
  const add = (geo, mat, x, y, z, ry = 0) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z); m.rotation.y = ry;
    m.castShadow = true; m.receiveShadow = true;
    temple.add(m);
    return m;
  };
  const block = (w, h, d, x, y, z, fluted = true, snowTop = true) => {
    add(new THREE.BoxGeometry(w, h, d), fluted ? marble(Math.max(1, Math.round(w * 1.2))) : slabMat, x, y + h / 2, z);
    if (snowTop) add(new THREE.BoxGeometry(w * 0.96, 0.06, d * 0.96), snowMat, x, y + h + 0.03, z);
  };
  const pane = (w, h, x, y, z, seed) => {
    const d = 0.32, t = 0.07;
    const g = new THREE.Group();
    const glassBox = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), paneMat());
    glassBox.position.y = h / 2;
    glassBox.castShadow = true;   // frosted glass still throws a soft shadow; without it only the frame did
    g.add(glassBox);
    const bar = (sx, sy, sz, bx, by, bz) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), frameMat);
      m.position.set(bx, by, bz); m.castShadow = true; g.add(m);
    };
    for (const sx of [-1, 1]) bar(t, h + t, d + 0.04, sx * w / 2, h / 2, 0);
    for (const y2 of [0, h]) bar(w + t, t, d + 0.04, 0, y2, 0);
    const gold = new THREE.LineSegments(new THREE.EdgesGeometry(glassBox.geometry), goldLine.clone());
    gold.position.y = h / 2; gold.scale.setScalar(1.02);
    g.add(gold);
    g.position.set(x, y, z);
    temple.add(g);
    return { group: g, gold, w, h, d };
  };

  // Base, from the ground up: broad tiers, then fluted pedestals joined by cantilevered slabs.
  block(7.2, 0.6, 4.6, 0.2, 0, 0.1, false);
  block(5.8, 0.5, 3.8, 0.2, 0.6, 0.0, false);
  block(1.9, 2.6, 1.9, -1.35, 1.1, 0.05);          // pedestal, tall pane
  block(1.9, 3.3, 1.9, 1.55, 1.1, -0.35);          // pedestal, short pane
  block(1.3, 1.8, 1.3, 0.15, 1.1, 1.15);           // front column
  add(new THREE.BoxGeometry(5.6, 0.26, 1.5), slabMat, 0.1, 2.55, 1.0);            // cantilever, front
  add(new THREE.BoxGeometry(5.0, 0.04, 1.4), snowMat, 0.1, 2.70, 1.0);
  add(new THREE.BoxGeometry(1.5, 0.26, 4.6), slabMat, 2.9, 3.1, 0.2);             // cantilever, side
  add(new THREE.BoxGeometry(1.4, 0.04, 4.3), snowMat, 2.9, 3.25, 0.2);
  block(2.4, 0.35, 2.3, -1.35, 3.7, 0.05);         // cap under tall pane
  block(2.4, 0.35, 2.3, 1.55, 4.4, -0.35);         // cap under short pane (higher)

  const tall = pane(1.55, 14.5, -1.35, 4.05 + 0.04, 0.05, 1);
  const short = pane(1.55, 12.0, 1.55, 4.75 + 0.04, -0.35, 2);

  temple.scale.setScalar(PILLAR_SCALE);
  // sunk into the floor: the broad lower tiers sit below ground level
  temple.position.set(VALLEY.x, VALLEY.y - 0.7, VALLEY.z);
  temple.rotation.y = -0.35;
  scene.add(temple);

  scene.updateMatrixWorld(true);
  const local = (m, x, y, z) => m.group.localToWorld(new THREE.Vector3(x, y, z));
  const glowSpots = [
    local(tall, 0, 8.5, 1.0),
    local(tall, 0, 12.5, 1.0),
    local(short, 0, 7.5, 1.0),
    temple.localToWorld(new THREE.Vector3(0.1, 9.5, 1.2)),
  ];
  const glowTargets = [[tall], [tall], [short], [tall, short]];

  // Rise: the light slides up the face of the tall pane, leaves its top and
  // climbs into the cloud ceiling, trailing a soft beam; the camera follows it.
  const tallTop = local(tall, 0, tall.h + 0.4, 0.6);
  const risePath = new THREE.CatmullRomCurve3([
    glowSpots[3].clone(),
    local(tall, 0, tall.h * 0.55, 1.0),
    tallTop.clone(),
    tallTop.clone().add(new THREE.Vector3(0.5, 9, 0)),
    new THREE.Vector3(VALLEY.x + 1, 46, VALLEY.z),
  ]);
  const beamTex = (() => {
    const c = document.createElement("canvas"); c.width = 4; c.height = 256;
    const g = c.getContext("2d");
    const v = g.createLinearGradient(0, 0, 0, 256);
    v.addColorStop(0, "rgba(255,240,205,0.95)"); v.addColorStop(0.6, "rgba(230,200,140,0.45)"); v.addColorStop(1, "rgba(230,200,140,0)");
    g.fillStyle = v; g.fillRect(0, 0, 4, 256);
    return new THREE.CanvasTexture(c);
  })();
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(0.55, 0.55, 1, 20, 1, true),
    new THREE.MeshBasicMaterial({ map: beamTex, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide })
  );
  scene.add(beam);
  const orb = new THREE.Vector3();
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: radialTex([[0, "rgba(255,236,190,1)"], [0.28, "rgba(214,170,90,0.75)"], [1, "rgba(214,170,90,0)"]], 128),
    transparent: true, depthWrite: false, opacity: 0,
  }));
  glow.scale.setScalar(6.5);
  scene.add(glow);
  const goldLight = new THREE.PointLight(0xe6c47e, 0, 18, 1.6);
  scene.add(goldLight);
  const glowPos = glowSpots[0].clone();

  // ---------- clouds ----------
  const loader = new THREE.TextureLoader();
  const cloudTex = [1, 2, 3, 4].map(n => { const t = loader.load(`./img/clouds/cloud-${n}.webp`); t.colorSpace = THREE.SRGBColorSpace; return t; });
  const clouds = [];
  const rnd = (a, b) => a + Math.random() * (b - a);
  const addCloud = (x, y, z, w, opacity, keepValleyClear = true) => {
    if (keepValleyClear && Math.hypot(x - VALLEY.x, z - VALLEY.z) < 22 && y < 20) return;
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: cloudTex[clouds.length % 4], transparent: true, opacity, depthWrite: false, fog: true }));
    sp.position.set(x, y, z); sp.scale.set(w, w * 0.6, 1);
    sp.userData.drift = rnd(0.12, 0.45) * (Math.random() < 0.5 ? -1 : 1);
    scene.add(sp); clouds.push(sp);
  };
  for (let i = 0; i < (isSmall ? 36 : 64); i++) {
    const a = rnd(0, Math.PI * 2), r = rnd(19, 75);
    addCloud(Math.cos(a) * r, rnd(0, 3), Math.sin(a) * r, rnd(20, 38), rnd(0.6, 0.95));
  }
  for (let i = 0; i < (isSmall ? 6 : 10); i++) {
    addCloud(rnd(-30, 34), rnd(1.5, 6), rnd(26, 40), rnd(22, 34), rnd(0.75, 0.95));
  }
  for (let i = 0; i < (isSmall ? 6 : 12); i++) {
    const a = rnd(0, Math.PI * 2), r = rnd(13, 26);
    addCloud(Math.cos(a) * r, rnd(7, 12), Math.sin(a) * r, rnd(9, 16), rnd(0.3, 0.5));
  }
  // Mist pooling just below the valley rim, and a cloud ceiling above it to rise into.
  for (let i = 0; i < (isSmall ? 8 : 14); i++) {
    const a = rnd(0, Math.PI * 2), r = rnd(15, 26);
    addCloud(VALLEY.x + Math.cos(a) * r, rnd(0.5, 2.5), VALLEY.z + Math.sin(a) * r, rnd(10, 18), rnd(0.55, 0.85), false);
  }
  for (let i = 0; i < (isSmall ? 10 : 18); i++) {
    addCloud(VALLEY.x + rnd(-22, 22), rnd(34, 48), VALLEY.z + rnd(-22, 22), rnd(18, 30), rnd(0.75, 0.95), false);
  }

  // ---------- text panels, steps, nav ----------
  const groupProcess = Array.from(section.querySelectorAll(".a3d-group-process"));
  const groupValues = Array.from(section.querySelectorAll(".a3d-group-values"));
  const processSteps = Array.from(section.querySelectorAll(".a3d-group-process .a3d-step"));
  const valueSteps = Array.from(section.querySelectorAll(".a3d-group-values .a3d-step"));
  const processNav = Array.from(section.querySelectorAll(".a3d-group-process .a3d-nav-item"));
  const valuesNav = Array.from(section.querySelectorAll(".a3d-group-values .a3d-nav-item"));
  const processMark = section.querySelector(".a3d-group-process .a3d-mark-no");
  const valuesMark = section.querySelector(".a3d-group-values .a3d-mark-no");
  const hint = section.querySelector(".a3d-hint");

  const activate = (items, index) => items.forEach((el, i) => {
    el.classList.toggle("is-active", i === index);
    if (i === index) el.setAttribute("aria-current", "step"); else el.removeAttribute("aria-current");
  });
  let curProcess = -1, curValue = -1, curGroup = "";
  const setGroup = (name) => {
    if (name === curGroup) return;
    curGroup = name;
    groupProcess.forEach(el => el.classList.toggle("is-hidden", name !== "process"));
    groupValues.forEach(el => el.classList.toggle("is-hidden", name !== "values"));
    if (hint) hint.textContent = name === "values" ? "Scroll to explore" : "Scroll to climb";
  };
  const setProcess = (index) => {
    if (index === curProcess) return;
    curProcess = index;
    if (processMark) processMark.textContent = String(index + 1).padStart(2, "0");
    activate(processSteps, index);
    activate(processNav, index);
    camps.forEach((c, i) => {
      const reached = i <= index;
      c.label.classList.toggle("is-reached", reached);
      c.label.classList.toggle("is-current", i === index);
      c.marker.material.color.set(reached ? 0xb8975a : 0x13294b);
      c.marker.material.emissive.set(reached ? 0x5a4520 : 0x000000);
    });
  };
  const setValue = (index) => {
    if (index === curValue) return;
    curValue = index;
    if (valuesMark) valuesMark.textContent = String(index + 1).padStart(2, "0");
    activate(valueSteps, index);
    activate(valuesNav, index);
  };

  const scrollToProgress = (P) => {
    const travel = section.offsetHeight - window.innerHeight;
    const top = section.getBoundingClientRect().top + window.scrollY;
    if (window.lenis) window.lenis.scrollTo(top + travel * P, { duration: 1.6 });
    else window.scrollTo({ top: top + travel * P, behavior: "smooth" });
  };
  processNav.forEach((item, i) => item.addEventListener("click", () =>
    scrollToProgress(CLIMB_END * Math.min(0.97, 0.1 + 0.8 * stops[i] + 0.01))));
  valuesNav.forEach((item, i) => item.addEventListener("click", () =>
    scrollToProgress(VALUES_START + (VALUES_END - VALUES_START) * ((i + 0.5) / valuesNav.length))));

  // ---------- camera ----------
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  if (!isSmall && !reduced) {
    window.addEventListener("pointermove", (e) => {
      pointer.tx = e.clientX / window.innerWidth - 0.5;
      pointer.ty = e.clientY / window.innerHeight - 0.5;
    }, { passive: true });
  }
  // Climb pose: orbit the peak, following the climber.
  const climbPose = (p, outPos, outLook) => {
    const q = Math.min(1, Math.max(0, (p - 0.1) / 0.8));
    const approach = sstep(0, 0.15, p), reveal = sstep(0.85, 1, p);
    const angle = trailAngle(q) - 0.25 + pointer.x * 0.35;
    const radius = (isSmall ? 62 : 50) - (isSmall ? 14 : 11) * approach + 8 * reveal;
    outPos.set(Math.cos(angle) * radius, 13 + q * 10 + 4 * reveal - pointer.y * 3, Math.sin(angle) * radius);
    outLook.set(summit.x * q, 8 + q * (summit.y - 9), summit.z * q).lerp(curve.getPointAt(q), 0.35 * (1 - reveal));
  };
  // Valley pose: circle the pillars at eye level, slightly above the floor.
  const pillarCenter = VALLEY.clone().add(new THREE.Vector3(0.1, 7.0, -0.2));
  const valleyPose = (t, outPos, outLook) => {
    const angle = Math.atan2(VALLEY.z, VALLEY.x) - 0.9 + t * 1.9 + pointer.x * 0.25;
    const radius = isSmall ? 25 : 20;   // inside the ring of hills
    outPos.set(pillarCenter.x + Math.cos(angle) * radius, VALLEY.y + 7.5 + t * 2.5 - pointer.y * 2, pillarCenter.z + Math.sin(angle) * radius);
    outLook.copy(pillarCenter);
  };
  const posA = new THREE.Vector3(), lookA = new THREE.Vector3(), posB = new THREE.Vector3(), lookB = new THREE.Vector3();
  const tmpV = new THREE.Vector3();
  const updateCamera = (P, dt) => {
    pointer.x += (pointer.tx - pointer.x) * Math.min(1, dt * 3);
    pointer.y += (pointer.ty - pointer.y) * Math.min(1, dt * 3);
    if (P <= CLIMB_END) {
      climbPose(P / CLIMB_END, posA, lookA);
    } else if (P < VALUES_START) {
      // Discover: swing down from the summit view to the valley, arcing above the clouds.
      const k = sstep(CLIMB_END, VALUES_START, P);
      climbPose(1, posA, lookA);
      valleyPose(0, posB, lookB);
      posA.lerp(posB, k);
      posA.y += Math.sin(k * Math.PI) * 6;
      lookA.lerp(lookB, sstep(0, 0.7, k));
    } else if (P <= VALUES_END) {
      valleyPose((P - VALUES_START) / (VALUES_END - VALUES_START), posA, lookA);
    } else {
      // Rise: follow the light up the pane and into the clouds.
      const t = Math.min(1, (P - VALUES_END) / (1 - VALUES_END));
      risePath.getPointAt(sstep(0, 1, t), orb);
      valleyPose(1, posB, lookB);
      const away = tmpV.set(posB.x - orb.x, 0, posB.z - orb.z).normalize();
      const dist = (isSmall ? 30 : 24) - t * 8;
      posA.copy(orb).addScaledVector(away, dist).add(new THREE.Vector3(0, -3 - 3 * (1 - t), 0));
      lookA.copy(orb).add(new THREE.Vector3(0, 2 + t * 4, 0));
      const blend = sstep(0, 0.25, t);
      posA.lerpVectors(posB, posA, blend);
      lookA.lerpVectors(lookB, lookA, blend);
    }
    camera.position.copy(posA);
    camera.lookAt(lookA);
  };

  const resize = () => {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.fov = w < h ? 58 : 45;
    if (w > 768) camera.setViewOffset(w, h, -w * 0.17, 0, w, h);
    else camera.setViewOffset(w, h, 0, h * 0.16, w, h);
    camera.updateProjectionMatrix();
  };
  window.addEventListener("resize", resize);
  resize();

  const projectLabels = (visibleNow) => {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    const camAng = Math.atan2(camera.position.z - summit.z, camera.position.x - summit.x);
    camps.forEach((c, i) => {
      const campAng = Math.atan2(c.p.z - summit.z, c.p.x - summit.x);
      const facing = i === camps.length - 1 || Math.cos(campAng - camAng) > -0.05;
      tmpV.copy(c.p).project(camera);
      const visible = visibleNow && facing && tmpV.z < 1 && tmpV.x > -1.1 && tmpV.x < 1.1 && tmpV.y > -1.1 && tmpV.y < 1.1;
      c.label.style.opacity = visible ? "1" : "0";
      const half = c.label.offsetWidth / 2 + 8;
      const px = Math.min(w - half, Math.max(half, (tmpV.x + 1) / 2 * w));
      c.label.style.transform = `translate(${px.toFixed(1)}px, ${((1 - tmpV.y) / 2 * h).toFixed(1)}px) translate(-50%, -150%)`;
    });
  };

  // ---------- loop ----------
  let shown = reduced ? CLIMB_END : 0;
  const readProgress = () => {
    const rect = section.getBoundingClientRect();
    const travel = rect.height - window.innerHeight;
    return travel > 0 ? Math.min(1, Math.max(0, -rect.top / travel)) : 0;
  };

  let running = false, last = performance.now();
  const frame = (now) => {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    const progress = reduced ? CLIMB_END : readProgress();
    shown += (progress - shown) * Math.min(1, dt * 5);
    const P = shown;

    // climb
    const climbP = Math.min(1, P / CLIMB_END);
    const trailP = Math.min(1, Math.max(0, (climbP - 0.1) / 0.8));
    trailGold.geometry.setDrawRange(0, Math.floor(trailP * TUBE_SEG) * indexPerSeg);
    climber.position.copy(curve.getPointAt(trailP)).add(new THREE.Vector3(0, 0.35, 0));
    climber.material.opacity = 0.75 + Math.sin(now / 300) * 0.25;
    let pIndex = 0;
    stops.forEach((f, i) => { if (trailP >= f - 0.02) pIndex = i; });
    setProcess(pIndex);

    // values
    const inValues = P >= (CLIMB_END + VALUES_START) / 2;
    if (!reduced) setGroup(inValues ? "values" : "process");
    const vt = Math.min(0.999, Math.max(0, (P - VALUES_START) / (VALUES_END - VALUES_START)));
    const vIndex = Math.min(3, Math.floor(vt * 4));
    setValue(vIndex);
    const lightOn = sstep(CLIMB_END, VALUES_START, P);
    const riseT = Math.min(1, Math.max(0, (P - VALUES_END) / (1 - VALUES_END)));
    if (riseT > 0) {
      risePath.getPointAt(sstep(0, 1, riseT), orb);
      glowPos.lerp(orb, Math.min(1, dt * 8));
    } else {
      glowPos.lerp(glowSpots[vIndex], Math.min(1, dt * 3));
    }
    // beam from the top of the pane up to the light
    const beamLen = Math.max(0, glowPos.y - tallTop.y);
    beam.visible = beamLen > 0.1;
    if (beam.visible) {
      beam.position.set((glowPos.x + tallTop.x) / 2, tallTop.y + beamLen / 2, (glowPos.z + tallTop.z) / 2);
      beam.scale.set(1, beamLen, 1);
      beam.material.opacity = 0.75 * sstep(0.15, 0.4, riseT) * (1 - sstep(0.92, 1, riseT));
    }
    glow.scale.setScalar(6.5 + riseT * 10);
    glow.position.copy(glowPos);
    goldLight.position.copy(glowPos);
    glow.material.opacity = (0.85 + Math.sin(now / 900) * 0.15) * lightOn;
    goldLight.intensity = 30 * lightOn;
    [tall, short].forEach(m => {
      const on = (riseT > 0 ? 0.9 : (glowTargets[vIndex].includes(m) ? 0.9 : 0.12)) * lightOn;
      m.gold.material.opacity += (on - m.gold.material.opacity) * Math.min(1, dt * 3);
    });

    if (!reduced) clouds.forEach(c => { c.position.x += c.userData.drift * dt; if (c.position.x > 75) c.position.x = -75; if (c.position.x < -75) c.position.x = 75; });
    flag.rotation.y = Math.sin(now / 700) * 0.25;

    updateCamera(P, dt);
    renderer.render(scene, camera);
    projectLabels(P < CLIMB_END + 0.02);
    if (running) requestAnimationFrame(frame);
  };

  new IntersectionObserver(([entry]) => {
    const was = running;
    running = entry.isIntersecting;
    if (running && !was) { last = performance.now(); requestAnimationFrame(frame); }
  }, { rootMargin: "200px 0px" }).observe(section);
}

const journeySection = document.querySelector(".ascent3d");
if (journeySection) mountJourney(journeySection);
