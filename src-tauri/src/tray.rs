use crate::control;
use crate::state::{AppState, TrayHandles};
use crate::{apply_patch, settings::patch_from_pairs};
use serde_json::json;
use tauri::image::Image;
use tauri::menu::{Menu, MenuItem, PredefinedMenuItem};
use tauri::tray::TrayIconBuilder;
use tauri::{AppHandle, Manager};

// macOS menu bar icons are monochrome templates; the Windows tray shows the colour icon.
#[cfg(target_os = "macos")]
const TRAY_ICON: &[u8] = include_bytes!("../icons/tray-template@2x.png");
#[cfg(not(target_os = "macos"))]
const TRAY_ICON: &[u8] = include_bytes!("../icons/32x32.png");

pub fn create(app: &AppHandle) -> tauri::Result<()> {
    let title = MenuItem::with_id(app, "title", "Dangle", false, None::<&str>)?;
    let current = MenuItem::with_id(app, "current", "Current charm: —", false, None::<&str>)?;
    let choose = MenuItem::with_id(app, "choose", "Choose Charm…", true, None::<&str>)?;
    let create = MenuItem::with_id(app, "create", "Create Charm…", true, None::<&str>)?;
    let settings = MenuItem::with_id(app, "settings", "Settings…", true, Some("CmdOrCtrl+,"))?;
    let feedback = MenuItem::with_id(app, "feedback", "Send Feedback…", true, None::<&str>)?;
    let update = MenuItem::with_id(app, "update", "Check for Updates…", true, None::<&str>)?;
    let pause = MenuItem::with_id(app, "pause", "Pause", true, None::<&str>)?;
    let visibility = MenuItem::with_id(
        app,
        "visibility",
        "Hide Charm",
        true,
        Some("CmdOrCtrl+Alt+D"),
    )?;
    let quit = MenuItem::with_id(app, "quit", "Quit Dangle", true, Some("CmdOrCtrl+Q"))?;

    let menu = Menu::with_items(
        app,
        &[
            &title,
            &PredefinedMenuItem::separator(app)?,
            &current,
            &PredefinedMenuItem::separator(app)?,
            &choose,
            &create,
            &settings,
            &feedback,
            &update,
            &PredefinedMenuItem::separator(app)?,
            &pause,
            &visibility,
            &PredefinedMenuItem::separator(app)?,
            &quit,
        ],
    )?;

    TrayIconBuilder::with_id("dangle-tray")
        .icon(Image::from_bytes(TRAY_ICON)?)
        .icon_as_template(cfg!(target_os = "macos"))
        .tooltip("Dangle")
        .menu(&menu)
        .show_menu_on_left_click(true)
        .on_menu_event(|app, event| match event.id().as_ref() {
            "choose" => control::show(app, Some("library")),
            "create" => control::show(app, Some("create")),
            "settings" => control::show(app, Some("settings")),
            "feedback" => control::show(app, Some("feedback")),
            "pause" => {
                let paused = app.state::<AppState>().settings.lock().unwrap().paused;
                apply_patch(app, patch_from_pairs(&[("paused", json!(!paused))]));
            }
            "visibility" => toggle_hidden(app),
            "update" => on_update_clicked(app),
            "quit" => app.exit(0),
            _ => {}
        })
        .build(app)?;

    *app.state::<AppState>().tray.lock().unwrap() = Some(TrayHandles {
        current,
        pause,
        visibility,
        update,
    });
    refresh(app);
    Ok(())
}

pub fn toggle_hidden(app: &AppHandle) {
    let hidden = app.state::<AppState>().settings.lock().unwrap().hidden;
    apply_patch(app, patch_from_pairs(&[("hidden", json!(!hidden))]));
}

pub fn refresh(app: &AppHandle) {
    let state = app.state::<AppState>();
    let settings = state.settings.lock().unwrap().clone();
    let guard = state.tray.lock().unwrap();
    if let Some(tray) = guard.as_ref() {
        let _ = tray
            .pause
            .set_text(if settings.paused { "Resume" } else { "Pause" });
        let _ = tray.visibility.set_text(if settings.hidden {
            "Show Charm"
        } else {
            "Hide Charm"
        });
    }
}

pub fn set_current_charm_name(app: &AppHandle, name: &str) {
    let label: String = name.chars().filter(|c| !c.is_control()).take(40).collect();
    let state = app.state::<AppState>();
    let guard = state.tray.lock().unwrap();
    if let Some(tray) = guard.as_ref() {
        let _ = tray.current.set_text(format!("Current charm: {label}"));
    }
}

/// Install straight away when an update is waiting; otherwise open About and look.
fn on_update_clicked(app: &AppHandle) {
    let app = app.clone();
    if crate::updates::pending_version(&app).is_some() {
        tauri::async_runtime::spawn(async move {
            if crate::updates::install(&app).await.is_err() {
                control::show(&app, Some("settings"));
            }
        });
    } else {
        control::show(&app, Some("settings"));
        tauri::async_runtime::spawn(async move {
            let _ = crate::updates::check(&app).await;
        });
    }
}

pub fn set_update(app: &AppHandle, version: Option<&str>) {
    let state = app.state::<AppState>();
    let guard = state.tray.lock().unwrap();
    if let Some(tray) = guard.as_ref() {
        let _ = tray.update.set_text(match version {
            Some(v) => format!("Restart to Update to {v}"),
            None => "Check for Updates…".to_string(),
        });
    }
}
