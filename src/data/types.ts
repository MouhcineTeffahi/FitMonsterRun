export type Lane = 0 | 1 | 2;

export type EntityKind = 'healthy' | 'coin' | 'junk';

export type EntityVariant =
  | 'broccoli'
  | 'chicken'
  | 'whey'
  | 'coin'
  | 'burger'
  | 'donut'
  | 'fries';

export type GameEntity = {
  id: number;
  kind: EntityKind;
  variant: EntityVariant;
  lane: Lane;
  /** Normalized 0..1 from top toward bottom of playfield. */
  y: number;
  active: boolean;
  collected: boolean;
};

export type ScreenId = 'home' | 'game' | 'gameOver' | 'shop';
