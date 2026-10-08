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
// Cartoon slap: sharp noise crack followed by a quick downward wobble.
wav('slap', render(0.34, (t) => {
  const crack = noise() * Math.exp(-t * 70);
  const wob = Math.sin(TAU * (520 - 700 * t) * t + 6 * Math.sin(TAU * 18 * t)) * Math.exp(-t * 9) * Math.min(1, t / 0.02);
  return crack * 0.9 + wob * 0.5;
}), 0.6);
// Spring "boing" for bonking into trucks and signs.
wav('boing', render(0.5, (t) => {
  const f = 180 + 140 * Math.exp(-t * 6) * Math.sin(TAU * 11 * t);
  return Math.sin(TAU * f * t) * Math.exp(-t * 5) * Math.min(1, t / 0.004);
}), 0.55);
// Low, gurgly burp for eating junk food.
let bp = 0;
wav('burp', render(0.45, (t) => {
  bp += (noise() - bp) * 0.15;
  const f = 85 + 25 * Math.sin(TAU * 7 * t) - 30 * t;
  const voice = sq(TAU * f * t) * (0.6 + 0.4 * Math.sin(TAU * 31 * t));
  return (voice * 0.7 + bp * 0.5) * Math.sin(Math.PI * Math.min(1, t / 0.45)) ** 0.6;
}), 0.55);

/** Short seamless-ish loops for menu / run (optional polish; keep tiny). */
function loopPad(seconds, chords) {
  return render(seconds, (t) => {
    let v = 0;
    for (const [freqs, start, dur, gain = 0.35] of chords) {
      const lt = t - start;
      if (lt < 0 || lt > dur) continue;
      const env = Math.min(1, lt / 0.08) * Math.min(1, (dur - lt) / 0.12);
      for (const f of freqs) {
        v += Math.sin(TAU * f * t) * env * gain;
        v += Math.sin(TAU * f * 2 * t) * env * gain * 0.18;
      }
    }
    // Soft clickless edges for looping.
    const edge = Math.min(1, t / 0.02, (seconds - t) / 0.02);
    return v * edge;
  });
}

wav(
  'menu-loop',
  loopPad(4.0, [
    [[196, 247, 294], 0.0, 2.0, 0.28],
    [[220, 262, 330], 1.9, 2.1, 0.26],
  ]),
  0.4,
);
wav(
  'run-loop',
  loopPad(3.2, [
    [[165, 220, 277], 0.0, 1.6, 0.3],
    [[185, 233, 311], 1.5, 1.7, 0.28],
  ]),
  0.38,
);
console.log('wrote sounds to', out);
