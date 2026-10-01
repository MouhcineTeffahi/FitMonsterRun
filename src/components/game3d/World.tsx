import { useLoader } from '@react-three/fiber';
import React, { forwardRef, useImperativeHandle, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

import { modelUrl, normalizedClone, type ModelKey } from '../../utils/models';
import { CAR_LENGTH, LANE_X } from '../../utils/runner3d';

const TILE_LENGTH = 5;
const TILE_COUNT = 24;
const TRACK_SPAN = TILE_LENGTH * TILE_COUNT;

export const CHUNK_LEN = 30;
const CHUNK_COUNT = 5;
const CHUNK_SPAN = CHUNK_LEN * CHUNK_COUNT;
/** Chunk start (nearest edge) beyond which a chunk is behind the camera. */
const RECYCLE_Z = 15 + CHUNK_LEN;
/** Distance covered by each biome before the next one starts. */
const BIOME_CHUNKS = 9;

export const BIOMES = ['street', 'yard', 'tunnel', 'elevated'] as const;
export type Biome = (typeof BIOMES)[number];

/** Web QA: `?biome=tunnel` starts the run inside that biome. */
const START_CHUNK = (() => {
  const search = typeof window !== 'undefined' ? window.location?.search : undefined;
  const wanted = search ? new URLSearchParams(search).get('biome') : null;
  const i = BIOMES.indexOf(wanted as Biome);
  return i > 0 ? i * BIOME_CHUNKS - 1 : 0;
})();

export function biomeOfChunk(k: number): Biome {
  return BIOMES[Math.floor(Math.max(0, k + START_CHUNK) / BIOME_CHUNKS) % BIOMES.length];
}

const BUILDING_KEYS: ModelKey[] = ['buildingA', 'skyscraperA', 'buildingC', 'buildingG', 'skyscraperC'];

export type WorldHandle = {
  scroll: (dz: number) => void;
  /** Biome under the runner (z = 0). */
  currentBiome: () => Biome;
};

const UNIT_BOX = new THREE.BoxGeometry(1, 1, 1);
const UNIT_PLANE = new THREE.PlaneGeometry(1, 1);

type Kit = Record<string, THREE.Material>;

function makeKit(): Kit {
  const std = (color: string, extra: THREE.MeshStandardMaterialParameters = {}) =>
    new THREE.MeshStandardMaterial({ color, roughness: 0.8, ...extra });
  const glow = (color: string) => new THREE.MeshBasicMaterial({ color, toneMapped: false });
  return {
    asphalt: std('#4E4A57'),
    sidewalk: std('#A7A2B6'),
    curb: std('#FCB202', { emissive: '#4A3300' }),
    grass: std('#5DBB63'),
    trunk: std('#6D4C41'),
    leaves: std('#43A047'),
    pole: std('#2E2E38', { metalness: 0.6, roughness: 0.4 }),
    lamp: glow('#FFF3C4'),
    gravel: std('#7A6A5A'),
    fence: std('#3B3B45', { metalness: 0.5 }),
    warehouse: std('#8D6E63'),
    warehouse2: std('#5C6BC0'),
    flood: glow('#FFE9A8'),
    tunnelFloor: std('#2A2633'),
    tunnelWall: std('#3A3447', { roughness: 0.6 }),
    tunnelCeil: std('#26222F'),
    neonCyan: glow('#00E5FF'),
    neonPink: glow('#FF2E88'),
    neonYellow: glow('#FCB202'),
    portal: std('#5A5466', { roughness: 0.9 }),
    deck: std('#9E9AA8', { roughness: 0.7 }),
    rail: std('#ECEFF1', { metalness: 0.7, roughness: 0.25 }),
    pillar: std('#B8B4C2'),
    cityGround: std('#6B8F71'),
    block1: std('#F48FB1'),
    block2: std('#81D4FA'),
    block3: std('#FFE082'),
    block4: std('#CE93D8'),
    white: glow('#FFFFFF'),
    boardGreen: glow('#2E7D32'),
    boardPink: glow('#C2185B'),
    boardPurple: glow('#4527A0'),
  };
}

function box(mat: THREE.Material, sx: number, sy: number, sz: number, x: number, y: number, z: number, receive = false) {
  const m = new THREE.Mesh(UNIT_BOX, mat);
  m.scale.set(sx, sy, sz);
  m.position.set(x, y, z);
  m.receiveShadow = receive;
  return m;
}

function floor(mat: THREE.Material, width: number, x: number, y = 0, len = CHUNK_LEN) {
  const m = new THREE.Mesh(UNIT_PLANE, mat);
  m.rotation.x = -Math.PI / 2;
  m.scale.set(width, len, 1);
  m.position.set(x, y, -len / 2);
  m.receiveShadow = true;
  return m;
}

/** Flat 2D-style billboard: coloured panel with a bold pictogram. */
function billboard(kit: Kit, variant: number, side: number, z: number) {
  const g = new THREE.Group();
  g.add(box(kit.pole, 0.2, 4.2, 0.2, 0, 2.1, 0));
  const boards = [kit.boardGreen, kit.boardPink, kit.boardPurple];
  const panel = new THREE.Mesh(UNIT_PLANE, boards[variant % boards.length]);
  panel.scale.set(3.4, 2, 1);
  panel.position.set(0, 5, 0.12);
  g.add(panel);
  const icon = new THREE.Group();
  icon.position.set(0, 5, 0.14);
  if (variant % 3 === 0) {
    icon.add(box(kit.white, 0.34, 1.3, 0.01, -0.9, 0, 0));
    icon.add(box(kit.white, 1.3, 0.34, 0.01, -0.9, 0, 0));
  } else if (variant % 3 === 1) {
    const bolt = new THREE.Shape();
    bolt.moveTo(0.15, 0.75);
    bolt.lineTo(-0.45, -0.05);
    bolt.lineTo(-0.05, -0.05);
    bolt.lineTo(-0.2, -0.75);
    bolt.lineTo(0.45, 0.1);
    bolt.lineTo(0.05, 0.1);
    bolt.closePath();
    const m = new THREE.Mesh(new THREE.ShapeGeometry(bolt), kit.neonYellow);
    m.position.x = -0.9;
    icon.add(m);
  } else {
    const coin = new THREE.Mesh(new THREE.CircleGeometry(0.62, 24), kit.neonYellow);
    coin.position.x = -0.9;
    icon.add(coin);
  }
  [0.35, 0, -0.35].forEach((y, i) => icon.add(box(kit.white, 1.5 - i * 0.35, 0.16, 0.01, 0.55 - i * 0.17, y, 0)));
  g.add(icon);
  g.position.set(side * 6.4, 0, z);
  g.rotation.y = side > 0 ? -0.35 : 0.35;
  return g;
}

function buildStreet(kit: Kit, k: number, buildings: THREE.Object3D[]) {
  const g = new THREE.Group();
  g.add(floor(kit.asphalt, 8.6, 0, -0.02));
  for (const side of [-1, 1]) {
    g.add(floor(kit.sidewalk, 3.4, side * 6, 0.02));
    g.add(box(kit.curb, 0.16, 0.14, CHUNK_LEN, side * 4.3, 0.07, -CHUNK_LEN / 2));
    [-7.5, -22.5].forEach((z, i) => {
      const src = buildings[(k * 2 + i + (side > 0 ? 3 : 0)) % buildings.length];
      const b = normalizedClone(src, { maxSize: 9 + ((k + i) % 3) * 1.5 });
      const width = new THREE.Box3().setFromObject(b).getSize(new THREE.Vector3()).x;
      b.rotation.y = side < 0 ? Math.PI / 2 : -Math.PI / 2;
      b.position.set(side * (7.8 + width / 2), 0, z);
      g.add(b);
    });
    const tree = new THREE.Group();
    tree.add(box(kit.trunk, 0.25, 1.6, 0.25, 0, 0.8, 0));
    const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(0.95, 0), kit.leaves);
    crown.position.y = 2.1;
    tree.add(crown);
    tree.position.set(side * 6.9, 0, -15);
    g.add(tree);
    const lamp = new THREE.Group();
    lamp.add(box(kit.pole, 0.14, 4.4, 0.14, 0, 2.2, 0));
    lamp.add(box(kit.pole, 1.1, 0.1, 0.12, -side * 0.5, 4.4, 0));
    lamp.add(box(kit.lamp, 0.5, 0.12, 0.3, -side * 0.95, 4.33, 0));
    lamp.position.set(side * 4.8, 0, -2);
    g.add(lamp);
  }
  g.add(billboard(kit, k, k % 2 ? 1 : -1, -25));
  return g;
}

