use crate::control;
use crate::state::{AppState, TrayHandles};
use crate::{apply_patch, settings::patch_from_pairs};
use serde_json::json;
use tauri::image::Image;
use tauri::menu::{Menu, MenuItem, PredefinedMenuItem};
use tauri::tray::TrayIconBuilder;
use tauri::{AppHandle, Manager};

const TRAY_ICON: &[u8] = include_bytes!("../icons/tray-template@2x.png");

pub fn create(app: &AppHandle) -> tauri::Result<()> {
    let title = MenuItem::with_id(app, "title", "Dangle", false, None::<&str>)?;
    let current = MenuItem::with_id(app, "current", "Current charm: —", false, None::<&str>)?;
    let choose = MenuItem::with_id(app, "choose", "Choose Charm…", true, None::<&str>)?;
    let create = MenuItem::with_id(app, "create", "Create Charm…", true, None::<&str>)?;
    let settings = MenuItem::with_id(app, "settings", "Settings…", true, Some("CmdOrCtrl+,"))?;
    let pause = MenuItem::with_id(app, "pause", "Pause", true, None::<&str>)?;
    let visibility =
        MenuItem::with_id(app, "visibility", "Hide Charm", true, Some("CmdOrCtrl+Alt+D"))?;
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
            &PredefinedMenuItem::separator(app)?,
            &pause,
            &visibility,
            &PredefinedMenuItem::separator(app)?,
            &quit,
        ],
    )?;

    TrayIconBuilder::with_id("dangle-tray")
        .icon(Image::from_bytes(TRAY_ICON)?)
        .icon_as_template(true)
        .tooltip("Dangle")
        .menu(&menu)
        .show_menu_on_left_click(true)
        .on_menu_event(|app, event| match event.id().as_ref() {
            "choose" => control::show(app, Some("library")),
            "create" => control::show(app, Some("create")),
            "settings" => control::show(app, Some("settings")),
            "pause" => {
                let paused = app.state::<AppState>().settings.lock().unwrap().paused;
                apply_patch(app, patch_from_pairs(&[("paused", json!(!paused))]));
            }
            "visibility" => toggle_hidden(app),
            "quit" => app.exit(0),
            _ => {}
        })
        .build(app)?;

    *app.state::<AppState>().tray.lock().unwrap() = Some(TrayHandles {
        current,
        pause,
        visibility,
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
