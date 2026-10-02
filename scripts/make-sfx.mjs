// Synthesises the game's short sound effects as 16-bit mono WAVs (original
// sounds, no third-party assets). Usage: node scripts/make-sfx.mjs
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const RATE = 22050;
const out = path.resolve('src/assets/sounds');
mkdirSync(out, { recursive: true });

const TAU = Math.PI * 2;
const tri = (p) => 1 - 4 * Math.abs(((p / TAU + 0.25) % 1) - 0.5);
const sq = (p) => (Math.sin(p) >= 0 ? 1 : -1);

function render(seconds, fn) {
  const n = Math.floor(seconds * RATE);
  const buf = new Float32Array(n);
  for (let i = 0; i < n; i++) buf[i] = fn(i / RATE, i);
  return buf;
}

/** Sequence of notes [freq, start, dur, wave, gain]. */
function notes(total, list) {
  return render(total, (t) => {
    let v = 0;
    for (const [f, start, dur, wave = 'sin', gain = 1] of list) {
      const lt = t - start;
      if (lt < 0 || lt > dur) continue;
      const env = Math.min(1, lt / 0.005) * Math.exp(-lt * (4 / dur));
      const p = TAU * f * lt;
      const s = wave === 'tri' ? tri(p) : wave === 'sq' ? sq(p) * 0.45 : Math.sin(p) + Math.sin(p * 2) * 0.25;
      v += s * env * gain;
    }
    return v;
  });
}

let seed = 7;
const noise = () => {
  seed = (seed * 16807) % 2147483647;
  return (seed / 2147483647) * 2 - 1;
};

function wav(name, data, gain = 0.6) {
  let peak = 0;
  for (const v of data) peak = Math.max(peak, Math.abs(v));
  const scale = peak > 0 ? gain / peak : 0;
  const bytes = Buffer.alloc(44 + data.length * 2);
  bytes.write('RIFF', 0);
  bytes.writeUInt32LE(36 + data.length * 2, 4);
  bytes.write('WAVE', 8);
  bytes.write('fmt ', 12);
  bytes.writeUInt32LE(16, 16);
  bytes.writeUInt16LE(1, 20);
  bytes.writeUInt16LE(1, 22);
  bytes.writeUInt32LE(RATE, 24);
  bytes.writeUInt32LE(RATE * 2, 28);
  bytes.writeUInt16LE(2, 32);
  bytes.writeUInt16LE(16, 34);
  bytes.write('data', 36);
  bytes.writeUInt32LE(data.length * 2, 40);
  data.forEach((v, i) => bytes.writeInt16LE(Math.round(Math.max(-1, Math.min(1, v * scale)) * 32767), 44 + i * 2));
  writeFileSync(path.join(out, `${name}.wav`), bytes);
}

wav('coin', notes(0.32, [[988, 0, 0.07, 'sq', 0.8], [1319, 0.06, 0.26, 'sq', 1]]), 0.45);
wav('jump', render(0.2, (t) => Math.sin(TAU * (320 * t + 1300 * t * t)) * Math.exp(-t * 9) * Math.min(1, t / 0.004)), 0.5);
wav('land', render(0.1, (t) => (Math.sin(TAU * 90 * t) * 0.8 + noise() * 0.3) * Math.exp(-t * 40)), 0.45);
let lp = 0;
wav('slide', render(0.32, (t) => {
  lp += (noise() - lp) * (0.08 + 0.25 * (t / 0.32));
  return lp * Math.sin(Math.PI * Math.min(1, t / 0.32));
}), 0.45);
wav('hit', render(0.3, (t) => (Math.sin(TAU * (130 - 260 * t) * t) * 0.9 + noise() * 0.55 * Math.exp(-t * 25)) * Math.exp(-t * 11)), 0.65);
wav('healthy', notes(0.36, [[523, 0, 0.12, 'tri'], [659, 0.07, 0.12, 'tri'], [784, 0.14, 0.2, 'tri']]), 0.5);
wav('protein', notes(0.42, [[392, 0, 0.12, 'sq'], [523, 0.08, 0.12, 'sq'], [659, 0.16, 0.14, 'sq'], [784, 0.24, 0.18, 'sq']]), 0.42);
wav('power', notes(0.9, [
  [523, 0, 0.14, 'sq'], [659, 0.08, 0.14, 'sq'], [784, 0.16, 0.14, 'sq'], [1047, 0.24, 0.5, 'sq'],
  [1568, 0.3, 0.5, 'tri', 0.5], [2093, 0.42, 0.45, 'tri', 0.35],
]), 0.45);
wav('level', notes(1.3, [
  [523, 0, 0.16, 'sq'], [659, 0.16, 0.16, 'sq'], [784, 0.32, 0.16, 'sq'], [1047, 0.5, 0.75, 'sq'],
  [784, 0.5, 0.75, 'tri', 0.6], [659, 0.5, 0.75, 'tri', 0.5],
]), 0.5);
wav('smash', render(0.25, (t) => (noise() * 0.8 + Math.sin(TAU * 600 * t) * 0.3) * Math.exp(-t * 16)), 0.5);
console.log('wrote sounds to', out);
