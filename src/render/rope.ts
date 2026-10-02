import type { Beads, Hook, RopeStyle, ThreadColor } from "../charms/types";

type Ctx = CanvasRenderingContext2D;

interface Palette {
  main: string;
  light: string;
}

const CLASSIC: Record<RopeStyle, Palette> = {
  minimal: { main: "rgba(34,28,24,0.9)", light: "rgba(255,255,255,0.45)" },
  thread: { main: "#C8412B", light: "#E88A74" },
  cord: { main: "#5B4638", light: "#B99D84" },
  chain: { main: "#D8B25C", light: "#F0D38A" },
};

const COLORS: Record<Exclude<ThreadColor, "classic">, Palette> = {
  ink: { main: "#2B2320", light: "#6B625A" },
  cream: { main: "#EFE2C8", light: "#FFFAF0" },
  rose: { main: "#E27A8C", light: "#F7B8C2" },
  sky: { main: "#6FA8D6", light: "#BFDDF2" },
  sage: { main: "#7FA37A", light: "#C2D8BC" },
  gold: { main: "#D8B25C", light: "#F0D38A" },
  silver: { main: "#B8BFC8", light: "#EEF1F5" },
};

export function paletteFor(style: RopeStyle, color: ThreadColor): Palette {
  return color === "classic" ? CLASSIC[style] : COLORS[color];
}

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

interface PathPoint {
  x: number;
  y: number;
  a: number;
}

/** Resamples the string at even spacing so links and beads sit evenly along it. */
function resample(xs: ArrayLike<number>, ys: ArrayLike<number>, count: number, spacing: number): PathPoint[] {
  const out: PathPoint[] = [];
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
  color: ThreadColor,
  scale: number,
) {
  const pal = paletteFor(style, color);
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  switch (style) {
    case "minimal": {
      tracePath(ctx, xs, ys, count);
      ctx.strokeStyle = color === "classic" ? pal.light : "rgba(20,14,10,0.35)";
      ctx.lineWidth = 2.6 * scale;
      ctx.stroke();
      ctx.strokeStyle = pal.main;
      ctx.lineWidth = 1.1 * scale;
      ctx.stroke();
      break;
    }
    case "thread": {
      tracePath(ctx, xs, ys, count);
      ctx.strokeStyle = "rgba(40,16,10,0.35)";
      ctx.lineWidth = 3 * scale;
      ctx.stroke();
      ctx.strokeStyle = pal.main;
      ctx.lineWidth = 1.8 * scale;
      ctx.stroke();
      break;
    }
    case "cord": {
      tracePath(ctx, xs, ys, count);
      ctx.strokeStyle = "rgba(20,14,10,0.55)";
      ctx.lineWidth = 4.8 * scale;
      ctx.stroke();
      ctx.strokeStyle = pal.main;
      ctx.lineWidth = 3.4 * scale;
      ctx.stroke();
      ctx.setLineDash([2.4 * scale, 2.6 * scale]);
      ctx.strokeStyle = pal.light;
      ctx.lineWidth = 1.6 * scale;
      ctx.stroke();
      ctx.setLineDash([]);
      break;
    }
    case "chain": {
      const spacing = 5.6 * scale;
      resample(xs, ys, count, spacing).forEach((l, i) => {
        ctx.save();
        ctx.translate(l.x, l.y);
        ctx.rotate(l.a);
        ctx.beginPath();
        if (i % 2 === 0) {
          ctx.ellipse(spacing / 2, 0, spacing * 0.62, 2.1 * scale, 0, 0, Math.PI * 2);
        } else {
          ctx.moveTo(spacing * 0.05, 0);
          ctx.lineTo(spacing * 0.95, 0);
        }
        ctx.strokeStyle = "rgba(40,28,10,0.6)";
        ctx.lineWidth = (i % 2 === 0 ? 2.6 : 2.8) * scale;
        ctx.stroke();
        ctx.strokeStyle = i % 2 === 0 ? pal.main : pal.light;
        ctx.lineWidth = (i % 2 === 0 ? 1.3 : 1.4) * scale;
        ctx.stroke();
        ctx.restore();
      });
      break;
    }
  }
  ctx.restore();
}

const GLASS = ["#8EC5E8", "#F2A7B5", "#A9D39E"];

function star(ctx: Ctx, r: number) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 === 0 ? r : r * 0.45;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    ctx.lineTo(Math.cos(a) * rad, Math.sin(a) * rad);
  }
  ctx.closePath();
}

