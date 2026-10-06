import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';

import type { RunEvent } from '../sim/runSim';

const SOURCES = {
  coin: require('../../assets/sounds/coin.wav'),
  jump: require('../../assets/sounds/jump.wav'),
  land: require('../../assets/sounds/land.wav'),
  slide: require('../../assets/sounds/slide.wav'),
  hit: require('../../assets/sounds/hit.wav'),
  healthy: require('../../assets/sounds/healthy.wav'),
  protein: require('../../assets/sounds/protein.wav'),
  power: require('../../assets/sounds/power.wav'),
  level: require('../../assets/sounds/level.wav'),
  smash: require('../../assets/sounds/smash.wav'),
  slap: require('../../assets/sounds/slap.wav'),
  boing: require('../../assets/sounds/boing.wav'),
  burp: require('../../assets/sounds/burp.wav'),
} as const;

export type SfxName = keyof typeof SOURCES;

/** Small round-robin pool per sound so rapid coins can overlap. */
const VOICES: Partial<Record<SfxName, number>> = { coin: 3 };
const VOLUME: Partial<Record<SfxName, number>> = { coin: 0.5, land: 0.5, slide: 0.6 };

const EVENT_SFX: Partial<Record<RunEvent, SfxName>> = {
  coin: 'coin',
  jump: 'jump',
  land: 'land',
  slide: 'slide',
  hit: 'hit',
  healthy: 'healthy',
  protein: 'protein',
  power: 'power',
  level: 'level',
  smash: 'smash',
  slap: 'slap',
  kick: 'slap',
  bonk: 'boing',
  burp: 'burp',
  convert: 'healthy',
  space: 'level',
  roof: 'land',
  platform: 'land',
};

type Pool = { players: AudioPlayer[]; next: number };
let pools: Partial<Record<SfxName, Pool>> | null = null;
let enabled = true;

/** Preloads every sound once; safe to call repeatedly. */
export function preloadSfx() {
  if (pools) return;
  pools = {};
  try {
    void setAudioModeAsync({ playsInSilentMode: false, interruptionMode: 'mixWithOthers' }).catch(() => {});
    (Object.keys(SOURCES) as SfxName[]).forEach((name) => {
      const n = VOICES[name] ?? 1;
      const players = Array.from({ length: n }, () => {
        const p = createAudioPlayer(SOURCES[name]);
        p.volume = VOLUME[name] ?? 0.8;
        return p;
      });
      pools![name] = { players, next: 0 };
    });
  } catch {
    // Audio is optional: a device without audio support just stays silent.
    pools = {};
  }
}

export function setSfxEnabled(on: boolean) {
  enabled = on;
}

export function playSfx(name: SfxName) {
  if (!enabled || !pools) return;
  const pool = pools[name];
  if (!pool) return;
  const p = pool.players[pool.next];
  pool.next = (pool.next + 1) % pool.players.length;
  try {
    void p.seekTo(0);
    p.play();
  } catch {
    // Ignore playback errors (e.g. web autoplay before the first tap).
  }
}

export function playEventSfx(event: RunEvent) {
  const name = EVENT_SFX[event];
  if (name) playSfx(name);
}
