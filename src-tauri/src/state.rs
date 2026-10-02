use crate::settings::Settings;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::menu::MenuItem;
use tauri::Wry;

/// Charm hit area in overlay-local logical pixels.
#[derive(Clone, Copy, Debug, Deserialize)]
pub struct Hitbox {
    pub x: f64,
    pub y: f64,
    pub r: f64,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OverlayGeometry {
    pub width: f64,
    pub height: f64,
    /// Window origin in global logical pixels.
    pub global_left: f64,
    pub global_top: f64,
    pub display_id: String,
}

#[derive(Default)]
pub struct PointerState {
    /// One hit circle per hanging charm, indexed by slot.
    pub hitboxes: Vec<Option<Hitbox>>,
    pub dragging: bool,
    /// While the user reels string in or out, the overlay grows to full height.
    pub reeling: bool,
    /// Slot under the cursor (or being dragged), if any.
    pub over: Option<usize>,
    pub origin: (f64, f64),
    /// Scale factor of the overlay's display, for platforms that report physical cursors.
    pub scale: f64,
    /// App that was frontmost before the charm was touched, so focus can be returned.
    pub previous_app: Option<i32>,
}

pub struct TrayHandles {
    pub current: MenuItem<Wry>,
    pub pause: MenuItem<Wry>,
    pub visibility: MenuItem<Wry>,
}

pub struct AppState {
    pub settings: Mutex<Settings>,
    pub settings_path: PathBuf,
    pub custom_dir: PathBuf,
    pub pointer: Mutex<PointerState>,
    pub geometry: Mutex<Option<OverlayGeometry>>,
    pub tray: Mutex<Option<TrayHandles>>,
}
