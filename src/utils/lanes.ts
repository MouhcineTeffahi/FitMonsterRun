import type { Lane } from '../data/types';
import { LANE_COUNT } from '../data/theme';

/** Lane centers as fractions of playfield width (0..1). */
export const LANE_CENTERS: readonly number[] = [0.18, 0.5, 0.82];

export function laneToX(lane: Lane, width: number): number {
  return LANE_CENTERS[lane] * width;
}

export function clampLane(lane: number): Lane {
  return Math.max(0, Math.min(LANE_COUNT - 1, lane)) as Lane;
}

export function shiftLane(lane: Lane, delta: -1 | 1): Lane {
  return clampLane(lane + delta);
}

/** Axis-aligned overlap using center points + half sizes. */
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
