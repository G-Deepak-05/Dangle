import { describe, expect, it } from "vitest";
import { detectBackground, hasTransparency, opaqueBounds, removeBackground, suggestAnchor } from "./pixels";
import { sniffImageType, validateDimensions, validateFileSize } from "./validate";
import { parseManifest } from "../charms/manifest";

function image(w: number, h: number, fill: [number, number, number, number]) {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < w * h; i++) data.set(fill, i * 4);
  return data;
}

function paintRect(data: Uint8ClampedArray, w: number, x0: number, y0: number, x1: number, y1: number, c: number[]) {
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) data.set(c, (y * w + x) * 4);
}

describe("sniffImageType", () => {
  it("recognises formats by magic bytes, not names", () => {
    expect(sniffImageType(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe("png");
    expect(sniffImageType(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe("jpeg");
    expect(sniffImageType(new TextEncoder().encode("RIFF1234WEBPVP8 "))).toBe("webp");
    expect(sniffImageType(new TextEncoder().encode("GIF89a"))).toBeNull();
    expect(sniffImageType(new TextEncoder().encode("<svg onload=alert(1)>"))).toBeNull();
    expect(sniffImageType(new Uint8Array())).toBeNull();
  });
});

describe("validation", () => {
  it("rejects empty, oversized, tiny and huge images", () => {
    expect(validateFileSize(0)).not.toBeNull();
    expect(validateFileSize(16 * 1024 * 1024)).not.toBeNull();
    expect(validateFileSize(2048)).toBeNull();
    expect(validateDimensions(10, 200)).not.toBeNull();
    expect(validateDimensions(9000, 200)).not.toBeNull();
    expect(validateDimensions(512, 512)).toBeNull();
  });
});

describe("background removal", () => {
  it("clears a flat backdrop and keeps the subject", () => {
    const w = 40,
      h = 40;
    const data = image(w, h, [250, 250, 250, 255]);
    paintRect(data, w, 10, 12, 30, 34, [200, 40, 40, 255]);
    expect(hasTransparency(data)).toBe(false);
    const bg = detectBackground(data, w, h);
    expect(bg.uniform).toBe(true);
    removeBackground(data, w, h, bg.color);
    expect(data[3]).toBe(0);
    expect(data[(20 * w + 20) * 4 + 3]).toBe(255);
    expect(opaqueBounds(data, w, h, 0)).toEqual({ x: 10, y: 12, width: 20, height: 22 });
    const anchor = suggestAnchor(data, w, h);
    expect(anchor.y).toBeGreaterThan(0.25);
    expect(anchor.y).toBeLessThan(0.4);
  });

  it("does not flag busy photos as removable", () => {
    const w = 20,
      h = 20;
    const data = image(w, h, [0, 0, 0, 255]);
    for (let i = 0; i < w * h; i++) data.set([(i * 37) % 255, (i * 91) % 255, (i * 13) % 255, 255], i * 4);
    expect(detectBackground(data, w, h).uniform).toBe(false);
  });

  it("returns null bounds for a fully transparent image", () => {
    expect(opaqueBounds(image(8, 8, [0, 0, 0, 0]), 8, 8)).toBeNull();
  });
});

describe("parseManifest", () => {
  it("accepts a good manifest and clamps values", () => {
    const c = parseManifest(
      { id: "moon", name: "Moon", category: "space", tags: ["cute", "bogus"], ropeStyle: "chain", defaultScale: 9, anchorOffset: { x: 2, y: -1 } },
      "/moon.svg",
    );
    expect(c?.tags).toEqual(["cute"]);
    expect(c?.defaultScale).toBe(1.6);
    expect(c?.anchorOffset).toEqual({ x: 1, y: 0 });
  });

  it("rejects missing ids, bad ids and missing images", () => {
    expect(parseManifest({ name: "x" }, "/a.svg")).toBeNull();
    expect(parseManifest({ id: "../x", name: "x" }, "/a.svg")).toBeNull();
    expect(parseManifest({ id: "ok", name: "x" }, undefined)).toBeNull();
  });
});
