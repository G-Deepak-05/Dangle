import type { RopeStyle } from "../charms/types";
import type { CharmSize, PhysicsProfileName } from "../physics/profiles";

/** Mirrors the Rust `Settings` struct; Rust owns validation and persistence. */
export interface Settings {
  version: number;
  onboardingComplete: boolean;
  activeCharmId: string;
  size: CharmSize;
  physics: PhysicsProfileName;
  ropeByCharm: Record<string, RopeStyle>;
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
}

export const DEFAULT_SETTINGS: Settings = {
  version: 1,
  onboardingComplete: false,
  activeCharmId: "moon",
  size: "medium",
  physics: "normal",
  ropeByCharm: {},
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
};
