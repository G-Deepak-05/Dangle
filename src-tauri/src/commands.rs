use crate::custom_charms::{self, CustomCharm, NewCustomCharm};
use crate::displays::{self, DisplayInfo};
use crate::settings::{self, Settings};
use crate::state::{AppState, Hitbox, OverlayGeometry};
use crate::{apply_patch, control, overlay, platform, tray};
use serde_json::{json, Value};
use tauri::{AppHandle, Emitter, State};

#[tauri::command]
pub fn get_settings(state: State<AppState>) -> Settings {
    state.settings.lock().unwrap().clone()
}

#[tauri::command]
pub fn update_settings(app: AppHandle, patch: Value) -> Settings {
    apply_patch(&app, patch)
}

#[tauri::command]
pub fn reset_position(app: AppHandle) -> Settings {
    apply_patch(
        &app,
        settings::patch_from_pairs(&[
            ("anchorX", json!(settings::DEFAULT_ANCHOR_X)),
            ("displayId", Value::Null),
        ]),
    )
}

#[tauri::command]
pub fn list_displays(app: AppHandle) -> Vec<DisplayInfo> {
    displays::list(&app)
}

#[tauri::command]
pub fn overlay_geometry(state: State<AppState>) -> Option<OverlayGeometry> {
    state.geometry.lock().unwrap().clone()
}

#[tauri::command]
pub fn overlay_hitbox(state: State<AppState>, hitbox: Option<Hitbox>) {
    let valid = hitbox.filter(|h| h.x.is_finite() && h.y.is_finite() && h.r.is_finite() && h.r > 0.0);
    state.pointer.lock().unwrap().hitbox = valid;
}

#[tauri::command]
pub fn overlay_drag(app: AppHandle, state: State<AppState>, active: bool) {
    let previous = {
        let mut p = state.pointer.lock().unwrap();
        p.dragging = active;
        p.previous_app
    };
    if !active && !control::is_visible(&app) {
        if let (Some(pid), Some(front)) = (previous, platform::frontmost_app_pid()) {
            if front == platform::own_pid() {
                platform::activate_pid(pid);
            }
        }
    }
}

#[tauri::command]
pub fn set_tray_charm(app: AppHandle, name: String) {
    tray::set_current_charm_name(&app, &name);
}

#[tauri::command]
pub fn list_custom_charms(state: State<AppState>) -> Vec<CustomCharm> {
    custom_charms::list(&state.custom_dir)
}

#[tauri::command]
pub fn save_custom_charm(
    app: AppHandle,
    state: State<AppState>,
    charm: NewCustomCharm,
) -> Result<CustomCharm, String> {
    let saved = custom_charms::save(&state.custom_dir, charm)?;
    let _ = app.emit("custom-charms-changed", ());
    Ok(saved)
}

#[tauri::command]
pub fn delete_custom_charm(app: AppHandle, state: State<AppState>, id: String) -> Result<(), String> {
    custom_charms::delete(&state.custom_dir, &id)?;
    let (active, mut favorites) = {
        let s = state.settings.lock().unwrap();
        (s.active_charm_id.clone(), s.favorites.clone())
    };
    favorites.retain(|f| f != &id);
    let mut patch = vec![("favorites", json!(favorites))];
    if active == id {
        patch.push(("activeCharmId", json!(settings::DEFAULT_CHARM_ID)));
    }
    apply_patch(&app, settings::patch_from_pairs(&patch));
    let _ = app.emit("custom-charms-changed", ());
    Ok(())
}

#[tauri::command]
pub fn open_control(app: AppHandle, route: Option<String>) {
    control::show(&app, route.as_deref());
}

#[tauri::command]
pub fn hide_control(app: AppHandle) {
    control::hide(&app);
}

#[tauri::command]
pub fn quit_app(app: AppHandle) {
    app.exit(0);
}

#[tauri::command]
pub fn relayout_overlay(app: AppHandle) {
    overlay::layout(&app);
}
