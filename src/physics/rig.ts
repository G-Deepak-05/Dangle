import type { BodyPose } from "./chain";
import type { PhysicsParams } from "./profiles";
import type { Bounds, Vec2 } from "./simulation";

export interface RopePiece {
  xs: Float64Array;
  ys: Float64Array;
}

/** What the stage needs from a simulation: one charm on a string, or a strand of several. */
export interface Rig {
  readonly asleep: boolean;
  readonly speed: number;
  readonly isDragging: boolean;
  readonly currentParams: PhysicsParams;
  readonly angularVelocity: number;
  readonly tipVelocity: Vec2;
  poses(): BodyPose[];
  ropes(): RopePiece[];
  setParams(params: PhysicsParams): void;
  setBounds(bounds: Bounds): void;
  setRopeLength(length: number): void;
  setElastic(elastic: boolean): void;
  setAnchor(anchor: Vec2): void;
  /** Hangs everything straight down from the anchor, at rest. */
  reset(): void;
  translate(dx: number, dy: number): void;
  impulse(vx: number, vy: number, body?: number): void;
  startDrag(grab: Vec2, body: number): void;
  moveDrag(pointer: Vec2): void;
  endDrag(): void;
  wake(): void;
  advance(elapsed: number): number;
}