function buildYard(kit: Kit, k: number, track: THREE.Object3D, cars: THREE.Object3D[]) {
  const g = new THREE.Group();
  g.add(floor(kit.gravel, 34, 0, -0.03));
  for (const side of [-1, 1]) {
    for (let i = 0; i < CHUNK_LEN / TILE_LENGTH; i++) {
      const t = normalizedClone(track, { length: TILE_LENGTH });
      t.scale.x = 1.9;
      t.position.set(side * 6.6, 0.01, -i * TILE_LENGTH - TILE_LENGTH / 2);
      g.add(t);
    }
    if ((k + (side > 0 ? 1 : 0)) % 2 === 0) {
      const train = new THREE.Group();
      [0, 1, 2].forEach((c) => {
        const car = normalizedClone(cars[c % cars.length], { length: CAR_LENGTH * 0.97 });
        car.position.z = -c * CAR_LENGTH;
        train.add(car);
      });
      train.position.set(side * 6.6, 0, -8 - (k % 3) * 3);
      g.add(train);
    }
    g.add(box(kit.fence, 0.08, 1.6, CHUNK_LEN, side * 9.4, 0.8, -CHUNK_LEN / 2));
    const flood = new THREE.Group();
    flood.add(box(kit.pole, 0.22, 7.5, 0.22, 0, 3.75, 0));
    flood.add(box(kit.pole, 1.4, 0.15, 0.3, -side * 0.5, 7.5, 0));
    flood.add(box(kit.flood, 1.2, 0.35, 0.25, -side * 0.6, 7.3, 0.05));
    flood.position.set(side * 9, 0, -12);
    g.add(flood);
    g.add(box(side > 0 ? kit.warehouse : kit.warehouse2, 10, 6 + (k % 3) * 2, 22, side * 17, 3 + (k % 3), -15));
  }
  return g;
}

