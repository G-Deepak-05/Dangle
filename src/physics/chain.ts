import type { PhysicsParams } from "./profiles";
import type { Rig, RopePiece } from "./rig";
import { FIXED_DT, type Bounds, type Vec2 } from "./simulation";

const MAX_STEPS_PER_FRAME = 10;
const CONSTRAINT_ITERATIONS = 22;
const TOP_SEGMENTS = 12;
const GAP_SEGMENTS = 4;
const SLEEP_SPEED = 3;
const SLEEP_DELAY = 0.6;
const SETTLE_SPEED = 70;
const SETTLE_RETENTION = 0.08;
/** A strand has more ways to wobble than a single charm; extra drag keeps settle times similar. */
const CHAIN_DRAG = 1.9;

export interface ChainBody {
  /** Distance from the charm's hang point to where the next string attaches, px. */
  length: number;
}

/** Where a charm hangs and how it is turned. */
export interface BodyPose {
  x: number;
  y: number;
  angle: number;
}

/**
 * Several charms on one string, one below another. Each charm is a rigid link between two
 * heavy nodes; short pieces of string join them. Because it is a single Verlet chain,
 * pulling any charm moves the others, like a real charm strand.
 */
export class ChainSimulation implements Rig {
  x = new Float64Array(0);
  y = new Float64Array(0);
  private px = new Float64Array(0);
  private py = new Float64Array(0);
  private invMass = new Float64Array(0);
  private rest = new Float64Array(0);
  private rigid = new Uint8Array(0);
  private tops: number[] = [];
  private bottoms: number[] = [];

  asleep = false;
  angularVelocity = 0;

  private anchor: Vec2;
  private ropeLength: number;
  private gapLength: number;
  private bodies: ChainBody[];
  private params: PhysicsParams;
  private bounds: Bounds;
  private accumulator = 0;
  private stillFor = 0;
  private lastSpeed = 0;
  private drag: { body: number; target: Vec2; offset: Vec2 } | null = null;

  constructor(
    anchor: Vec2,
    ropeLength: number,
    params: PhysicsParams,
    bounds: Bounds,
    bodies: ChainBody[],
    gapLength = 16,
  ) {
    this.anchor = { ...anchor };
    this.ropeLength = ropeLength;
    this.gapLength = gapLength;
    this.params = params;
    this.bounds = bounds;
    this.bodies = bodies;
    this.build();
  }

  get bodyCount(): number {
    return this.bodies.length;
  }

  get isDragging(): boolean {
    return this.drag !== null;
  }

  get speed(): number {
    return this.lastSpeed;
  }

  get currentParams(): PhysicsParams {
    return this.params;
  }

  /** Hang point and rotation of each charm, top to bottom. */
  poses(): BodyPose[] {
    return this.tops.map((t, k) => {
      const b = this.bottoms[k];
      const dx = this.x[b] - this.x[t];
      const dy = this.y[b] - this.y[t];
      return { x: this.x[t], y: this.y[t], angle: Math.atan2(-dx, dy) };
    });
  }

  /** The string pieces to draw: [start, end] node ranges that are rope, not charm. */
  ropeRanges(): [number, number][] {
    const ranges: [number, number][] = [[0, this.tops[0]]];
    for (let k = 0; k < this.bodies.length - 1; k++) ranges.push([this.bottoms[k], this.tops[k + 1]]);
    return ranges;
  }

  ropes(): RopePiece[] {
    return this.ropeRanges().map(([a, b]) => ({ xs: this.x.subarray(a, b + 1), ys: this.y.subarray(a, b + 1) }));
  }

  /** Velocity of the first charm, for debugging. */
  get tipVelocity(): Vec2 {
    const t = this.tops[0];
    return { x: (this.x[t] - this.px[t]) / FIXED_DT, y: (this.y[t] - this.py[t]) / FIXED_DT };
  }

