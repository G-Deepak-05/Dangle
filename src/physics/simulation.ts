import type { BodyPose } from "./chain";
import type { PhysicsParams } from "./profiles";
import type { Rig, RopePiece } from "./rig";

export const FIXED_DT = 1 / 120;
const MAX_STEPS_PER_FRAME = 10;
const CONSTRAINT_ITERATIONS = 18;
const SEGMENTS = 14;
const SLEEP_SPEED = 3;
const SLEEP_ANGULAR = 0.03;
const SLEEP_DELAY = 0.6;
const SWING_COUPLING = 0.0009;
/** Below this speed (px/s) extra damping fades in, so tiny oscillations die out like a real pendant. */
const SETTLE_SPEED = 70;
const SETTLE_RETENTION = 0.08;

export interface Vec2 {
  x: number;
  y: number;
}

export interface Bounds {
  width: number;
  height: number;
}

function wrapAngle(a: number): number {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

/**
 * A string of point masses (position-based Verlet) with a heavy charm on the end.
 * The string only resists stretching, so it goes slack when the charm is tossed up.
 * The charm body has its own angle that chases the last string segment through a
 * damped spring, which gives the slight lag and wobble of a real pendant.
 */
export class CharmSimulation implements Rig {
  readonly x = new Float64Array(SEGMENTS + 1);
  readonly y = new Float64Array(SEGMENTS + 1);
  private readonly px = new Float64Array(SEGMENTS + 1);
  private readonly py = new Float64Array(SEGMENTS + 1);
  private readonly invMass = new Float64Array(SEGMENTS + 1);

  angle = 0;
  angularVelocity = 0;
  asleep = false;

  private anchor: Vec2;
  private segmentLength: number;
  private params: PhysicsParams;
  private bounds: Bounds;
  private accumulator = 0;
  private stillFor = 0;
  private lastVx = 0;
  private drag: { target: Vec2; offset: Vec2 } | null = null;
  private lastSpeed = 0;
  private tipInset = 0;

  constructor(anchor: Vec2, ropeLength: number, params: PhysicsParams, bounds: Bounds) {
    this.anchor = { ...anchor };
    this.segmentLength = ropeLength / SEGMENTS;
    this.params = params;
    this.bounds = bounds;
    this.applyMass();
    this.reset();
  }

  get segments(): number {
    return SEGMENTS;
  }

  get tip(): Vec2 {
    return { x: this.x[SEGMENTS], y: this.y[SEGMENTS] };
  }

  get isDragging(): boolean {
    return this.drag !== null;
  }

  /** Charm velocity in px/s, derived from the last Verlet step. */
  get tipVelocity(): Vec2 {
    return {
      x: (this.x[SEGMENTS] - this.px[SEGMENTS]) / FIXED_DT,
      y: (this.y[SEGMENTS] - this.py[SEGMENTS]) / FIXED_DT,
    };
  }

  get speed(): number {
    return this.lastSpeed;
  }

  get currentParams(): PhysicsParams {
    return this.params;
  }

  poses(): BodyPose[] {
    return [{ x: this.x[SEGMENTS], y: this.y[SEGMENTS], angle: this.angle }];
  }

  ropes(): RopePiece[] {
    return [{ xs: this.x, ys: this.y }];
  }

  /** Angle the charm would rest at given the current string direction. */
  get targetAngle(): number {
    const dx = this.x[SEGMENTS] - this.x[SEGMENTS - 1];
    const dy = this.y[SEGMENTS] - this.y[SEGMENTS - 1];
    if (dx * dx + dy * dy < 1e-6) return this.angle;
    return Math.atan2(-dx, dy);
  }

  reset(): void {
    for (let i = 0; i <= SEGMENTS; i++) {
      this.x[i] = this.px[i] = this.anchor.x;
      this.y[i] = this.py[i] = this.anchor.y + i * this.segmentLength;
    }
    this.angle = 0;
    this.angularVelocity = 0;
    this.accumulator = 0;
    this.stillFor = 0;
    this.asleep = false;
  }

  setParams(params: PhysicsParams): void {
    this.params = params;
    this.applyMass();
    this.wake();
  }

  setBounds(bounds: Bounds): void {
    this.bounds = bounds;
    this.wake();
  }

  /** Keeps the charm body (not just its attachment point) inside the bounds. */
  setTipInset(inset: number): void {
    this.tipInset = Math.max(0, inset);
  }

  setRopeLength(length: number): void {
    this.segmentLength = length / SEGMENTS;
    this.wake();
  }

  setAnchor(anchor: Vec2): void {
    this.anchor = { ...anchor };
    this.x[0] = this.px[0] = anchor.x;
    this.y[0] = this.py[0] = anchor.y;
    this.wake();
  }

  /** Moves everything without adding velocity, e.g. when the host window moves. */
  translate(dx: number, dy: number): void {
    for (let i = 1; i <= SEGMENTS; i++) {
      this.x[i] += dx;
      this.px[i] += dx;
      this.y[i] += dy;
      this.py[i] += dy;
    }
    this.wake();
  }

  /** Adds a velocity change (px/s) to the charm. */
  impulse(vx: number, vy: number, _body?: number): void {
    this.px[SEGMENTS] -= vx * FIXED_DT;
    this.py[SEGMENTS] -= vy * FIXED_DT;
    this.wake();
  }

  /** Starts a drag. `grab` is where the pointer touched, in the same space as the sim. */
  startDrag(grab: Vec2, _body = 0): void {
    const cos = Math.cos(-this.angle);
    const sin = Math.sin(-this.angle);
    const dx = grab.x - this.x[SEGMENTS];
    const dy = grab.y - this.y[SEGMENTS];
    this.drag = {
      target: { ...grab },
      offset: { x: dx * cos - dy * sin, y: dx * sin + dy * cos },
    };
    this.wake();
  }

  moveDrag(pointer: Vec2): void {
    if (!this.drag) return;
    this.drag.target = { ...pointer };
    this.wake();
  }

  endDrag(): void {
    this.drag = null;
    this.wake();
  }

  wake(): void {
    this.asleep = false;
    this.stillFor = 0;
  }

  /** Advances by real elapsed seconds using fixed substeps. Returns steps taken. */
  advance(elapsed: number): number {
    if (this.asleep) return 0;
    this.accumulator += Math.min(elapsed, 0.1);
    let steps = 0;
    while (this.accumulator >= FIXED_DT && steps < MAX_STEPS_PER_FRAME) {
      this.step(FIXED_DT);
      this.accumulator -= FIXED_DT;
      steps++;
    }
    if (steps === MAX_STEPS_PER_FRAME) this.accumulator = 0;
    return steps;
  }

  step(dt: number): void {
    const p = this.params;
    const n = SEGMENTS;
    let damping = Math.pow(p.retention, dt);
    if (!this.drag && this.lastSpeed < SETTLE_SPEED) {
      damping *= Math.pow(SETTLE_RETENTION, dt * (1 - this.lastSpeed / SETTLE_SPEED));
    }

    const swing = Math.atan2(this.x[n] - this.anchor.x, this.y[n] - this.anchor.y);
    if (!this.drag && Math.abs(swing) > p.swingLimit) {
      damping *= Math.pow(0.05, dt);
    }

    const maxStep = p.maxSpeed * dt;
    let maxSpeedSq = 0;
    for (let i = 1; i <= n; i++) {
      let vx = (this.x[i] - this.px[i]) * damping;
      let vy = (this.y[i] - this.py[i]) * damping;
      const sq = vx * vx + vy * vy;
      if (sq > maxStep * maxStep) {
        const s = maxStep / Math.sqrt(sq);
        vx *= s;
        vy *= s;
      }
      this.px[i] = this.x[i];
      this.py[i] = this.y[i];
      this.x[i] += vx;
      this.y[i] += vy + p.gravity * dt * dt;
    }

    if (this.drag) {
      const cos = Math.cos(this.angle);
      const sin = Math.sin(this.angle);
      const o = this.drag.offset;
      const tx = this.drag.target.x - (o.x * cos - o.y * sin);
      const ty = this.drag.target.y - (o.x * sin + o.y * cos);
      this.x[n] += (tx - this.x[n]) * p.dragStiffness;
      this.y[n] += (ty - this.y[n]) * p.dragStiffness;
    }

    this.solveConstraints();

    for (let i = 1; i <= n; i++) {
      const vx = (this.x[i] - this.px[i]) / dt;
      const vy = (this.y[i] - this.py[i]) / dt;
      maxSpeedSq = Math.max(maxSpeedSq, vx * vx + vy * vy);
    }
    this.lastSpeed = Math.sqrt(maxSpeedSq);

    const tipVx = (this.x[n] - this.px[n]) / dt;
    const accelX = (tipVx - this.lastVx) / dt;
    this.lastVx = tipVx;

    const error = wrapAngle(this.targetAngle - this.angle);
    const torque =
      p.angularStiffness * error - p.angularDamping * this.angularVelocity - accelX * SWING_COUPLING;
    this.angularVelocity += torque * dt;
    this.angularVelocity = Math.max(-40, Math.min(40, this.angularVelocity));
    this.angle = wrapAngle(this.angle + this.angularVelocity * dt);

    const still =
      !this.drag &&
      this.lastSpeed < SLEEP_SPEED &&
      Math.abs(this.angularVelocity) < SLEEP_ANGULAR &&
      Math.abs(error) < 0.01;
    this.stillFor = still ? this.stillFor + dt : 0;
    if (this.stillFor > SLEEP_DELAY) {
      for (let i = 1; i <= n; i++) {
        this.px[i] = this.x[i];
        this.py[i] = this.y[i];
      }
      this.angularVelocity = 0;
      this.asleep = true;
    }
  }

  private applyMass(): void {
    this.invMass[0] = 0;
    for (let i = 1; i < SEGMENTS; i++) this.invMass[i] = 1;
    this.invMass[SEGMENTS] = 1 / Math.max(1, this.params.charmMass);
  }

  private solveConstraints(): void {
    const n = SEGMENTS;
    const rest = this.segmentLength;
    const margin = 3;
    const maxX = this.bounds.width - margin;
    const maxY = this.bounds.height - margin;
    for (let iter = 0; iter < CONSTRAINT_ITERATIONS; iter++) {
      for (let i = 0; i < n; i++) {
        const dx = this.x[i + 1] - this.x[i];
        const dy = this.y[i + 1] - this.y[i];
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist <= rest || dist === 0) continue;
        const w1 = this.invMass[i];
        const w2 = this.invMass[i + 1];
        const total = w1 + w2;
        if (total === 0) continue;
        const correction = (dist - rest) / (dist * total);
        this.x[i] += dx * correction * w1;
        this.y[i] += dy * correction * w1;
        this.x[i + 1] -= dx * correction * w2;
        this.y[i + 1] -= dy * correction * w2;
      }
      for (let i = 1; i <= n; i++) {
        const inset = i === n ? this.tipInset : 0;
        if (this.y[i] < margin) this.y[i] = margin;
        if (this.y[i] > maxY - inset * 2) this.y[i] = maxY - inset * 2;
        if (this.x[i] < margin + inset) this.x[i] = margin + inset;
        if (this.x[i] > maxX - inset) this.x[i] = maxX - inset;
      }
    }
    // The mass-weighted solve cannot fully hold a heavy charm on a light string, so
    // finish with an anchor-outward pass that makes the string strictly inextensible.
    for (let i = 1; i <= n; i++) {
      const dx = this.x[i] - this.x[i - 1];
      const dy = this.y[i] - this.y[i - 1];
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > rest) {
        const k = rest / dist;
        this.x[i] = this.x[i - 1] + dx * k;
        this.y[i] = this.y[i - 1] + dy * k;
      }
    }
  }
}
