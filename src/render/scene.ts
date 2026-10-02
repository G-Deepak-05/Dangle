import type { Beads, Hook, RopeStyle, ThreadColor } from "../charms/types";
import type { CharmSimulation } from "../physics/simulation";
import { drawAnchor, drawBeads, drawJumpRing, drawRope } from "./rope";
import type { Sprite } from "./sprite";

export interface DebugInfo {
  state: "paused" | "reeling" | "dragging" | "sleeping" | "swinging";
  fps: number | null;
  rows: [string, string][];
}

export interface SceneState {
  sim: CharmSimulation;
  sprite: Sprite | null;
  rope: RopeStyle;
  color: ThreadColor;
  beads: Beads;
  hook: Hook;
  shadow: boolean;
  /** Visual size multiplier for rope details (1 = medium). */
  detailScale: number;
  /** Animated charm scale for hover, press, and swap transitions. */
  charmScale: number;
  opacity: number;
  debug?: DebugInfo;
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

  drawRope(ctx, sim.x, sim.y, sim.segments + 1, state.rope, state.color, state.detailScale);
  drawBeads(ctx, sim.x, sim.y, sim.segments + 1, state.beads, state.detailScale);
  drawAnchor(ctx, sim.x[0], sim.y[0], state.rope, state.color, state.detailScale, state.hook);

  const tip = sim.tip;
  const ringR = RING_RADIUS * state.detailScale;
  if (sprite) {
    const s = state.charmScale;
    const w = (sprite.width + sprite.pad * 2) * s;
    const h = (sprite.height + sprite.pad * 2) * s;
    const ox = -(sprite.attach.x + sprite.pad) * s;
    const oy = ringR * 2 - 1 - (sprite.attach.y + sprite.pad) * s;

    if (state.shadow) {
      ctx.save();
      ctx.translate(tip.x, tip.y + 5 * state.detailScale);
      ctx.rotate(sim.angle);
      ctx.drawImage(sprite.shadow, ox, oy, w, h);
      ctx.restore();
    }

    ctx.save();
    ctx.translate(tip.x, tip.y);
    ctx.rotate(sim.angle);
    ctx.drawImage(sprite.art, ox, oy, w, h);
    drawJumpRing(ctx, ringR, state.detailScale);
    ctx.restore();
  }
  ctx.globalAlpha = 1;

  if (state.debug) drawDebugCard(ctx, width, sim.x[0], state.debug);
}

const STATE_COLORS: Record<DebugInfo["state"], string> = {
  swinging: "#7BC47F",
  dragging: "#E0654C",
  reeling: "#E6B450",
  sleeping: "#8C8173",
  paused: "#8C8173",
};

/** A small frosted card that sits beside the string's anchor, clear of the swing. */
function drawDebugCard(ctx: CanvasRenderingContext2D, width: number, anchorX: number, info: DebugInfo) {
  const w = 176;
  const rowH = 17;
  const headH = 30;
  const h = headH + (info.rows.length + 1) * rowH + 10;
  const gap = 22;
  const x = anchorX + gap + w <= width - 8 ? anchorX + gap : Math.max(8, anchorX - gap - w);
  const y = 10;
  const ui = "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif";
  const mono = "ui-monospace, 'SF Mono', Menlo, monospace";

  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.25)";
  ctx.shadowBlur = 16;
  ctx.shadowOffsetY = 4;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 12);
  ctx.fillStyle = "rgba(24,21,17,0.86)";
  ctx.fill();
  ctx.shadowColor = "transparent";
  ctx.strokeStyle = "rgba(255,240,220,0.12)";
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.textBaseline = "middle";
  ctx.font = `600 10px ${ui}`;
  ctx.fillStyle = "rgba(243,236,226,0.55)";
  ctx.fillText("PHYSICS", x + 12, y + 16);

  ctx.font = `500 10.5px ${ui}`;
  const label = info.state[0].toUpperCase() + info.state.slice(1);
  const pillW = ctx.measureText(label).width + 22;
  const px = x + w - 10 - pillW;
  ctx.beginPath();
  ctx.roundRect(px, y + 8, pillW, 16, 8);
  ctx.fillStyle = "rgba(255,240,220,0.08)";
  ctx.fill();
  ctx.beginPath();
  ctx.arc(px + 8, y + 16, 3, 0, Math.PI * 2);
  ctx.fillStyle = STATE_COLORS[info.state];
  ctx.fill();
  ctx.fillStyle = "#F3ECE2";
  ctx.fillText(label, px + 15, y + 16.5);

  ctx.fillStyle = "rgba(255,240,220,0.08)";
  ctx.fillRect(x + 12, y + headH - 1, w - 24, 1);

  const rows: [string, string][] = [["Frame rate", info.fps === null ? "idle" : `${info.fps} fps`], ...info.rows];
  rows.forEach(([k, v], i) => {
    const ry = y + headH + 8 + i * rowH;
    ctx.font = `11px ${ui}`;
    ctx.fillStyle = "rgba(243,236,226,0.5)";
    ctx.fillText(k, x + 12, ry);
    ctx.font = `11px ${mono}`;
    ctx.fillStyle = "#F3ECE2";
    ctx.fillText(v, x + w - 12 - ctx.measureText(v).width, ry);
  });
  ctx.restore();
}
