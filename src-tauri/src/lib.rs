mod commands;
mod control;
mod custom_charms;
mod displays;
mod feedback;
mod overlay;
mod packs;
mod platform;
mod settings;
mod shortcuts;
mod state;
mod tray;
mod updates;

use serde_json::Value;
use settings::Settings;
use state::{AppState, PointerState};
use std::sync::Mutex;
use tauri::{AppHandle, Emitter, Manager, RunEvent, WindowEvent};
use tauri_plugin_autostart::{MacosLauncher, ManagerExt};

/// Single write path for settings: merge, persist, broadcast, then apply side effects.
/// Generated at build time from the /charms folder (see build.rs).
pub(crate) const BUILTIN_CHARM_IDS: &[&str] = include!(concat!(env!("OUT_DIR"), "/builtin_ids.rs"));

pub(crate) fn apply_patch(app: &AppHandle, patch: Value) -> Settings {
    let state = app.state::<AppState>();
    let (old, new) = {
        let mut guard = state.settings.lock().unwrap();
        let old = guard.clone();
        let new = Settings::merged_lenient(&old, &patch);
        *guard = new.clone();
        (old, new)
    };
    if old != new {
        if let Err(err) = settings::save(&state.settings_path, &new) {
            eprintln!("dangle: failed to save settings: {err}");
        }
        let _ = app.emit("settings-changed", &new);
        apply_side_effects(app, Some(&old), &new);
    }
    new
}

fn apply_side_effects(app: &AppHandle, old: Option<&Settings>, new: &Settings) {
    let changed = |f: fn(&Settings) -> String| old.map(|o| f(o) != f(new)).unwrap_or(true);

    if changed(|s| s.start_at_login.to_string()) {
        let launcher = app.autolaunch();
        let enabled = launcher.is_enabled().unwrap_or(false);
        let result = match (new.start_at_login, enabled) {
            (true, false) => launcher.enable(),
            (false, true) => launcher.disable(),
            _ => Ok(()),
        };
        if let Err(err) = result {
            eprintln!("dangle: autostart update failed: {err}");
        }
    }

    if let Some(window) = overlay::window(app) {
        if changed(|s| s.always_on_top.to_string()) {
            platform::set_overlay_level(&window, new.always_on_top);
        }
        if changed(|s| format!("{}{}", s.all_spaces, s.hide_when_fullscreen)) {
            platform::apply_window_behavior(&window, new.all_spaces, !new.hide_when_fullscreen);
        }
    }

    if changed(|s| {
        format!(
            "{}{:?}{:?}{}",
            s.anchor_x, s.display_id, s.size, s.thread_length
        )
    }) {
        overlay::layout(app);
    }
    if changed(|s| format!("{}{}", s.hidden, s.onboarding_complete)) {
        overlay::sync_visibility(app);
    }
    if changed(|s| format!("{}{}", s.hidden, s.paused)) {
        tray::refresh(app);
    }
}

const ROUTES: [&str; 7] = [
    "home",
    "library",
    "customize",
    "create",
    "settings",
    "privacy",
    "feedback",
];

/// `dangle --open library` jumps straight to a screen; unknown values are ignored.
fn route_from_args(args: &[String]) -> Option<&'static str> {
    let i = args.iter().position(|a| a == "--open")?;
    let wanted = args.get(i + 1)?;
    ROUTES.iter().copied().find(|r| r == wanted)
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, args, _cwd| {
            control::show(app, route_from_args(&args));
        }))
        .plugin(tauri_plugin_autostart::init(
            MacosLauncher::LaunchAgent,
            Some(vec!["--autostart"]),
        ))
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(shortcuts::plugin())
        .invoke_handler(tauri::generate_handler![
            commands::get_settings,
            commands::update_settings,
            commands::reset_position,
            commands::list_displays,
            commands::overlay_geometry,
            commands::overlay_hitbox,
            commands::overlay_drag,
            commands::overlay_reel,
            commands::set_tray_charm,
            commands::list_custom_charms,
            commands::save_custom_charm,
            commands::delete_custom_charm,
            commands::open_control,
            commands::hide_control,
            commands::quit_app,
            commands::relayout_overlay,
            commands::pick_image,
            commands::app_info,
            commands::open_feedback,
            commands::open_releases,
            commands::check_for_updates,
            commands::install_update,
            commands::export_pack,
            commands::import_pack,
            commands::pick_images,
        ])
        .setup(|app| {
            let handle = app.handle().clone();
            let config_dir = app.path().app_config_dir()?;
            let data_dir = app.path().app_data_dir()?;
            let settings_path = settings::settings_path(&config_dir);
            let mut initial = settings::load(&settings_path);
            if !initial.remember_position {
                initial.anchor_x = settings::DEFAULT_ANCHOR_X;
                initial.display_id = None;
            }

            app.manage(AppState {
                settings: Mutex::new(initial.clone()),
                settings_path,
                custom_dir: data_dir.join("custom-charms"),
                pointer: Mutex::new(PointerState::default()),
                geometry: Mutex::new(None),
                tray: Mutex::new(None),
            });

            #[cfg(target_os = "macos")]
            app.set_activation_policy(tauri::ActivationPolicy::Accessory);

            overlay::create(&handle)?;
            control::create(&handle)?;
            tray::create(&handle)?;
            shortcuts::register(&handle);

            apply_side_effects(&handle, None, &initial);
            overlay::spawn_pointer_watch(handle.clone());
            overlay::spawn_display_watch(handle.clone());
            app.manage(updates::UpdateState::default());
            updates::spawn_checker(handle.clone());

            if !initial.onboarding_complete {
                control::show(&handle, Some("onboarding"));
            }
            Ok(())
        })
        .on_window_event(|window, event| {
            if window.label() == control::LABEL {
                if let WindowEvent::CloseRequested { api, .. } = event {
                    api.prevent_close();
                    control::hide(window.app_handle());
                }
            }
            if window.label() == overlay::LABEL {
                if let WindowEvent::ScaleFactorChanged { .. } = event {
                    overlay::layout(window.app_handle());
                }
            }
        })
        .build(tauri::generate_context!())
        .expect("error while building Dangle")
        .run(|_app, event| {
            if let RunEvent::ExitRequested { api, code, .. } = event {
                if code.is_none() {
                    api.prevent_exit();
                }
            }
        });
}
