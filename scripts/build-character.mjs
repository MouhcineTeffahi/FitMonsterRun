// Builds the Fit Monster player from CC0 sources:
//   - Quaternius "Universal Base Characters" Superhero Male (body + rig)
//   - Quaternius "Universal Animation Library" (clips, same bone names)
// mirrored at codeberg.org/jamesonBradfield/Quaternius_IK_Rigged_with_animations.
//
//   node scripts/build-character.mjs <path-to>/addons/quaternius_ik_rigged
//
// Output: src/assets/models/fit-monster.glb and fit-monster-anims.glb.
// The outfit (mask, eyes, "N" harness, wristbands, shorts, leggings, sneakers) is
// baked as geometry with a per-vertex `_REGION` id; the app colours regions per skin
// (see REGION in src/components/game3d/fitMonster.ts — keep the ids in sync).
// Requires ffmpeg on PATH (normal map processing).
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, prune, quantize, resample, weld } from '@gltf-transform/functions';

const src = process.argv[2];
if (!src) throw new Error('usage: node scripts/build-character.mjs <quaternius_ik_rigged dir>');
const out = path.resolve('src/assets/models');
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);

const KEEP_CLIPS = ['Sprint_Loop', 'Jump_Start', 'Jump_Loop', 'Jump_Land', 'Idle_Loop', 'Dance_Loop', 'Roll', 'Crouch_Fwd_Loop'];

const R = {
  SKIN: 0, HEAD: 1, TORSO: 2, ARM: 3, HAND: 4, SHORTS: 5, LEGGINGS: 6, CALF: 7,
  SHOE: 8, SOLE: 9, WRIST: 10, PIPING: 11, EMBLEM: 12, HARNESS: 13, EYES: 14,
};

// Bind-pose landmarks (metres, +Y up, +Z = facing direction).
const WAIST_Y = 1.03;
const HEM_Y = 0.76;
const LEGGING_Y = 0.47;
const SHOE_Y = 0.14;
const SOLE_Y = 0.042;
const WRIST_X = 0.70;
const WRISTBAND = [WRIST_X - 0.06, WRIST_X - 0.008];

// ---------------------------------------------------------------- geometry part

