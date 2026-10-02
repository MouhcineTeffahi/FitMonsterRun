import * as THREE from 'three';

import { TRUCK_WIDTH, TRUCKS, type TruckVariant } from '../sim/patterns';
import { mergeParts, type Part } from '../world/kit';

/**
 * Low-poly trucks built from the collider dimensions in sim/patterns.ts, so
 * what you see is what you hit/stand on. Base at y = 0, rear (+Z) toward the
 * runner, cab at -Z; oncoming trucks are rotated 180°.
 *
 * Vertex colours carry everything except the paint job: parts with `tint`
 * take the per-instance colour (cargo fully, cab as a lighter tone).
 */

const box = (x: number, y: number, z: number) => new THREE.BoxGeometry(x, y, z);
const wheelGeo = (r: number) => new THREE.CylinderGeometry(r, r, 0.3, 14).rotateZ(Math.PI / 2);
const hubGeo = (r: number) => new THREE.CylinderGeometry(r * 0.45, r * 0.45, 0.33, 8).rotateZ(Math.PI / 2);

const GLASS = '#2D4F7C';
const DARK = '#2B2D3A';
const CHROME = '#C3C8D8';
const HEAD: [number, number, number] = [3.4, 3.2, 2.4];
const TAIL: [number, number, number] = [3.2, 0.35, 0.3];
const GRAFFITI = ['#FF3D7F', '#FFD23F', '#00D9FF', '#7CFF4F', '#B46BFF', '#FFFFFF'];

const W = TRUCK_WIDTH;

function wheels(zs: number[], r: number): Part[] {
  const out: Part[] = [];
  for (const z of zs) {
    for (const side of [-1, 1]) {
      out.push({ geo: wheelGeo(r), color: '#1C1D24', at: { x: side * (W / 2 - 0.05), y: r, z } });
      out.push({ geo: hubGeo(r), color: CHROME, at: { x: side * (W / 2 - 0.04), y: r, z } });
    }
  }
  return out;
}

/** Simple tag on both cargo sides: a zigzag, a star and a dot. */
function graffiti(z0: number, z1: number, y0: number, y1: number, seed: number): Part[] {
  const out: Part[] = [];
  const zc = (z0 + z1) / 2;
  const span = z1 - z0;
  const yc = (y0 + y1) / 2;
  for (const side of [-1, 1]) {
    const x = side * (W / 2 + 0.012);
    for (let i = 0; i < 4; i++) {
      out.push({
        geo: box(0.02, 0.14, span * 0.16),
        color: GRAFFITI[(seed + i) % GRAFFITI.length],
        at: { x, y: yc + (i % 2 ? 0.18 : -0.18), z: z0 + span * (0.18 + i * 0.13), rx: i % 2 ? 0.7 : -0.7 },
      });
    }
    out.push({ geo: box(0.02, 0.42, 0.42), color: GRAFFITI[(seed + 2) % GRAFFITI.length], at: { x, y: yc + 0.1, z: zc + span * 0.22, rx: Math.PI / 4 } });
    out.push({ geo: box(0.02, 0.42, 0.42), color: GRAFFITI[(seed + 3) % GRAFFITI.length], at: { x, y: yc + 0.1, z: zc + span * 0.22 } });
    out.push({ geo: new THREE.CylinderGeometry(0.2, 0.2, 0.02, 12).rotateZ(Math.PI / 2), color: '#FFFFFF', at: { x, y: yc - 0.25, z: zc + span * 0.36 } });
  }
  return out;
}

/** Rear doors, tail lights and bumper at the +Z end. */
function rear(z: number, top: number, bottom: number): Part[] {
  return [
    { geo: box(0.04, top - bottom - 0.12, 0.03), color: DARK, at: { y: (top + bottom) / 2, z: z + 0.012 } },
    { geo: box(0.08, 0.3, 0.05), color: CHROME, at: { x: 0.14, y: (top + bottom) / 2, z: z + 0.02 } },
    { geo: box(0.08, 0.3, 0.05), color: CHROME, at: { x: -0.14, y: (top + bottom) / 2, z: z + 0.02 } },
    { geo: box(0.3, 0.16, 0.05), color: TAIL, at: { x: 0.72, y: bottom + 0.22, z: z + 0.02 } },
    { geo: box(0.3, 0.16, 0.05), color: TAIL, at: { x: -0.72, y: bottom + 0.22, z: z + 0.02 } },
    { geo: box(W, 0.18, 0.22), color: '#6B7086', at: { y: 0.42, z: z + 0.05 } },
  ];
}

