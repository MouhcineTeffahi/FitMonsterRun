import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/** Unit box with its base on y = 0 (scale = width/height/depth). */
export const BASE_BOX = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0);
/** Unit box centred on the origin. */
export const UNIT_BOX = new THREE.BoxGeometry(1, 1, 1);

export type Part = {
  geo: THREE.BufferGeometry;
  color: THREE.ColorRepresentation | [number, number, number];
  /** Applied to the part before merging. */
  at?: { x?: number; y?: number; z?: number; rx?: number; ry?: number; rz?: number; s?: number | [number, number, number] };
  /** 1 = tinted by the instance colour, 0 = keeps its own colour (see `tintable`). */
  tint?: number;
};

const tmpM = new THREE.Matrix4();
const tmpQ = new THREE.Quaternion();
const tmpE = new THREE.Euler();
const tmpS = new THREE.Vector3();
const tmpP = new THREE.Vector3();
const tmpC = new THREE.Color();

/**
 * Merges coloured parts into one vertex-coloured geometry, so a whole prop is a
 * single draw call (and a single InstancedMesh). Colour arrays may exceed 1 for
 * glowing bits (lamps, headlights), which the bloom pass picks up.
 */
export function mergeParts(parts: Part[]): THREE.BufferGeometry {
  const geos = parts.map(({ geo, color, at = {}, tint = 0 }) => {
    const g = (geo.index ? geo.toNonIndexed() : geo.clone()) as THREE.BufferGeometry;
    g.deleteAttribute('uv');
    const s = at.s ?? 1;
    tmpS.set(...((Array.isArray(s) ? s : [s, s, s]) as [number, number, number]));
    tmpQ.setFromEuler(tmpE.set(at.rx ?? 0, at.ry ?? 0, at.rz ?? 0));
    tmpP.set(at.x ?? 0, at.y ?? 0, at.z ?? 0);
    g.applyMatrix4(tmpM.compose(tmpP, tmpQ, tmpS));
    const n = g.getAttribute('position').count;
    const rgb = Array.isArray(color) ? color : (tmpC.set(color), [tmpC.r, tmpC.g, tmpC.b]);
    const col = new Float32Array(n * 3);
    const tin = new Float32Array(n).fill(tint);
    for (let i = 0; i < n; i++) col.set(rgb, i * 3);
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    g.setAttribute('aTint', new THREE.BufferAttribute(tin, 1));
    return g;
  });
  const merged = mergeGeometries(geos, false);
  if (!merged) throw new Error('mergeParts: incompatible geometries');
  geos.forEach((g) => g.dispose());
  return merged;
}

/**
 * Instance colour only tints vertices whose `aTint` is 1 (e.g. a truck's cargo
 * box) — wheels, windows and lights keep their own vertex colours.
 */
export function tintable<T extends THREE.Material>(mat: T): T {
  mat.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aTint;')
      .replace(
        '#include <color_vertex>',
        THREE.ShaderChunk.color_vertex.replace(
          'vColor.rgb *= instanceColor.rgb;',
          'vColor.rgb *= mix( vec3( 1.0 ), instanceColor.rgb, aTint );',
        ),
      );
  };
  mat.customProgramCacheKey = () => 'tintable';
  return mat;
}

/** Standard vertex-coloured material for merged props. */
export function propMaterial(extra: THREE.MeshStandardMaterialParameters = {}) {
  return tintable(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.65, ...extra }));
}

export function instanced(
  geo: THREE.BufferGeometry,
  mat: THREE.Material,
  count: number,
  { cast = false, receive = false, colored = false } = {},
): THREE.InstancedMesh {
  const mesh = new THREE.InstancedMesh(geo, mat, count);
  mesh.castShadow = cast;
  mesh.receiveShadow = receive;
  // Instances scroll every frame; a cached bounding sphere would cull them wrongly.
  mesh.frustumCulled = false;
  for (let i = 0; i < count; i++) mesh.setMatrixAt(i, ZERO);
  if (colored) {
    mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(count * 3).fill(1), 3);
  }
  return mesh;
}

const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);
const dummy = new THREE.Object3D();

export function hide(mesh: THREE.InstancedMesh, i: number) {
  mesh.setMatrixAt(i, ZERO);
  mesh.instanceMatrix.needsUpdate = true;
}

