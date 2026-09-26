import { detectBackground, hasTransparency, opaqueBounds, removeBackground, suggestAnchor } from "./pixels";
import {
  mimeFor,
  sniffImageType,
  UNSUPPORTED_MESSAGE,
  validateDimensions,
  validateFileSize,
} from "./validate";

const WORKING_SIZE = 512;

export class ImageImportError extends Error {}

export interface SourceImage {
  bitmap: ImageBitmap;
  hasAlpha: boolean;
  /** True when the image has a flat backdrop that can be cut away. */
  backgroundRemovable: boolean;
}

export interface PreparedImage {
  canvas: HTMLCanvasElement;
  dataUrl: string;
  suggestedAnchor: { x: number; y: number };
}

/** Reads and validates an untrusted file entirely in-process. Nothing is uploaded. */
export async function readImageFile(file: File): Promise<SourceImage> {
  const sizeError = validateFileSize(file.size);
  if (sizeError) throw new ImageImportError(sizeError);

  const bytes = new Uint8Array(await file.arrayBuffer());
  const kind = sniffImageType(bytes);
  if (!kind) throw new ImageImportError(UNSUPPORTED_MESSAGE);

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(new Blob([bytes], { type: mimeFor(kind) }));
  } catch {
    throw new ImageImportError("That image couldn't be read. It may be damaged.");
  }
  const dimError = validateDimensions(bitmap.width, bitmap.height);
  if (dimError) {
    bitmap.close();
    throw new ImageImportError(dimError);
  }

  const { data, width, height } = drawScaled(bitmap, 128);
  const hasAlpha = hasTransparency(data);
  const backgroundRemovable = !hasAlpha && detectBackground(data, width, height).uniform;
  return { bitmap, hasAlpha, backgroundRemovable };
}

function drawScaled(bitmap: ImageBitmap, maxSide: number) {
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, 0, 0, width, height);
  return { canvas, ctx, data: ctx.getImageData(0, 0, width, height).data, width, height };
}

/** Downscales, optionally cuts the background, and trims to the visible artwork. */
export function prepareImage(source: SourceImage, cutBackground: boolean): PreparedImage {
  const { canvas, ctx, width, height } = drawScaled(source.bitmap, WORKING_SIZE);
  const image = ctx.getImageData(0, 0, width, height);
  if (cutBackground && source.backgroundRemovable) {
    const bg = detectBackground(image.data, width, height);
    removeBackground(image.data, width, height, bg.color);
    ctx.putImageData(image, 0, 0);
  }
  const bounds = opaqueBounds(image.data, width, height) ?? { x: 0, y: 0, width, height };

  const out = document.createElement("canvas");
  out.width = bounds.width;
  out.height = bounds.height;
  out.getContext("2d")!.drawImage(canvas, bounds.x, bounds.y, bounds.width, bounds.height, 0, 0, bounds.width, bounds.height);
  const trimmed = out.getContext("2d")!.getImageData(0, 0, out.width, out.height).data;

  return {
    canvas: out,
    dataUrl: out.toDataURL("image/png"),
    suggestedAnchor: suggestAnchor(trimmed, out.width, out.height),
  };
}

export function dataUrlToBase64(dataUrl: string): string {
  return dataUrl.slice(dataUrl.indexOf(",") + 1);
}
