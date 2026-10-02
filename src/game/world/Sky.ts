import * as THREE from 'three';

/** Gradient sky dome (top → mid → warm horizon) with a soft sun glow. Follows the camera. */
export function createSky() {
  const uniforms = {
    uTop: { value: new THREE.Color('#1E9BFF') },
    uMid: { value: new THREE.Color('#74CCFF') },
    uHorizon: { value: new THREE.Color('#FFD9B8') },
    uSunDir: { value: new THREE.Vector3(0.35, 0.35, -1).normalize() },
    uSun: { value: 1 },
  };
  const mat = new THREE.ShaderMaterial({
    uniforms,
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uTop;
      uniform vec3 uMid;
      uniform vec3 uHorizon;
      uniform vec3 uSunDir;
      uniform float uSun;
      varying vec3 vDir;
      void main() {
        float h = normalize(vDir).y;
        vec3 col = mix(uHorizon, uMid, smoothstep(-0.02, 0.2, h));
        col = mix(col, uTop, smoothstep(0.2, 0.75, h));
        float sun = max(dot(normalize(vDir), uSunDir), 0.0);
        col += vec3(1.0, 0.85, 0.6) * (pow(sun, 24.0) * 0.6 + pow(sun, 400.0) * 2.5) * uSun;
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(190, 24, 12), mat);
  mesh.renderOrder = -1;
  mesh.frustumCulled = false;
  return { mesh, uniforms };
}
