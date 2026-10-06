#!/usr/bin/env node
/**
 * Packs Kenney "Mini Characters" (CC0, https://kenney.nl/assets/mini-characters)
 * into src/assets/models/pedestrians.glb: one scene per character, one shared
 * colour-map texture, and a single set of animation clips (every character uses
 * the same node names, so the runtime retargets the clips onto any of them).
 *
 * Usage: node scripts/build-pedestrians.mjs "<kenney_mini-characters>/Models/GLB format"
 */
import path from 'node:path';

import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, mergeDocuments, prune, quantize, resample } from '@gltf-transform/functions';

const SRC = process.argv[2];
if (!SRC) {
  console.error('usage: node scripts/build-pedestrians.mjs "<kenney_mini-characters>/Models/GLB format"');
  process.exit(1);
}

const CHARACTERS = [
  'character-male-a',
  'character-female-b',
  'character-male-c',
  'character-female-d',
  'character-male-e',
  'character-female-f',
  'character-male-b',
  'character-female-a',
  'character-male-d',
  'character-female-c',
  'character-male-f',
  'character-female-e',
];
const KEEP_CLIPS = new Set(['walk', 'sprint', 'emote-yes', 'fall']);

/** Animation.dispose() keeps its samplers and their keyframe accessors alive. */
function dropAnimation(anim) {
  for (const sampler of anim.listSamplers()) {
    const input = sampler.getInput();
    const output = sampler.getOutput();
    sampler.dispose();
    for (const acc of [input, output]) if (acc && acc.listParents().length <= 1) acc.dispose();
  }
  for (const channel of anim.listChannels()) channel.dispose();
  anim.dispose();
}

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const target = await io.read(path.join(SRC, `${CHARACTERS[0]}.glb`));

for (const name of CHARACTERS.slice(1)) {
  const doc = await io.read(path.join(SRC, `${name}.glb`));
  // Clips come from the first character only; drop the duplicates before merging.
  for (const anim of doc.getRoot().listAnimations()) dropAnimation(anim);
  mergeDocuments(target, doc);
}

const root = target.getRoot();
for (const anim of root.listAnimations()) {
  if (!KEEP_CLIPS.has(anim.getName())) dropAnimation(anim);
}
// Tangents are only needed for normal maps, which these flat-shaded models lack.
for (const mesh of root.listMeshes()) {
  for (const prim of mesh.listPrimitives()) prim.setAttribute('TANGENT', null);
}
// Each source file has its own copy of the shared buffer; glb needs exactly one.
const [buffer, ...extra] = root.listBuffers();
for (const acc of root.listAccessors()) acc.setBuffer(buffer);
for (const b of extra) b.dispose();
root.listScenes().forEach((scene, i) => scene.setName(CHARACTERS[i]));

// quantize() leaves the float accessors behind, so prune again afterwards.
await target.transform(resample(), dedup(), prune(), quantize({ quantizeNormal: 10, quantizePosition: 14 }), prune());

const out = path.resolve('src/assets/models/pedestrians.glb');
await io.write(out, target);
console.log('wrote', out, root.listScenes().length, 'characters,', root.listAnimations().map((a) => a.getName()).join(', '));
