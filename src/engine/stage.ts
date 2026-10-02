import {
  MAX_THREAD_LENGTH,
  MIN_THREAD_LENGTH,
  type Beads,
  type Charm,
  type Finish,
  type Hook,
  type RopeStyle,
  type ThreadColor,
} from "../charms/types";
import { resolveParams, SIZES, type CharmSize, type PhysicsProfileName } from "../physics/profiles";
import { ChainSimulation } from "../physics/chain";
import type { Rig } from "../physics/rig";
import { CharmSimulation, type Vec2 } from "../physics/simulation";
import { sounds, type SoundMaterial } from "../audio/sounds";
import { soundFor } from "../charms/types";
import {
  charmBodyLength,
  drawScene,
  hitCircles,
  type DebugInfo,
  type HitCircle,
  type SceneState,
} from "../render/scene";
import { buildSprite, loadImage, type Sprite } from "../render/sprite";

export interface StageConfig {
  charm: Charm;
  /** Charms hung one below another on the same string, under `charm`. */
  stack?: Charm[];
  size: CharmSize;
  rope: RopeStyle;
  threadColor: ThreadColor;
  beads: Beads;
  /** Overrides the charm's own sound, e.g. while previewing a new custom charm. */
  sound?: SoundMaterial;
  finish: Finish;
  hook: Hook;
  shadow: boolean;
  /** String length multiplier, 0.5–3. */
  threadLength: number;
  physics: PhysicsProfileName;
  reduceMotion: boolean;
  /** Extra multiplier on top of the size preset (fine size, or the create-charm preview). */
  scale?: number;
  /** 0.25–1. */
  opacity?: number;
  glow?: "off" | "soft" | "strong";
  elastic?: boolean;
}

export interface StageOptions {
  /** Notified (throttled) with the charm's hit circle, or null when it cannot be touched. */
  onHitbox?: (hitboxes: HitCircle[]) => void;
  onDragChange?: (dragging: boolean) => void;
  /** ⌥-drag reels string in or out. Called when reeling starts and stops. */
  onReelChange?: (reeling: boolean) => void;
  /** Called on release after reeling with the new length multiplier. */
  onThreadLengthCommit?: (threadLength: number) => void;
  /** A quick tap without dragging. */
  onClick?: (charm: Charm) => void;
  /** Called once when a charm image fails to load, so the host can fall back. */
  onCharmError?: (charm: Charm) => void;
  /** When true the stage decides hover itself from pointer events. */
  selfHover?: boolean;
  /** The host routes pointer events itself (several stages sharing one input layer). */
  externalInput?: HTMLElement;
  /** Occasional gentle nudges while idle so the charm never looks frozen. */
  breeze?: boolean;
  debug?: boolean;
}

const HITBOX_INTERVAL = 33;
const HOVER_SCALE = 1.06;
const PRESS_SCALE = 0.96;
const SWAP_OUT_MS = 140;

type SwapPhase = { kind: "none" } | { kind: "out"; start: number; next: Sprite[] };

/**
 * Owns one charm on one canvas: simulation, sprite, render loop, and pointer input.
 * The loop only runs while something is moving; a settled charm costs nothing.
 */
export class CharmStage {
  private ctx: CanvasRenderingContext2D;
  private sim: Rig;
  private config: StageConfig | null = null;
  private sprites: (Sprite | null)[] = [];
  private spriteKey = "";
  private grabbedBody = 0;
  private width = 0;
  private height = 0;
  private dpr = 1;
  private anchor: Vec2 = { x: 0, y: 0 };

  private frame = 0;
  private lastTime = 0;
  private hovered = false;
  private pressed = false;
  private paused = false;
  private destroyed = false;
  private charmScale = 0;
  private scaleVelocity = 0;
  private opacity = 1;
  private swap: SwapPhase = { kind: "none" };
  private bounds = { width: 1, height: 1 };
  private lastHitboxSent = 0;
  private breezeTimer = 0;
  private breezeEnabled: boolean;
  private pointerId: number | null = null;
  private fps = 0;
  private debug: boolean;
  private loadToken = 0;
  private reeling = false;
  private lastWhoosh = 0;
  private downAt = 0;
  private downPoint: Vec2 = { x: 0, y: 0 };
  private travelled = 0;
  private baseRope = SIZES.medium.rope;
  private threadLength = 1;