/** Non-indexed triangle soup with skinning + region per vertex. */
function newPart() {
  return { pos: [], nrm: [], uv: [], jnt: [], wgt: [], reg: [] };
}
function pushVert(part, p, n, uv, j, w, r) {
  part.pos.push(p[0], p[1], p[2]);
  part.nrm.push(n[0], n[1], n[2]);
  part.uv.push(uv[0], uv[1]);
  part.jnt.push(j[0], j[1], j[2], j[3]);
  part.wgt.push(w[0], w[1], w[2], w[3]);
  part.reg.push(r);
}
const vcount = (part) => part.pos.length / 3;
const get3 = (a, i) => [a[i * 3], a[i * 3 + 1], a[i * 3 + 2]];
const get2 = (a, i) => [a[i * 2], a[i * 2 + 1]];
const get4 = (a, i) => [a[i * 4], a[i * 4 + 1], a[i * 4 + 2], a[i * 4 + 3]];
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const scale = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a) => {
  const l = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

// ---------------------------------------------------------------- projector

/** Axis-aligned ray caster: rays travel along -axis from far away. */
const AXES = {
  front: { a: 0, b: 1, d: 2, s: 1 },
  back: { a: 0, b: 1, d: 2, s: -1 },
  top: { a: 0, b: 2, d: 1, s: 1 },
  right: { a: 2, b: 1, d: 0, s: 1 },
  left: { a: 2, b: 1, d: 0, s: -1 },
};
const CELL = 0.01;

function buildProjector(parts, axisName) {
  const ax = AXES[axisName];
  const bins = new Map();
  const tris = [];
  for (const part of parts) {
    for (let t = 0; t < vcount(part) / 3; t++) {
      const ids = [t * 3, t * 3 + 1, t * 3 + 2];
      const p = ids.map((i) => get3(part.pos, i));
      const A = p.map((q) => q[ax.a]);
      const B = p.map((q) => q[ax.b]);
      const tri = { part, ids, p, A, B };
      const ti = tris.push(tri) - 1;
      for (let ca = Math.floor(Math.min(...A) / CELL); ca <= Math.floor(Math.max(...A) / CELL); ca++) {
        for (let cb = Math.floor(Math.min(...B) / CELL); cb <= Math.floor(Math.max(...B) / CELL); cb++) {
          const k = ca * 100003 + cb;
          if (!bins.has(k)) bins.set(k, []);
          bins.get(k).push(ti);
        }
      }
    }
  }
  return function cast(a, b) {
    const list = bins.get(Math.floor(a / CELL) * 100003 + Math.floor(b / CELL));
    if (!list) return null;
    let best = null;
    for (const ti of list) {
      const { A, B, p, part, ids } = tris[ti];
      const den = (B[1] - B[2]) * (A[0] - A[2]) + (A[2] - A[1]) * (B[0] - B[2]);
      if (Math.abs(den) < 1e-12) continue;
      const l0 = ((B[1] - B[2]) * (a - A[2]) + (A[2] - A[1]) * (b - B[2])) / den;
      const l1 = ((B[2] - B[0]) * (a - A[2]) + (A[0] - A[2]) * (b - B[2])) / den;
      const l2 = 1 - l0 - l1;
      if (l0 < -1e-6 || l1 < -1e-6 || l2 < -1e-6) continue;
      const depth = (l0 * p[0][ax.d] + l1 * p[1][ax.d] + l2 * p[2][ax.d]) * ax.s;
      if (best && depth <= best.depth) continue;
      const l = [l0, l1, l2];
      const pos = [0, 1, 2].reduce((acc, k) => add(acc, scale(p[k], l[k])), [0, 0, 0]);
      const nrm = norm([0, 1, 2].reduce((acc, k) => add(acc, scale(get3(part.nrm, ids[k]), l[k])), [0, 0, 0]));
      const uv = [0, 1, 2].reduce((acc, k) => {
        const q = get2(part.uv, ids[k]);
        return [acc[0] + q[0] * l[k], acc[1] + q[1] * l[k]];
      }, [0, 0]);
      const major = ids[l.indexOf(Math.max(...l))];
      best = { depth, pos, nrm, uv, jnt: get4(part.jnt, major), wgt: get4(part.wgt, major) };
    }
    return best;
  };
}

/**
 * Projects a 2D mask (in the projector's a/b plane) onto the surface as a grid decal.
 * Cells whose centre passes `mask` become two triangles lifted `lift` off the surface.
 */
function projectDecal(target, cast, { a0, a1, b0, b1, step = 0.003, lift = 0.003, mask, region }) {
  const na = Math.ceil((a1 - a0) / step);
  const nb = Math.ceil((b1 - b0) / step);
  const hits = new Map();
  const hitAt = (i, j) => {
    const k = i * 100003 + j;
    if (!hits.has(k)) hits.set(k, cast(a0 + i * step, b0 + j * step));
    return hits.get(k);
  };
  for (let i = 0; i < na; i++) {
    for (let j = 0; j < nb; j++) {
      if (!mask(a0 + (i + 0.5) * step, b0 + (j + 0.5) * step)) continue;
      const q = [hitAt(i, j), hitAt(i + 1, j), hitAt(i + 1, j + 1), hitAt(i, j + 1)];
      if (q.some((h) => !h)) continue;
      const depths = q.map((h) => h.depth);
      if (Math.max(...depths) - Math.min(...depths) > step * 6) continue;
      const order = [0, 1, 2, 0, 2, 3];
      // Keep front faces pointing out of the surface.
      const n0 = cross(sub(q[1].pos, q[0].pos), sub(q[2].pos, q[0].pos));
      const flip = n0[0] * q[0].nrm[0] + n0[1] * q[0].nrm[1] + n0[2] * q[0].nrm[2] < 0;
      for (const o of flip ? [0, 2, 1, 0, 3, 2] : order) {
        const h = q[o];
        pushVert(target, add(h.pos, scale(h.nrm, lift)), h.nrm, h.uv, h.jnt, h.wgt, region);
      }
    }
  }
}

const segDist = (px, py, ax, ay, bx, by) => {
  const dx = bx - ax;
  const dy = by - ay;
  const t = clamp(((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy), 0, 1);
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
};
const strapMask = (segs, half) => (a, b) => segs.some((s) => segDist(a, b, ...s) < half);

// ---------------------------------------------------------------- body processing

async function buildCharacter() {
  const doc = await io.read(path.join(src, 'Godot - UE/Superhero_Male_FullBody.gltf'));
  const root = doc.getRoot();
  for (const node of root.listNodes()) {
    if (node.getName() === 'Eyebrows' || node.getName() === 'Eyes') node.dispose();
  }
  const skin = root.listSkins()[0];
  const jointNames = skin.listJoints().map((j) => j.getName());
  const bodyNode = root.listNodes().find((n) => n.getName() === 'SuperHero_Male');
  const mesh = bodyNode.getMesh();
  const prim = mesh.listPrimitives()[0];
  const mat = prim.getMaterial();

  const P = Float32Array.from(prim.getAttribute('POSITION').getArray());
  const N = Float32Array.from(prim.getAttribute('NORMAL').getArray());
  const UV = prim.getAttribute('TEXCOORD_0').getArray();
  const J = prim.getAttribute('JOINTS_0').getArray();
  const W = prim.getAttribute('WEIGHTS_0').getArray();
  const I = prim.getIndices().getArray();
  const nv = P.length / 3;
  const dominant = (v) => {
    let b = 0;
    for (let k = 1; k < 4; k++) if (W[v * 4 + k] > W[v * 4 + b]) b = k;
    return jointNames[J[v * 4 + b]];
  };

  // Weld UV seams so smoothing/normals stay continuous.
  const canon = new Int32Array(nv);
  const keyMap = new Map();
  for (let v = 0; v < nv; v++) {
    const k = `${Math.round(P[v * 3] * 1e5)},${Math.round(P[v * 3 + 1] * 1e5)},${Math.round(P[v * 3 + 2] * 1e5)}`;
    if (!keyMap.has(k)) keyMap.set(k, v);
    canon[v] = keyMap.get(k);
  }
  const nbrs = new Map();
  for (let t = 0; t < I.length; t += 3) {
    for (let e = 0; e < 3; e++) {
      const a = canon[I[t + e]];
      const b = canon[I[t + ((e + 1) % 3)]];
      if (!nbrs.has(a)) nbrs.set(a, new Set());
      if (!nbrs.has(b)) nbrs.set(b, new Set());
      nbrs.get(a).add(b);
      nbrs.get(b).add(a);
    }
  }

  // Smooth mask face: no nose, no mouth.
  const faceW = new Float32Array(nv);
  for (let v = 0; v < nv; v++) {
    const name = dominant(v);
    if (name !== 'Head' && name !== 'neck_01') continue;
    const y = P[v * 3 + 1];
    const z = P[v * 3 + 2];
    const x = Math.abs(P[v * 3]);
    if (z < 0.01 || x > 0.08) continue;
    const wy = clamp(Math.min((y - 1.56) / 0.015, (1.75 - y) / 0.015), 0, 1);
    const wx = clamp((0.08 - x) / 0.02, 0, 1);
    const wz = clamp((z - 0.01) / 0.02, 0, 1);
    faceW[v] = wy * wx * wz;
  }
  // Pull the face onto a smooth mask ellipsoid, then relax the seam.
  const MASK = { cy: 1.69, cz: -0.015, rx: 0.092, ry: 0.125, rz: 0.11 };
  for (let v = 0; v < nv; v++) {
    const w = faceW[v];
    if (w <= 0 || canon[v] !== v) continue;
    const x = P[v * 3] / MASK.rx;
    const y = (P[v * 3 + 1] - MASK.cy) / MASK.ry;
    const inside = 1 - x * x - y * y;
    if (inside <= 0) continue;
    const target = MASK.cz + MASK.rz * Math.sqrt(inside);
    P[v * 3 + 2] += (target - P[v * 3 + 2]) * w;
  }
  for (let it = 0; it < 12; it++) {
    const next = Float32Array.from(P);
    for (const [c, set] of nbrs) {
      const w = faceW[c];
      if (w <= 0) continue;
      const avg = [0, 0, 0];
      for (const n of set) {
        avg[0] += P[n * 3];
        avg[1] += P[n * 3 + 1];
        avg[2] += P[n * 3 + 2];
      }
      for (let k = 0; k < 3; k++) next[c * 3 + k] = P[c * 3 + k] + (avg[k] / set.size - P[c * 3 + k]) * 0.6 * w;
    }
    P.set(next);
  }
  for (let v = 0; v < nv; v++) {
    if (canon[v] !== v) for (let k = 0; k < 3; k++) P[v * 3 + k] = P[canon[v] * 3 + k];
  }
  // Recompute smooth normals for touched vertices.
  const acc = new Float32Array(nv * 3);
  for (let t = 0; t < I.length; t += 3) {
    const [a, b, c] = [I[t], I[t + 1], I[t + 2]];
    const fn = cross(sub(get3(P, b), get3(P, a)), sub(get3(P, c), get3(P, a)));
    for (const v of [a, b, c]) for (let k = 0; k < 3; k++) acc[canon[v] * 3 + k] += fn[k];
  }
  for (let v = 0; v < nv; v++) {
    const fw = faceW[canon[v]];
    if (fw <= 0) continue;
    const n = norm(get3(acc, canon[v]));
    for (let k = 0; k < 3; k++) N[v * 3 + k] = n[k];
  }
  const smoothN = (v) => norm(get3(acc, canon[v]));

  // Flatten the normal map under the face (it carries nose/lip detail).
  const normalPng = path.join(src, 'Godot - UE/T_Superhero_Male_Normal.png');
  const raw = path.join(tmpdir(), 'fm-normal.raw');
  const SIZE = 1024;
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', normalPng, '-vf', `scale=${SIZE}:${SIZE}`, '-f', 'rawvideo', '-pix_fmt', 'rgb24', raw]);
  const img = readFileSync(raw);
  for (let t = 0; t < I.length; t += 3) {
    const ids = [I[t], I[t + 1], I[t + 2]];
    const ws = ids.map((v) => faceW[canon[v]]);
    if (Math.max(...ws) <= 0) continue;
    const uvs = ids.map((v) => [UV[v * 2] * SIZE, UV[v * 2 + 1] * SIZE]);
    const minX = Math.floor(Math.min(...uvs.map((u) => u[0])));
    const maxX = Math.ceil(Math.max(...uvs.map((u) => u[0])));
    const minY = Math.floor(Math.min(...uvs.map((u) => u[1])));
    const maxY = Math.ceil(Math.max(...uvs.map((u) => u[1])));
    const [p0, p1, p2] = uvs;
    const den = (p1[1] - p2[1]) * (p0[0] - p2[0]) + (p2[0] - p1[0]) * (p0[1] - p2[1]);
    if (Math.abs(den) < 1e-9) continue;
    for (let y = minY - 1; y <= maxY + 1; y++) {
      for (let x = minX - 1; x <= maxX + 1; x++) {
        if (x < 0 || y < 0 || x >= SIZE || y >= SIZE) continue;
        const l0 = ((p1[1] - p2[1]) * (x + 0.5 - p2[0]) + (p2[0] - p1[0]) * (y + 0.5 - p2[1])) / den;
        const l1 = ((p2[1] - p0[1]) * (x + 0.5 - p2[0]) + (p0[0] - p2[0]) * (y + 0.5 - p2[1])) / den;
        const l2 = 1 - l0 - l1;
        if (l0 < -0.05 || l1 < -0.05 || l2 < -0.05) continue;
        const w = clamp(l0 * ws[0] + l1 * ws[1] + l2 * ws[2], 0, 1);
        const o = (y * SIZE + x) * 3;
        img[o] = Math.round(img[o] + (128 - img[o]) * w);
        img[o + 1] = Math.round(img[o + 1] + (128 - img[o + 1]) * w);
        img[o + 2] = Math.round(img[o + 2] + (255 - img[o + 2]) * w);
      }
    }
  }
  writeFileSync(raw, img);
  const normalJpg = path.join(tmpdir(), 'fm-normal.jpg');
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', `${SIZE}x${SIZE}`, '-i', raw, '-q:v', '3', normalJpg]);

  // ---- body regions (per triangle, so outfit edges stay crisp)
  const body = newPart();
  const triRegion = (ids) => {
    const c = [0, 1, 2].map((k) => ids.reduce((s, v) => s + P[v * 3 + k], 0) / 3);
    const names = ids.map(dominant);
    const name = names.sort((a, b) => names.filter((n) => n === b).length - names.filter((n) => n === a).length)[0];
    const [x, y] = [Math.abs(c[0]), c[1]];
    if (name === 'Head' || name === 'neck_01') return R.HEAD;
    if (x > WRISTBAND[1] || /hand|thumb|index|middle|ring|pinky/.test(name)) return R.HAND;
    if (/upperarm|lowerarm/.test(name) || (name.startsWith('clavicle') && x > 0.2)) return R.ARM;
    if (/foot|ball/.test(name)) return y < SOLE_Y ? R.SOLE : R.SHOE;
    // Shells cover the outfit edges; the body underneath takes the colour on the
    // visible side of each edge so nothing jagged pokes out.
    if (y > WAIST_Y - 0.03) return R.TORSO;
    if (y > HEM_Y) return R.SHORTS;
    if (y > LEGGING_Y + 0.03) return R.LEGGINGS;
    if (y > SHOE_Y - 0.03) return R.CALF;
    return y < SOLE_Y ? R.SOLE : R.SHOE;
  };
  const vert = (part, v, r, p = get3(P, v)) =>
    pushVert(part, p, get3(N, v), get2(UV, v), get4(J, v), get4(W, v), r);
  for (let t = 0; t < I.length; t += 3) {
    const ids = [I[t], I[t + 1], I[t + 2]];
    const r = triRegion(ids);
    for (const v of ids) vert(body, v, r);
  }

  // ---- shells: geometry pushed out along the smooth normal
  const shell = (select, offset, clampP, region) => {
    const part = newPart();
    for (let t = 0; t < I.length; t += 3) {
      const ids = [I[t], I[t + 1], I[t + 2]];
      if (!select(ids)) continue;
      const ps = ids.map((v) => {
        const p = add(get3(P, v), scale(smoothN(v), offset(get3(P, v))));
        return clampP ? clampP(p) : p;
      });
      const r = typeof region === 'function' ? region(ps) : region;
      ids.forEach((v, k) => pushVert(part, ps[k], smoothN(v), get2(UV, v), get4(J, v), get4(W, v), r));
    }
    return part;
  };
  const centroid = (ids) => [0, 1, 2].map((k) => ids.reduce((s, v) => s + P[v * 3 + k], 0) / 3);
  const isLegOrHip = (ids) => ids.every((v) => /pelvis|thigh|spine_01/.test(dominant(v)));

  const shorts = shell(
    (ids) => {
      const c = centroid(ids);
      return isLegOrHip(ids) && c[1] > HEM_Y - 0.035 && c[1] < WAIST_Y + 0.035;
    },
    (p) => 0.012 + 0.02 * clamp((WAIST_Y - p[1]) / (WAIST_Y - HEM_Y), 0, 1),
    (p) => [p[0], clamp(p[1], HEM_Y, WAIST_Y), p[2]],
    R.SHORTS,
  );
  const leggings = shell(
    (ids) => {
      const c = centroid(ids);
      return ids.every((v) => /thigh|calf/.test(dominant(v))) && c[1] > LEGGING_Y - 0.035 && c[1] < HEM_Y + 0.01;
    },
    () => 0.0035,
    (p) => [p[0], clamp(p[1], LEGGING_Y, HEM_Y), p[2]],
    R.LEGGINGS,
  );
  const wrists = shell(
    (ids) => {
      const x = Math.abs(centroid(ids)[0]);
      return x > WRISTBAND[0] - 0.01 && x < WRISTBAND[1] + 0.01;
    },
    () => 0.007,
    (p) => [Math.sign(p[0]) * clamp(Math.abs(p[0]), WRISTBAND[0], WRISTBAND[1]), p[1], p[2]],
    R.WRIST,
  );
  const shoes = shell(
    (ids) => centroid(ids)[1] < SHOE_Y + 0.02 && ids.every((v) => /foot|ball|calf/.test(dominant(v))),
    (p) => (p[1] < 0.06 ? 0.02 : 0.014),
    (p) => [p[0], Math.min(p[1], SHOE_Y), p[2]],
    (ps) => (ps.reduce((s, p) => s + p[1], 0) / 3 < SOLE_Y ? R.SOLE : R.SHOE),
  );

  // Shorts hem piping: a band around each leg opening.
  const piping = newPart();
  for (const side of [-1, 1]) {
    const ring = [];
    const BINS = 72;
    const cx = side * 0.112;
    let cz = 0;
    let cnt = 0;
    for (let i = 0; i < vcount(shorts); i++) {
      const p = get3(shorts.pos, i);
      if (p[1] < HEM_Y + 0.03 && p[0] * side > 0.0) {
        cz += p[2];
        cnt++;
      }
    }
    cz /= cnt || 1;
    for (let b = 0; b < BINS; b++) ring.push({ r: 0, i: -1 });
    for (let i = 0; i < vcount(shorts); i++) {
      const p = get3(shorts.pos, i);
      if (p[1] > HEM_Y + 0.03 || p[0] * side <= 0) continue;
      const ang = Math.atan2(p[2] - cz, p[0] - cx);
      const bin = Math.floor(((ang + Math.PI) / (2 * Math.PI)) * BINS) % BINS;
      const rr = Math.hypot(p[0] - cx, p[2] - cz);
      if (rr > ring[bin].r) ring[bin] = { r: rr, i };
    }
    for (let b = 0; b < BINS; b++) {
      if (ring[b].i < 0) ring[b] = ring[(b + BINS - 1) % BINS];
    }
    for (let b = 0; b < BINS; b++) {
      const q = [ring[b], ring[(b + 1) % BINS]];
      const angs = [b, b + 1].map((k) => (k / BINS) * 2 * Math.PI - Math.PI);
      const pts = q.map((e, k) => {
        const rr = e.r + 0.002;
        return [cx + Math.cos(angs[k]) * rr, cz + Math.sin(angs[k]) * rr];
      });
      const quad = [
        [pts[0][0], HEM_Y, pts[0][1], q[0]],
        [pts[1][0], HEM_Y, pts[1][1], q[1]],
        [pts[1][0], HEM_Y + 0.014, pts[1][1], q[1]],
        [pts[0][0], HEM_Y + 0.014, pts[0][1], q[0]],
      ];
      for (const o of [0, 2, 1, 0, 3, 2]) {
        const [x, y, z, e] = quad[o];
        const n = norm([x - cx, 0, z - cz]);
        pushVert(piping, [x, y, z], n, get2(shorts.uv, e.i), get4(shorts.jnt, e.i), get4(shorts.wgt, e.i), R.PIPING);
      }
    }
  }

  // ---- decals
  const decals = newPart();
  const eyes = newPart();
  const front = buildProjector([body], 'front');
  const back = buildProjector([body], 'back');
  const top = buildProjector([body], 'top');
  const right = buildProjector([body], 'right');
  const left = buildProjector([body], 'left');

  // Almond eyes, pointed at the inner corner, tilted up and out.
  const EYE = { x: 0.039, y: 1.695, half: 0.034, h: 0.0165, tilt: 0.36 };
  const eyeMask = (a, b) => {
    const side = Math.sign(a) || 1;
    const dx = (a - side * EYE.x) * side;
    const dy = b - EYE.y;
    const u = (dx * Math.cos(EYE.tilt) + dy * Math.sin(EYE.tilt)) / EYE.half;
    const v = -dx * Math.sin(EYE.tilt) + dy * Math.cos(EYE.tilt);
    if (u <= -1 || u >= 1) return false;
    const shape = Math.pow(1 - u * u, 0.6) * (0.7 + 0.3 * (u + 1) / 2) * 1.15;
    return Math.abs(v) < EYE.h * shape;
  };
  projectDecal(eyes, front, { a0: -0.09, a1: 0.09, b0: 1.65, b1: 1.74, step: 0.002, lift: 0.0025, mask: eyeMask, region: R.EYES });

  // Stylised serif "N" on the sternum.
  const NC = { x: 0, y: 1.39, w: 0.115, h: 0.105 };
  const nMask = (a, b) => {
    const u = (a - NC.x) / NC.w + 0.5;
    const v = (b - NC.y) / NC.h + 0.5;
    if (u < -0.12 || u > 1.12 || v < 0 || v > 1) return false;
    const leftStem = u >= 0.02 && u <= 0.24;
    const rightStem = u >= 0.76 && u <= 0.98 && v >= 0.12;
    const diag = segDist(u, v, 0.13, 0.97, 0.87, 0.03) < 0.13 && u >= 0.02 && u <= 0.98;
    const serifTL = v >= 0.86 && u >= -0.1 && u <= 0.3;
    const serifTR = v >= 0.9 && u >= 0.66 && u <= 1.1;
    const serifBL = v <= 0.08 && u >= -0.06 && u <= 0.3;
    return leftStem || rightStem || diag || serifTL || serifTR || serifBL;
  };
  projectDecal(decals, front, { a0: -0.08, a1: 0.08, b0: 1.33, b1: 1.45, step: 0.0022, lift: 0.004, mask: nMask, region: R.EMBLEM });

  // Harness straps.
  const S = 0.0115;
  const SH = 0.108; // shoulder strap x
  const LOW = 1.312;
  const frontSegs = [
    [SH, 1.52, 0.05, NC.y + NC.h / 2 - 0.004],
    [-SH, 1.52, -0.05, NC.y + NC.h / 2 - 0.004],
    [0.05, NC.y - NC.h / 2 + 0.01, 0.235, LOW],
    [-0.05, NC.y - NC.h / 2 + 0.01, -0.235, LOW],
  ];
  const harnessMask = (segs) => {
    const m = strapMask(segs, S);
    return (a, b) => m(a, b) && !nMask(a, b);
  };
  projectDecal(decals, front, { a0: -0.25, a1: 0.25, b0: 1.27, b1: 1.54, step: 0.0032, lift: 0.0035, mask: harnessMask(frontSegs), region: R.HARNESS });
  const backSegs = [
    [SH, 1.52, -0.235, LOW],
    [-SH, 1.52, 0.235, LOW],
    [-0.235, LOW, 0.235, LOW],
  ];
  projectDecal(decals, back, { a0: -0.25, a1: 0.25, b0: 1.27, b1: 1.54, step: 0.0032, lift: 0.0035, mask: strapMask(backSegs, S), region: R.HARNESS });
  projectDecal(decals, top, {
    a0: -0.14, a1: 0.14, b0: -0.16, b1: 0.12, step: 0.0032, lift: 0.0035, region: R.HARNESS,
    mask: (a) => Math.abs(Math.abs(a) - SH) < S,
  });
  for (const cast of [right, left]) {
    projectDecal(decals, cast, {
      a0: -0.18, a1: 0.16, b0: LOW - 0.03, b1: LOW + 0.03, step: 0.0032, lift: 0.0035, region: R.HARNESS,
      mask: (_, b) => Math.abs(b - LOW) < S,
    });
  }

  // Shorts side piping.
  const shortsRight = buildProjector([shorts], 'right');
  const shortsLeft = buildProjector([shorts], 'left');
  for (const cast of [shortsRight, shortsLeft]) {
    projectDecal(decals, cast, {
      a0: -0.06, a1: 0.04, b0: HEM_Y, b1: WAIST_Y - 0.03, step: 0.0025, lift: 0.002, region: R.PIPING,
      mask: (a, b) => Math.abs(a + 0.01) < 0.006 && b > HEM_Y + 0.006,
    });
  }

  // ---- write back into the glTF
  const merged = newPart();
  for (const part of [body, shorts, leggings, wrists, shoes, piping, decals]) {
    for (const key of Object.keys(merged)) for (const v of part[key]) merged[key].push(v);
  }
  const buffer = root.listBuffers()[0];
  const accessor = (arr, type, Ctor) =>
    doc.createAccessor().setType(type).setArray(new Ctor(arr)).setBuffer(buffer);
  const fill = (target, part) => {
    target
      .setIndices(null)
      .setAttribute('POSITION', accessor(part.pos, 'VEC3', Float32Array))
      .setAttribute('NORMAL', accessor(part.nrm, 'VEC3', Float32Array))
      .setAttribute('TEXCOORD_0', accessor(part.uv, 'VEC2', Float32Array))
      .setAttribute('JOINTS_0', accessor(part.jnt, 'VEC4', Uint8Array))
      .setAttribute('WEIGHTS_0', accessor(part.wgt, 'VEC4', Float32Array))
      .setAttribute('_REGION', accessor(part.reg, 'SCALAR', Float32Array))
      .setAttribute('COLOR_0', null);
  };
  fill(prim, merged);
  mat.setName('FM_Body');
  mat.setBaseColorTexture(null);
  mat.setMetallicRoughnessTexture(null);
  mat.setBaseColorFactor([1, 1, 1, 1]);
  mat.setMetallicFactor(0);
  mat.setRoughnessFactor(0.5);
  mat.getNormalTexture()?.setImage(readFileSync(normalJpg)).setMimeType('image/jpeg').setURI('normal.jpg');

  const eyeMat = doc.createMaterial('FM_Eyes').setBaseColorFactor([1, 1, 1, 1]).setRoughnessFactor(0.2);
  const eyePrim = doc.createPrimitive().setMaterial(eyeMat);
  fill(eyePrim, eyes);
  mesh.addPrimitive(eyePrim);

  await doc.transform(weld(), prune(), dedup(), quantize({ quantizePosition: 14, quantizeNormal: 10, quantizeTexcoord: 12, quantizeWeight: 8 }));
  await io.write(path.join(out, 'fit-monster.glb'), doc);
  console.log('verts', vcount(merged), 'eyes', vcount(eyes), 'decals', vcount(decals), 'piping', vcount(piping));
}

async function buildAnimations() {
  const doc = await io.read(path.join(src, 'UAL1_Standard.glb'));
  const root = doc.getRoot();
  const kept = new Set();
  for (const anim of root.listAnimations()) {
    if (!KEEP_CLIPS.includes(anim.getName())) continue;
    for (const s of anim.listSamplers()) kept.add(s.getInput()).add(s.getOutput());
  }
  const dropUnkept = (accessor) => {
    if (accessor && !kept.has(accessor)) accessor.dispose();
  };
  for (const anim of root.listAnimations()) {
    if (KEEP_CLIPS.includes(anim.getName())) continue;
    for (const sampler of anim.listSamplers()) {
      dropUnkept(sampler.getInput());
      dropUnkept(sampler.getOutput());
      sampler.dispose();
    }
    for (const channel of anim.listChannels()) channel.dispose();
    anim.dispose();
  }
  // Clips were authored on the UAL mannequin: keep rotations only, so the Superhero
  // keeps its own bone lengths; the pelvis keeps its bounce scaled to the taller hips.
  const PELVIS_SCALE = 0.949 / 0.917;
  const scaled = new Set();
  for (const anim of root.listAnimations()) {
    for (const channel of anim.listChannels()) {
      const pathName = channel.getTargetPath();
      const isPelvis = channel.getTargetNode()?.getName() === 'pelvis';
      if (pathName === 'rotation' || (pathName === 'translation' && isPelvis)) {
        const output = channel.getSampler().getOutput();
        if (isPelvis && pathName === 'translation' && !scaled.has(output)) {
          scaled.add(output);
          output.setArray(output.getArray().map((v) => v * PELVIS_SCALE));
        }
        continue;
      }
      const sampler = channel.getSampler();
      channel.dispose();
      if (sampler.listParents().filter((p) => p.propertyType === 'AnimationChannel').length === 0) {
        sampler.dispose();
      }
    }
  }
  for (const node of root.listNodes()) {
    if (node.getMesh()) node.setMesh(null).setSkin(null);
  }
  for (const mesh of root.listMeshes()) mesh.dispose();
  for (const skin of root.listSkins()) skin.dispose();
  await doc.transform(resample(), prune({ keepLeaves: true }), dedup());
  await io.write(path.join(out, 'fit-monster-anims.glb'), doc);
}

await buildCharacter();
await buildAnimations();
console.log('wrote fit-monster.glb + fit-monster-anims.glb');
