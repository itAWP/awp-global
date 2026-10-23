// One continuous cloud sky behind the whole page.
// A fixed WebGL canvas draws layered, slowly drifting clouds. Scroll position
// sets the "altitude": just below the hero we are inside the cloud bank, and
// further down the sky opens into a soft blue-grey overcast. Section boundaries
// thicken the clouds a little so moving between sections feels like passing
// through them, instead of a separate overlay popping in.
import * as THREE from "three";

const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const isSmall = window.matchMedia("(max-width: 768px)").matches;

const canvas = document.createElement("canvas");
canvas.className = "sky-canvas";
canvas.setAttribute("aria-hidden", "true");
document.body.prepend(canvas);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: "low-power" });
// Clouds are soft, so a reduced internal resolution looks the same and is much cheaper.
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1) * (isSmall ? 0.4 : 0.5));

const uniforms = {
  uRes: { value: new THREE.Vector2(1, 1) },
  uTime: { value: 0 },
  uScroll: { value: 0 },
  uAlt: { value: 0 },
  uFog: { value: 0 },
};

const material = new THREE.ShaderMaterial({
  uniforms,
  depthTest: false,
  depthWrite: false,
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
  `,
  fragmentShader: /* glsl */ `
    precision highp float;
    uniform vec2 uRes;
    uniform float uTime, uScroll, uAlt, uFog;
    varying vec2 vUv;

    float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
    float noise(vec2 p) {
      vec2 i = floor(p), f = fract(p);
      vec2 u = f * f * (3.0 - 2.0 * f);
      return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
                 mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
    }
    float fbm(vec2 p) {
      float s = 0.0, a = 0.5;
      mat2 r = mat2(0.8, -0.6, 0.6, 0.8);
      for (int i = 0; i < ${isSmall ? 4 : 5}; i++) { s += a * noise(p); p = r * p * 2.03 + 7.1; a *= 0.5; }
      return s;
    }

    void main() {
      vec2 p = gl_FragCoord.xy / uRes.y;
      float alt = clamp(uAlt, 0.0, 1.0);

      // Sky: bright just under the hero, cooler blue-grey overcast further down.
      vec3 skyTop = mix(vec3(0.86, 0.91, 0.95), vec3(0.74, 0.80, 0.87), alt);
      vec3 skyBot = mix(vec3(0.98, 0.99, 1.00), vec3(0.88, 0.91, 0.94), alt);
      vec3 col = mix(skyBot, skyTop, vUv.y);

      // Thickest inside the cloud bank right after the hero, thinner wisps lower down,
      // plus a bump at each section boundary.
      float bank = exp(-pow((alt - 0.08) / 0.1, 2.0));
      float density = clamp(0.32 + bank * 0.45 + uFog, 0.0, 1.0);

      for (int i = 0; i < 4; i++) {
        float fi = float(i);
        float scale = 0.9 + fi * 0.75;
        float parallax = 0.35 + fi * 0.28;               // nearer layers move faster
        vec2 q = p * scale;
        q.x += uTime * (0.010 + fi * 0.006) + fi * 17.3;
        q.y -= (uScroll / uRes.y) * parallax * scale * 0.55;
        q.y *= 1.7;                                        // flatten into horizontal banks
        float n = fbm(q);
        float cover = mix(0.66, 0.40, density) - fi * 0.02;
        float a = smoothstep(cover, cover + 0.26, n);
        // Fake lighting: brighter where the noise rises toward the light above.
        float lit = fbm(q + vec2(0.0, 0.06));
        float shade = clamp(0.78 + (n - lit) * 5.0, 0.6, 1.0);
        vec3 cloud = mix(vec3(0.78, 0.83, 0.89), vec3(1.0), shade);
        cloud = mix(cloud, cloud * vec3(0.93, 0.95, 0.98), alt);
        col = mix(col, cloud, a * (0.5 + 0.13 * fi));
      }
      gl_FragColor = vec4(col, 1.0);
    }
  `,
});

const scene = new THREE.Scene();
scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material));
const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

const resize = () => {
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  const size = renderer.getDrawingBufferSize(new THREE.Vector2());
  uniforms.uRes.value.copy(size);
};
window.addEventListener("resize", resize);
resize();

// Section boundaries that thicken the clouds as they cross mid-screen.
const boundaries = ["#vision-reveal", "#roadmap-section", "#tl-container", "#global-connectivity", ".stats-section", ".footer"]
  .map(sel => document.querySelector(sel)).filter(Boolean);
const hero = document.querySelector(".hero1");

let fog = 0, last = performance.now(), time = 0;
const frame = (now) => {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (document.hidden) return;

  const vh = window.innerHeight;
  // Skip drawing while the opaque hero image covers the whole screen.
  const heroRect = hero && hero.getBoundingClientRect();
  if (heroRect && heroRect.bottom >= vh && heroRect.top <= 0) return;

  const scrollY = window.scrollY;
  const maxScroll = Math.max(1, document.documentElement.scrollHeight - vh);
  const heroEnd = heroRect ? heroRect.bottom + scrollY : 0;
  uniforms.uAlt.value = Math.max(0, (scrollY - heroEnd + vh) / Math.max(1, maxScroll - heroEnd + vh));
  uniforms.uScroll.value = scrollY;

  let target = 0;
  for (const el of boundaries) {
    const d = (el.getBoundingClientRect().top - vh * 0.5) / (vh * 0.45);
    target = Math.max(target, Math.exp(-d * d) * 0.7);
  }
  fog += (target - fog) * Math.min(1, dt * 4);
  uniforms.uFog.value = fog;

  if (!reduced) time += dt;
  uniforms.uTime.value = time;
  renderer.render(scene, camera);
};
requestAnimationFrame(frame);
