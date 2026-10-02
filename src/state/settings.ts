import type { Beads, Finish, Hook, RopeStyle, ThreadColor } from "../charms/types";

export type RotateMode = "off" | "hourly" | "daily";

/** Each charm on its own string, or all of them on one string, one below another. */
export type HangMode = "separate" | "stacked";

export interface CharmSlot {
  charmId: string;
  anchorX: number;
}

export interface UserCollection {
  id: string;
  name: string;
  charmIds: string[];
}

export const MAX_EXTRA_SLOTS = 4;
import type { CharmSize, PhysicsProfileName } from "../physics/profiles";

/** Mirrors the Rust `Settings` struct; Rust owns validation and persistence. */
export interface Settings {
  version: number;
  onboardingComplete: boolean;
  activeCharmId: string;
  size: CharmSize;
  physics: PhysicsProfileName;
  ropeByCharm: Record<string, RopeStyle>;
  /** String length as a multiple of the size preset's default, 0.5–3. */
  threadLength: number;
  threadColor: ThreadColor;
  beads: Beads;
  anchorX: number;
  displayId: string | null;
  favorites: string[];
  startAtLogin: boolean;
  alwaysOnTop: boolean;
  allSpaces: boolean;
  rememberPosition: boolean;
  hideWhenFullscreen: boolean;
  pauseWhenInactive: boolean;
  reduceMotion: boolean;
  paused: boolean;
  hidden: boolean;
  debugOverlay: boolean;
  checkForUpdates: boolean;
  extraSlots: CharmSlot[];
  finish: Finish;
  shadow: boolean;
  hook: Hook;
  rotate: RotateMode;
  /** "favorites", "all", or "collection:<id>". */
  rotateSource: string;
  userCollections: UserCollection[];
  soundEnabled: boolean;
  /** 0–1. */
  soundVolume: number;
  hangMode: HangMode;
}

export const DEFAULT_SETTINGS: Settings = {
  version: 1,
  onboardingComplete: false,
  activeCharmId: "moon",
  size: "medium",
  physics: "normal",
  ropeByCharm: {},
  threadLength: 1,
  threadColor: "classic",
  beads: "none",
  anchorX: 0.78,
  displayId: null,
  favorites: [],
  startAtLogin: false,
  alwaysOnTop: true,
  allSpaces: true,
  rememberPosition: true,
  hideWhenFullscreen: true,
  pauseWhenInactive: true,
  reduceMotion: false,
  paused: false,
  hidden: false,
  debugOverlay: false,
  checkForUpdates: true,
  extraSlots: [],
  finish: "classic",
  shadow: true,
  hook: "clip",
  rotate: "off",
  rotateSource: "favorites",
  userCollections: [],
  soundEnabled: true,
  soundVolume: 0.6,
  hangMode: "separate",
};
