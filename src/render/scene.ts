import type { RopeStyle } from "../charms/types";
import type { CharmSimulation } from "../physics/simulation";
import { drawAnchor, drawJumpRing, drawRope } from "./rope";
import type { Sprite } from "./sprite";

export interface SceneState {
  sim: CharmSimulation;
  sprite: Sprite | null;
  rope: RopeStyle;
  /** Visual size multiplier for rope details (1 = medium). */
  detailScale: number;
  /** Animated charm scale for hover, press, and swap transitions. */
  charmScale: number;
  opacity: number;
  debug?: string[];
}

export const RING_RADIUS = 4;

/** Where the charm's centre sits relative to the string tip, in the charm's rotated frame. */
export function charmCenterOffset(sprite: Sprite, detailScale: number, scale: number) {
  const ring = RING_RADIUS * detailScale * 2 - 1;
  return {
    x: (sprite.width / 2 - sprite.attach.x) * scale,
    y: ring + (sprite.height / 2 - sprite.attach.y) * scale,
  };
}

export function hitCircle(state: SceneState) {
  const { sim, sprite } = state;
  if (!sprite) return null;
  const off = charmCenterOffset(sprite, state.detailScale, state.charmScale);
  const cos = Math.cos(sim.angle);
  const sin = Math.sin(sim.angle);
  const tip = sim.tip;
  return {
    x: tip.x + off.x * cos - off.y * sin,
    y: tip.y + off.x * sin + off.y * cos,
    r: (Math.max(sprite.width, sprite.height) / 2) * 0.82 * state.charmScale,
  };
}

export function drawScene(ctx: CanvasRenderingContext2D, width: number, height: number, state: SceneState) {
  const { sim, sprite } = state;
  ctx.clearRect(0, 0, width, height);
  ctx.globalAlpha = state.opacity;

  drawRope(ctx, sim.x, sim.y, sim.segments + 1, state.rope, state.detailScale);
  drawAnchor(ctx, sim.x[0], sim.y[0], state.rope, state.detailScale);

  const tip = sim.tip;
  const ringR = RING_RADIUS * state.detailScale;
  if (sprite) {
    const s = state.charmScale;
    const w = (sprite.width + sprite.pad * 2) * s;
    const h = (sprite.height + sprite.pad * 2) * s;
    const ox = -(sprite.attach.x + sprite.pad) * s;
    const oy = ringR * 2 - 1 - (sprite.attach.y + sprite.pad) * s;

    ctx.save();
    ctx.translate(tip.x, tip.y + 5 * state.detailScale);
    ctx.rotate(sim.angle);
    ctx.drawImage(sprite.shadow, ox, oy, w, h);
    ctx.restore();

    ctx.save();
    ctx.translate(tip.x, tip.y);
    ctx.rotate(sim.angle);
    ctx.drawImage(sprite.art, ox, oy, w, h);
    drawJumpRing(ctx, ringR, state.detailScale);
    ctx.restore();
  }
  ctx.globalAlpha = 1;

  if (state.debug) {
    ctx.save();
    ctx.font = "11px ui-monospace, SFMono-Regular, Menlo, monospace";
    const lineH = 14;
    const boxW = 210;
    ctx.fillStyle = "rgba(20,16,12,0.78)";
    ctx.beginPath();
    ctx.roundRect(8, height - state.debug.length * lineH - 18, boxW, state.debug.length * lineH + 10, 6);
    ctx.fill();
    ctx.fillStyle = "#F5EBDD";
    state.debug.forEach((line, i) => ctx.fillText(line, 16, height - (state.debug!.length - i) * lineH - 4));
    ctx.restore();
  }
}