  constructor(
    private canvas: HTMLCanvasElement,
    private options: StageOptions = {},
  ) {
    this.ctx = canvas.getContext("2d")!;
    this.sim = new CharmSimulation({ x: 0, y: 0 }, SIZES.medium.rope, resolveParams("normal", false), {
      width: 1,
      height: 1,
    });
    this.breezeEnabled = options.breeze ?? true;
    this.debug = options.debug ?? false;
    if (!options.externalInput) {
      canvas.addEventListener("pointerdown", this.onPointerDown);
      canvas.addEventListener("pointermove", this.onPointerMove);
      canvas.addEventListener("pointerup", this.onPointerUp);
      canvas.addEventListener("pointercancel", this.onPointerUp);
      canvas.addEventListener("pointerleave", this.onPointerLeave);
      canvas.addEventListener("lostpointercapture", this.onPointerUp);
    }
    this.scheduleBreeze();
  }

  destroy() {
    this.destroyed = true;
    cancelAnimationFrame(this.frame);
    clearTimeout(this.breezeTimer);
    this.canvas.removeEventListener("pointerdown", this.onPointerDown);
    this.canvas.removeEventListener("pointermove", this.onPointerMove);
    this.canvas.removeEventListener("pointerup", this.onPointerUp);
    this.canvas.removeEventListener("pointercancel", this.onPointerUp);
    this.canvas.removeEventListener("pointerleave", this.onPointerLeave);
    this.canvas.removeEventListener("lostpointercapture", this.onPointerUp);
  }

