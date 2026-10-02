import { CATEGORIES, ROPE_STYLES, type Charm, type CharmCategory, type RopeStyle } from "./types";

const ID_PATTERN = /^[a-z0-9][a-z0-9_-]{0,63}$/i;

const clamp01 = (n: unknown, fallback: number) =>
  typeof n === "number" && Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : fallback;

/**
 * Turns an untrusted manifest object into a Charm, or null when it is unusable.
 * Optional fields fall back to sensible defaults so a slightly-off manifest still loads.
 */
export function parseManifest(raw: unknown, image: string | undefined): Charm | null {
  if (!raw || typeof raw !== "object" || !image) return null;
  const m = raw as Record<string, unknown>;
  if (typeof m.id !== "string" || !ID_PATTERN.test(m.id)) return null;
  if (typeof m.name !== "string" || !m.name.trim()) return null;

  const category = CATEGORIES.includes(m.category as CharmCategory)
    ? (m.category as CharmCategory)
    : "minimal";
  const tags = Array.isArray(m.tags)
    ? (m.tags.filter((t) => CATEGORIES.includes(t as CharmCategory)) as CharmCategory[])
    : [];
  const ropeStyle = ROPE_STYLES.includes(m.ropeStyle as RopeStyle)
    ? (m.ropeStyle as RopeStyle)
    : "thread";
  const anchor = (m.anchorOffset ?? {}) as Record<string, unknown>;
  const scale =
    typeof m.defaultScale === "number" && Number.isFinite(m.defaultScale)
      ? Math.min(1.6, Math.max(0.5, m.defaultScale))
      : 1;
  const meta = (m.metadata ?? {}) as Record<string, unknown>;
  const physics = (m.physicsProfile ?? undefined) as Charm["physicsProfile"];

  return {
    id: m.id,
    name: m.name.trim().slice(0, 40),
    category,
    tags,
    collection:
      typeof m.collection === "string" && ID_PATTERN.test(m.collection) ? m.collection : undefined,
    image,
    thumbnail: image,
    defaultScale: scale,
    ropeStyle,
    anchorOffset: { x: clamp01(anchor.x, 0.5), y: clamp01(anchor.y, 0.05) },
    physicsProfile: physics && typeof physics === "object" ? sanitizePhysics(physics) : undefined,
    metadata: {
      description: typeof meta.description === "string" ? meta.description.slice(0, 140) : undefined,
      author: typeof meta.author === "string" ? meta.author.slice(0, 60) : undefined,
      source: "builtin",
    },
  };
}

function sanitizePhysics(p: Record<string, unknown>): Charm["physicsProfile"] {
  const out: NonNullable<Charm["physicsProfile"]> = {};
  const num = (v: unknown, min: number, max: number) =>
    typeof v === "number" && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : undefined;
  const mass = num(p.charmMass, 1, 40);
  const stiff = num(p.angularStiffness, 10, 300);
  const damp = num(p.angularDamping, 0.5, 30);
  if (mass !== undefined) out.charmMass = mass;
  if (stiff !== undefined) out.angularStiffness = stiff;
  if (damp !== undefined) out.angularDamping = damp;
  return out;
}
