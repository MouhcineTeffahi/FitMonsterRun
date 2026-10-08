import { createAudioPlayer, type AudioPlayer } from 'expo-audio';

type Track = 'menu' | 'run';

const SOURCES: Record<Track, number> = {
  menu: require('../../assets/sounds/menu-loop.wav'),
  run: require('../../assets/sounds/run-loop.wav'),
};

let player: AudioPlayer | null = null;
let current: Track | null = null;
let enabled = true;

export function setMusicEnabled(on: boolean) {
  enabled = on;
  if (!on) stopMusic();
  else if (current) playMusic(current);
}

export function playMusic(track: Track) {
  if (!enabled) {
    current = track;
    return;
  }
  try {
    if (player && current === track) {
      if (!player.playing) player.play();
      return;
    }
    stopMusic();
    player = createAudioPlayer(SOURCES[track], { updateInterval: 500 });
    player.loop = true;
    player.volume = track === 'menu' ? 0.28 : 0.22;
    current = track;
    player.play();
  } catch {
    player = null;
    current = track;
  }
}

export function stopMusic() {
  try {
    player?.pause();
    player?.remove();
  } catch {
    // ignore
  }
  player = null;
  current = null;
}
