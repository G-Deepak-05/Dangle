export type PhysicsProfileName = "calm" | "normal" | "bouncy";
export type CharmSize = "small" | "medium" | "large";

export interface PhysicsParams {
  /** Downward acceleration in px/s². */
  gravity: number;
  /** Fraction of velocity kept after one second of free motion (air drag). */
  retention: number;
  /** Fraction of the gap to the cursor closed per step while dragging. */
  dragStiffness: number;
  /** How strongly the charm body rotates to follow the string, rad/s² per rad. */
  angularStiffness: number;
  /** Rotational damping, 1/s. */
  angularDamping: number;
  /** Swing angle (rad from vertical) past which extra damping kicks in. */
  swingLimit: number;
  /** Strength of the occasional idle breeze in px/s. Zero disables it. */
  breeze: number;
  /** Velocity clamp that keeps wild flicks stable. */
  maxSpeed: number;
  /** Mass of the charm relative to one string node. */
  charmMass: number;
}

const BASE: PhysicsParams = {
  gravity: 2600,
  retention: 0.6,
  dragStiffness: 0.25,
  angularStiffness: 95,
  angularDamping: 6,
  swingLimit: 1.6,
  breeze: 20,
  maxSpeed: 4200,
  charmMass: 10,
};

export const PROFILES: Record<PhysicsProfileName, PhysicsParams> = {
  calm: {
    ...BASE,
    retention: 0.3,
    dragStiffness: 0.16,
    angularDamping: 9,
    swingLimit: 0.85,
    breeze: 12,
  },
  normal: BASE,
  bouncy: {
    ...BASE,
    retention: 0.8,
    dragStiffness: 0.34,
    angularStiffness: 80,
    angularDamping: 3.2,
    swingLimit: Math.PI,
    breeze: 26,
  },
};

/** Reduced motion keeps the charm draggable but settles it almost immediately. */
export const REDUCED_MOTION: Partial<PhysicsParams> = {
  retention: 0.004,
  angularDamping: 22,
  swingLimit: 0.4,
  breeze: 0,
};

export interface SizeSpec {
  /** Longest side of the charm artwork in px. */
  charm: number;
  /** Length of the string in px. */
  rope: number;
}

export const SIZES: Record<CharmSize, SizeSpec> = {
  small: { charm: 58, rope: 96 },
  medium: { charm: 78, rope: 124 },
  large: { charm: 104, rope: 150 },
};

export function resolveParams(
  profile: PhysicsProfileName,
  reduceMotion: boolean,
  overrides: Partial<PhysicsParams> = {},
): PhysicsParams {
  return {
    ...PROFILES[profile],
    ...overrides,
    ...(reduceMotion ? REDUCED_MOTION : {}),
  };
}
