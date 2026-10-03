use crate::custom_charms::{self, CustomCharm, NewCustomCharm};
use crate::displays::{self, DisplayInfo};
use crate::settings::{self, Settings};
use crate::state::{AppState, Hitbox, OverlayGeometry};
use crate::{
    apply_patch, apps, control, feedback, link_import, overlay, packs, platform, tray, updates,
};
use base64::Engine;
use serde::Serialize;
use serde_json::{json, Value};
use tauri::{AppHandle, Emitter, Manager, State};
use tauri_plugin_dialog::DialogExt;
use tauri_plugin_opener::OpenerExt;

const MAX_PICKED_BYTES: u64 = 15 * 1024 * 1024;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PickedImage {
    name: String,
    base64: String,
}

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

/// Hit circles for one hanging stage (one per charm on its string).
#[tauri::command]
pub fn overlay_hitbox(state: State<AppState>, slot: usize, hitboxes: Vec<Hitbox>) {
    if slot > settings::MAX_EXTRA_SLOTS {
        return;
    }
    let valid: Vec<Hitbox> = hitboxes
        .into_iter()
        .filter(|h| h.x.is_finite() && h.y.is_finite() && h.r.is_finite() && h.r > 0.0)
        .take(settings::MAX_EXTRA_SLOTS + 1)
        .collect();
    let mut p = state.pointer.lock().unwrap();
    if p.hitboxes.len() <= slot {
        p.hitboxes.resize(slot + 1, Vec::new());
    }
    p.hitboxes[slot] = valid;
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
pub fn overlay_reel(app: AppHandle, state: State<AppState>, active: bool) {
    let changed = {
        let mut p = state.pointer.lock().unwrap();
        let changed = p.reeling != active;
        p.reeling = active;
        changed
    };
    if changed {
        overlay::layout(&app);
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
pub fn delete_custom_charm(
    app: AppHandle,
    state: State<AppState>,
    id: String,
) -> Result<(), String> {
    custom_charms::delete(&state.custom_dir, &id)?;
    let (active, mut favorites, mut collections, mut slots) = {
        let s = state.settings.lock().unwrap();
        (
            s.active_charm_id.clone(),
            s.favorites.clone(),
            s.user_collections.clone(),
            s.extra_slots.clone(),
        )
    };
    favorites.retain(|f| f != &id);
    for c in &mut collections {
        c.charm_ids.retain(|c| c != &id);
    }
    slots.retain(|slot| slot.charm_id != id);
    let mut patch = vec![
        ("favorites", json!(favorites)),
        ("userCollections", json!(collections)),
        ("extraSlots", json!(slots)),
    ];
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

/// Native picker shown as a sheet on the control window, so it opens on the same Space
/// and never blocks the app. Only the file the user picked is read.
#[tauri::command]
pub async fn pick_image(app: AppHandle) -> Result<Option<PickedImage>, String> {
    let (tx, rx) = std::sync::mpsc::channel();
    let mut dialog = app
        .dialog()
        .file()
        .set_title("Choose an image for your charm")
        .add_filter("Images", &["png", "webp", "jpg", "jpeg"]);
    if let Some(window) = app.get_webview_window(control::LABEL) {
        dialog = dialog.set_parent(&window);
    }
    dialog.pick_file(move |path| {
        let _ = tx.send(path);
    });
    let picked = tauri::async_runtime::spawn_blocking(move || rx.recv().ok().flatten())
        .await
        .map_err(|e| e.to_string())?;
    let Some(path) = picked.and_then(|p| p.into_path().ok()) else {
        return Ok(None);
    };
    let size = std::fs::metadata(&path)
        .map_err(|_| "That file couldn't be opened.".to_string())?
        .len();
    if size > MAX_PICKED_BYTES {
        return Err("That image is over 15 MB. Try a smaller one.".into());
    }
    let bytes = std::fs::read(&path).map_err(|_| "That file couldn't be read.".to_string())?;
    let name = path
        .file_name()
        .map(|n| n.to_string_lossy().chars().take(120).collect())
        .unwrap_or_else(|| "image".into());
    Ok(Some(PickedImage {
        name,
        base64: base64::engine::general_purpose::STANDARD.encode(bytes),
    }))
}

#[tauri::command]
pub fn app_info(app: AppHandle) -> feedback::AppInfo {
    feedback::app_info(&app.package_info().version.to_string())
}

#[tauri::command]
pub fn open_feedback(
    app: AppHandle,
    kind: feedback::FeedbackKind,
    message: String,
    include_info: bool,
) -> Result<(), String> {
    let info = include_info.then(|| feedback::app_info(&app.package_info().version.to_string()));
    let url = feedback::issue_url(kind, &message, info.as_ref());
    app.opener()
        .open_url(url, None::<&str>)
        .map_err(|_| "Couldn't open your browser.".to_string())
}

#[tauri::command]
pub fn open_releases(app: AppHandle) -> Result<(), String> {
    app.opener()
        .open_url(
            format!("{}/releases/latest", feedback::REPO_URL),
            None::<&str>,
        )
        .map_err(|_| "Couldn't open your browser.".to_string())
}

#[tauri::command]
pub async fn check_for_updates(app: AppHandle) -> Result<Option<updates::UpdateInfo>, String> {
    updates::check_visibly(&app).await
}

#[tauri::command]
pub async fn install_update(app: AppHandle) -> Result<(), String> {
    updates::install(&app).await
}

fn pick_path(
    app: &AppHandle,
    save_name: Option<String>,
) -> Result<Option<std::path::PathBuf>, String> {
    let (tx, rx) = std::sync::mpsc::channel();
    let mut dialog = app
        .dialog()
        .file()
        .add_filter("Dangle pack", &["danglepack"]);
    if let Some(window) = app.get_webview_window(control::LABEL) {
        dialog = dialog.set_parent(&window);
    }
    match save_name {
        Some(name) => dialog.set_file_name(name).save_file(move |p| {
            let _ = tx.send(p);
        }),
        None => dialog.pick_file(move |p| {
            let _ = tx.send(p);
        }),
    }
    let picked = rx.recv().ok().flatten();
    Ok(picked.and_then(|p| p.into_path().ok()))
}

#[tauri::command]
pub async fn export_pack(app: AppHandle, collection_id: String) -> Result<bool, String> {
    let (collection, custom_dir) = {
        let state = app.state::<AppState>();
        let s = state.settings.lock().unwrap();
        let c = s
            .user_collections
            .iter()
            .find(|c| c.id == collection_id)
            .cloned()
            .ok_or_else(|| "That collection no longer exists.".to_string())?;
        (c, state.custom_dir.clone())
    };
    let pack = packs::build(&custom_dir, &collection);
    let safe: String = collection
        .name
        .chars()
        .map(|c| {
            if c.is_alphanumeric() || c == ' ' || c == '-' {
                c
            } else {
                '_'
            }
        })
        .collect();
    let handle = app.clone();
    let path = tauri::async_runtime::spawn_blocking(move || {
        pick_path(&handle, Some(format!("{}.danglepack", safe.trim())))
    })
    .await
    .map_err(|e| e.to_string())??;
    let Some(path) = path else { return Ok(false) };
    let body = serde_json::to_vec(&pack).map_err(|e| e.to_string())?;
    std::fs::write(&path, body).map_err(|_| "Couldn't save the pack there.".to_string())?;
    Ok(true)
}

#[tauri::command]
pub async fn import_pack(app: AppHandle) -> Result<Option<packs::ImportResult>, String> {
    let handle = app.clone();
    let path = tauri::async_runtime::spawn_blocking(move || pick_path(&handle, None))
        .await
        .map_err(|e| e.to_string())??;
    let Some(path) = path else { return Ok(None) };
    let pack = packs::read(&path)?;
    let name = pack.name.clone();
    let custom_dir = app.state::<AppState>().custom_dir.clone();
    let (ids, skipped) = tauri::async_runtime::spawn_blocking(move || {
        packs::import(&custom_dir, pack, is_builtin_id)
    })
    .await
    .map_err(|e| e.to_string())?;
    if ids.is_empty() {
        return Err("None of the charms in that pack could be imported.".into());
    }
    let mut collections = app
        .state::<AppState>()
        .settings
        .lock()
        .unwrap()
        .user_collections
        .clone();
    let base: String = name.chars().filter(|c| !c.is_control()).take(34).collect();
    let base = if base.trim().is_empty() {
        "Imported".to_string()
    } else {
        base.trim().to_string()
    };
    let mut unique = base.clone();
    let mut n = 2;
    while collections.iter().any(|c| c.name == unique) {
        unique = format!("{base} ({n})");
        n += 1;
    }
    let nanos = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_nanos())
        .unwrap_or(0);
    let collection = settings::UserCollection {
        id: format!("uc-{nanos:x}"),
        name: unique,
        charm_ids: ids,
    };
    collections.push(collection.clone());
    apply_patch(
        &app,
        settings::patch_from_pairs(&[("userCollections", json!(collections))]),
    );
    let _ = app.emit("custom-charms-changed", ());
    Ok(Some(packs::ImportResult {
        imported: collection.charm_ids.len(),
        skipped,
        collection,
    }))
}

/// Built-in charm ids are plain folder names; anything a pack references is checked
/// against the app's bundled list before it is linked.
fn is_builtin_id(id: &str) -> bool {
    crate::BUILTIN_CHARM_IDS.contains(&id)
}

const MAX_BULK_IMAGES: usize = 60;

/// Several images at once for building a collection; unreadable or oversized files are skipped.
#[tauri::command]
pub async fn pick_images(app: AppHandle) -> Result<Vec<PickedImage>, String> {
    let (tx, rx) = std::sync::mpsc::channel();
    let mut dialog = app
        .dialog()
        .file()
        .set_title("Choose images for your collection")
        .add_filter("Images", &["png", "webp", "jpg", "jpeg"]);
    if let Some(window) = app.get_webview_window(control::LABEL) {
        dialog = dialog.set_parent(&window);
    }
    dialog.pick_files(move |paths| {
        let _ = tx.send(paths);
    });
    let picked = tauri::async_runtime::spawn_blocking(move || rx.recv().ok().flatten())
        .await
        .map_err(|e| e.to_string())?
        .unwrap_or_default();
    if picked.len() > MAX_BULK_IMAGES {
        return Err(format!("Pick up to {MAX_BULK_IMAGES} images at a time."));
    }
    let images = picked
        .into_iter()
        .filter_map(|p| p.into_path().ok())
        .filter_map(|path| {
            let size = std::fs::metadata(&path).ok()?.len();
            if size > MAX_PICKED_BYTES {
                return None;
            }
            let bytes = std::fs::read(&path).ok()?;
            let name = path
                .file_name()?
                .to_string_lossy()
                .chars()
                .take(120)
                .collect();
            Some(PickedImage {
                name,
                base64: base64::engine::general_purpose::STANDARD.encode(bytes),
            })
        })
        .collect();
    Ok(images)
}

#[tauri::command]
pub async fn list_apps() -> Vec<apps::InstalledApp> {
    tauri::async_runtime::spawn_blocking(apps::list)
        .await
        .unwrap_or_default()
}

fn icon_on_main(app: &AppHandle, path: String, size: u32) -> Option<Vec<u8>> {
    let (tx, rx) = std::sync::mpsc::channel();
    let _ = app.run_on_main_thread(move || {
        let _ = tx.send(apps::icon_png(&path, size));
    });
    rx.recv_timeout(std::time::Duration::from_secs(5))
        .ok()
        .flatten()
}

/// Small icon for the app picker; returns None where the OS icon isn't available.
#[tauri::command]
pub async fn app_icon(app: AppHandle, path: String) -> Option<String> {
    if !apps::is_known(&path) {
        return None;
    }
    let handle = app.clone();
    let png = tauri::async_runtime::spawn_blocking(move || icon_on_main(&handle, path, 96))
        .await
        .ok()
        .flatten()?;
    Some(base64::engine::general_purpose::STANDARD.encode(png))
}

#[tauri::command]
pub async fn create_app_charm(
    app: AppHandle,
    path: String,
    name: String,
    fallback_png_base64: Option<String>,
) -> Result<CustomCharm, String> {
    if !apps::is_known(&path) {
        return Err("That app isn't installed in a standard place.".into());
    }
    // One charm per app: hanging it again reuses the charm you already have.
    let custom_dir = app.state::<AppState>().custom_dir.clone();
    if let Some(existing) = custom_charms::find_app_charm(&custom_dir, &path) {
        return Ok(existing);
    }
    let handle = app.clone();
    let icon_path = path.clone();
    let png = tauri::async_runtime::spawn_blocking(move || icon_on_main(&handle, icon_path, 256))
        .await
        .map_err(|e| e.to_string())?;
    let png_base64 = match png {
        Some(bytes) => base64::engine::general_purpose::STANDARD.encode(bytes),
        None => fallback_png_base64.ok_or_else(|| "Couldn't read that app's icon.".to_string())?,
    };
    let saved = custom_charms::save_with_launch(
        &custom_dir,
        NewCustomCharm {
            name,
            rope_style: settings::RopeStyle::Thread,
            anchor_offset: custom_charms::AnchorOffset { x: 0.5, y: 0.1 },
            default_scale: 1.0,
            png_base64,
            sound: Some("plastic".into()),
        },
        Some(path),
    )?;
    let _ = app.emit("custom-charms-changed", ());
    Ok(saved)
}

/// The overlay asks to open a charm by id; the target path comes from Rust's own records.
#[tauri::command]
pub fn launch_charm(state: State<AppState>, id: String) -> Result<(), String> {
    let charm = custom_charms::get(&state.custom_dir, &id)
        .ok_or_else(|| "That charm no longer exists.".to_string())?;
    let target = charm
        .meta
        .launch
        .ok_or_else(|| "That charm doesn't open an app.".to_string())?;
    apps::launch(&target)
}

/// Downloads an image from a link the user pasted, for making a charm.
#[tauri::command]
pub async fn fetch_image(url: String) -> Result<PickedImage, String> {
    let downloaded = link_import::download(&url).await?;
    Ok(PickedImage {
        name: downloaded.name,
        base64: base64::engine::general_purpose::STANDARD.encode(downloaded.bytes),
    })
}
