import { describe, expect, it } from "vitest";
import { isSoundMaterial } from "../audio/sounds";
import { BUILTIN_CHARMS, BUILTIN_COLLECTIONS } from "./builtin";
import { soundFor } from "./types";

describe("built-in charms", () => {
  it("loads every charm with art, a known collection, and a sound", () => {
    expect(BUILTIN_CHARMS.length).toBe(73);
    const collectionIds = new Set(BUILTIN_COLLECTIONS.map((c) => c.id));
    for (const charm of BUILTIN_CHARMS) {
      expect(charm.image, charm.id).toBeTruthy();
      expect(collectionIds.has(charm.collection ?? ""), charm.id).toBe(true);
      expect(isSoundMaterial(charm.sound), charm.id).toBe(true);
      expect(isSoundMaterial(soundFor(charm))).toBe(true);
    }
  });

  it("gives every collection at least five charms", () => {
    for (const col of BUILTIN_COLLECTIONS) {
      expect(BUILTIN_CHARMS.filter((c) => c.collection === col.id).length, col.id).toBeGreaterThanOrEqual(5);
    }
  });
});
