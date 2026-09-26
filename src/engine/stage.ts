import type { Charm, RopeStyle } from "../charms/types";
import { resolveParams, SIZES, type CharmSize, type PhysicsProfileName } from "../physics/profiles";
import { CharmSimulation, type Vec2 } from "../physics/simulation";
import { drawScene, hitCircle, type SceneState } from "../render/scene";
import { buildSprite, loadImage, type Sprite } from "../render/sprite";

export interface StageConfig {
  charm: Charm;
  size: CharmSize;
  rope: RopeStyle;
  physics: PhysicsProfileName;
  reduceMotion: boolean;
  /** Extra multiplier on top of the size preset, used by the create-charm preview. */
  scale?: number;
}

export interface StageOptions {
  /** Notified (throttled) with the charm's hit circle, or null when it cannot be touched. */
  onHitbox?: (hitbox: { x: number; y: number; r: number } | null) => void;
  onDragChange?: (dragging: boolean) => void;
  /** Called once when a charm image fails to load, so the host can fall back. */
  onCharmError?: (charm: Charm) => void;
  /** When true the stage decides hover itself from pointer events. */
  selfHover?: boolean;
  /** Occasional gentle nudges while idle so the charm never looks frozen. */
  breeze?: boolean;
  debug?: boolean;
}

const HITBOX_INTERVAL = 33;
const HOVER_SCALE = 1.06;
const PRESS_SCALE = 0.96;
const SWAP_OUT_MS = 140;

type SwapPhase = { kind: "none" } | { kind: "out"; start: number; next: Sprite };

/**
 * Owns one charm on one canvas: simulation, sprite, render loop, and pointer input.
 * The loop only runs while something is moving; a settled charm costs nothing.
 */
export class CharmStage {
  private ctx: CanvasRenderingContext2D;
  private sim: CharmSimulation;
  private config: StageConfig | null = null;
  private sprite: Sprite | null = null;
  private spriteKey = "";
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
  private lastHitboxSent = 0;
  private breezeTimer = 0;
  private breezeEnabled: boolean;
  private pointerId: number | null = null;
  private fps = 0;
  private debug: boolean;
  private loadToken = 0;

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
    canvas.addEventListener("pointerdown", this.onPointerDown);
    canvas.addEventListener("pointermove", this.onPointerMove);
    canvas.addEventListener("pointerup", this.onPointerUp);
    canvas.addEventListener("pointercancel", this.onPointerUp);
    canvas.addEventListener("pointerleave", this.onPointerLeave);
    canvas.addEventListener("lostpointercapture", this.onPointerUp);
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
    this.sim.setBounds({ width, height });
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