/** Cab occupying z ∈ [zBack, zFront] (zBack = the truck's -Z end). */
function cab(zBack: number, zFront: number, top: number, roofTo: number): Part[] {
  const len = zFront - zBack;
  const zc = (zBack + zFront) / 2;
  const parts: Part[] = [
    { geo: box(W - 0.04, top - 0.45, len), color: '#FFFFFF', at: { y: (top + 0.45) / 2, z: zc }, tint: 0.55 },
    { geo: box(W - 0.24, 0.62, 0.05), color: GLASS, at: { y: top - 0.48, z: zBack - 0.01 } },
    { geo: box(0.05, 0.55, len * 0.45), color: GLASS, at: { x: W / 2 - 0.01, y: top - 0.5, z: zBack + len * 0.3 } },
    { geo: box(0.05, 0.55, len * 0.45), color: GLASS, at: { x: -(W / 2 - 0.01), y: top - 0.5, z: zBack + len * 0.3 } },
    { geo: box(1.0, 0.42, 0.05), color: DARK, at: { y: 0.86, z: zBack - 0.015 } },
    { geo: box(0.32, 0.2, 0.05), color: HEAD, at: { x: 0.66, y: 0.84, z: zBack - 0.02 } },
    { geo: box(0.32, 0.2, 0.05), color: HEAD, at: { x: -0.66, y: 0.84, z: zBack - 0.02 } },
    { geo: box(W + 0.06, 0.22, 0.24), color: CHROME, at: { y: 0.42, z: zBack - 0.06 } },
    { geo: box(0.12, 0.2, 0.08), color: '#FFB300', at: { x: W / 2 - 0.1, y: top + 0.04, z: zBack + 0.15 } },
    { geo: box(0.12, 0.2, 0.08), color: '#FFB300', at: { x: -(W / 2 - 0.1), y: top + 0.04, z: zBack + 0.15 } },
  ];
  if (roofTo > top + 0.05) {
    // Air deflector up to the cargo roof so the walkable top is continuous.
    parts.push({ geo: box(W - 0.12, roofTo - top, len * 0.7), color: '#FFFFFF', at: { y: (roofTo + top) / 2, z: zFront - len * 0.35 }, tint: 0.55 });
  }
  return parts;
}

function cargoTruck(variant: 'container' | 'boxTruck', seed: number) {
  const { length: L, height: H } = TRUCKS[variant];
  const cabLen = variant === 'container' ? 2.5 : 2.1;
  const zRear = L / 2;
  const zCab = -L / 2;
  const cargoFront = zCab + cabLen + 0.1;
  const bottom = 0.55;
  const cargoLen = zRear - cargoFront;
  const cargoZ = (zRear + cargoFront) / 2;
  const parts: Part[] = [
    { geo: box(W - 0.2, 0.3, L - 0.3), color: DARK, at: { y: 0.5, z: 0 } },
    { geo: box(W, H - bottom, cargoLen), color: '#FFFFFF', at: { y: (H + bottom) / 2, z: cargoZ }, tint: 1 },
    // White band + thin dark pinstripe along both sides.
    { geo: box(W + 0.02, 0.22, cargoLen - 0.5), color: '#FFFFFF', at: { y: bottom + 0.42, z: cargoZ } },
    { geo: box(W + 0.024, 0.05, cargoLen - 0.5), color: DARK, at: { y: bottom + 0.6, z: cargoZ } },
    // Roof rim so the walkable top reads clearly.
    { geo: box(W + 0.04, 0.08, cargoLen + 0.02), color: '#E9ECF5', at: { y: H - 0.04, z: cargoZ } },
    ...graffiti(cargoFront + 0.3, zRear - 0.3, bottom + 0.75, H - 0.15, seed),
    ...rear(zRear, H, bottom),
    ...cab(zCab, cargoFront - 0.1, H - 0.4, H),
    ...wheels(variant === 'container' ? [zCab + 0.9, zRear - 2.2, zRear - 1.1] : [zCab + 0.75, zRear - 1.2], 0.42),
  ];
  return mergeParts(parts);
}

function van(seed: number) {
  const { length: L, height: H } = TRUCKS.van;
  const zRear = L / 2;
  const zFront = -L / 2;
  const bottom = 0.32;
  const parts: Part[] = [
    { geo: box(W - 0.06, H - bottom - 0.08, L - 0.2), color: '#FFFFFF', at: { y: (H - 0.08 + bottom) / 2, z: 0.1 }, tint: 1 },
    { geo: box(W - 0.2, 0.08, L - 0.9), color: '#FFFFFF', at: { y: H - 0.04, z: 0.3 }, tint: 0.6 },
    { geo: box(W - 0.06, 0.55, 0.9), color: '#FFFFFF', at: { y: 0.6, z: zFront + 0.45 }, tint: 1 },
    { geo: box(W - 0.3, 0.5, 0.05), color: GLASS, at: { y: 1.12, z: zFront + 0.82, rx: 0.42 } },
    { geo: box(W - 0.02, 0.34, L * 0.55), color: GLASS, at: { y: 1.12, z: -0.35 } },
    { geo: box(W - 0.02, 0.12, L - 0.4), color: '#FFFFFF', at: { y: 0.68, z: 0.1 } },
    { geo: box(0.3, 0.16, 0.05), color: HEAD, at: { x: 0.62, y: 0.7, z: zFront - 0.01 } },
    { geo: box(0.3, 0.16, 0.05), color: HEAD, at: { x: -0.62, y: 0.7, z: zFront - 0.01 } },
    { geo: box(W + 0.04, 0.2, 0.2), color: CHROME, at: { y: 0.36, z: zFront - 0.02 } },
    ...rear(zRear, H - 0.1, bottom),
    ...wheels([zFront + 1.0, zRear - 1.0], 0.34),
    ...graffiti(-0.2, zRear - 0.3, 0.8, H - 0.45, seed).slice(0, 6),
  ];
  return mergeParts(parts);
}

export function truckGeometry(variant: TruckVariant): THREE.BufferGeometry {
  if (variant === 'van') return van(1);
  return cargoTruck(variant, variant === 'container' ? 0 : 3);
}

/** Bright paint jobs (per instance). */
export const TRUCK_COLORS = ['#FF3B3B', '#14C8B4', '#FF8A1F', '#8B5CF6', '#F4F4F8', '#2F7BFF', '#FFC21A'];
