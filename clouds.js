import * as THREE from "three";
import * as BufferGeometryUtils from "addons/utils/BufferGeometryUtils.js";

export function mountClouds(container, options = {}) {
  const textureURL = options.textureURL || "https://mrdoob.com/lab/javascript/webgl/clouds/cloud10.png";
  const width = container.clientWidth || container.offsetWidth;
  const height = container.clientHeight || container.offsetHeight;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, width / height, 1, 3000);
  const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true });
  const mouse = new THREE.Vector2();

  let startTime = Date.now();
  let windowHalfX = width / 2;
  let windowHalfY = height / 2;
  let animationId = null;
  let planesMesh, planesMeshA, material;
  let ro = null;

  container.style.background = "none";

  camera.position.z = 6000;

  const fog = new THREE.Fog(options.fogColor || 0xa7cdea, -100, 3000);
  scene.fog = fog;

  const cloudShader = {
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
      }
    `,
    fragmentShader: `
      uniform sampler2D map;
      uniform vec3 fogColor;
      uniform float fogNear;
      uniform float fogFar;
      varying vec2 vUv;
      void main() {
        float depth = gl_FragCoord.z / gl_FragCoord.w;
        float fogFactor = smoothstep( fogNear, fogFar, depth );

        gl_FragColor = texture2D( map, vUv );
        gl_FragColor.w *= pow( gl_FragCoord.z, 20.0 );
        gl_FragColor = mix( gl_FragColor, vec4( fogColor, gl_FragColor.w ), fogFactor );
      }
    `
  };

  const loader = new THREE.TextureLoader();

  function buildScene(texture) {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.magFilter = THREE.LinearMipMapLinearFilter;
    texture.minFilter = THREE.LinearMipMapLinearFilter;

    material = new THREE.ShaderMaterial({
      uniforms: {
        map: { value: texture },
        fogColor: { value: fog.color },
        fogNear: { value: fog.near },
        fogFar: { value: fog.far }
      },
      vertexShader: cloudShader.vertexShader,
      fragmentShader: cloudShader.fragmentShader,
      depthWrite: false,
      depthTest: false,
      transparent: true
    });

    const planeGeo = new THREE.PlaneGeometry(64, 64);
    const planeObj = new THREE.Object3D();
    const geometries = [];

    const cloudCount = 4000;
    const cloudRange = 8000;

    for (let i = 0; i < cloudCount; i++) {
      planeObj.position.x = Math.random() * 1000 - 500;
      planeObj.position.y = -Math.random() * Math.random() * 70 - 20;
      planeObj.position.z = (i / cloudCount) * cloudRange;
      planeObj.rotation.z = Math.random() * Math.PI;
      planeObj.scale.x = planeObj.scale.y = Math.random() * Math.random() * 1.5 + 0.5;
      planeObj.updateMatrix();
      const clonedPlaneGeo = planeGeo.clone();
      clonedPlaneGeo.applyMatrix4(planeObj.matrix);
      geometries.push(clonedPlaneGeo);
    }

    const mergedGeo = BufferGeometryUtils.mergeGeometries(geometries);
    planesMesh = new THREE.Mesh(mergedGeo, material);
    planesMesh.renderOrder = 2;

    planesMeshA = planesMesh.clone();
    planesMeshA.position.z = -cloudRange;
    planesMeshA.renderOrder = 1;

    scene.add(planesMesh);
    scene.add(planesMeshA);

    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setSize(width, height);
    container.appendChild(renderer.domElement);
    const cs = window.getComputedStyle(container);
    if (cs.position === "static") container.style.position = "relative";
    const canvas = renderer.domElement;
    canvas.style.position = "absolute";
    canvas.style.top = "0";
    canvas.style.left = "0";
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.display = "block";

    container.addEventListener("mousemove", onMouseMove);
    ro = new ResizeObserver(onResize);
    ro.observe(container);

    animate();
  }

  function onMouseMove(e) {
    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    mouse.x = (x - windowHalfX) * 0.25;
    mouse.y = (y - windowHalfY) * 0.15;
  }

  function onResize() {
    const w = container.clientWidth || container.offsetWidth;
    const h = container.clientHeight || container.offsetHeight;
    windowHalfX = w / 2;
    windowHalfY = h / 2;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }

  function animate() {
    animationId = requestAnimationFrame(animate);
    const cloudRange = 8000;
    const position = ((Date.now() - startTime) * 0.03) % cloudRange;
    camera.position.x += (mouse.x - camera.position.x) * 0.01;
    camera.position.y += (-mouse.y - camera.position.y) * 0.01;
    camera.position.z = -position + cloudRange;
    renderer.render(scene, camera);
  }

  loader.load(textureURL, buildScene);

  function destroy() {
    if (animationId !== null) cancelAnimationFrame(animationId);
    container.removeEventListener("mousemove", onMouseMove);
    if (ro) ro.disconnect();
    if (renderer.domElement && renderer.domElement.parentNode === container) {
      container.removeChild(renderer.domElement);
    }
    if (planesMesh) {
      planesMesh.geometry.dispose();
      if (Array.isArray(planesMesh.material)) {
        planesMesh.material.forEach(m => m.dispose());
      } else {
        planesMesh.material.dispose();
      }
    }
    if (planesMeshA) {
      planesMeshA.geometry.dispose();
      if (Array.isArray(planesMeshA.material)) {
        planesMeshA.material.forEach(m => m.dispose());
      } else {
        planesMeshA.material.dispose();
      }
    }
    renderer.dispose();
  }

  return { destroy };
}
