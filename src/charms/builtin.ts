import { parseManifest } from "./manifest";
import type { Charm } from "./types";

// Every folder in /charms with a charm.json and charm.svg becomes a built-in charm.
const manifests = import.meta.glob("../../charms/*/charm.json", { eager: true, import: "default" });
const images = import.meta.glob("../../charms/*/charm.svg", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>;

const ORDER = ["moon", "star", "planet", "cat", "ghost", "mushroom", "leaf", "cloud", "crystal", "heart", "sun", "coin", "camera", "coffee", "sword"];

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
  return charms.sort((a, b) => rank(a.id) - rank(b.id) || a.name.localeCompare(b.name));
}

export const BUILTIN_CHARMS: Charm[] = load();
export const FALLBACK_CHARM_ID = "moon";
