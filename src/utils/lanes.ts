/**
 * Perspective helpers for a Subway Surfers–style 3-lane track.
 * depth 0 = horizon (far), depth 1 = near camera / player.
 */
import type { Lane } from '../data/types';
import { LANE_COUNT } from '../data/theme';

/** Near-camera lane centers as fractions of width. */
export const LANE_CENTERS_NEAR: readonly number[] = [0.2, 0.5, 0.8];

export function clampLane(lane: number): Lane {
  return Math.max(0, Math.min(LANE_COUNT - 1, lane)) as Lane;
}

export function shiftLane(lane: Lane, delta: -1 | 1): Lane {
  return clampLane(lane + delta);
}

/** Ease depth so objects grow faster as they approach. */
export function easeDepth(y: number): number {
  const t = Math.max(0, Math.min(1, y));
  return t * t * (3 - 2 * t);
}

export function laneToX(lane: Lane, width: number, depthY = 1): number {
  const t = easeDepth(depthY);
  const near = LANE_CENTERS_NEAR[lane];
  const far = 0.5;
  return (far + (near - far) * t) * width;
}

export function depthScale(depthY: number): number {
  const t = easeDepth(depthY);
  return 0.28 + t * 0.72;
}

export function aabbOverlap(
  ax: number,
  ay: number,
  aw: number,
  ah: number,
  bx: number,
  by: number,
  bw: number,
  bh: number,
): boolean {
  return (
    Math.abs(ax - bx) * 2 < aw + bw && Math.abs(ay - by) * 2 < ah + bh
  );
}