function buildTunnel(kit: Kit) {
  const g = new THREE.Group();
  g.add(floor(kit.tunnelFloor, 9.4, 0, -0.02));
  for (const side of [-1, 1]) {
    g.add(box(kit.tunnelWall, 0.5, 6.4, CHUNK_LEN, side * 4.95, 3.2, -CHUNK_LEN / 2, true));
    g.add(box(kit.neonCyan, 0.05, 0.08, CHUNK_LEN, side * 4.68, 1.1, -CHUNK_LEN / 2));
    g.add(box(kit.neonPink, 0.05, 0.06, CHUNK_LEN, side * 4.68, 4.6, -CHUNK_LEN / 2));
  }
  g.add(box(kit.tunnelCeil, 10.4, 0.4, CHUNK_LEN, 0, 6.6, -CHUNK_LEN / 2));
  [-6, -21].forEach((z, i) => {
    const mat = i === 0 ? kit.neonCyan : kit.neonPink;
    g.add(box(mat, 0.18, 6.2, 0.18, -4.62, 3.1, z));
    g.add(box(mat, 0.18, 6.2, 0.18, 4.62, 3.1, z));
    g.add(box(mat, 9.4, 0.18, 0.18, 0, 6.3, z));
  });
  return g;
}

/** Tunnel mouth seen when arriving from outside. */
function buildPortal(kit: Kit) {
  const g = new THREE.Group();
  for (const side of [-1, 1]) g.add(box(kit.portal, 14, 14, 2, side * 12.2, 7, -0.5));
  g.add(box(kit.portal, 10.4, 7.4, 2, 0, 10.3, -0.5));
  g.add(box(kit.neonYellow, 9.6, 0.2, 0.2, 0, 6.5, 0.6));
  for (const side of [-1, 1]) g.add(box(kit.neonYellow, 0.2, 6.5, 0.2, side * 4.8, 3.25, 0.6));
  return g;
}

