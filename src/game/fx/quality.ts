/**
 * Shared adaptive quality, driven by the smoothed frame time of the run.
 * Steps down only (no flicker): bloom off below ~45 fps, then all
 * post-processing off and fewer particles below ~30 fps.
 */
export const quality = {
  avgDt: 1 / 60,
  slowFor: 0,
  bloom: true,
  post: true,
  particles: 1,
};

/** Web QA: `?fx=hi` keeps full quality even on software-rendered browsers. */
const PINNED = (() => {
  const search = typeof window !== 'undefined' ? window.location?.search : undefined;
  return !!search && new URLSearchParams(search).get('fx') === 'hi';
})();

export function trackFrame(dt: number) {
  quality.avgDt += (dt - quality.avgDt) * 0.05;
  if (PINNED) return;
  if (quality.avgDt > 1 / 45) quality.slowFor += dt;
  else quality.slowFor = Math.max(0, quality.slowFor - dt * 0.5);
  if (quality.slowFor > 2 && quality.bloom) {
    quality.bloom = false;
    quality.slowFor = 0;
  } else if (quality.slowFor > 2 && quality.avgDt > 1 / 30 && quality.post) {
    quality.post = false;
    quality.particles = 0.4;
  }
}

export function resetQuality() {
  quality.avgDt = 1 / 60;
  quality.slowFor = 0;
}
