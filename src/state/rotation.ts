import type { Charm } from "../charms/types";
import type { RotateMode, Settings } from "./settings";

/** A number that changes once per hour or day in local time; null when rotation is off. */
export function rotationBucket(mode: RotateMode, now: Date): number | null {
  if (mode === "off") return null;
  const day = Math.floor(
    (Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) - Date.UTC(2020, 0, 1)) / 86_400_000,
  );
  return mode === "daily" ? day : day * 24 + now.getHours();
}

export function rotationPool(settings: Settings, charms: Charm[]): Charm[] {
  const source = settings.rotateSource;
  if (source === "all") return charms;
  if (source.startsWith("collection:")) {
    const id = source.slice("collection:".length);
    const user = settings.userCollections.find((c) => c.id === id);
    if (user) return user.charmIds.map((cid) => charms.find((c) => c.id === cid)).filter((c) => c !== undefined);
    return charms.filter((c) => c.collection === id);
  }
  return charms.filter((c) => settings.favorites.includes(c.id));
}

/** Deterministic, well-spread pick so every hour or day lands on a different charm. */
export function pickForBucket(pool: Charm[], bucket: number, avoidId?: string): Charm | null {
  if (pool.length === 0) return null;
  // MurmurHash3 finalizer: mixes every input bit into the low bits used by the modulo.
  let h = bucket | 0;
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  h = (h ^ (h >>> 16)) >>> 0;
  let index = h % pool.length;
  if (pool.length > 1 && pool[index].id === avoidId) index = (index + 1) % pool.length;
  return pool[index];
}