function buildElevated(kit: Kit, k: number) {
  const g = new THREE.Group();
  g.add(box(kit.deck, 8.8, 0.8, CHUNK_LEN, 0, -0.42, -CHUNK_LEN / 2, true));
  for (const side of [-1, 1]) {
    g.add(box(kit.rail, 0.1, 0.1, CHUNK_LEN, side * 4.3, 1.0, -CHUNK_LEN / 2));
    g.add(box(kit.curb, 0.12, 0.12, CHUNK_LEN, side * 4.3, 0.06, -CHUNK_LEN / 2));
    for (let z = -1.5; z > -CHUNK_LEN; z -= 3) g.add(box(kit.rail, 0.08, 1.0, 0.08, side * 4.3, 0.5, z));
    g.add(box(kit.pillar, 1.4, 16, 1.4, side * 3, -8.6, -15));
  }
  g.add(floor(kit.cityGround, 140, 0, -16.6));
  const blocks = [kit.block1, kit.block2, kit.block3, kit.block4];
  for (let i = 0; i < 6; i++) {
    const side = i % 2 ? 1 : -1;
    const h = 4 + ((k * 7 + i * 5) % 9);
    const x = side * (12 + ((k * 3 + i * 11) % 26));
    g.add(box(blocks[(k + i) % blocks.length], 5 + (i % 3), h, 6 + (i % 2) * 3, x, -16.6 + h / 2, -4 - i * 4.5));
  }
  return g;
}

type Chunk = {
  group: THREE.Group;
  biomes: Record<Biome, THREE.Group>;
  portal: THREE.Group;
  k: number;
};

export const World = forwardRef<WorldHandle>(function World(_, ref) {
  const [track, trainFront, trainMiddle, trainBack, ...buildingGltfs] = useLoader(GLTFLoader, [
    modelUrl('track'),
    modelUrl('trainFront'),
    modelUrl('trainMiddle'),
    modelUrl('trainBack'),
    ...BUILDING_KEYS.map(modelUrl),
  ]);
  const tiles = useRef<(THREE.Object3D | null)[]>([]);

  const tileObjects = useMemo(
    () =>
      Array.from({ length: TILE_COUNT * LANE_X.length }, (_, i) => {
        const tile = normalizedClone(track.scene, { length: TILE_LENGTH });
        tile.traverse((c) => {
          if ((c as THREE.Mesh).isMesh) (c as THREE.Mesh).receiveShadow = true;
        });
        tile.scale.x = 1.9;
        tile.position.set(
          LANE_X[i % LANE_X.length],
          0.01,
          -Math.floor(i / LANE_X.length) * TILE_LENGTH + TILE_LENGTH,
        );
        return tile;
      }),
    [track],
  );

  const chunks = useMemo<Chunk[]>(() => {
    const kit = makeKit();
    const buildings = buildingGltfs.map((g) => g.scene);
    const cars = [trainFront.scene, trainMiddle.scene, trainBack.scene];
    return Array.from({ length: CHUNK_COUNT }, (_, k) => {
      const group = new THREE.Group();
      const biomes = {
        street: buildStreet(kit, k, buildings),
        yard: buildYard(kit, k, track.scene, cars),
        tunnel: buildTunnel(kit),
        elevated: buildElevated(kit, k),
      };
      const portal = buildPortal(kit);
      Object.values(biomes).forEach((b) => group.add(b));
      group.add(portal);
      group.position.z = 15 - k * CHUNK_LEN;
      const chunk = { group, biomes, portal, k };
      applyBiome(chunk);
      return chunk;
    });
  }, [track, trainFront, trainMiddle, trainBack, buildingGltfs]);

  useImperativeHandle(ref, () => ({
    scroll(dz) {
      for (const t of tiles.current) {
        if (!t) continue;
        t.position.z += dz;
        if (t.position.z > TILE_LENGTH * 2) t.position.z -= TRACK_SPAN;
      }
      for (const c of chunks) {
        c.group.position.z += dz;
        if (c.group.position.z > RECYCLE_Z) {
          c.group.position.z -= CHUNK_SPAN;
          c.k += CHUNK_COUNT;
          applyBiome(c);
        }
      }
    },
    currentBiome() {
      for (const c of chunks) {
        const start = c.group.position.z;
        if (start >= 0 && start - CHUNK_LEN < 0) return biomeOfChunk(c.k);
      }
      return 'street';
    },
  }));

  return (
    <group>
      {tileObjects.map((obj, i) => (
        <primitive
          key={`tile-${i}`}
          object={obj}
          ref={(o: THREE.Object3D | null) => {
            tiles.current[i] = o;
          }}
        />
      ))}
      {chunks.map((c, i) => (
        <primitive key={`chunk-${i}`} object={c.group} />
      ))}
    </group>
  );
});

function applyBiome(c: Chunk) {
  const biome = biomeOfChunk(c.k);
  (Object.keys(c.biomes) as Biome[]).forEach((b) => {
    c.biomes[b].visible = b === biome;
  });
  c.portal.visible = biome === 'tunnel' && biomeOfChunk(c.k - 1) !== 'tunnel';
}
