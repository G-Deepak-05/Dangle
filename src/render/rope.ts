import type { RopeStyle } from "../charms/types";

type Ctx = CanvasRenderingContext2D;

function tracePath(ctx: Ctx, xs: ArrayLike<number>, ys: ArrayLike<number>, count: number) {
  ctx.beginPath();
  ctx.moveTo(xs[0], ys[0]);
  for (let i = 1; i < count - 1; i++) {
    const mx = (xs[i] + xs[i + 1]) / 2;
    const my = (ys[i] + ys[i + 1]) / 2;
    ctx.quadraticCurveTo(xs[i], ys[i], mx, my);
  }
  ctx.lineTo(xs[count - 1], ys[count - 1]);
}

/** Resamples the string at even spacing so chain links sit evenly along it. */
function resample(xs: ArrayLike<number>, ys: ArrayLike<number>, count: number, spacing: number) {
  const out: { x: number; y: number; a: number }[] = [];
  let carry = 0;
  for (let i = 0; i < count - 1; i++) {
    const dx = xs[i + 1] - xs[i];
    const dy = ys[i + 1] - ys[i];
    const len = Math.hypot(dx, dy);
    if (len === 0) continue;
    const a = Math.atan2(dy, dx);
    let t = carry;
    while (t < len) {
      out.push({ x: xs[i] + (dx * t) / len, y: ys[i] + (dy * t) / len, a });
      t += spacing;
    }
    carry = t - len;
  }
  return out;
}

export function drawRope(
  ctx: Ctx,
  xs: ArrayLike<number>,
  ys: ArrayLike<number>,
  count: number,
  style: RopeStyle,
  scale: number,
) {
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  switch (style) {
    case "minimal": {
      tracePath(ctx, xs, ys, count);
      ctx.strokeStyle = "rgba(255,255,255,0.45)";
      ctx.lineWidth = 2.6 * scale;
      ctx.stroke();
      ctx.strokeStyle = "rgba(34,28,24,0.9)";
      ctx.lineWidth = 1.1 * scale;
      ctx.stroke();
      break;
    }
    case "thread": {
      tracePath(ctx, xs, ys, count);
      ctx.strokeStyle = "rgba(60,16,10,0.35)";
      ctx.lineWidth = 3 * scale;
      ctx.stroke();
      ctx.strokeStyle = "#C8412B";
      ctx.lineWidth = 1.8 * scale;
      ctx.stroke();
      break;
    }
    case "cord": {
      tracePath(ctx, xs, ys, count);
      ctx.strokeStyle = "rgba(20,14,10,0.55)";
      ctx.lineWidth = 4.8 * scale;
      ctx.stroke();
      ctx.strokeStyle = "#5B4638";
      ctx.lineWidth = 3.4 * scale;
      ctx.stroke();
      ctx.setLineDash([2.4 * scale, 2.6 * scale]);
      ctx.strokeStyle = "#B99D84";
      ctx.lineWidth = 1.6 * scale;
      ctx.stroke();
      ctx.setLineDash([]);
      break;
    }
    case "chain": {
      const spacing = 5.6 * scale;
      const links = resample(xs, ys, count, spacing);
      links.forEach((l, i) => {
        ctx.save();
        ctx.translate(l.x, l.y);
        ctx.rotate(l.a);
        if (i % 2 === 0) {
          ctx.beginPath();
          ctx.ellipse(spacing / 2, 0, spacing * 0.62, 2.1 * scale, 0, 0, Math.PI * 2);
          ctx.strokeStyle = "rgba(40,28,10,0.6)";
          ctx.lineWidth = 2.6 * scale;
          ctx.stroke();
          ctx.strokeStyle = "#D8B25C";
          ctx.lineWidth = 1.3 * scale;
          ctx.stroke();
        } else {
          ctx.beginPath();
          ctx.moveTo(spacing * 0.05, 0);
          ctx.lineTo(spacing * 0.95, 0);
          ctx.strokeStyle = "rgba(40,28,10,0.6)";
          ctx.lineWidth = 2.8 * scale;
          ctx.stroke();
          ctx.strokeStyle = "#F0D38A";
          ctx.lineWidth = 1.4 * scale;
          ctx.stroke();
        }
        ctx.restore();
      });
      break;
    }
  }
  ctx.restore();
}

/** The small clip that holds the string at the top edge of the screen. */
export function drawAnchor(ctx: Ctx, x: number, y: number, style: RopeStyle, scale: number) {
  ctx.save();
  if (style === "minimal") {
    ctx.beginPath();
    ctx.arc(x, y + 1.5 * scale, 2 * scale, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(34,28,24,0.9)";
    ctx.fill();
  } else {
    const w = 9 * scale;
    const h = 5 * scale;
    ctx.beginPath();
    ctx.roundRect(x - w / 2, y - 1, w, h + 1, [0, 0, 2.5 * scale, 2.5 * scale]);
    ctx.fillStyle = style === "chain" ? "#C9A04D" : "#2B2320";
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.fillRect(x - w / 2 + 1.5 * scale, y + 0.5, w - 3 * scale, 1 * scale);
  }
  ctx.restore();
}

/** The metal jump ring linking string and charm. Drawn in the charm's rotated frame. */
export function drawJumpRing(ctx: Ctx, radius: number, scale: number) {
  ctx.beginPath();
  ctx.arc(0, radius, radius, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(40,28,10,0.55)";
  ctx.lineWidth = 2.8 * scale;
  ctx.stroke();
  ctx.strokeStyle = "#D8B25C";
  ctx.lineWidth = 1.5 * scale;
  ctx.stroke();
}
