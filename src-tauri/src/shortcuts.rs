use crate::{control, tray};
use tauri::plugin::TauriPlugin;
use tauri::{AppHandle, Wry};
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState};

/// ⌘⌥ on macOS; Ctrl+Alt elsewhere (Win+Alt+D is taken by Windows itself).
fn primary() -> Modifiers {
    if cfg!(target_os = "macos") {
        Modifiers::SUPER | Modifiers::ALT
    } else {
        Modifiers::CONTROL | Modifiers::ALT
    }
}

fn toggle_charm() -> Shortcut {
    Shortcut::new(Some(primary()), Code::KeyD)
}

fn open_settings() -> Shortcut {
    Shortcut::new(Some(primary()), Code::Comma)
}

pub fn plugin() -> TauriPlugin<Wry> {
    tauri_plugin_global_shortcut::Builder::new()
        .with_handler(|app, shortcut, event| {
            if event.state() != ShortcutState::Pressed {
                return;
            }
            if shortcut == &toggle_charm() {
                tray::toggle_hidden(app);
            } else if shortcut == &open_settings() {
                control::show(app, Some("settings"));
            }
        })
        .build()
}

/// Registration can fail when another app owns the combo; Dangle keeps working without it.
pub fn register(app: &AppHandle) {
    for shortcut in [toggle_charm(), open_settings()] {
        if let Err(err) = app.global_shortcut().register(shortcut) {
            eprintln!("dangle: could not register shortcut {shortcut:?}: {err}");
        }
    }
}