  private build(): void {
    // Anchor + top string; each charm adds its bottom node; each gap adds its segments
    // (the last gap node doubles as the next charm's hang point).
    const nodes = 1 + TOP_SEGMENTS + this.bodies.length + (this.bodies.length - 1) * GAP_SEGMENTS;
    this.x = new Float64Array(nodes);
    this.y = new Float64Array(nodes);
    this.px = new Float64Array(nodes);
    this.py = new Float64Array(nodes);
    this.invMass = new Float64Array(nodes);
    this.rest = new Float64Array(nodes - 1);
    this.rigid = new Uint8Array(nodes - 1);
    this.tops = [];
    this.bottoms = [];

    let i = 0;
    const charmInv = 1 / Math.max(1, this.params.charmMass / 2);
    this.invMass[0] = 0;
    for (let s = 0; s < TOP_SEGMENTS; s++) {
      this.rest[i] = this.ropeLength / TOP_SEGMENTS;
      i++;
      this.invMass[i] = 1;
    }
    this.bodies.forEach((body, k) => {
      this.tops.push(i);
      this.invMass[i] = charmInv;
      this.rest[i] = Math.max(4, body.length);
      this.rigid[i] = 1;
      i++;
      this.bottoms.push(i);
      this.invMass[i] = charmInv;
      if (k < this.bodies.length - 1) {
        for (let s = 0; s < GAP_SEGMENTS; s++) {
          this.rest[i] = this.gapLength / GAP_SEGMENTS;
          i++;
          this.invMass[i] = s === GAP_SEGMENTS - 1 ? charmInv : 1;
        }
      }
    });
    this.reset();
  }

  reset(): void {
    let y = this.anchor.y;
    for (let i = 0; i < this.x.length; i++) {
      this.x[i] = this.px[i] = this.anchor.x;
      this.y[i] = this.py[i] = y;
      if (i < this.rest.length) y += this.rest[i];
    }
    this.accumulator = 0;
    this.stillFor = 0;
    this.asleep = false;
  }

  /** Rebuilds the strand for a new set of charms, keeping the first part where it was. */
  setBodies(bodies: ChainBody[]): void {
    const same =
      bodies.length === this.bodies.length && bodies.every((b, k) => Math.abs(b.length - this.bodies[k].length) < 0.5);
    this.bodies = bodies;
    if (same) return this.wake();
    this.build();
  }

  setParams(params: PhysicsParams): void {
    this.params = params;
    const charmInv = 1 / Math.max(1, params.charmMass / 2);
    for (const t of this.tops) this.invMass[t] = charmInv;
    for (const b of this.bottoms) this.invMass[b] = charmInv;
    this.wake();
  }

  setBounds(bounds: Bounds): void {
    this.bounds = bounds;
    this.wake();
  }

  setRopeLength(length: number): void {
    this.ropeLength = length;
    for (let s = 0; s < TOP_SEGMENTS; s++) this.rest[s] = length / TOP_SEGMENTS;
    this.wake();
  }

  setAnchor(anchor: Vec2): void {
    this.anchor = { ...anchor };
    this.x[0] = this.px[0] = anchor.x;
    this.y[0] = this.py[0] = anchor.y;
    this.wake();
  }

  translate(dx: number, dy: number): void {
    for (let i = 1; i < this.x.length; i++) {
      this.x[i] += dx;
      this.px[i] += dx;
      this.y[i] += dy;
      this.py[i] += dy;
    }
    this.wake();
  }

  /** Adds a velocity change (px/s) to one charm (default: the bottom one). */
  impulse(vx: number, vy: number, body = this.bodies.length - 1): void {
    for (const n of [this.tops[body], this.bottoms[body]]) {
      this.px[n] -= vx * FIXED_DT;
      this.py[n] -= vy * FIXED_DT;
    }
    this.wake();
  }

