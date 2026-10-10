/**
 * Hermes / React Native often lack URL.createObjectURL until late init.
 * R3F native polyfills call it at import time — seed a safe stub first.
 * This file must be imported before any @react-three/fiber code.
 */
const g = globalThis as typeof globalThis & {
  URL?: typeof URL;
};

if (typeof g.URL !== 'undefined') {
  if (typeof g.URL.createObjectURL !== 'function') {
    g.URL.createObjectURL = function createObjectURL() {
      return `blob:polyfill-${Math.random().toString(36).slice(2)}`;
    };
  }
  if (typeof g.URL.revokeObjectURL !== 'function') {
    g.URL.revokeObjectURL = function revokeObjectURL() {};
  }
}
