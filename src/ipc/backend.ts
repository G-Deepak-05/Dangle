import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import type { RopeStyle } from "../charms/types";
import type { Settings } from "../state/settings";

export interface DisplayInfo {
  id: string;
  label: string;
  isPrimary: boolean;
  width: number;
  height: number;
}

export interface OverlayGeometry {
  width: number;
  height: number;
  anchorX: number;
  globalAnchorX: number;
  globalTop: number;
  displayId: string;
}

export interface Hitbox {
  x: number;
  y: number;
  r: number;
}

export interface CustomCharmRecord {
  id: string;
  name: string;
  ropeStyle: RopeStyle;
  anchorOffset: { x: number; y: number };
  defaultScale: number;
  createdAt: number;
  imageDataUrl: string;
}

export interface NewCustomCharm {
  name: string;
  ropeStyle: RopeStyle;
  anchorOffset: { x: number; y: number };
  defaultScale: number;
  pngBase64: string;
}

export type Route = "home" | "library" | "customize" | "create" | "settings" | "privacy" | "onboarding";

export const backend = {
  getSettings: () => invoke<Settings>("get_settings"),
  updateSettings: (patch: Partial<Settings>) => invoke<Settings>("update_settings", { patch }),
  resetPosition: () => invoke<Settings>("reset_position"),
  listDisplays: () => invoke<DisplayInfo[]>("list_displays"),
  overlayGeometry: () => invoke<OverlayGeometry | null>("overlay_geometry"),
  overlayHitbox: (hitbox: Hitbox | null) => invoke<void>("overlay_hitbox", { hitbox }),
  overlayDrag: (active: boolean) => invoke<void>("overlay_drag", { active }),
  setTrayCharm: (name: string) => invoke<void>("set_tray_charm", { name }),
  listCustomCharms: () => invoke<CustomCharmRecord[]>("list_custom_charms"),
  saveCustomCharm: (charm: NewCustomCharm) => invoke<CustomCharmRecord>("save_custom_charm", { charm }),
  deleteCustomCharm: (id: string) => invoke<void>("delete_custom_charm", { id }),
  openControl: (route?: Route) => invoke<void>("open_control", { route }),
  hideControl: () => invoke<void>("hide_control"),
  quit: () => invoke<void>("quit_app"),
};

type Handler<T> = (payload: T) => void;
const on =
  <T>(event: string) =>
  (handler: Handler<T>): Promise<UnlistenFn> =>
    listen<T>(event, (e) => handler(e.payload));

export const events = {
  settings: on<Settings>("settings-changed"),
  geometry: on<OverlayGeometry>("overlay-geometry"),
  hover: on<boolean>("overlay-hover"),
  navigate: on<Route>("navigate"),
  customCharmsChanged: on<null>("custom-charms-changed"),
  displaysChanged: on<DisplayInfo[]>("displays-changed"),
  systemIdle: on<boolean>("system-idle"),
};