  startDrag(grab: Vec2, body: number): void {
    const pose = this.poses()[body];
    const cos = Math.cos(-pose.angle);
    const sin = Math.sin(-pose.angle);
    const dx = grab.x - pose.x;
    const dy = grab.y - pose.y;
    this.drag = { body, target: { ...grab }, offset: { x: dx * cos - dy * sin, y: dx * sin + dy * cos } };
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
    const n = this.x.length;
    let damping = Math.pow(p.retention, dt * CHAIN_DRAG);
    if (!this.drag && this.lastSpeed < SETTLE_SPEED) {
      damping *= Math.pow(SETTLE_RETENTION, dt * (1 - this.lastSpeed / SETTLE_SPEED));
    }
    const maxStep = p.maxSpeed * dt;
    for (let i = 1; i < n; i++) {
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
      const pose = this.poses()[this.drag.body];
      const cos = Math.cos(pose.angle);
      const sin = Math.sin(pose.angle);
      const o = this.drag.offset;
      const tx = this.drag.target.x - (o.x * cos - o.y * sin);
      const ty = this.drag.target.y - (o.x * sin + o.y * cos);
      const mx = (tx - pose.x) * p.dragStiffness;
      const my = (ty - pose.y) * p.dragStiffness;
      for (const node of [this.tops[this.drag.body], this.bottoms[this.drag.body]]) {
        this.x[node] += mx;
        this.y[node] += my;
      }
    }

    this.solve();

    let maxSq = 0;
    for (let i = 1; i < n; i++) {
      const vx = (this.x[i] - this.px[i]) / dt;
      const vy = (this.y[i] - this.py[i]) / dt;
      maxSq = Math.max(maxSq, vx * vx + vy * vy);
    }
    this.lastSpeed = Math.sqrt(maxSq);

    const still = !this.drag && this.lastSpeed < SLEEP_SPEED;
    this.stillFor = still ? this.stillFor + dt : 0;
    if (this.stillFor > SLEEP_DELAY) {
      for (let i = 1; i < n; i++) {
        this.px[i] = this.x[i];
        this.py[i] = this.y[i];
      }
      this.asleep = true;
    }
  }

  private solve(): void {
    const n = this.x.length;
    const margin = 3;
    const maxX = this.bounds.width - margin;
    const maxY = this.bounds.height - margin;
    for (let iter = 0; iter < CONSTRAINT_ITERATIONS; iter++) {
      for (let i = 0; i < n - 1; i++) {
        const dx = this.x[i + 1] - this.x[i];
        const dy = this.y[i + 1] - this.y[i];
        const dist = Math.sqrt(dx * dx + dy * dy);
        const rest = this.rest[i];
        if (dist === 0 || (!this.rigid[i] && dist <= rest)) continue;
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
      for (let i = 1; i < n; i++) {
        if (this.y[i] < margin) this.y[i] = margin;
        if (this.y[i] > maxY) this.y[i] = maxY;
        if (this.x[i] < margin) this.x[i] = margin;
        if (this.x[i] > maxX) this.x[i] = maxX;
      }
    }
    // While a charm is held, first pull everything above it toward it (FABRIK-style), so the
    // whole strand follows the hand instead of snapping the held charm back.
    if (this.drag) {
      for (let i = this.bottoms[this.drag.body]; i >= 1; i--) {
        const dx = this.x[i - 1] - this.x[i];
        const dy = this.y[i - 1] - this.y[i];
        const dist = Math.sqrt(dx * dx + dy * dy);
        const rest = this.rest[i - 1];
        if (dist > rest || (this.rigid[i - 1] && dist > 0)) {
          const k = rest / dist;
          if (i - 1 === 0) break;
          this.x[i - 1] = this.x[i] + dx * k;
          this.y[i - 1] = this.y[i] + dy * k;
        }
      }
    }
    // Anchor-outward pass: the string can't stretch and each charm keeps its exact size.
    for (let i = 1; i < n; i++) {
      const dx = this.x[i] - this.x[i - 1];
      const dy = this.y[i] - this.y[i - 1];
      const dist = Math.sqrt(dx * dx + dy * dy);
      const rest = this.rest[i - 1];
      if (dist > rest || (this.rigid[i - 1] && dist > 0)) {
        const k = rest / dist;
        this.x[i] = this.x[i - 1] + dx * k;
        this.y[i] = this.y[i - 1] + dy * k;
      }
    }
  }
}