  async configure(config: StageConfig): Promise<void> {
    const previous = this.config;
    this.config = config;
    const scale = (config.scale ?? 1) * config.charm.defaultScale;
    const size = SIZES[config.size];
    const charmSide = size.charm * scale;

    const prefersReduced =
      typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
    const reduce = config.reduceMotion || prefersReduced;
    this.sim.setParams(resolveParams(config.physics, reduce, config.charm.physicsProfile));
    this.sim.setRopeLength(size.rope * Math.min(1.25, Math.max(0.8, scale)));
    this.sim.setTipInset(charmSide * 0.55);
    this.breezeEnabled = (this.options.breeze ?? true) && !reduce;

    const key = `${config.charm.id}|${config.charm.image.length}|${config.charm.image.slice(-32)}|${charmSide}|${config.charm.anchorOffset.x},${config.charm.anchorOffset.y}|${this.dpr}`;
    if (key === this.spriteKey) {
      this.requestFrame();
      return;
    }
    this.spriteKey = key;
    const token = ++this.loadToken;
    let img: HTMLImageElement;
    try {
      img = await loadImage(config.charm.image);
    } catch (err) {
      console.error(err);
      if (token === this.loadToken) this.options.onCharmError?.(config.charm);
      return;
    }
    if (token !== this.loadToken || this.destroyed) return;
    const next = buildSprite(img, charmSide, config.charm.anchorOffset, this.dpr);

    const sameCharm = previous?.charm.id === config.charm.id;
    if (!this.sprite) {
      this.sprite = next;
      this.dropIn(reduce);
    } else if (sameCharm || reduce) {
      this.sprite = next;
    } else {
      this.swap = { kind: "out", start: performance.now(), next };
    }
    this.requestFrame();
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
      this.options.onHitbox?.(null);
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

  /** A gentle push, used by onboarding to show the charm is alive. */
  nudge(strength = 160) {
    this.sim.impulse(strength * (Math.random() < 0.5 ? -1 : 1), 0);
    this.requestFrame();
  }

  private dropIn(reduce: boolean) {
    this.charmScale = reduce ? 1 : 0.6;
    this.scaleVelocity = 0;
    if (reduce) return;
    const tip = this.sim.tip;
    this.sim.translate(0, this.anchor.y + 8 - tip.y);
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
        this.sprite = this.swap.next;
        this.swap = { kind: "none" };
        this.charmScale = 0.35;
        this.scaleVelocity = 0;
        this.sim.impulse((Math.random() - 0.5) * 140, -40);
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
    const size = this.config ? SIZES[this.config.size] : SIZES.medium;
    return {
      sim: this.sim,
      sprite: this.sprite,
      rope: this.config?.rope ?? "thread",
      detailScale: Math.max(0.8, size.charm / SIZES.medium.charm),
      charmScale: this.charmScale,
      opacity: this.opacity,
      debug: this.debug ? this.debugLines() : undefined,
    };
  }

  private render() {
    drawScene(this.ctx, this.width, this.height, this.sceneState());
  }

  private debugLines(): string[] {
    const tip = this.sim.tip;
    const v = this.sim.tipVelocity;
    const p = this.sim.currentParams;
    const state = this.paused
      ? "paused"
      : this.sim.isDragging
        ? "dragging"
        : this.sim.asleep
          ? "sleeping"
          : "swinging";
    return [
      `fps       ${this.sim.asleep ? "–" : this.fps.toFixed(0)}`,
      `position  ${tip.x.toFixed(1)}, ${tip.y.toFixed(1)}`,
      `velocity  ${v.x.toFixed(0)}, ${v.y.toFixed(0)} px/s`,
      `angle     ${((this.sim.angle * 180) / Math.PI).toFixed(1)}°`,
      `ang.vel   ${this.sim.angularVelocity.toFixed(2)} rad/s`,
      `damping   ${p.retention.toFixed(3)} kept/s`,
      `state     ${state}`,
    ];
  }

  private reportHitbox(now: number, moving: boolean, force = false) {
    if (!this.options.onHitbox) return;
    if (!force && moving && now - this.lastHitboxSent < HITBOX_INTERVAL) return;
    if (!force && !moving) return;
    this.lastHitboxSent = now;
    const hit = this.paused ? null : hitCircle(this.sceneState());
    this.options.onHitbox(hit);
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

  private isOverCharm(p: Vec2): boolean {
    const hit = hitCircle(this.sceneState());
    if (!hit) return false;
    return Math.hypot(p.x - hit.x, p.y - hit.y) <= hit.r + 6;
  }

  private updateCursor() {
    this.canvas.style.cursor = this.pointerId !== null ? "grabbing" : this.hovered ? "grab" : "default";
  }

  private onPointerDown = (e: PointerEvent) => {
    if (this.paused || e.button !== 0) return;
    const p = this.localPoint(e);
    if (!this.isOverCharm(p)) return;
    e.preventDefault();
    this.pointerId = e.pointerId;
    try {
      this.canvas.setPointerCapture(e.pointerId);
    } catch {
      /* capture is best-effort */
    }
    this.pressed = true;
    this.hovered = true;
    this.sim.startDrag(p);
    this.options.onDragChange?.(true);
    this.updateCursor();
    this.requestFrame();
  };

  private onPointerMove = (e: PointerEvent) => {
    const p = this.localPoint(e);
    if (this.pointerId === e.pointerId) {
      if (this.pressed && Math.hypot(e.movementX, e.movementY) > 0.5) this.pressed = false;
      this.sim.moveDrag(p);
      this.requestFrame();
    } else if (this.options.selfHover && !this.paused) {
      this.setHover(this.isOverCharm(p));
    }
  };

  private onPointerUp = (e: PointerEvent) => {
    if (this.pointerId !== e.pointerId) return;
    this.endDrag();
    if (this.options.selfHover) this.setHover(this.isOverCharm(this.localPoint(e)));
  };

  private onPointerLeave = () => {
    if (this.pointerId === null && this.options.selfHover) this.setHover(false);
  };

  private endDrag() {
    if (this.pointerId === null) return;
    try {
      this.canvas.releasePointerCapture(this.pointerId);
    } catch {
      /* already released */
    }
    this.pointerId = null;
    this.pressed = false;
    this.sim.endDrag();
    this.options.onDragChange?.(false);
    this.updateCursor();
    this.requestFrame();
  }
}
