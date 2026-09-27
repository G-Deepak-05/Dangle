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
    /// Anchor position in overlay-local logical pixels.
    pub anchor_x: f64,
    /// Anchor position in global logical pixels; lets the overlay keep the charm
    /// in place on screen when the window moves.
    pub global_anchor_x: f64,
    pub global_top: f64,
    pub display_id: String,
}

#[derive(Default)]
pub struct PointerState {
    pub hitbox: Option<Hitbox>,
    pub dragging: bool,
    /// While the user reels string in or out, the overlay grows to full height.
    pub reeling: bool,
    pub over: bool,
    pub origin: (f64, f64),
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
