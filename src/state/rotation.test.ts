import { describe, expect, it } from "vitest";
import type { Charm } from "../charms/types";
import { pickForBucket, rotationBucket, rotationPool } from "./rotation";
import { DEFAULT_SETTINGS } from "./settings";

const charm = (id: string, collection?: string): Charm => ({
  id,
  name: id,
  category: "cute",
  tags: [],
  collection,
  image: "",
  thumbnail: "",
  defaultScale: 1,
  ropeStyle: "thread",
  anchorOffset: { x: 0.5, y: 0 },
  metadata: { source: "builtin" },
});

const charms = [charm("moon"), charm("star"), charm("wand", "wizard-school"), charm("owl", "wizard-school")];

describe("rotation", () => {
  it("changes bucket hourly or daily and is off when disabled", () => {
    const a = new Date(2026, 9, 2, 10, 15);
    const b = new Date(2026, 9, 2, 11, 5);
    const c = new Date(2026, 9, 3, 10, 15);
    expect(rotationBucket("off", a)).toBeNull();
    expect(rotationBucket("hourly", a)).not.toBe(rotationBucket("hourly", b));
    expect(rotationBucket("daily", a)).toBe(rotationBucket("daily", b));
    expect(rotationBucket("daily", a)).not.toBe(rotationBucket("daily", c));
  });

  it("builds pools from favorites, built-in collections, and user collections", () => {
    const s = { ...DEFAULT_SETTINGS, favorites: ["star"] };
    expect(rotationPool(s, charms).map((c) => c.id)).toEqual(["star"]);
    expect(rotationPool({ ...s, rotateSource: "collection:wizard-school" }, charms).map((c) => c.id)).toEqual([
      "wand",
      "owl",
    ]);
    const withUser = {
      ...s,
      rotateSource: "collection:uc-1",
      userCollections: [{ id: "uc-1", name: "Mine", charmIds: ["owl", "gone", "moon"] }],
    };
    expect(rotationPool(withUser, charms).map((c) => c.id)).toEqual(["owl", "moon"]);
    expect(rotationPool({ ...s, rotateSource: "all" }, charms)).toHaveLength(4);
  });

  it("picks deterministically and avoids repeating the current charm", () => {
    expect(pickForBucket([], 3)).toBeNull();
    expect(pickForBucket(charms, 42)?.id).toBe(pickForBucket(charms, 42)?.id);
    const first = pickForBucket(charms, 7)!;
    expect(pickForBucket(charms, 7, first.id)?.id).not.toBe(first.id);
    const seen = new Set(Array.from({ length: 40 }, (_, i) => pickForBucket(charms, i)?.id));
    expect(seen.size).toBe(4);
  });
});
