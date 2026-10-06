import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import { Platform } from 'react-native';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

import { quality } from './quality';

/** Display-referred grade: saturation boost, gentle contrast, soft vignette. */
const GradeShader = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    uSaturation: { value: 1.18 },
    uContrast: { value: 1.06 },
    uVignette: { value: 0.38 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uSaturation;
    uniform float uContrast;
    uniform float uVignette;
    varying vec2 vUv;
    void main() {
      vec4 c = texture2D(tDiffuse, vUv);
      float l = dot(c.rgb, vec3(0.2126, 0.7152, 0.0722));
      vec3 col = mix(vec3(l), c.rgb, uSaturation);
      col = (col - 0.5) * uContrast + 0.5;
      vec2 d = vUv - 0.5;
      float v = smoothstep(0.85, 0.25, length(d * vec2(1.0, 0.82)));
      col *= mix(1.0 - uVignette, 1.0, v);
      gl_FragColor = vec4(clamp(col, 0.0, 1.0), c.a);
    }`,
};

type Props = {
  /** Called with false when post-processing is bypassed (callers draw a 2D vignette instead). */
  onActive?: (active: boolean) => void;
};

/**
 * Takes over rendering (useFrame priority 1). Bloom runs at half resolution
 * and switches off on slow devices; on very slow frames, or if the composer
 * fails (some native GL drivers), it falls back to a plain render.
 */
export function PostFx({ onActive }: Props) {
  const { gl, scene, camera, size } = useThree();
  const failed = useRef(false);
  const active = useRef<boolean | null>(null);

  const fx = useMemo(() => {
    try {
      const web = Platform.OS === 'web';
      const target = new THREE.WebGLRenderTarget(1, 1, {
        type: web ? THREE.HalfFloatType : THREE.UnsignedByteType,
        samples: web ? 4 : 0,
      });
      const composer = new EffectComposer(gl, target);
      composer.addPass(new RenderPass(scene, camera));
      // High threshold and a small radius: lights still glow, food stays sharp.
      const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.22, 0.22, web ? 1.2 : 1.08);
      composer.addPass(bloom);
      composer.addPass(new OutputPass());
      composer.addPass(new ShaderPass(GradeShader));
      return { composer, bloom };
    } catch {
      failed.current = true;
      return null;
    }
  }, [gl, scene, camera]);

  useEffect(() => {
    if (!fx) return;
    fx.composer.setPixelRatio(gl.getPixelRatio());
    fx.composer.setSize(size.width, size.height);
  }, [fx, gl, size]);

  useEffect(() => () => fx?.composer.dispose(), [fx]);

  useFrame((_, dt) => {
    const use = !!fx && !failed.current && quality.post;
    if (active.current !== use) {
      active.current = use;
      onActive?.(use);
    }
    if (!use || !fx) {
      gl.render(scene, camera);
      return;
    }
    fx.bloom.enabled = quality.bloom;
    try {
      fx.composer.render(dt);
    } catch {
      failed.current = true;
      gl.render(scene, camera);
    }
  }, 1);

  return null;
}