export function put(
  mesh: THREE.InstancedMesh,
  i: number,
  x: number, y: number, z: number,
  sx = 1, sy = sx, sz = sx,
  ry = 0, rx = 0, rz = 0,
) {
  dummy.position.set(x, y, z);
  dummy.rotation.set(rx, ry, rz);
  dummy.scale.set(sx, sy, sz);
  dummy.updateMatrix();
  mesh.setMatrixAt(i, dummy.matrix);
  mesh.instanceMatrix.needsUpdate = true;
}

export function paint(mesh: THREE.InstancedMesh, i: number, color: THREE.ColorRepresentation) {
  mesh.setColorAt(i, tmpC.set(color));
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
}

/**
 * A ring of `count` items spaced `spacing` apart that scrolls toward the camera.
 * The whole ring moves once per frame by translating its group (O(1)); an item
 * is only rewritten when it passes `recycleZ`, at which point it jumps one span
 * back (beyond the fog) and re-rolls its content. This is the single place
 * world props move, so nothing can be translated twice.
 */
export class Scroller {
  readonly group = new THREE.Group();
  /** Item origin in group-local space. */
  readonly local: Float32Array;
  readonly span: number;
  /** Total distance scrolled (for the dev movement audit). */
  moved = 0;

  constructor(
    readonly count: number,
    readonly spacing: number,
    readonly firstZ: number,
    readonly recycleZ: number,
    /** Pick new content for item i at world z; then write its instances. */
    private readonly place: (i: number, localZ: number, worldZ: number) => void,
    /** Rewrite item i's instances at a new local z, keeping its content. */
    private readonly move: (i: number, localZ: number) => void,
  ) {
    this.span = count * spacing;
    this.local = new Float32Array(count);
  }

  init() {
    for (let i = 0; i < this.count; i++) {
      this.local[i] = this.firstZ - i * this.spacing;
      this.place(i, this.local[i], this.local[i]);
    }
  }

  scroll(dz: number) {
    this.moved += dz;
    const g = this.group.position;
    g.z += dz;
    for (let i = 0; i < this.count; i++) {
      if (this.local[i] + g.z > this.recycleZ) {
        this.local[i] -= this.span;
        this.place(i, this.local[i], this.local[i] + g.z);
      }
    }
    // Keep float precision on long runs: fold the offset back into the items.
    if (g.z > 2000) {
      const shift = g.z;
      g.z = 0;
      for (let i = 0; i < this.count; i++) {
        this.local[i] += shift;
        this.move(i, this.local[i]);
      }
    }
  }
}

/** Two-colour stripes along V (repeat it along the length of a mesh). */
export function stripeTexture(a: string, b: string, size = 8) {
  const ca = new THREE.Color(a);
  const cb = new THREE.Color(b);
  const data = new Uint8Array(size * 4);
  for (let i = 0; i < size; i++) {
    const c = i < size / 2 ? ca : cb;
    const o = i * 4;
    // DataTextures are sampled as sRGB below, so store sRGB bytes.
    const srgb = c.clone().convertLinearToSRGB();
    data[o] = Math.round(srgb.r * 255);
    data[o + 1] = Math.round(srgb.g * 255);
    data[o + 2] = Math.round(srgb.b * 255);
    data[o + 3] = 255;
  }
  const tex = new THREE.DataTexture(data, 1, size, THREE.RGBAFormat);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.NearestFilter;
  tex.needsUpdate = true;
  return tex;
}

/** Checkerboard for the level finish banner. */
export function checkerTexture(n = 8) {
  const data = new Uint8Array(n * n * 4);
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const v = (x + y) % 2 ? 255 : 20;
      data.set([v, v, v, 255], (y * n + x) * 4);
    }
  }
  const tex = new THREE.DataTexture(data, n, n, THREE.RGBAFormat);
  tex.magFilter = THREE.NearestFilter;
  tex.needsUpdate = true;
  return tex;
}

/** Soft round dot, used for glows/halos and particles. */
export function dotTexture(size = 32) {
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const d = Math.hypot(x - size / 2 + 0.5, y - size / 2 + 0.5) / (size / 2);
      const a = Math.max(0, 1 - d) ** 1.6;
      data.set([255, 255, 255, Math.round(a * 255)], (y * size + x) * 4);
    }
  }
  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  tex.needsUpdate = true;
  return tex;
}

/** Deterministic-enough random helpers for layout. */
export const rand = (a: number, b: number) => a + Math.random() * (b - a);
export const chance = (p: number) => Math.random() < p;
export const choose = <T,>(items: readonly T[]): T => items[Math.floor(Math.random() * items.length)];
