// The Ascent: scroll-driven 3D mountain for the Process section.
// The camera orbits the peak as you scroll, the gold route draws up a spiral
// trail, and each step lights up when its marker is reached.
import * as THREE from "three";

function mountAscent3D(section) {

    const canvas = section.querySelector(".ascent3d-canvas");
    const steps = Array.from(section.querySelectorAll(".a3d-step"));
    const labelsEl = section.querySelector(".camp-labels");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const isSmall = window.matchMedia("(max-width: 768px)").matches;

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

    // ---------- terrain height (sharp alpine "horn" + satellite peaks + erosion gullies) ----------
    const PEAK = 19;
    const smoothstep = (a, b, v) => { const t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
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
    const height = (x, z) => {
      const wx = x + (valueNoise(x * 0.045 + 7.3, z * 0.045) - 0.5) * 7;
      const wz = z + (valueNoise(x * 0.045, z * 0.045 + 3.9) - 0.5) * 7;
      let y = horn(wx, wz, 0, 0, 21, PEAK, 0.35);
      y += 3.2 * Math.exp(-(wx * wx + wz * wz) / (2 * 15 * 15));
      y += horn(wx, wz, 26, 20, 17, 12.5, 0.1);      // big peak, front right
      y += horn(wx, wz, 19, -13, 15, 10, 0.8, 3);
      y += horn(wx, wz, -21, -12, 16, 9.5, 0.5);
      y += horn(wx, wz, 4, -36, 20, 10, 0.2, 5);
      y += horn(wx, wz, -36, 16, 17, 6, 0.6);
      // crags scale with altitude
      const crag = ridged(wx * 0.08 + 3.1, wz * 0.08 + 1.7);
      y += (crag - 0.35) * (0.5 + y * 0.32);
      // erosion gullies running downhill from each summit (radial streaks)
      const ang = Math.atan2(wz, wx), r = Math.hypot(wx, wz);
      const g = 1 - Math.abs(valueNoise(ang * 11 + valueNoise(r * 0.2, ang) * 2, r * 0.18) * 2 - 1);
      y -= Math.pow(g, 4) * 0.9 * Math.min(1, y / 6);
      y += (ridged(x * 0.45 + 9, z * 0.45 + 4) - 0.45) * 0.35 * (0.2 + y / PEAK);
      return y - 2.4;
    };

    // ---------- renderer / scene ----------
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isSmall ? 1.5 : 1.75));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.3;

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0xe8edf2, 42, 165);
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 400);

    // Strong key light from the left, cool blue fill: lit faces read white, shaded faces soft blue.
    scene.add(new THREE.HemisphereLight(0xffffff, 0x7d97b6, 1.25));
    const sun = new THREE.DirectionalLight(0xffffff, 3.2);
    sun.position.set(-55, 42, 18);
    scene.add(sun);

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
          // stretched vertically so the relief reads as downhill streaks
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
    let summit = new THREE.Vector3(0, -Infinity, 0);
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i);
      const y = height(x, z);
      pos.setY(i, y);
      if (Math.hypot(x, z) < 8 && y > summit.y) summit.set(x, y, z);
    }
    geo.computeVertexNormals();

    // Snow vs rock is decided per pixel from slope plus noise, so the pattern stays
    // crisp up close: snow on anything not too steep, blue-grey rock in steep faces.
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
    scene.add(terrain);

    // ---------- the trail ----------
    // The route spirals up and around the peak, so the orbiting camera keeps it in view.
    const TRAIL_A0 = Math.PI / 2 - 0.35;   // starts on the face toward the opening camera
    const TRAIL_SWEEP = Math.PI * 1.15;    // wraps a little over half way round
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
    const tubeGeo = new THREE.TubeGeometry(curve, TUBE_SEG, 0.06, RAD_SEG, false);
    const trailBase = new THREE.Mesh(tubeGeo, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35 }));
    scene.add(trailBase);
    // Slightly thicker than the base track so the drawn part sits on top of it.
    const trailGold = new THREE.Mesh(new THREE.TubeGeometry(curve, TUBE_SEG, 0.09, RAD_SEG, false), new THREE.MeshBasicMaterial({ color: 0xe6cf9c }));
    scene.add(trailGold);
    const indexPerSeg = RAD_SEG * 6;

    // Glowing climber
    const glowTex = (() => {
      const c = document.createElement("canvas"); c.width = c.height = 64;
      const g = c.getContext("2d");
      const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      grad.addColorStop(0, "rgba(255,244,214,1)"); grad.addColorStop(0.35, "rgba(241,223,180,0.8)"); grad.addColorStop(1, "rgba(241,223,180,0)");
      g.fillStyle = grad; g.fillRect(0, 0, 64, 64);
      return new THREE.CanvasTexture(c);
    })();
    const climber = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, depthTest: false, transparent: true }));
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
    // Summit flag
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.2, 8), new THREE.MeshStandardMaterial({ color: 0xf1dfb4 }));
    pole.position.copy(summit).add(new THREE.Vector3(0, 1.3, 0));
    scene.add(pole);
    const flagShape = new THREE.Shape(); flagShape.moveTo(0, 0); flagShape.lineTo(1.2, -0.35); flagShape.lineTo(0, -0.7);
    const flag = new THREE.Mesh(new THREE.ShapeGeometry(flagShape), new THREE.MeshStandardMaterial({ color: 0xb8975a, side: THREE.DoubleSide }));
    flag.position.copy(summit).add(new THREE.Vector3(0.04, 2.4, 0));
    scene.add(flag);

    // ---------- clouds ----------
    const loader = new THREE.TextureLoader();
    const cloudTex = [1, 2, 3, 4].map(n => { const t = loader.load(`./img/clouds/cloud-${n}.webp`); t.colorSpace = THREE.SRGBColorSpace; return t; });
    const clouds = [];
    const rnd = (a, b) => a + Math.random() * (b - a);
    const addCloud = (x, y, z, w, opacity) => {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: cloudTex[clouds.length % 4], transparent: true, opacity, depthWrite: false, fog: true }));
      sp.position.set(x, y, z); sp.scale.set(w, w * 0.6, 1);
      sp.userData.drift = rnd(0.12, 0.45) * (Math.random() < 0.5 ? -1 : 1);
      scene.add(sp); clouds.push(sp);
    };
    // Sea of clouds hugging the valleys
    for (let i = 0; i < (isSmall ? 36 : 64); i++) {
      const a = rnd(0, Math.PI * 2), r = rnd(19, 75);
      addCloud(Math.cos(a) * r, rnd(0, 3), Math.sin(a) * r, rnd(20, 38), rnd(0.6, 0.95));
    }
    // Thick banks in front of the opening shot, like a view from above the clouds
    for (let i = 0; i < (isSmall ? 6 : 10); i++) {
      addCloud(rnd(-30, 34), rnd(1.5, 6), rnd(26, 40), rnd(22, 34), rnd(0.75, 0.95));
    }
    // Wisps clinging to the flanks
    for (let i = 0; i < (isSmall ? 6 : 12); i++) {
      const a = rnd(0, Math.PI * 2), r = rnd(13, 26);
      addCloud(Math.cos(a) * r, rnd(7, 12), Math.sin(a) * r, rnd(9, 16), rnd(0.3, 0.5));
    }

    // ---------- camera: orbit around the peak as you scroll ----------
    const camPos = new THREE.Vector3(), camLook = new THREE.Vector3(), tmpV = new THREE.Vector3();
    const sstep = (a, b, v) => { const t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
    // Gentle pointer parallax on desktop: a few degrees of yaw and a little height.
    const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
    if (!isSmall && !reduced) {
      window.addEventListener("pointermove", (e) => {
        pointer.tx = e.clientX / window.innerWidth - 0.5;
        pointer.ty = e.clientY / window.innerHeight - 0.5;
      }, { passive: true });
    }

    const updateCamera = (p, dt) => {
      pointer.x += (pointer.tx - pointer.x) * Math.min(1, dt * 3);
      pointer.y += (pointer.ty - pointer.y) * Math.min(1, dt * 3);
      const q = Math.min(1, Math.max(0, (p - 0.1) / 0.8));        // progress along the trail
      const approach = sstep(0, 0.15, p), reveal = sstep(0.85, 1, p);
      // Orbit angle trails slightly behind the climber so we look across at the route.
      const angle = trailAngle(q) - 0.25 + pointer.x * 0.35;
      const radius = (isSmall ? 62 : 50) - (isSmall ? 14 : 11) * approach + 8 * reveal;
      const camY = 13 + q * 10 + 4 * reveal - pointer.y * 3;
      camPos.set(Math.cos(angle) * radius, camY, Math.sin(angle) * radius);
      const axis = tmpV.set(summit.x * q, 8 + q * (summit.y - 9), summit.z * q);
      camLook.copy(axis).lerp(curve.getPointAt(q), 0.35 * (1 - reveal));
      camera.position.copy(camPos);
      camera.lookAt(camLook);
    };

    // ---------- steps ----------
    let current = -1;
    const markNo = section.querySelector(".a3d-mark-no");
    const navItems = Array.from(section.querySelectorAll(".a3d-nav-item"));
    const setStep = (index) => {
      if (index === current) return;
      current = index;
      if (markNo) markNo.textContent = String(index + 1).padStart(2, "0");
      navItems.forEach((n, i) => {
        n.classList.toggle("is-active", i === index);
        if (i === index) n.setAttribute("aria-current", "step"); else n.removeAttribute("aria-current");
      });
      steps.forEach((s, i) => {
        s.classList.toggle("is-active", i === index);
        if (i === index) s.setAttribute("aria-current", "step"); else s.removeAttribute("aria-current");
      });
      camps.forEach((c, i) => {
        const reached = i <= index;
        c.label.classList.toggle("is-reached", reached);
        c.label.classList.toggle("is-current", i === index);
        c.marker.material.color.set(reached ? 0xb8975a : 0x13294b);
        c.marker.material.emissive.set(reached ? 0x5a4520 : 0x000000);
      });
    };

    // Step nav: jump to the scroll position where that step's marker is reached.
    navItems.forEach((item, i) => {
      item.addEventListener("click", () => {
        const travel = section.offsetHeight - window.innerHeight;
        const sectionTop = section.getBoundingClientRect().top + window.scrollY;
        const raw = Math.min(0.97, 0.1 + 0.8 * stops[i] + 0.01);
        const target = sectionTop + travel * raw;
        if (window.lenis) window.lenis.scrollTo(target, { duration: 1.6 });
        else window.scrollTo({ top: target, behavior: "smooth" });
      });
    });

    // ---------- loop ----------
    let progress = reduced ? 1 : 0, shown = 0;
    const readProgress = () => {
      const rect = section.getBoundingClientRect();
      const travel = rect.height - window.innerHeight;
      return travel > 0 ? Math.min(1, Math.max(0, -rect.top / travel)) : 0;
    };

    const resize = () => {
      const w = canvas.clientWidth, h = canvas.clientHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.fov = w < h ? 58 : 45;
      // Shift the picture so the mountain sits beside the text panel
      // (to the right on desktop, above it on phones).
      if (w > 768) camera.setViewOffset(w, h, -w * 0.17, 0, w, h);
      else camera.setViewOffset(w, h, 0, h * 0.16, w, h);
      camera.updateProjectionMatrix();
    };
    window.addEventListener("resize", resize);
    resize();

    const projectLabels = () => {
      const w = canvas.clientWidth, h = canvas.clientHeight;
      const camAng = Math.atan2(camera.position.z - summit.z, camera.position.x - summit.x);
      camps.forEach((c, i) => {
        // Hide camps on the far side of the peak (the summit is always visible).
        const campAng = Math.atan2(c.p.z - summit.z, c.p.x - summit.x);
        const facing = i === camps.length - 1 || Math.cos(campAng - camAng) > -0.05;
        tmpV.copy(c.p).project(camera);
        const visible = facing && tmpV.z < 1 && tmpV.x > -1.1 && tmpV.x < 1.1 && tmpV.y > -1.1 && tmpV.y < 1.1;
        c.label.style.opacity = visible ? "1" : "0";
        // Keep the (now longer) step names fully on screen.
        const half = c.label.offsetWidth / 2 + 8;
        const px = Math.min(w - half, Math.max(half, (tmpV.x + 1) / 2 * w));
        c.label.style.transform = `translate(${px.toFixed(1)}px, ${((1 - tmpV.y) / 2 * h).toFixed(1)}px) translate(-50%, -150%)`;
      });
    };

    let running = false, last = performance.now();
    const frame = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      if (!reduced) progress = readProgress();
      // smooth the scroll value so the camera glides instead of stepping
      shown += (progress - shown) * Math.min(1, dt * 6);
      const trailP = reduced ? 1 : Math.min(1, Math.max(0, (shown - 0.1) / 0.8));

      trailGold.geometry.setDrawRange(0, Math.floor(trailP * TUBE_SEG) * indexPerSeg);
      climber.position.copy(curve.getPointAt(trailP)).add(new THREE.Vector3(0, 0.35, 0));
      climber.material.opacity = 0.75 + Math.sin(now / 300) * 0.25;

      let index = 0;
      stops.forEach((f, i) => { if (trailP >= f - 0.02) index = i; });
      setStep(index);

      clouds.forEach(c => { c.position.x += c.userData.drift * dt; if (c.position.x > 45) c.position.x = -45; if (c.position.x < -45) c.position.x = 45; });
      flag.rotation.y = Math.sin(now / 700) * 0.25;

      updateCamera(reduced ? 1 : shown, dt);
      renderer.render(scene, camera);
      projectLabels();
      if (running) requestAnimationFrame(frame);
    };

    new IntersectionObserver(([entry]) => {
      const was = running;
      running = entry.isIntersecting;
      if (running && !was) { last = performance.now(); requestAnimationFrame(frame); }
    }, { rootMargin: "200px 0px" }).observe(section);
}

const ascentSection = document.querySelector(".ascent3d");
if (ascentSection) mountAscent3D(ascentSection);
