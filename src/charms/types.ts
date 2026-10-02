import type { PhysicsParams } from "../physics/profiles";

export type RopeStyle = "minimal" | "thread" | "cord" | "chain";

export const ROPE_STYLES: RopeStyle[] = ["minimal", "thread", "cord", "chain"];

export type ThreadColor = "classic" | "ink" | "cream" | "rose" | "sky" | "sage" | "gold" | "silver";

export const THREAD_COLORS: ThreadColor[] = ["classic", "ink", "cream", "rose", "sky", "sage", "gold", "silver"];

export type Beads = "none" | "pearl" | "wood" | "glass" | "star";

export const BEADS: Beads[] = ["none", "pearl", "wood", "glass", "star"];

export type Finish = "classic" | "glossy" | "matte" | "sticker" | "glow";

export const FINISHES: Finish[] = ["classic", "glossy", "matte", "sticker", "glow"];

export type Hook = "clip" | "pin" | "bow" | "suction" | "nail" | "none";

export const HOOKS: Hook[] = ["clip", "pin", "bow", "suction", "nail", "none"];

export const MIN_THREAD_LENGTH = 0.5;
export const MAX_THREAD_LENGTH = 3;

export type CharmCategory = "cute" | "nature" | "space" | "retro" | "minimal" | "seasonal" | "custom";

export const CATEGORIES: CharmCategory[] = [
  "cute",
  "nature",
  "space",
  "retro",
  "minimal",
  "seasonal",
  "custom",
];

export interface AnchorOffset {
  /** Attachment point as a fraction of the artwork box, 0..1 from the top-left. */
  x: number;
  y: number;
}

export interface CollectionInfo {
  id: string;
  name: string;
  description: string;
}

export interface Charm {
  id: string;
  name: string;
  category: CharmCategory;
  /** Extra categories the charm also appears under. */
  tags: CharmCategory[];
  /** Built-in collection this charm belongs to, if any. */
  collection?: string;
  image: string;
  thumbnail: string;
  defaultScale: number;
  ropeStyle: RopeStyle;
  anchorOffset: AnchorOffset;
  physicsProfile?: Partial<Pick<PhysicsParams, "charmMass" | "angularStiffness" | "angularDamping">>;
  metadata: {
    description?: string;
    author?: string;
    source: "builtin" | "custom";
    createdAt?: number;
  };
}

export function inCategory(charm: Charm, category: CharmCategory | "all"): boolean {
  return category === "all" || charm.category === category || charm.tags.includes(category);
}
