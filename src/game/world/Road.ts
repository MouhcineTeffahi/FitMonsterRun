import * as THREE from 'three';

import { LANE_X } from '../sim/patterns';
import { instanced, put, Scroller, stripeTexture, UNIT_BOX } from './kit';

const ROAD_HALF = 4.3;
const NEAR_Z = 24;
const FAR_Z = -150;
const LENGTH = NEAR_Z - FAR_Z;
const DASH_SPACING = 6;
const DASH_COUNT = 30;
const DASH_LEN = 2.6;
const CURB_STRIPE = 1.6;

/**
 * Three-lane asphalt road. The asphalt itself is uniform, so it never moves;
 * motion comes from the lane dashes (one Scroller) and the red/white curbs
 * (a scrolling texture offset).
 */
export class Road {
  readonly group = new THREE.Group();
  readonly dashes: Scroller;
  private readonly curbTex: THREE.DataTexture;

  constructor() {
    const asphalt = new THREE.Mesh(
      new THREE.PlaneGeometry(ROAD_HALF * 2, LENGTH),
      new THREE.MeshStandardMaterial({ color: '#4A4E68', roughness: 0.92 }),
    );
    asphalt.rotation.x = -Math.PI / 2;
    asphalt.position.set(0, 0, (NEAR_Z + FAR_Z) / 2);
    asphalt.receiveShadow = true;
    this.group.add(asphalt);

    const lineMat = new THREE.MeshStandardMaterial({ color: '#FFFFFF', emissive: '#FFFFFF', emissiveIntensity: 0.25, roughness: 0.5 });
    for (const side of [-1, 1]) {
      const edge = new THREE.Mesh(UNIT_BOX, new THREE.MeshStandardMaterial({ color: '#FFD23F', emissive: '#FFB300', emissiveIntensity: 0.25 }));
      edge.scale.set(0.16, 0.02, LENGTH);
      edge.position.set(side * (ROAD_HALF - 0.35), 0.012, (NEAR_Z + FAR_Z) / 2);
      edge.receiveShadow = true;
      this.group.add(edge);
    }

    this.curbTex = stripeTexture('#FF3B4F', '#FFFFFF');
    this.curbTex.repeat.set(1, LENGTH / (CURB_STRIPE * 2));
    const curbMat = new THREE.MeshStandardMaterial({ map: this.curbTex, roughness: 0.6 });
    for (const side of [-1, 1]) {
      // Curb geometry with V along the road so the stripe texture runs lengthwise.
      const geo = new THREE.BoxGeometry(0.24, 0.16, LENGTH);
      const uv = geo.getAttribute('uv');
      const pos = geo.getAttribute('position');
      for (let i = 0; i < uv.count; i++) uv.setXY(i, 0.5, (pos.getZ(i) + LENGTH / 2) / LENGTH);
      const curb = new THREE.Mesh(geo, curbMat);
      curb.position.set(side * ROAD_HALF, 0.08, (NEAR_Z + FAR_Z) / 2);
      curb.receiveShadow = true;
      this.group.add(curb);
    }

    const dashMesh = instanced(UNIT_BOX, lineMat, DASH_COUNT * 2, { receive: true });
    const lines = [(LANE_X[0] + LANE_X[1]) / 2, (LANE_X[1] + LANE_X[2]) / 2];
    const write = (i: number, z: number) => {
      lines.forEach((x, k) => put(dashMesh, i * 2 + k, x, 0.012, z, 0.14, 0.02, DASH_LEN));
    };
    this.dashes = new Scroller(DASH_COUNT, DASH_SPACING, NEAR_Z - 2, NEAR_Z - 2, write, write);
    this.dashes.group.add(dashMesh);
    this.group.add(this.dashes.group);
    this.dashes.init();
  }

  scroll(dz: number) {
    this.dashes.scroll(dz);
    // Texture V grows toward +Z; shifting it by -dz moves the stripes with the road.
    const period = CURB_STRIPE * 2;
    this.curbTex.offset.y = (this.curbTex.offset.y - dz / period) % 1;
  }
}
