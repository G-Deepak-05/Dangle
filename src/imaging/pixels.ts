/** Pure RGBA pixel operations used by the custom charm pipeline. */

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function hasTransparency(data: Uint8ClampedArray): boolean {
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] < 250) return true;
  }
  return false;
}

function colorDistance(data: Uint8ClampedArray, i: number, r: number, g: number, b: number): number {
  const dr = data[i] - r;
  const dg = data[i + 1] - g;
  const db = data[i + 2] - b;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

/** Average border colour, and whether the border is uniform enough to be a background. */
export function detectBackground(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  tolerance = 40,
): { color: [number, number, number]; uniform: boolean } {
  const border: number[] = [];
  for (let x = 0; x < width; x++) border.push(x, (height - 1) * width + x);
  for (let y = 1; y < height - 1; y++) border.push(y * width, y * width + width - 1);

  let r = 0,
    g = 0,
    b = 0;
  for (const p of border) {
    r += data[p * 4];
    g += data[p * 4 + 1];
    b += data[p * 4 + 2];
  }
  const n = border.length;
  const color: [number, number, number] = [r / n, g / n, b / n];
  const close = border.filter((p) => colorDistance(data, p * 4, ...color) <= tolerance).length;
  return { color, uniform: close / n >= 0.85 };
}

/**
 * Flood-fills from the image border, clearing pixels close to the background colour,
 * then feathers the new edge so the cut-out doesn't look jagged.
 */
export function removeBackground(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  color: [number, number, number],
  tolerance = 42,
): void {
  const visited = new Uint8Array(width * height);
  const stack: number[] = [];
  const pushIfBg = (p: number) => {
    if (visited[p]) return;
    visited[p] = 1;
    if (colorDistance(data, p * 4, ...color) <= tolerance) stack.push(p);
  };
  for (let x = 0; x < width; x++) {
    pushIfBg(x);
    pushIfBg((height - 1) * width + x);
  }
  for (let y = 0; y < height; y++) {
    pushIfBg(y * width);
    pushIfBg(y * width + width - 1);
  }
  const cleared = new Uint8Array(width * height);
  while (stack.length) {
    const p = stack.pop()!;
    cleared[p] = 1;
    data[p * 4 + 3] = 0;
    const x = p % width;
    const y = (p - x) / width;
    if (x > 0) pushIfBg(p - 1);
    if (x < width - 1) pushIfBg(p + 1);
    if (y > 0) pushIfBg(p - width);
    if (y < height - 1) pushIfBg(p + width);
  }
  const feather = tolerance * 1.8;
  for (let p = 0; p < width * height; p++) {
    if (cleared[p]) continue;
    const x = p % width;
    const y = (p - x) / width;
    const touchesCleared =
      (x > 0 && cleared[p - 1]) ||
      (x < width - 1 && cleared[p + 1]) ||
      (y > 0 && cleared[p - width]) ||
      (y < height - 1 && cleared[p + width]);
    if (!touchesCleared) continue;
    const d = colorDistance(data, p * 4, ...color);
    if (d < feather) {
      data[p * 4 + 3] = Math.round(data[p * 4 + 3] * Math.max(0.25, (d - tolerance) / (feather - tolerance)));
    }
  }
}

/** Bounding box of visible pixels, padded, or null when the image is fully transparent. */
export function opaqueBounds(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  padding = 4,
): Rect | null {
  let minX = width,
    minY = height,
    maxX = -1,
    maxY = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] > 8) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return null;
  minX = Math.max(0, minX - padding);
  minY = Math.max(0, minY - padding);
  maxX = Math.min(width - 1, maxX + padding);
  maxY = Math.min(height - 1, maxY + padding);
  return { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
}

/** Finds the topmost visible pixel column near the horizontal centre, as a default hang point. */
export function suggestAnchor(data: Uint8ClampedArray, width: number, height: number): { x: number; y: number } {
  const cx = Math.floor(width / 2);
  const span = Math.max(1, Math.floor(width * 0.15));
  for (let y = 0; y < height; y++) {
    for (let dx = 0; dx <= span; dx++) {
      for (const x of [cx - dx, cx + dx]) {
        if (x >= 0 && x < width && data[(y * width + x) * 4 + 3] > 60) {
          return { x: x / width, y: Math.min(0.5, (y + 2) / height) };
        }
      }
    }
  }
  return { x: 0.5, y: 0.05 };
}
