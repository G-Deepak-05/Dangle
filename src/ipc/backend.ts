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
  globalLeft: number;
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
  sound?: string | null;
  /** Present on app charms: the app a click opens. */
  launch?: string | null;
}

export interface NewCustomCharm {
  name: string;
  ropeStyle: RopeStyle;
  anchorOffset: { x: number; y: number };
  defaultScale: number;
  pngBase64: string;
  sound?: string;
}

export type Route =
  | "home"
  | "library"
  | "customize"
  | "create"
  | "settings"
  | "privacy"
  | "feedback"
  | "apps"
  | "onboarding";

export interface AppInfo {
  version: string;
  os: string;
  arch: string;
}

export interface UpdateInfo {
  version: string;
  notes: string | null;
}

export interface InstalledApp {
  name: string;
  path: string;
}

export type FeedbackKind = "bug" | "idea" | "other";

export interface PackImportResult {
  collection: { id: string; name: string; charmIds: string[] };
  imported: number;
  skipped: number;
}

export const backend = {
  getSettings: () => invoke<Settings>("get_settings"),
  updateSettings: (patch: Partial<Settings>) => invoke<Settings>("update_settings", { patch }),
  resetPosition: () => invoke<Settings>("reset_position"),
  listDisplays: () => invoke<DisplayInfo[]>("list_displays"),
  overlayGeometry: () => invoke<OverlayGeometry | null>("overlay_geometry"),
  overlayHitbox: (slot: number, hitboxes: Hitbox[]) => invoke<void>("overlay_hitbox", { slot, hitboxes }),
  overlayDrag: (active: boolean) => invoke<void>("overlay_drag", { active }),
  overlayReel: (active: boolean) => invoke<void>("overlay_reel", { active }),
  setTrayCharm: (name: string) => invoke<void>("set_tray_charm", { name }),
  listCustomCharms: () => invoke<CustomCharmRecord[]>("list_custom_charms"),
  saveCustomCharm: (charm: NewCustomCharm) => invoke<CustomCharmRecord>("save_custom_charm", { charm }),
  deleteCustomCharm: (id: string) => invoke<void>("delete_custom_charm", { id }),
  openControl: (route?: Route) => invoke<void>("open_control", { route }),
  hideControl: () => invoke<void>("hide_control"),
  quit: () => invoke<void>("quit_app"),
  pickImage: () => invoke<{ name: string; base64: string } | null>("pick_image"),
  pickImages: () => invoke<{ name: string; base64: string }[]>("pick_images"),
  listApps: () => invoke<InstalledApp[]>("list_apps"),
  appIcon: (path: string) => invoke<string | null>("app_icon", { path }),
  createAppCharm: (path: string, name: string, fallbackPngBase64?: string) =>
    invoke<CustomCharmRecord>("create_app_charm", { path, name, fallbackPngBase64 }),
  launchCharm: (id: string) => invoke<void>("launch_charm", { id }),
  appInfo: () => invoke<AppInfo>("app_info"),
  openFeedback: (kind: FeedbackKind, message: string, includeInfo: boolean) =>
    invoke<void>("open_feedback", { kind, message, includeInfo }),
  openReleases: () => invoke<void>("open_releases"),
  checkForUpdates: () => invoke<UpdateInfo | null>("check_for_updates"),
  installUpdate: () => invoke<void>("install_update"),
  exportPack: (collectionId: string) => invoke<boolean>("export_pack", { collectionId }),
  importPack: () => invoke<PackImportResult | null>("import_pack"),
};

type Handler<T> = (payload: T) => void;
const on =
  <T>(event: string) =>
  (handler: Handler<T>): Promise<UnlistenFn> =>
    listen<T>(event, (e) => handler(e.payload));

export const events = {
  settings: on<Settings>("settings-changed"),
  geometry: on<OverlayGeometry>("overlay-geometry"),
  /** Index of the hovered charm slot, or null. */
  hover: on<number | null>("overlay-hover"),
  navigate: on<Route>("navigate"),
  customCharmsChanged: on<null>("custom-charms-changed"),
  displaysChanged: on<DisplayInfo[]>("displays-changed"),
  systemIdle: on<boolean>("system-idle"),
  updateAvailable: on<UpdateInfo>("update-available"),
};
