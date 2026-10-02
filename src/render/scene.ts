import type { Beads, Hook, RopeStyle, ThreadColor } from "../charms/types";
import type { Rig } from "../physics/rig";
import { drawAnchor, drawBeads, drawJumpRing, drawRope } from "./rope";
import type { Sprite } from "./sprite";

export interface DebugInfo {
  state: "paused" | "reeling" | "dragging" | "sleeping" | "swinging";
  fps: number | null;
  rows: [string, string][];
}

export interface SceneState {
  rig: Rig;
  /** One sprite per charm, top to bottom; null while loading. */
  sprites: (Sprite | null)[];
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

export interface HitCircle {
  x: number;
  y: number;
  r: number;
}

export const RING_RADIUS = 4;

/** Where the charm's centre sits relative to its hang point, in the charm's rotated frame. */
export function charmCenterOffset(sprite: Sprite, detailScale: number, scale: number) {
  const ring = RING_RADIUS * detailScale * 2 - 1;
  return {
    x: (sprite.width / 2 - sprite.attach.x) * scale,
    y: ring + (sprite.height / 2 - sprite.attach.y) * scale,
  };
}

/** Distance from a charm's hang point to the bottom edge, where a stacked charm hangs on. */
export function charmBodyLength(sprite: Sprite, detailScale: number, scale: number) {
  return RING_RADIUS * detailScale * 2 - 1 + (sprite.height - sprite.attach.y) * scale * 0.96;
}

export function hitCircles(state: SceneState): (HitCircle | null)[] {
  const poses = state.rig.poses();
  return poses.map((pose, i) => {
    const sprite = state.sprites[i];
    if (!sprite) return null;
    const off = charmCenterOffset(sprite, state.detailScale, state.charmScale);
    const cos = Math.cos(pose.angle);
    const sin = Math.sin(pose.angle);
    return {
      x: pose.x + off.x * cos - off.y * sin,
      y: pose.y + off.x * sin + off.y * cos,
      r: (Math.max(sprite.width, sprite.height) / 2) * 0.82 * state.charmScale,
    };
  });
}

export function drawScene(ctx: CanvasRenderingContext2D, width: number, height: number, state: SceneState) {
  const { rig } = state;
  ctx.clearRect(0, 0, width, height);
  ctx.globalAlpha = state.opacity;

  const ropes = rig.ropes();
  ropes.forEach((piece, i) => {
    drawRope(ctx, piece.xs, piece.ys, piece.xs.length, state.rope, state.color, state.detailScale);
    if (i === 0) drawBeads(ctx, piece.xs, piece.ys, piece.xs.length, state.beads, state.detailScale);
  });
  drawAnchor(ctx, ropes[0].xs[0], ropes[0].ys[0], state.rope, state.color, state.detailScale, state.hook);

  const ringR = RING_RADIUS * state.detailScale;
  const poses = rig.poses();
  const s = state.charmScale;
  poses.forEach((pose, i) => {
    const sprite = state.sprites[i];
    if (!sprite) return;
    const w = (sprite.width + sprite.pad * 2) * s;
    const h = (sprite.height + sprite.pad * 2) * s;
    const ox = -(sprite.attach.x + sprite.pad) * s;
    const oy = ringR * 2 - 1 - (sprite.attach.y + sprite.pad) * s;

    if (state.shadow) {
      ctx.save();
      ctx.translate(pose.x, pose.y + 5 * state.detailScale);
      ctx.rotate(pose.angle);
      ctx.drawImage(sprite.shadow, ox, oy, w, h);
      ctx.restore();
    }

    ctx.save();
    ctx.translate(pose.x, pose.y);
    ctx.rotate(pose.angle);
    ctx.drawImage(sprite.art, ox, oy, w, h);
    drawJumpRing(ctx, ringR, state.detailScale);
    if (i < poses.length - 1) {
      // A small ring at the bottom edge holds the next charm's string.
      ctx.translate(0, charmBodyLength(sprite, state.detailScale, s) - ringR);
      drawJumpRing(ctx, ringR * 0.8, state.detailScale);
    }
    ctx.restore();
  });
  ctx.globalAlpha = 1;

  if (state.debug) drawDebugCard(ctx, width, ropes[0].xs[0], state.debug);
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
