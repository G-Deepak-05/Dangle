//! Opt-out update checks against the latest GitHub release. The only request made is a
//! download of the public `latest.json`; updates are verified against the key built
//! into the app before they are installed.

use crate::state::AppState;
use serde::Serialize;
use std::sync::Mutex;
use std::time::{Duration, Instant};
use tauri::{AppHandle, Emitter, Manager};
use tauri_plugin_updater::{Update, UpdaterExt};

const FIRST_CHECK_DELAY: Duration = Duration::from_secs(20);
const CHECK_INTERVAL: Duration = Duration::from_secs(60 * 60);
/// Opening Dangle checks again if the last look is older than this.
const RECHECK_ON_OPEN: Duration = Duration::from_secs(10 * 60);
/// Split across every address a host resolves to, so one unreachable GitHub server
/// costs a couple of seconds instead of the system's ~30 s default.
const CONNECT_TIMEOUT: Duration = Duration::from_secs(8);
const REQUEST_TIMEOUT: Duration = Duration::from_secs(30);

#[derive(Clone, Serialize)]
pub struct UpdateInfo {
    pub version: String,
    pub notes: Option<String>,
}

/// Sent as `update-progress` so the window can show what's happening.
#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Progress {
    /// "checking", "downloading", "installing", "idle" or "failed".
    pub phase: &'static str,
    pub downloaded: u64,
    pub total: Option<u64>,
}

fn report(app: &AppHandle, phase: &'static str, downloaded: u64, total: Option<u64>) {
    let _ = app.emit("update-progress", Progress { phase, downloaded, total });
}

#[derive(Default)]
pub struct UpdateState {
    pending: Mutex<Option<Update>>,
    last_check: Mutex<Option<Instant>>,
}

fn updater(app: &AppHandle) -> Result<tauri_plugin_updater::Updater, String> {
    app.updater_builder()
        .timeout(REQUEST_TIMEOUT)
        .configure_client(|c| c.connect_timeout(CONNECT_TIMEOUT))
        .build()
        .map_err(|e| e.to_string())
}

/// The version waiting to install, if a check has found one.
pub fn pending_version(app: &AppHandle) -> Option<String> {
    let state = app.state::<UpdateState>();
    let guard = state.pending.lock().unwrap();
    guard.as_ref().map(|u| u.version.clone())
}

/// Called when the window opens: look again unless we looked recently.
pub fn check_if_stale(app: &AppHandle) {
    if cfg!(debug_assertions) || !app.state::<AppState>().settings.lock().unwrap().check_for_updates {
        return;
    }
    let fresh = app
        .state::<UpdateState>()
        .last_check
        .lock()
        .unwrap()
        .is_some_and(|t| t.elapsed() < RECHECK_ON_OPEN);
    if !fresh {
        let app = app.clone();
        tauri::async_runtime::spawn(async move {
            let _ = check(&app).await;
        });
    }
}

pub async fn check(app: &AppHandle) -> Result<Option<UpdateInfo>, String> {
    *app.state::<UpdateState>().last_check.lock().unwrap() = Some(Instant::now());
    let update = updater(app)?
        .check()
        .await
        .map_err(|_| "Couldn't reach GitHub. Check your connection and try again.".to_string())?;
    let info = update.as_ref().map(|u| UpdateInfo {
        version: u.version.clone(),
        notes: u.body.clone(),
    });
    *app.state::<UpdateState>().pending.lock().unwrap() = update;
    if let Some(info) = &info {
        let _ = app.emit("update-available", info);
    }
    crate::tray::set_update(app, info.as_ref().map(|i| i.version.as_str()));
    Ok(info)
}

/// A check someone asked for: shows "Checking…" in the window while it runs.
pub async fn check_visibly(app: &AppHandle) -> Result<Option<UpdateInfo>, String> {
    report(app, "checking", 0, None);
    let result = check(app).await;
    report(app, if result.is_ok() { "idle" } else { "failed" }, 0, None);
    result
}

pub async fn install(app: &AppHandle) -> Result<(), String> {
    let pending = app.state::<UpdateState>().pending.lock().unwrap().clone();
    let update = match pending {
        Some(u) => u,
        None => updater(app)?
            .check()
            .await
            .map_err(|e| e.to_string())?
            .ok_or_else(|| "You're already on the latest version.".to_string())?,
    };
    report(app, "downloading", 0, None);
    let mut downloaded = 0u64;
    let mut last_sent = 0u64;
    let result = update
        .download_and_install(
            |chunk, total| {
                downloaded += chunk as u64;
                // Roughly every 64 KB is plenty for a smooth bar.
                if downloaded - last_sent >= 64 * 1024 || Some(downloaded) == total {
                    last_sent = downloaded;
                    report(app, "downloading", downloaded, total);
                }
            },
            || report(app, "installing", 0, None),
        )
        .await;
    if result.is_err() {
        report(app, "failed", 0, None);
        return Err("The update couldn't be installed. Please try again later.".to_string());
    }
    report(app, "installing", 0, None);
    app.restart();
}

/// Checks shortly after launch and then every few hours while the setting is on.
/// Development builds only check when asked, so local runs never hit the network.
pub fn spawn_checker(app: AppHandle) {
    if cfg!(debug_assertions) {
        return;
    }
    std::thread::Builder::new()
        .name("dangle-updates".into())
        .spawn(move || {
            std::thread::sleep(FIRST_CHECK_DELAY);
            loop {
                let enabled = app
                    .state::<AppState>()
                    .settings
                    .lock()
                    .unwrap()
                    .check_for_updates;
                if enabled {
                    let _ = tauri::async_runtime::block_on(check(&app));
                }
                std::thread::sleep(CHECK_INTERVAL);
            }
        })
        .expect("spawn update checker");
}
