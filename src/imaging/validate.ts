export type ImageKind = "png" | "jpeg" | "webp";

export const MAX_FILE_BYTES = 15 * 1024 * 1024;
export const MIN_DIMENSION = 32;
export const MAX_DIMENSION = 8000;

const MIME: Record<ImageKind, string> = {
  png: "image/png",
  jpeg: "image/jpeg",
  webp: "image/webp",
};

export function mimeFor(kind: ImageKind): string {
  return MIME[kind];
}

/** Identifies the format from magic bytes; the file name and reported MIME type are not trusted. */
export function sniffImageType(bytes: Uint8Array): ImageKind | null {
  const at = (i: number, ...vals: number[]) => vals.every((v, k) => bytes[i + k] === v);
  if (bytes.length >= 8 && at(0, 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) return "png";
  if (bytes.length >= 3 && at(0, 0xff, 0xd8, 0xff)) return "jpeg";
  if (bytes.length >= 12 && at(0, 0x52, 0x49, 0x46, 0x46) && at(8, 0x57, 0x45, 0x42, 0x50)) return "webp";
  return null;
}

export function validateFileSize(size: number): string | null {
  if (size === 0) return "That file is empty.";
  if (size > MAX_FILE_BYTES) return "That image is over 15 MB. Try a smaller one.";
  return null;
}

export function validateDimensions(width: number, height: number): string | null {
  if (width < MIN_DIMENSION || height < MIN_DIMENSION) {
    return `That image is too small. Use one at least ${MIN_DIMENSION}px on each side.`;
  }
  if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
    return `That image is too large. Keep it under ${MAX_DIMENSION}px on each side.`;
  }
  return null;
}

export const UNSUPPORTED_MESSAGE = "Dangle can use PNG, WebP, or JPEG images.";
