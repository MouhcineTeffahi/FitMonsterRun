import * as THREE from 'three';

import {
  AWNINGS, BEACH_FACADES, biomeAt, DESERT_ROCKS, DOCK_FACADES, FACADES, GYM_FACADES,
  MOUNTAIN_ROCKS, PARK_FACADES, SIGNS, SNOW_FACADES, type Biome,
} from './biomes';
import { BASE_BOX, chance, choose, hide, instanced, paint, propMaterial, put, rand, Scroller, UNIT_BOX } from './kit';
import * as P from './props';
import { makeGymAthlete, SPORTS, type GymAthlete } from './gymAthletes';

/**
 * The scenery on both sides of the road, as a ring of 10-unit "lots".
 *
 * Fix for the old duplicated/doubled buildings: the previous world cloned the
 * same five GLB buildings into five fixed chunks and never re-rolled them, so
 * the street repeated every 150 units while fog only hid things past 110–150
 * (the same building was visible twice at once, and recycled chunks popped in).
 * Now every lot re-rolls its buildings and props when it is recycled, it is
 * recycled only once fully behind the camera, it reappears beyond the fog
 * (FOG_LIMIT), and all lots move together through one Scroller group.
 */

export const LOT_LEN = 10;
const LOT_COUNT = 17;
const FIRST_Z = 22;
const ROAD_EDGE = 4.3;
const WALK_EDGE = 7.7;
const FACADE_X = 7.9;
const LOW_Y = -16.6;

type MeshKey =
  | 'bodies' | 'trims' | 'awnings' | 'signs' | 'tanks' | 'trees' | 'palms' | 'lamps'
  | 'benches' | 'bins' | 'bushes' | 'pots' | 'umbrellas' | 'billboards' | 'ground'
  | 'sea' | 'tunnel' | 'neon' | 'portal' | 'rails' | 'pillars' | 'cacti' | 'rocks' | 'statues'
  | 'frost' | 'trainers' | 'gear' | 'balls';

/** Instances reserved per lot in each mesh. */
const PER_LOT: Record<MeshKey, number> = {
  bodies: 4, trims: 4, awnings: 2, signs: 3, tanks: 2, trees: 2, palms: 4, lamps: 2,
  benches: 2, bins: 2, bushes: 2, pots: 2, umbrellas: 2, billboards: 1, ground: 7,
  sea: 1, tunnel: 3, neon: 10, portal: 3, rails: 8, pillars: 2, cacti: 4, rocks: 4, statues: 2,
  frost: 4, trainers: 4, gear: 4, balls: 2,
};

/** 0 static, 1 sway, 2 bob, 3 fall, 4 roll. */
type Op = { mesh: THREE.InstancedMesh; i: number; x: number; y: number; z: number; sx: number; sy: number; sz: number; ry: number; rz: number; wave: number };

type Lot = { biome: Biome; ops: Op[]; crew: GymAthlete[] };

