import { parseManifest } from "./manifest";
import collections from "../../charms/collections.json";
import type { Charm, CollectionInfo } from "./types";

export const BUILTIN_COLLECTIONS: CollectionInfo[] = (collections as CollectionInfo[]).filter(
  (c) => typeof c.id === "string" && typeof c.name === "string",
);

// Every folder in /charms with a charm.json and charm.svg becomes a built-in charm.
const manifests = import.meta.glob("../../charms/*/charm.json", { eager: true, import: "default" });
const images = import.meta.glob("../../charms/*/charm.svg", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>;

const ORDER = ["moon", "star", "planet", "rocket", "cat", "ghost", "mushroom", "leaf", "clover", "cloud", "rainbow", "crystal", "heart", "balloon", "sun", "cherry", "strawberry", "donut", "coffee", "cactus", "pumpkin", "snowflake", "bell", "coin", "key", "dice", "note", "cassette", "camera", "sword"];

function load(): Charm[] {
  const charms: Charm[] = [];
  for (const [path, manifest] of Object.entries(manifests)) {
    const image = images[path.replace(/charm\.json$/, "charm.svg")];
    const charm = parseManifest(manifest, image);
    if (charm) charms.push(charm);
    else console.warn(`Dangle: skipped invalid charm at ${path}`);
  }
  const rank = (id: string) => {
    const i = ORDER.indexOf(id);
    return i === -1 ? ORDER.length : i;
  };
  const collectionRank = (c: Charm) => {
    const i = BUILTIN_COLLECTIONS.findIndex((col) => col.id === c.collection);
    return i === -1 ? BUILTIN_COLLECTIONS.length : i;
  };
  return charms.sort(
    (a, b) => collectionRank(a) - collectionRank(b) || rank(a.id) - rank(b.id) || a.name.localeCompare(b.name),
  );
}

export const BUILTIN_CHARMS: Charm[] = load();
export const FALLBACK_CHARM_ID = "moon";
