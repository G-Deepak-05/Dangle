import type { AnchorOffset } from "../charms/types";

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

export function buildSprite(img: HTMLImageElement, maxSide: number, anchor: AnchorOffset, dpr: number): Sprite {
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
  actx.drawImage(img, pad * dpr, pad * dpr, width * dpr, height * dpr);

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