function windowMaterial(glow: { value: number }) {
  const mat = new THREE.MeshStandardMaterial({ roughness: 0.8 });
  const varyings = 'varying vec3 vWinPos;\nvarying vec3 vWinNrm;\nvarying vec3 vWinSize;\nvarying float vWinSeed;';
  // Procedural windows from object-space position × instance scale, so the
  // grid keeps a constant size on every building and nothing is stretched.
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uWindowGlow = glow;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${varyings}`)
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
#ifdef USE_INSTANCING
  vWinSize = vec3(length(instanceMatrix[0].xyz), length(instanceMatrix[1].xyz), length(instanceMatrix[2].xyz));
  vWinSeed = instanceMatrix[3].x * 0.37 + vWinSize.y * 1.7;
#else
  vWinSize = vec3(1.0);
  vWinSeed = 0.0;
#endif
  vWinPos = position * vWinSize;
  vWinNrm = normal;`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\nuniform float uWindowGlow;\n${varyings}`)
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
  float fmSide = 1.0 - step(0.5, abs(vWinNrm.y));
  bool fmX = abs(vWinNrm.x) > 0.5;
  vec2 fmF = fmX ? vec2(vWinPos.z, vWinPos.y) : vec2(vWinPos.x, vWinPos.y);
  float fmHalf = (fmX ? vWinSize.z : vWinSize.x) * 0.5;
  vec2 fmG = vec2((fmF.x + fmHalf) / 1.5, fmF.y / 1.7);
  vec2 fmId = floor(fmG);
  vec2 fmFr = fract(fmG);
  float fmWin = step(0.22, fmFr.x) * step(fmFr.x, 0.78) * step(0.3, fmFr.y) * step(fmFr.y, 0.82);
  fmWin *= fmSide * step(1.6, fmF.y) * step(fmF.y, vWinSize.y - 0.5) * step(abs(fmF.x), fmHalf - 0.35);
  float fmLit = step(0.55, fract(sin(dot(fmId + vWinSeed, vec2(12.9898, 78.233))) * 43758.5453));
  vec3 fmGlass = mix(vec3(0.38, 0.6, 0.88), vec3(1.0, 0.86, 0.56), fmLit);
  diffuseColor.rgb = mix(diffuseColor.rgb, fmGlass, fmWin);
  diffuseColor.rgb *= 1.0 - 0.16 * fmSide * step(fmF.y, 1.25);`,
      )
      .replace(
        '#include <roughnessmap_fragment>',
        `#include <roughnessmap_fragment>
  roughnessFactor = mix(roughnessFactor, 0.18, fmWin);`,
      )
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
  totalEmissiveRadiance += fmWin * fmLit * uWindowGlow * vec3(1.0, 0.8, 0.45);`,
      );
  };
  mat.customProgramCacheKey = () => 'fm-windows';
  return mat;
}

const tmpColor = new THREE.Color();

export class CityLots {
  readonly scroller: Scroller;
  readonly windowGlow = { value: 0.35 };
  private readonly meshes = {} as Record<MeshKey, THREE.InstancedMesh>;
  private readonly lots: Lot[] = [];
  /** Run distance at the runner; set by the world before each scroll. */
  distance = 0;
  private counter = 0;
  private lastBiome: Biome | null = null;
  private current: Lot | null = null;
  private currentIndex = 0;

  constructor() {
    const n = (k: MeshKey) => PER_LOT[k] * LOT_COUNT;
    const props = propMaterial();
    const glow = (o: THREE.MeshBasicMaterialParameters = {}) => new THREE.MeshBasicMaterial({ toneMapped: false, ...o });
    const std = (o: THREE.MeshStandardMaterialParameters) => new THREE.MeshStandardMaterial({ roughness: 0.8, ...o });

    const m = this.meshes;
    m.bodies = instanced(BASE_BOX, windowMaterial(this.windowGlow), n('bodies'), { cast: true, receive: true, colored: true });
    m.trims = instanced(BASE_BOX, std({ roughness: 0.6 }), n('trims'), { colored: true });
    m.awnings = instanced(UNIT_BOX, std({ roughness: 0.7 }), n('awnings'), { cast: true, colored: true });
    m.signs = instanced(UNIT_BOX, glow(), n('signs'), { colored: true });
    m.tanks = instanced(P.tankGeometry(), props, n('tanks'));
    m.trees = instanced(P.treeGeometry(), props, n('trees'), { cast: true, colored: true });
    m.palms = instanced(P.palmGeometry(), props, n('palms'), { cast: true, colored: true });
    m.lamps = instanced(P.lampGeometry(), props, n('lamps'));
    m.benches = instanced(P.benchGeometry(), props, n('benches'));
    m.bins = instanced(P.binGeometry(), props, n('bins'), { colored: true });
    m.bushes = instanced(P.bushGeometry(), props, n('bushes'), { colored: true });
    m.pots = instanced(P.potGeometry(), props, n('pots'), { colored: true });
    m.umbrellas = instanced(P.umbrellaGeometry(), props, n('umbrellas'));
    m.billboards = instanced(P.billboardFrameGeometry(), props, n('billboards'));
    m.ground = instanced(UNIT_BOX, std({ roughness: 0.95 }), n('ground'), { receive: true, colored: true });
    m.sea = instanced(UNIT_BOX, std({ color: '#19B3EA', roughness: 0.12, metalness: 0.25, emissive: '#0B5C8C', emissiveIntensity: 0.35 }), n('sea'));
    m.tunnel = instanced(UNIT_BOX, std({ color: '#3D3660', roughness: 0.55 }), n('tunnel'), { receive: true });
    m.neon = instanced(UNIT_BOX, glow(), n('neon'), { colored: true });
    m.portal = instanced(UNIT_BOX, std({ color: '#7A7396', roughness: 0.9 }), n('portal'));
    m.rails = instanced(UNIT_BOX, std({ color: '#F4F6FA', metalness: 0.55, roughness: 0.3 }), n('rails'));
    m.pillars = instanced(UNIT_BOX, std({ color: '#CFC9DE' }), n('pillars'));
    m.cacti = instanced(P.cactusGeometry(), props, n('cacti'), { cast: true, colored: true });
    m.rocks = instanced(P.rockGeometry(), props, n('rocks'), { cast: true, colored: true });
    m.statues = instanced(P.gymStationGeometry(), props, n('statues'), { cast: true, colored: true });
    m.frost = instanced(P.snowTreeGeometry(), props, n('frost'), { cast: true, colored: true });
    m.trainers = instanced(P.trainerGeometry(), props, n('trainers'), { cast: true, colored: true });
    m.gear = instanced(P.kettlebellGeometry(), props, n('gear'), { cast: true, colored: true });
    m.balls = instanced(P.ballGeometry(), props, n('balls'), { cast: true, colored: true });

    this.scroller = new Scroller(
      LOT_COUNT, LOT_LEN, FIRST_Z, FIRST_Z,
      (i, local, world) => this.placeLot(i, local, world),
      (i, local) => this.moveLot(i, local),
    );
    for (let i = 0; i < LOT_COUNT; i++) {
      const crew = [0, 1, 2].map((n) => makeGymAthlete(i * 3 + n));
      for (const a of crew) {
        a.root.visible = false;
        this.scroller.group.add(a.root);
      }
      this.lots.push({ biome: 'city', ops: [], crew });
    }
    Object.values(m).forEach((mesh) => this.scroller.group.add(mesh));
    this.scroller.init();
  }

  get group() {
    return this.scroller.group;
  }

  scroll(dz: number) {
    this.scroller.scroll(dz);
  }

  tick(t: number) {
    for (let n = 0; n < this.lots.length; n++) {
      const lot = this.lots[n];
      const local = this.scroller.local[n];
      if (lot.biome === 'gym') {
        for (const a of lot.crew) {
          if (a.root.visible) a.pose(t);
        }
      }
      for (const op of lot.ops) {
        if (!op.wave) continue;
        if (op.wave === 1) {
          const sway = Math.sin(t * 1.45 + op.x * 0.32 + op.z * 0.08) * 0.075;
          put(op.mesh, op.i, op.x, op.y, local + op.z, op.sx, op.sy, op.sz, op.ry, sway, op.rz + sway);
        } else if (op.wave === 2) {
          const amp = op.sz > 20 ? 0.07 : 0.2;
          const bob = Math.sin(t * 2.05 + op.x) * amp;
          put(op.mesh, op.i, op.x, op.y + bob, local + op.z, op.sx, op.sy, op.sz, op.ry, 0, op.rz);
        } else if (op.wave === 3) {
          const y = 0.5 + ((op.y + t * 1.65 + op.x * 0.25) % 9.4);
          put(op.mesh, op.i, op.x, y, local + op.z, op.sx, op.sy, op.sz, op.ry, 0, op.rz);
        } else {
          const x = op.x + Math.sin(t * 0.55 + op.z) * 0.55;
          put(op.mesh, op.i, x, op.y, local + op.z, op.sx, op.sy, op.sz, op.ry, t * 2.8 + op.z, op.rz);
        }
      }
    }
  }

  // ---------------------------------------------------------------- placement

  private slot(key: MeshKey, k: number) {
    return this.currentIndex * PER_LOT[key] + k;
  }

  /** Writes one instance (lot-relative z) and records it for re-basing. */
  private add(key: MeshKey, k: number, x: number, y: number, z: number, sx = 1, sy = sx, sz = sx, ry = 0, rz = 0, color?: THREE.ColorRepresentation | THREE.Color) {
    const lot = this.current!;
    const mesh = this.meshes[key];
    const i = this.slot(key, k);
    const base = this.scroller.local[this.currentIndex];
    put(mesh, i, x, y, base + z, sx, sy, sz, ry, 0, rz);
    if (color !== undefined) paint(mesh, i, color);
    lot.ops.push({ mesh, i, x, y, z, sx, sy, sz, ry, rz, wave: 0 });
  }

  /** Marks the last placed instance as a cheap looping motion. */
  private live(wave: number) {
    const ops = this.current?.ops;
    if (!ops?.length) return;
    ops[ops.length - 1].wave = wave;
  }

  private moveLot(index: number, local: number) {
    for (const op of this.lots[index].ops) {
      put(op.mesh, op.i, op.x, op.y, local + op.z, op.sx, op.sy, op.sz, op.ry, 0, op.rz);
    }
    for (const a of this.lots[index].crew) {
      if (a.root.visible) a.root.position.z = local + a.zOff;
    }
  }

  private placeLot(index: number, _local: number, world: number) {
    const lot = this.lots[index];
    this.current = lot;
    this.currentIndex = index;
    lot.ops.length = 0;
    for (const a of lot.crew) a.root.visible = false;
    (Object.keys(PER_LOT) as MeshKey[]).forEach((key) => {
      for (let k = 0; k < PER_LOT[key]; k++) hide(this.meshes[key], index * PER_LOT[key] + k);
    });
    // Distance of the lot centre ahead of the runner decides its biome.
    const biome = biomeAt(this.distance - (world - LOT_LEN / 2));
    const entering = biome !== this.lastBiome;
    lot.biome = biome;
    this.lastBiome = biome;
    this.counter += 1;
    if (biome === 'city') this.city();
    else if (biome === 'beach') this.beach();
    else if (biome === 'tunnel') this.tunnel(entering);
    else if (biome === 'night') this.night();
    else if (biome === 'sunset') this.bridge('#8E6FA8', '#C77A6B');
    else if (biome === 'gym') this.gym();
    else if (biome === 'desert') this.desert();
    else if (biome === 'mountain') this.mountain();
    else if (biome === 'docks') this.docks();
    else if (biome === 'park') this.park();
    else if (biome === 'snow') this.snow();
    else this.bridge();
  }

  private sidewalk(side: number, color: string) {
    this.add('ground', side < 0 ? 0 : 1, side * (ROAD_EDGE + WALK_EDGE) / 2, 0, -LOT_LEN / 2, WALK_EDGE - ROAD_EDGE, 0.12, LOT_LEN + 0.02, 0, 0, color);
  }

  private outer(side: number, color: string, from = WALK_EDGE, width = 32, y = -0.03) {
    this.add('ground', side < 0 ? 2 : 3, side * (from + width / 2), y, -LOT_LEN / 2, width, 0.06, LOT_LEN + 0.02, 0, 0, color);
  }

  private building(side: number, k: number, opts: { w: [number, number]; d: [number, number]; h: [number, number]; palette: readonly string[]; x0?: number; y0?: number; decor?: boolean }) {
    const w = rand(...opts.w);
    const d = rand(...opts.d);
    const h = rand(...opts.h);
    const y0 = opts.y0 ?? 0;
    const x = side * ((opts.x0 ?? FACADE_X) + w / 2);
    const z = -LOT_LEN / 2 + rand(-0.3, 0.3);
    const color = choose(opts.palette);
    this.add('bodies', k * 2, x, y0, z, w, h, d, 0, 0, color);
    const trim = tmpColor.set(color).lerp(tmpColor.clone().set('#FFFFFF'), 0.55);
    this.add('trims', k * 2, x, y0 + h, z, w + 0.3, 0.32, d + 0.3, 0, 0, trim);
    if (opts.decor === false) return { x, z, w, d, h };

    if (chance(0.5)) {
      const w2 = w * rand(0.45, 0.7);
      const d2 = d * rand(0.5, 0.8);
      const h2 = rand(1.8, 4.5);
      const x2 = x + side * (w - w2) * 0.5 * rand(0.3, 1);
      const c2 = choose(opts.palette);
      this.add('bodies', k * 2 + 1, x2, y0 + h + 0.32, z, w2, h2, d2, 0, 0, c2);
      this.add('trims', k * 2 + 1, x2, y0 + h + 0.32 + h2, z, w2 + 0.24, 0.26, d2 + 0.24, 0, 0, '#FFFFFF');
    } else if (chance(0.6)) {
      this.add('tanks', k, x + side * rand(0, w / 4), y0 + h + 0.32, z + rand(-d / 4, d / 4), 1);
    }
    if (chance(0.7)) {
      const len = d * rand(0.6, 0.85);
      this.add('awnings', k, side * (FACADE_X - 0.62), y0 + 2.55, z, 1.35, 0.1, len, 0, side * 0.28, choose(AWNINGS));
    }
    if (chance(0.55)) {
      const c = tmpColor.set(choose(SIGNS)).multiplyScalar(1.6);
      this.add('signs', k, side * (FACADE_X - 0.04), y0 + rand(3.3, 4.1), z, 0.08, 0.75, d * rand(0.35, 0.55), 0, 0, c);
      this.live(1);
    }
    return { x, z, w, d, h };
  }

  /** Lamp near the curb; the model's arm points to -X, so the left one turns around. */
  private lamp(side: number, k: number, z: number, x = side * 4.85) {
    this.add('lamps', k, x, 0, z, 1, 1, 1, side < 0 ? Math.PI : 0);
  }

  private streetProps(side: number, k: number) {
    const facing = side < 0 ? Math.PI : 0;
    if (chance(0.45)) this.add('benches', k, side * 7.0, 0.06, -8.3, 1, 1, 1, facing);
    if (chance(0.5)) this.add('bins', k, side * 5.0, 0.06, -4.3, 1, 1, 1, 0, 0, choose(['#2FBF71', '#3D8BFF', '#FF6B3D']));
    if (chance(0.55)) this.add('bushes', k, side * 7.15, 0.06, -2.6, rand(0.8, 1.15), rand(0.8, 1.1), rand(0.8, 1.15), rand(0, 3), 0, tmpColor.setHSL(0.3, 0.5, rand(0.85, 1)));
    if (chance(0.5)) this.add('pots', k, side * 5.25, 0.06, -6.6, 1, 1, 1, 0, 0, choose(['#FFFFFF', '#FFE3C7', '#E0F7FF']));
  }

  private city() {
    const tone = this.counter % 2 ? '#FFC2AE' : '#FFB49C';
    for (const side of [-1, 1]) {
      const k = side < 0 ? 0 : 1;
      this.sidewalk(side, tone);
      this.outer(side, '#F6DDBE');
      const b = this.building(side, k, { w: [5, 8.5], d: [6.6, 9.4], h: [5.5, 15], palette: FACADES });
      if (chance(0.7)) {
        if (chance(0.35)) {
          this.add('palms', k * 2, side * 6.6, 0.06, -5.6, rand(0.9, 1.1), rand(0.9, 1.15), rand(0.9, 1.1), rand(0, 6), 0, '#FFFFFF');
          this.live(1);
        } else {
          this.add('trees', k, side * 6.6, 0.06, -5.6, rand(0.85, 1.1), rand(0.85, 1.2), rand(0.85, 1.1), rand(0, 6), 0, tmpColor.setHSL(0.3, 0.4, rand(0.85, 1)));
          this.live(1);
        }
      }
      if ((this.counter + k) % 2 === 0) this.lamp(side, k, -1.5);
      this.streetProps(side, k);
      if (k === this.counter % 2 && chance(0.35)) {
        // Rooftop billboard angled toward the road.
        const ry = -side * 0.35;
        const bx = side * (FACADE_X + 1.6);
        this.add('billboards', 0, bx, b.h + 0.32, b.z, 1, 1, 1, ry);
        const c = tmpColor.set(choose(SIGNS)).multiplyScalar(1.4);
        this.add('signs', 2, bx + Math.sin(ry) * 0.05, b.h + 0.32 + 5.1, b.z + Math.cos(ry) * 0.05, 3.4, 2.0, 0.04, ry, 0, c);
      }
    }
  }

  private beach() {
    // Left: beach houses and cafés. Right: sand, umbrellas, palms and the sea.
    this.sidewalk(-1, '#FFE2B3');
    this.sidewalk(1, '#FFE2B3');
    this.outer(-1, '#FFE6B8');
    this.building(-1, 0, { w: [4, 6.5], d: [5, 8], h: [3.2, 6], palette: BEACH_FACADES });
    this.add('palms', 0, -6.6, 0.06, -3, rand(0.9, 1.15), rand(0.95, 1.25), rand(0.9, 1.15), rand(0, 6), 0, '#FFFFFF');
    this.live(1);
    if (chance(0.5)) this.add('pots', 0, -5.3, 0.06, -7.2, 1, 1, 1, 0, 0, '#FFFFFF');
    this.lamp(-1, 0, -8);

    this.outer(1, '#FFE0A6', WALK_EDGE, 7, -0.03);
    this.add('sea', 0, 14.7 + 40, -0.25, -LOT_LEN / 2, 80, 0.3, LOT_LEN + 0.02);
    this.live(2);
    if (chance(0.75)) {
      this.add('umbrellas', 1, rand(9.2, 12.2), 0, rand(-8, -2), 1, 1, 1, rand(0, 6));
      this.live(1);
    }
    if (chance(0.6)) {
      this.add('palms', 2, rand(8.4, 9.6), 0, rand(-9, -1), rand(0.9, 1.2), rand(1, 1.3), rand(0.9, 1.2), rand(0, 6), 0, '#FFFFFF');
      this.live(1);
    }
    if (chance(0.5)) {
      this.add('palms', 3, 6.6, 0.06, -7.5, 1, rand(0.95, 1.15), 1, rand(0, 6), 0, '#FFFFFF');
      this.live(1);
    }
    if (chance(0.7)) {
      this.add('balls', 0, rand(9.4, 12.0), 0.02, rand(-8, -2), 1, 1, 1, 0, 0, choose(['#FF4F6D', '#FFD23F', '#3D8BFF', '#FFFFFF']));
      this.live(2);
    }
    if (chance(0.4)) {
      this.add('balls', 1, rand(8.8, 11), 0.02, rand(-9, -1), 0.78, 0.78, 0.78, 0, 0, choose(['#FF4F6D', '#5FD3B0']));
      this.live(2);
    }
    if (chance(0.5)) this.add('awnings', 1, rand(9.0, 11.5), 0.04, rand(-8, -3), 1.6, 0.05, 1.1, rand(0, 1), 0, choose(['#FF4F6D', '#FFFFFF', '#5B7BFF']));
    if (this.counter % 2 === 0) this.lamp(1, 1, -2);
  }

  private tunnel(entering: boolean) {
    const ring = this.counter % 2 ? tmpColor.set('#00E5FF').multiplyScalar(1.5) : tmpColor.set('#FF2E88').multiplyScalar(1.5);
    for (const side of [-1, 1]) {
      const k = side < 0 ? 0 : 1;
      this.sidewalk(side, '#2E2946');
      this.add('tunnel', k, side * (WALK_EDGE + 0.25), 3.6, -LOT_LEN / 2, 0.5, 7.2, LOT_LEN + 0.02);
      this.add('neon', k * 2, side * (WALK_EDGE - 0.04), 1.0, -LOT_LEN / 2, 0.06, 0.09, LOT_LEN + 0.02, 0, 0, tmpColor.set('#00E5FF').multiplyScalar(1.6));
      this.add('neon', k * 2 + 1, side * (WALK_EDGE - 0.04), 5.6, -LOT_LEN / 2, 0.06, 0.07, LOT_LEN + 0.02, 0, 0, tmpColor.set('#FF2E88').multiplyScalar(1.6));
      this.add('neon', 4 + k, side * (WALK_EDGE - 0.1), 3.6, -LOT_LEN / 2, 0.16, 7.2, 0.16, 0, 0, ring);
    }
    this.add('tunnel', 2, 0, 7.4, -LOT_LEN / 2, WALK_EDGE * 2 + 1, 0.4, LOT_LEN + 0.02);
    this.add('neon', 6, 0, 7.12, -LOT_LEN / 2, WALK_EDGE * 2 - 0.2, 0.16, 0.16, 0, 0, ring);
    if (entering) {
      // Tunnel mouth seen when arriving from outside.
      for (const side of [-1, 1]) {
        this.add('portal', side < 0 ? 0 : 1, side * (WALK_EDGE + 11.5), 8, 0, 23, 16, 2);
        this.add('neon', side < 0 ? 7 : 8, side * (WALK_EDGE - 0.1), 3.8, 1.05, 0.25, 7.6, 0.2, 0, 0, tmpColor.set('#FFC400').multiplyScalar(1.6));
      }
      this.add('portal', 2, 0, 12.1, 0, WALK_EDGE * 2, 9, 2);
      this.add('neon', 9, 0, 7.6, 1.05, WALK_EDGE * 2, 0.25, 0.2, 0, 0, tmpColor.set('#FFC400').multiplyScalar(1.6));
    }
  }

  private bridge(deck = '#A7AABF', below = '#86D07A') {
    this.add('ground', 6, 0, -0.55, -LOT_LEN / 2, WALK_EDGE * 2 + 0.2, 1.0, LOT_LEN + 0.02, 0, 0, deck);
    for (const side of [-1, 1]) {
      const k = side < 0 ? 0 : 1;
      this.sidewalk(side, '#C9CCDA');
      this.add('rails', k * 4, side * (WALK_EDGE - 0.08), 1.05, -LOT_LEN / 2, 0.12, 0.1, LOT_LEN + 0.02);
      this.add('rails', k * 4 + 1, side * (WALK_EDGE - 0.08), 0.6, -LOT_LEN / 2, 0.08, 0.07, LOT_LEN + 0.02);
      this.add('rails', k * 4 + 2, side * (WALK_EDGE - 0.08), 0.55, -2.5, 0.1, 1.05, 0.1);
      this.add('rails', k * 4 + 3, side * (WALK_EDGE - 0.08), 0.55, -7.5, 0.1, 1.05, 0.1);
      if (this.counter % 2 === 0) this.add('pillars', k, side * 3.4, LOW_Y / 2 - 0.5, -LOT_LEN / 2, 1.7, -LOW_Y - 1, 1.7);
      // The city far below the deck.
      this.add('ground', 4 + k, side * (WALK_EDGE + 30), LOW_Y - 0.05, -LOT_LEN / 2, 60, 0.1, LOT_LEN + 0.02, 0, 0, below);
      this.building(side, k, { w: [5, 9], d: [6, 9], h: [6, 13.5], palette: FACADES, x0: rand(10, 26), y0: LOW_Y, decor: false });
      if ((this.counter + k) % 3 === 0) this.lamp(side, k, -5, side * 7.3);
    }
  }

  /** Downtown at night: the city layout plus neon strips and glowing billboards. */
  private night() {
    this.city();
    for (const side of [-1, 1]) {
      const k = side < 0 ? 0 : 1;
      const c = tmpColor.set(this.counter % 2 ? '#B46BFF' : '#00E5FF').multiplyScalar(1.8);
      this.add('neon', k, side * (FACADE_X - 0.06), 2.0, -LOT_LEN / 2, 0.06, 0.1, LOT_LEN * 0.8, 0, 0, c);
      if (chance(0.5)) this.add('neon', 2 + k, side * (FACADE_X - 0.08), rand(5, 9), -LOT_LEN / 2 + rand(-2, 2), 0.06, rand(1.2, 2.4), 0.12, 0, 0, tmpColor.set(choose(SIGNS)).multiplyScalar(2));
    }
  }

  /** Outdoor gym by the beach: 1–3 trainers on the left, sea and palms on the right. */
  private gym() {
    const local = this.scroller.local[this.currentIndex];
    const crew = this.current!.crew;

    this.sidewalk(-1, '#3A3F52');
    this.outer(-1, '#2E3348');
    this.add('ground', 4, -8.6, 0.03, -LOT_LEN / 2, 6.4, 0.08, LOT_LEN + 0.02, 0, 0, '#1A1C28');
    if (this.counter % 3 === 0) this.lamp(-1, 0, -1.2);

    this.sidewalk(1, '#FFE2B3');
    this.outer(1, '#FFE0A6', WALK_EDGE, 7, -0.03);
    this.add('sea', 0, 14.7 + 40, -0.25, -LOT_LEN / 2, 80, 0.3, LOT_LEN + 0.02);
    this.live(2);
    this.add('palms', 2, 8.8, 0, -3.0, rand(0.9, 1.15), rand(0.95, 1.2), rand(0.9, 1.15), rand(0, 6), 0, '#FFFFFF');
    this.live(1);
    if (this.counter % 2 === 0) {
      this.add('palms', 3, 9.5, 0, -7.6, rand(0.85, 1.1), rand(0.9, 1.2), rand(0.85, 1.1), rand(0, 6), 0, '#FFFFFF');
      this.live(1);
    }
    if (this.counter % 3 === 1) {
      this.add('umbrellas', 1, 10.2, 0, -5.4, 1, 1, 1, rand(0, 6));
      this.live(1);
    }

    if (this.counter % 2 !== 0) return;

    this.add('statues', 0, -8.1, 0.02, -5.4, 1, 1, 1, 0.18);
    this.add('gear', 0, -7.2, 0.02, -2.4, 1, 1, 1);
    this.add('gear', 1, -9.1, 0.02, -8.0, 0.9, 0.9, 0.9);

    const wave = Math.floor(this.counter / 2);
    const count = 1 + (wave % 3);
    const spots = [
      { x: -7.4, z: -2.6, ry: 1.05 },
      { x: -8.3, z: -5.4, ry: 0.85 },
      { x: -7.6, z: -8.0, ry: 1.2 },
    ];
    for (let i = 0; i < count; i++) {
      const a = crew[i];
      a.setSport(SPORTS[(wave + i) % SPORTS.length]);
      a.zOff = spots[i].z;
      a.root.visible = true;
      a.root.position.set(spots[i].x, 0, local + a.zOff);
      a.root.rotation.y = spots[i].ry;
    }
  }

  /** Desert road: sand, cacti, red rocks and distant mesas. */
  private desert() {
    for (const side of [-1, 1]) {
      const k = side < 0 ? 0 : 1;
      this.sidewalk(side, '#F2C98A');
      this.outer(side, '#F4CF92', WALK_EDGE, 60);
      for (let c = 0; c < 2; c++) {
        if (chance(0.7)) this.add('cacti', k * 2 + c, side * rand(6.4, 14), 0, rand(-9, -1), rand(0.8, 1.3), rand(0.8, 1.4), rand(0.8, 1.3), rand(0, 6), 0, tmpColor.setHSL(0.33, 0.5, rand(0.75, 1)));
      }
      if (chance(0.6)) this.add('rocks', k * 2, side * rand(7, 12), 0, rand(-9, -1), rand(0.6, 1.4), rand(0.5, 1.2), rand(0.6, 1.4), rand(0, 6), 0, choose(DESERT_ROCKS));
      if (chance(0.4)) {
        this.add('bushes', k, side * rand(6.6, 11), 0.32, rand(-8, -1), 0.72, 0.72, 0.72, 0, 0, '#C9A06A');
        this.live(4);
      }
      if (this.counter % 3 === k) {
        // Distant mesa: a huge flattened rock far from the road.
        this.add('rocks', k * 2 + 1, side * rand(30, 45), -1, -LOT_LEN / 2, rand(10, 16), rand(6, 10), rand(6, 9), rand(0, 6), 0, choose(DESERT_ROCKS));
      }
      if ((this.counter + k) % 4 === 0) this.lamp(side, k, -5);
    }
  }

  /** Alpine road: pines, guardrails and distant stone peaks. */
  private mountain() {
    for (const side of [-1, 1]) {
      const k = side < 0 ? 0 : 1;
      this.sidewalk(side, '#9AA7B2');
      this.outer(side, '#6B8F5E', WALK_EDGE, 50);
      this.add('rails', k * 4, side * (WALK_EDGE - 0.08), 1.05, -LOT_LEN / 2, 0.12, 0.1, LOT_LEN + 0.02);
      this.add('rails', k * 4 + 1, side * (WALK_EDGE - 0.08), 0.6, -LOT_LEN / 2, 0.08, 0.07, LOT_LEN + 0.02);
      if (this.counter % 5 === k) {
        this.building(side, k, { w: [4, 6], d: [5, 7], h: [3, 5], palette: PARK_FACADES, decor: false });
      } else {
        this.add('trees', k, side * rand(6.2, 8.4), 0.06, rand(-8, -2), rand(0.95, 1.25), rand(1.35, 1.85), rand(0.95, 1.25), rand(0, 6), 0, tmpColor.setHSL(0.33, 0.45, rand(0.28, 0.42)));
        this.live(1);
      }
      if (chance(0.7)) {
        this.add('rocks', k * 2, side * rand(7.2, 12), 0, rand(-9, -1), rand(0.8, 1.5), rand(1.0, 1.9), rand(0.8, 1.5), rand(0, 6), 0, choose(MOUNTAIN_ROCKS));
      }
      if (this.counter % 2 === k) {
        this.add('rocks', k * 2 + 1, side * rand(28, 44), -2, -LOT_LEN / 2, rand(12, 20), rand(14, 24), rand(8, 14), rand(0, 6), 0, choose(MOUNTAIN_ROCKS));
      }
      if ((this.counter + k) % 2 === 0) this.lamp(side, k, -3);
    }
  }

  /** Harbour: warehouses on the left, water and a crane on the right. */
  private docks() {
    this.sidewalk(-1, '#4A5368');
    this.sidewalk(1, '#4A5368');
    this.outer(-1, '#3A4254');
    this.building(-1, 0, { w: [6, 9], d: [7, 9.2], h: [7, 15], palette: DOCK_FACADES, decor: false });
    this.add('tanks', 0, -6.5, 0.06, -3.8, 1.15);
    if (chance(0.55)) this.add('tanks', 1, -8.4, 0.06, -7.4, 0.95);
    this.lamp(-1, 0, -1.6);
    if (chance(0.5)) this.add('bins', 0, -5.1, 0.06, -6.2, 1.15, 1, 1.15, 0, 0, '#C45C26');

    this.outer(1, '#2A3344', WALK_EDGE, 6, -0.03);
    this.add('sea', 0, 18.2, -0.22, -LOT_LEN / 2, 72, 0.3, LOT_LEN + 0.02);
    this.live(2);
    if (chance(0.55)) {
      this.add('balls', 1, rand(9.6, 13.2), 0.12, rand(-7, -2), 1.05, 1.05, 1.05, 0, 0, choose(['#FF6B3D', '#FFD23F', '#FFFFFF']));
      this.live(2);
    }
    this.add('pillars', 1, 8.6, 4.2, -LOT_LEN / 2, 0.55, 8.4, 0.55);
    this.add('rails', 0, 11.2, 8.4, -LOT_LEN / 2, 6.4, 0.22, 0.32);
    this.add('rails', 1, 14.2, 7.6, -LOT_LEN / 2, 0.18, 1.6, 0.18);
    const glow = tmpColor.set(this.counter % 2 ? '#FF9A3D' : '#00E5FF').multiplyScalar(1.55);
    this.add('neon', 0, 6.15, 2.15, -LOT_LEN / 2, 0.08, 0.12, LOT_LEN * 0.7, 0, 0, glow);
    if (chance(0.45)) this.add('neon', 1, 6.2, rand(4.5, 7), -LOT_LEN / 2 + rand(-2, 2), 0.08, rand(1.1, 2), 0.12, 0, 0, tmpColor.set(choose(SIGNS)).multiplyScalar(1.7));
    this.lamp(1, 1, -6.2);
    if (chance(0.5)) this.add('bins', 1, 5.15, 0.06, -4.8, 1.2, 1, 1.2, 0, 0, '#8A9AAB');
  }

  /** Green campus: lawns, trees, benches and a few low brick halls. */
  private park() {
    for (const side of [-1, 1]) {
      const k = side < 0 ? 0 : 1;
      this.sidewalk(side, '#E8F0D8');
      this.outer(side, '#7BC46A');
      if (this.counter % 3 === k) {
        this.building(side, k, { w: [5, 7.5], d: [6, 8], h: [3.4, 6.4], palette: PARK_FACADES });
      } else {
        this.add('trees', k, side * rand(6.3, 8.1), 0.06, rand(-7.2, -2), rand(1.0, 1.35), rand(1.15, 1.55), rand(1.0, 1.35), rand(0, 6), 0, tmpColor.setHSL(0.32, 0.55, rand(0.78, 1)));
        this.live(1);
        this.add('bushes', k, side * 6.85, 0.06, -8.1, 1.15, 0.95, 1.25, 0, 0, '#4CB85A');
      }
      this.add('pots', k, side * 5.2, 0.06, -4.4, 1, 1, 1, 0, 0, choose(['#FFFFFF', '#FFE3C7', '#E8F0D8']));
      if (chance(0.65)) this.add('benches', k, side * 7.0, 0.06, -6.2, 1, 1, 1, side < 0 ? Math.PI : 0);
      if (chance(0.35)) {
        this.add('balls', k, side * rand(5.4, 6.8), 0.02, rand(-7, -3), 0.82, 0.82, 0.82, 0, 0, choose(['#FF4F6D', '#FFD23F', '#3D8BFF']));
        this.live(2);
      }
      if ((this.counter + k) % 2 === 0) this.lamp(side, k, -1.5);
    }
  }

  /** Frozen street: white ground, snow caps, pines and falling flakes. */
  private snow() {
    for (const side of [-1, 1]) {
      const k = side < 0 ? 0 : 1;
      this.sidewalk(side, '#F8FBFF');
      this.outer(side, '#EEF5FC', WALK_EDGE, 70);
      this.add('ground', 4 + k, side * (ROAD_EDGE + 1.7), 0.2, -LOT_LEN / 2, 2.8, 0.44, LOT_LEN + 0.02, 0, 0, '#FFFFFF');
      const b = this.building(side, k, {
        w: [5.2, 7.6], d: [6.2, 8.4], h: [5, 11], palette: SNOW_FACADES, decor: false,
      });
      this.add('trims', k * 2 + 1, b.x, b.h + 0.42, b.z, b.w + 0.75, 0.58, b.d + 0.75, 0, 0, '#FFFFFF');
      this.add('frost', k * 2, side * rand(6.4, 8.2), 0.06, rand(-8.2, -2.2), rand(1.05, 1.35), rand(1.35, 1.85), rand(1.05, 1.35), rand(0, 6), 0, '#FFFFFF');
      this.live(1);
      if (chance(0.7)) {
        this.add('frost', k * 2 + 1, side * rand(8.4, 11), 0.06, rand(-9, -1), rand(0.85, 1.15), rand(1.1, 1.5), rand(0.85, 1.15), rand(0, 6), 0, '#F4F8FC');
        this.live(1);
      }
      this.add('awnings', k, side * 6.1, 0, rand(-8.2, -1.8), rand(2.0, 2.8), rand(0.55, 0.9), rand(1.6, 2.4), 0, 0, '#FFFFFF');
      this.lamp(side, k, -2.2);
    }
    for (let f = 0; f < 10; f++) {
      this.add('neon', f, rand(-12, 12), rand(1.4, 10), rand(-9, 0), 0.11, 0.11, 0.11, 0, 0, '#FFFFFF');
      this.live(3);
    }
  }
}
