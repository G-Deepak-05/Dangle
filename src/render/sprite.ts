import type { AnchorOffset, Finish } from "../charms/types";

/**
 * Charm artwork pre-rasterised at device resolution, plus a blurred silhouette for the
 * shadow. Building these once per charm/size keeps per-frame drawing to two blits.
 */
export interface Sprite {
  art: HTMLCanvasElement;
  shadow: HTMLCanvasElement;
  /** Artwork box in CSS px. */
  width: number;
  height: number;
  /** Attachment point in CSS px from the artwork's top-left. */
  attach: { x: number; y: number };
  /** Transparent margin around the artwork inside both canvases, CSS px. */
  pad: number;
  dpr: number;
}

const imageCache = new Map<string, Promise<HTMLImageElement>>();

export function loadImage(url: string): Promise<HTMLImageElement> {
  let cached = imageCache.get(url);
  if (!cached) {
    cached = new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.decoding = "async";
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Could not load charm image: ${url.slice(0, 80)}`));
      img.src = url;
    });
    cached.catch(() => imageCache.delete(url));
    imageCache.set(url, cached);
  }
  return cached;
}

export function buildSprite(
  img: HTMLImageElement,
  maxSide: number,
  anchor: AnchorOffset,
  dpr: number,
  finish: Finish = "classic",
  glow: "off" | "soft" | "strong" = "off",
): Sprite {
  const naturalW = img.naturalWidth || img.width || 1;
  const naturalH = img.naturalHeight || img.height || 1;
  const fit = maxSide / Math.max(naturalW, naturalH);
  const width = naturalW * fit;
  const height = naturalH * fit;
  const pad = Math.ceil(maxSide * 0.18);

  const makeCanvas = () => {
    const c = document.createElement("canvas");
    c.width = Math.ceil((width + pad * 2) * dpr);
    c.height = Math.ceil((height + pad * 2) * dpr);
    return c;
  };

  const art = makeCanvas();
  const actx = art.getContext("2d")!;
  actx.imageSmoothingQuality = "high";
  const box = [pad * dpr, pad * dpr, width * dpr, height * dpr] as const;

  // A flat-colour copy of the artwork's outline, used for sticker borders and glows.
  const silhouette = (color: string) => {
    const c = makeCanvas();
    const cx = c.getContext("2d")!;
    cx.drawImage(img, ...box);
    cx.globalCompositeOperation = "source-in";
    cx.fillStyle = color;
    cx.fillRect(0, 0, c.width, c.height);
    return c;
  };

  if (finish === "sticker") {
    const white = silhouette("#ffffff");
    const r = Math.max(1.5, maxSide * 0.045) * dpr;
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      actx.drawImage(white, Math.cos(a) * r, Math.sin(a) * r);
    }
  }
  const glowLevel = finish === "glow" && glow === "off" ? "strong" : glow;
  if (glowLevel !== "off") {
    const warm = silhouette("#ffd98a");
    const strong = glowLevel === "strong";
    actx.filter = `blur(${Math.max(3, maxSide * (strong ? 0.08 : 0.055)) * dpr}px)`;
    actx.globalAlpha = strong ? 0.95 : 0.6;
    actx.drawImage(warm, 0, 0);
    if (strong) actx.drawImage(warm, 0, 0);
    actx.filter = "none";
    actx.globalAlpha = 1;
  }

  if (finish === "matte") actx.filter = "saturate(0.78) contrast(0.92) brightness(1.04)";
  actx.drawImage(img, ...box);
  actx.filter = "none";

  if (finish === "glossy") {
    actx.globalCompositeOperation = "source-atop";
    const g = actx.createLinearGradient(box[0], box[1], box[0] + box[2], box[1] + box[3]);
    g.addColorStop(0, "rgba(255,255,255,0.55)");
    g.addColorStop(0.35, "rgba(255,255,255,0.12)");
    g.addColorStop(0.36, "rgba(255,255,255,0)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    actx.fillStyle = g;
    actx.fillRect(0, 0, art.width, art.height);
    actx.globalCompositeOperation = "source-over";
  }

  const shadow = makeCanvas();
  const sctx = shadow.getContext("2d")!;
  sctx.filter = `blur(${Math.max(2, maxSide * 0.06) * dpr}px)`;
  sctx.globalAlpha = 0.28;
  sctx.drawImage(art, 0, 0);
  sctx.filter = "none";
  sctx.globalCompositeOperation = "source-in";
  sctx.fillStyle = "#1a120a";
  sctx.fillRect(0, 0, shadow.width, shadow.height);

  return {
    art,
    shadow,
    width,
    height,
    attach: { x: anchor.x * width, y: anchor.y * height },
    pad,
    dpr,
  };
}