  /** Sizes the canvas in CSS px and places the string's anchor. */
  setViewport(width: number, height: number, anchorX: number, anchorY = 0) {
    const dpr = window.devicePixelRatio || 1;
    const resized = width !== this.width || height !== this.height || dpr !== this.dpr;
    this.width = width;
    this.height = height;
    if (resized) {
      this.canvas.width = Math.round(width * dpr);
      this.canvas.height = Math.round(height * dpr);
      this.canvas.style.width = `${width}px`;
      this.canvas.style.height = `${height}px`;
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    this.bounds = { width, height };
    this.sim.setBounds(this.bounds);
    this.anchor = { x: anchorX, y: anchorY };
    this.sim.setAnchor(this.anchor);
    if (dpr !== this.dpr) {
      this.dpr = dpr;
      this.spriteKey = "";
      if (this.config) void this.configure(this.config);
    }
    this.requestFrame();
  }

  /** Shifts the whole charm, e.g. to keep it still on screen while its window moves. */
  translate(dx: number, dy: number) {
    this.sim.translate(dx, dy);
    this.requestFrame();
  }

  private charms(config = this.config): Charm[] {
    return config ? [config.charm, ...(config.stack ?? [])] : [];
  }

  async configure(config: StageConfig): Promise<void> {
    const previous = this.config;
    this.config = config;
    const scale = (config.scale ?? 1) * config.charm.defaultScale;
    const size = SIZES[config.size];
    const charmSide = size.charm * scale;
    const charms = this.charms(config);

    const prefersReduced =
      typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
    const reduce = config.reduceMotion || prefersReduced;
    const params = resolveParams(config.physics, reduce, config.charm.physicsProfile);
    this.baseRope = size.rope * Math.min(1.25, Math.max(0.8, scale));
    if (!this.reeling) this.threadLength = config.threadLength;

    // One charm keeps the tuned single-pendant physics; several share one strand.
    const wantChain = charms.length > 1;
    if (wantChain !== this.sim instanceof ChainSimulation) {
      const length = this.baseRope * this.threadLength;
      this.sim = wantChain
        ? new ChainSimulation(this.anchor, length, params, this.bounds, charms.map(() => ({ length: charmSide })))
        : new CharmSimulation(this.anchor, length, params, this.bounds);
      this.spriteKey = "";
    }
    this.sim.setParams(params);
    this.sim.setElastic(config.elastic ?? false);
    if (!this.reeling) this.sim.setRopeLength(this.baseRope * this.threadLength);
    if (this.sim instanceof CharmSimulation) this.sim.setTipInset(charmSide * 0.55);
    this.breezeEnabled = (this.options.breeze ?? true) && !reduce;

    const key = charms
      .map(
        (c) =>
          `${c.id}|${c.image.length}|${c.image.slice(-32)}|${c.anchorOffset.x},${c.anchorOffset.y}|${c.defaultScale}`,
      )
      .concat([`${charmSide}|${this.dpr}|${config.finish}|${config.glow ?? "off"}`])
      .join(";");
    if (key === this.spriteKey) {
      this.requestFrame();
      return;
    }
    this.spriteKey = key;
    const token = ++this.loadToken;
    const loaded = await Promise.all(
      charms.map((c) =>
        loadImage(c.image).then(
          (img) => buildSprite(
            img,
            size.charm * (config.scale ?? 1) * c.defaultScale,
            c.anchorOffset,
            this.dpr,
            config.finish,
            config.glow ?? "off",
          ),
          (err) => {
            console.error(err);
            if (token === this.loadToken) this.options.onCharmError?.(c);
            return null;
          },
        ),
      ),
    );
    if (token !== this.loadToken || this.destroyed) return;

    if (this.sim instanceof ChainSimulation) {
      const detail = this.detailScale();
      this.sim.setBodies(
        loaded.map((sp) => ({ length: sp ? charmBodyLength(sp, detail, 1) : charmSide })),
      );
    }

    const sameCharm = previous?.charm.id === config.charm.id && charms.length === this.sprites.length;
    if (this.sprites.length === 0 || this.sprites.every((sp) => !sp)) {
      this.sprites = loaded;
      this.dropIn(reduce);
    } else if (sameCharm || reduce || charms.length > 1) {
      this.sprites = loaded;
    } else {
      this.swap = { kind: "out", start: performance.now(), next: loaded.filter((sp): sp is Sprite => !!sp) };
    }
    this.requestFrame();
  }

  private detailScale() {
    const size = this.config ? SIZES[this.config.size] : SIZES.medium;
    return Math.max(0.8, size.charm / SIZES.medium.charm);
  }

  setHover(hovered: boolean) {
    if (this.hovered === hovered) return;
    this.hovered = hovered;
    this.updateCursor();
    this.requestFrame();
  }

  setPaused(paused: boolean) {
    this.paused = paused;
    if (paused) {
      this.endDrag();
      this.options.onHitbox?.([]);
    } else {
      this.sim.wake();
    }
    this.requestFrame();
  }

  setBreeze(enabled: boolean) {
    const reduce = this.config?.reduceMotion ?? false;
    this.breezeEnabled = enabled && !reduce;
  }

  setDebug(debug: boolean) {
    this.debug = debug;
    this.requestFrame();
  }

  /** A flick of the cursor nearby (reactive mode) pushes the charm away from it. */
  poke(body: number, vx: number, vy: number) {
    if (this.paused || this.isDragging) return;
    const k = 0.22;
    const max = 900;
    this.sim.impulse(Math.max(-max, Math.min(max, vx * k)), Math.max(-max / 2, Math.min(max / 2, vy * k * 0.5)), body);
    this.requestFrame();
  }

  /** A gentle push, used by onboarding to show the charm is alive. */
  nudge(strength = 160) {
    this.sim.impulse(strength * (Math.random() < 0.5 ? -1 : 1), 0);
    this.requestFrame();
  }

  private dropIn(reduce: boolean) {
    this.charmScale = reduce ? 1 : 0.6;
    this.scaleVelocity = 0;
    if (reduce) return;
    const top = this.sim.poses()[0];
    this.sim.translate(0, this.anchor.y + 8 - top.y);
    this.sim.impulse((Math.random() - 0.5) * 120, 0);
  }

  private requestFrame() {
    if (this.frame || this.destroyed) return;
    this.lastTime = performance.now();
    this.frame = requestAnimationFrame(this.tick);
  }

  private tick = (now: number) => {
    this.frame = 0;
    if (this.destroyed) return;
    const elapsed = Math.max(0, (now - this.lastTime) / 1000);
    this.lastTime = now;
    if (elapsed > 0) this.fps = this.fps * 0.9 + (1 / elapsed) * 0.1;

    if (!this.paused) this.sim.advance(elapsed);
    const animating = this.animate(now, elapsed);
    this.render();
    this.reportHitbox(now, !this.sim.asleep || animating);

    const keepGoing = !this.paused && (!this.sim.asleep || animating);
    if (keepGoing) {
      this.frame = requestAnimationFrame(this.tick);
    } else {
      this.reportHitbox(now, false, true);
    }
  };

  /** Advances hover/press/swap tweens. Returns true while any is still moving. */
  private animate(now: number, dt: number): boolean {
    if (this.swap.kind === "out") {
      const t = Math.min(1, (now - this.swap.start) / SWAP_OUT_MS);
      this.charmScale = Math.max(0, 1 - t * t);
      this.opacity = 1;
      if (t >= 1) {
        this.sprites = this.swap.next;
        this.swap = { kind: "none" };
        this.charmScale = 0.35;
        this.scaleVelocity = 0;
        this.sim.impulse((Math.random() - 0.5) * 140, -40, 0);
      }
      return true;
    }
    const target = this.pressed ? PRESS_SCALE : this.hovered ? HOVER_SCALE : 1;
    const stiffness = 320;
    const damping = 2 * Math.sqrt(stiffness) * 0.62;
    const step = Math.min(dt, 1 / 30);
    const accel = stiffness * (target - this.charmScale) - damping * this.scaleVelocity;
    this.scaleVelocity += accel * step;
    this.charmScale += this.scaleVelocity * step;
    const settled = Math.abs(target - this.charmScale) < 0.0015 && Math.abs(this.scaleVelocity) < 0.01;
    if (settled) {
      this.charmScale = target;
      this.scaleVelocity = 0;
    }
    return !settled;
  }

  private sceneState(): SceneState {
    return {
      rig: this.sim,
      sprites: this.sprites,
      rope: this.config?.rope ?? "thread",
      color: this.config?.threadColor ?? "classic",
      beads: this.config?.beads ?? "none",
      hook: this.config?.hook ?? "clip",
      shadow: this.config?.shadow ?? true,
      detailScale: this.detailScale(),
      charmScale: this.charmScale,
      opacity: this.opacity * (this.config?.opacity ?? 1),
      debug: this.debug ? this.debugInfo() : undefined,
    };
  }

  private render() {
    drawScene(this.ctx, this.width, this.height, this.sceneState());
  }

  private debugInfo(): DebugInfo {
    const tip = this.sim.poses()[0];
    const v = this.sim.tipVelocity;
    const p = this.sim.currentParams;
    const state = this.paused
      ? "paused"
      : this.reeling
        ? "reeling"
        : this.sim.isDragging
          ? "dragging"
          : this.sim.asleep
            ? "sleeping"
            : "swinging";
    return {
      state,
      fps: this.sim.asleep || this.paused ? null : Math.round(this.fps),
      rows: [
        ["Position", `${tip.x.toFixed(0)}, ${tip.y.toFixed(0)}`],
        ["Velocity", `${Math.hypot(v.x, v.y).toFixed(0)} px/s`],
        ["Angle", `${((tip.angle * 180) / Math.PI).toFixed(1)}°`],
        ["Spin", `${this.sim.angularVelocity.toFixed(2)} rad/s`],
        ["Damping", `${Math.round((1 - p.retention) * 100)}%/s`],
        ["String", `${(this.baseRope * this.threadLength).toFixed(0)} px · ${this.threadLength.toFixed(2)}×`],
      ],
    };
  }

  private reportHitbox(now: number, moving: boolean, force = false) {
    if (!this.options.onHitbox) return;
    if (!force && moving && now - this.lastHitboxSent < HITBOX_INTERVAL) return;
    if (!force && !moving) return;
    this.lastHitboxSent = now;
    const hits = this.paused ? [] : hitCircles(this.sceneState()).filter((h): h is HitCircle => !!h);
    this.options.onHitbox(hits);
  }

  private scheduleBreeze() {
    const delay = 6000 + Math.random() * 8000;
    this.breezeTimer = window.setTimeout(() => {
      if (!this.destroyed && this.breezeEnabled && !this.paused && this.sim.asleep && !this.sim.isDragging) {
        const strength = this.sim.currentParams.breeze * (0.6 + Math.random() * 0.4);
        this.sim.impulse(strength * (Math.random() < 0.5 ? -1 : 1), 0);
        this.requestFrame();
      }
      if (!this.destroyed) this.scheduleBreeze();
    }, delay);
  }

  private localPoint(e: PointerEvent): Vec2 {
    const rect = this.canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  /** True when a pointer event lands on one of this stage's charms. */
  hits(e: PointerEvent): boolean {
    return !this.paused && this.bodyAt(this.localPoint(e)) !== -1;
  }

  get isDragging(): boolean {
    return this.pointerId !== null;
  }

  /** The charm under a pointer or wheel event, if any. */
  charmAt(e: MouseEvent): Charm | undefined {
    if (this.paused) return undefined;
    const rect = this.canvas.getBoundingClientRect();
    const body = this.bodyAt({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    return body === -1 ? undefined : this.charms()[body];
  }

  private get captureTarget(): HTMLElement {
    return this.options.externalInput ?? this.canvas;
  }

  /** Index of the charm under `p` (lowest first, since it is drawn on top), or -1. */
  private bodyAt(p: Vec2): number {
    const circles = hitCircles(this.sceneState());
    for (let i = circles.length - 1; i >= 0; i--) {
      const hit = circles[i];
      if (hit && Math.hypot(p.x - hit.x, p.y - hit.y) <= hit.r + 6) return i;
    }
    return -1;
  }

  private isOverCharm(p: Vec2): boolean {
    return this.bodyAt(p) !== -1;
  }

  private grabbedCharm(): Charm | undefined {
    return this.charms()[this.grabbedBody] ?? this.config?.charm;
  }

  private updateCursor() {
    const clickable = Boolean(this.charms().some((c) => c.launch) && this.options.onClick);
    (this.options.externalInput ?? this.canvas).style.cursor =
      this.pointerId !== null ? "grabbing" : this.hovered ? (clickable ? "pointer" : "grab") : "default";
  }

  readonly onPointerDown = (e: PointerEvent) => {
    if (this.paused || e.button !== 0) return;
    const p = this.localPoint(e);
    const body = this.bodyAt(p);
    if (body === -1) return;
    e.preventDefault();
    this.grabbedBody = body;
    this.pointerId = e.pointerId;
    try {
      this.captureTarget.setPointerCapture(e.pointerId);
    } catch {
      /* capture is best-effort */
    }
    this.pressed = true;
    this.hovered = true;
    this.downAt = performance.now();
    this.downPoint = p;
    this.travelled = 0;
    this.sim.startDrag(p, body);
    this.options.onDragChange?.(true);
    this.playSound("grab", 0.55);
    if (e.altKey) {
      this.reeling = true;
      this.options.onReelChange?.(true);
    }
    this.updateCursor();
    this.requestFrame();
  };

  readonly onPointerMove = (e: PointerEvent) => {
    const p = this.localPoint(e);
    if (this.pointerId === e.pointerId) {
      if (this.pressed && Math.hypot(e.movementX, e.movementY) > 0.5) this.pressed = false;
      if (this.reeling) this.reelTo(p);
      this.travelled = Math.max(this.travelled, Math.hypot(p.x - this.downPoint.x, p.y - this.downPoint.y));
      this.sim.moveDrag(p);
      const now = performance.now();
      if (this.sim.speed > 1500 && now - this.lastWhoosh > 380) {
        this.lastWhoosh = now;
        this.playSound("whoosh", this.sim.speed / 3500);
      }
      this.requestFrame();
    } else if (this.options.selfHover && !this.paused) {
      this.setHover(this.isOverCharm(p));
    }
  };

  readonly onPointerUp = (e: PointerEvent) => {
    if (this.pointerId !== e.pointerId) return;
    const wasClick = !this.reeling && this.travelled < 5 && performance.now() - this.downAt < 350;
    this.endDrag();
    const charm = this.grabbedCharm();
    if (wasClick && charm && this.options.onClick) {
      this.sim.impulse(0, -260, this.grabbedBody);
      this.options.onClick(charm);
    }
    if (this.options.selfHover) this.setHover(this.isOverCharm(this.localPoint(e)));
  };

  private onPointerLeave = () => {
    if (this.pointerId === null && this.options.selfHover) this.setHover(false);
  };

  /** Sets the string length from the anchor-to-pointer distance, like pulling thread off a spool. */
  private reelTo(p: Vec2) {
    const charmReach = this.sprites[0] ? this.sprites[0].height * 0.5 : 20;
    const dist = Math.hypot(p.x - this.anchor.x, p.y - this.anchor.y) - charmReach;
    const next = Math.min(MAX_THREAD_LENGTH, Math.max(MIN_THREAD_LENGTH, dist / this.baseRope));
    if (Math.abs(next - this.threadLength) < 0.005) return;
    this.threadLength = next;
    this.sim.setRopeLength(this.baseRope * next);
  }

  private playSound(event: "grab" | "release" | "whoosh", intensity: number) {
    const charm = this.grabbedCharm();
    if (!this.config || !charm) return;
    sounds.play(this.grabbedBody === 0 && this.config.sound ? this.config.sound : soundFor(charm), event, intensity);
  }

  private endDrag() {
    if (this.pointerId === null) return;
    try {
      this.captureTarget.releasePointerCapture(this.pointerId);
    } catch {
      /* already released */
    }
    this.pointerId = null;
    this.pressed = false;
    if (this.reeling) {
      this.reeling = false;
      this.options.onReelChange?.(false);
      this.options.onThreadLengthCommit?.(Math.round(this.threadLength * 100) / 100);
    }
    this.sim.endDrag();
    this.options.onDragChange?.(false);
    this.playSound("release", 0.3 + this.sim.speed / 2200);
    this.updateCursor();
    this.requestFrame();
  }
}