/** Beads threaded near the charm end of the string. */
export function drawBeads(
  ctx: Ctx,
  xs: ArrayLike<number>,
  ys: ArrayLike<number>,
  count: number,
  beads: Beads,
  scale: number,
) {
  if (beads === "none") return;
  const spacing = (beads === "star" ? 11 : 8.5) * scale;
  const path = resample(xs, ys, count, spacing);
  const total = beads === "star" ? 2 : 3;
  // Skip the last couple of samples so beads sit just above the jump ring.
  const picks = path.slice(Math.max(0, path.length - 2 - total), path.length - 2);
  ctx.save();
  picks.forEach((p, i) => {
    ctx.save();
    ctx.translate(p.x, p.y);
    const r = 3.4 * scale;
    switch (beads) {
      case "pearl": {
        const g = ctx.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.2, 0, 0, r);
        g.addColorStop(0, "#FFFFFF");
        g.addColorStop(0.6, "#F1ECE3");
        g.addColorStop(1, "#C9C0B2");
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fillStyle = g;
        ctx.fill();
        ctx.strokeStyle = "rgba(60,48,36,0.35)";
        ctx.lineWidth = 0.8 * scale;
        ctx.stroke();
        break;
      }
      case "wood": {
        ctx.rotate(p.a);
        ctx.beginPath();
        ctx.ellipse(0, 0, r * 1.15, r, 0, 0, Math.PI * 2);
        ctx.fillStyle = i % 2 ? "#A46E45" : "#8A5A3B";
        ctx.fill();
        ctx.strokeStyle = "rgba(43,35,32,0.8)";
        ctx.lineWidth = 1 * scale;
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-r * 0.5, -r * 0.55);
        ctx.lineTo(r * 0.3, -r * 0.55);
        ctx.strokeStyle = "rgba(255,230,200,0.35)";
        ctx.stroke();
        break;
      }
      case "glass": {
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.globalAlpha = 0.85;
        ctx.fillStyle = GLASS[i % GLASS.length];
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.strokeStyle = "rgba(43,35,32,0.55)";
        ctx.lineWidth = 0.9 * scale;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(-r * 0.35, -r * 0.35, r * 0.32, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255,255,255,0.8)";
        ctx.fill();
        break;
      }
      case "star": {
        ctx.rotate(p.a + Math.PI / 2);
        star(ctx, r * 1.5);
        ctx.fillStyle = "#F6D365";
        ctx.fill();
        ctx.strokeStyle = "#2B2320";
        ctx.lineWidth = 1 * scale;
        ctx.lineJoin = "round";
        ctx.stroke();
        break;
      }
    }
    ctx.restore();
  });
  ctx.restore();
}

/** What holds the string at the top edge of the screen. */
export function drawAnchor(
  ctx: Ctx,
  x: number,
  y: number,
  style: RopeStyle,
  color: ThreadColor,
  scale: number,
  hook: Hook = "clip",
) {
  const pal = paletteFor(style, color);
  ctx.save();
  switch (hook) {
    case "none":
      break;
    case "clip": {
      if (style === "minimal") {
        ctx.beginPath();
        ctx.arc(x, y + 1.5 * scale, 2 * scale, 0, Math.PI * 2);
        ctx.fillStyle = pal.main;
        ctx.fill();
        break;
      }
      const w = 9 * scale;
      const h = 5 * scale;
      ctx.beginPath();
      ctx.roundRect(x - w / 2, y - 1, w, h + 1, [0, 0, 2.5 * scale, 2.5 * scale]);
      ctx.fillStyle = style === "chain" ? "#C9A04D" : "#2B2320";
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      ctx.fillRect(x - w / 2 + 1.5 * scale, y + 0.5, w - 3 * scale, 1 * scale);
      break;
    }
    case "pin": {
      const r = 4.6 * scale;
      const cy = y + r + 0.5;
      const g = ctx.createRadialGradient(x - r * 0.4, cy - r * 0.4, r * 0.15, x, cy, r);
      g.addColorStop(0, "#F7A08F");
      g.addColorStop(1, "#C8412B");
      ctx.beginPath();
      ctx.arc(x, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = g;
      ctx.fill();
      ctx.strokeStyle = "rgba(43,35,32,0.6)";
      ctx.lineWidth = 1 * scale;
      ctx.stroke();
      break;
    }
    case "bow": {
      const s = scale;
      ctx.fillStyle = pal.main;
      ctx.strokeStyle = "rgba(43,35,32,0.55)";
      ctx.lineWidth = 0.9 * s;
      for (const dir of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(x, y + 4 * s);
        ctx.bezierCurveTo(x + dir * 4 * s, y - 2 * s, x + dir * 11 * s, y, x + dir * 9 * s, y + 6 * s);
        ctx.bezierCurveTo(x + dir * 8 * s, y + 9 * s, x + dir * 3 * s, y + 6 * s, x, y + 4 * s);
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x, y + 4.5 * s);
        ctx.lineTo(x + dir * 4 * s, y + 12 * s);
        ctx.lineWidth = 2 * s;
        ctx.strokeStyle = pal.main;
        ctx.stroke();
        ctx.lineWidth = 0.9 * s;
        ctx.strokeStyle = "rgba(43,35,32,0.55)";
      }
      ctx.beginPath();
      ctx.arc(x, y + 4.5 * s, 2.2 * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      break;
    }
    case "suction": {
      const w = 15 * scale;
      const h = 6 * scale;
      ctx.beginPath();
      ctx.moveTo(x - w / 2, y);
      ctx.quadraticCurveTo(x, y + h * 1.8, x + w / 2, y);
      ctx.closePath();
      ctx.fillStyle = "rgba(190,214,230,0.75)";
      ctx.fill();
      ctx.strokeStyle = "rgba(60,80,100,0.55)";
      ctx.lineWidth = 1 * scale;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x, y + h * 0.95, 1.8 * scale, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(80,100,120,0.8)";
      ctx.fill();
      break;
    }
    case "nail": {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, y + 5 * scale);
      ctx.strokeStyle = "#8E959E";
      ctx.lineWidth = 1.6 * scale;
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(x, y + 5.5 * scale, 3.4 * scale, 1.6 * scale, 0, 0, Math.PI * 2);
      ctx.fillStyle = "#B8BFC8";
      ctx.fill();
      ctx.strokeStyle = "rgba(43,35,32,0.6)";
      ctx.lineWidth = 0.8 * scale;
      ctx.stroke();
      break;
    }
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
