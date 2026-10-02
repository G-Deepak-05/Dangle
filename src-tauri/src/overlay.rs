use crate::displays;
use crate::platform;
use crate::settings::{CharmSize, HangMode, MouseMode};
use crate::state::{AppState, OverlayGeometry};
use std::time::Duration;
use tauri::{
    AppHandle, Emitter, LogicalPosition, LogicalSize, Manager, WebviewUrl, WebviewWindow,
    WebviewWindowBuilder,
};

pub const LABEL: &str = "overlay";
const MIN_HEIGHT: f64 = 380.0;
const HIT_PADDING: f64 = 6.0;
const IDLE_AFTER_SECS: f64 = 60.0;

pub fn create(app: &AppHandle) -> tauri::Result<WebviewWindow> {
    let window = WebviewWindowBuilder::new(app, LABEL, WebviewUrl::App("overlay.html".into()))
        .title("Dangle Charm")
        .inner_size(800.0, MIN_HEIGHT)
        .transparent(true)
        .decorations(false)
        .shadow(false)
        .resizable(false)
        .maximizable(false)
        .minimizable(false)
        .skip_taskbar(true)
        .always_on_top(true)
        .focused(false)
        .focusable(false)
        .accept_first_mouse(true)
        .visible(false)
        .build()?;
    platform::set_click_through(&window, true);
    Ok(window)
}

pub fn window(app: &AppHandle) -> Option<WebviewWindow> {
    app.get_webview_window(LABEL)
}

/// Positions the overlay band on the chosen display and tells the charm where its anchor is.
/// Monitor queries touch AppKit, so the work always runs on the main thread.
pub fn layout(app: &AppHandle) {
    let handle = app.clone();
    let _ = app.run_on_main_thread(move || layout_now(&handle));
}

fn layout_now(app: &AppHandle) {
    let Some(window) = window(app) else { return };
    let state = app.state::<AppState>();
    let settings = state.settings.lock().unwrap().clone();
    let Some(monitor) = displays::target(app, settings.display_id.as_deref()) else {
        return;
    };
    let scale = monitor.scale_factor();
    // Use the full display, not the work area, so the string starts at the very top
    // edge of the screen; the overlay sits above the menu bar layer (see platform.rs).
    let (pos, size) = (monitor.position(), monitor.size());
    let (wx, wy) = (pos.x as f64 / scale, pos.y as f64 / scale);
    let (ww, wh) = (size.width as f64 / scale, size.height as f64 / scale);

    // The band spans the whole display so several charms can hang anywhere along it.
    let (charm, rope) = match settings.size {
        CharmSize::Small => (58.0, 96.0),
        CharmSize::Medium => (78.0, 124.0),
        CharmSize::Large => (104.0, 150.0),
    };
    let charm = charm * settings.charm_scale;
    let rope = rope * settings.thread_length * settings.charm_scale.clamp(0.8, 1.25);
    let drop = settings.anchor_y * wh;
    let stacked_extra = if settings.hang_mode == HangMode::Stacked {
        settings.extra_slots.len() as f64 * (charm * 1.25 + 20.0)
    } else {
        0.0
    };
    let reeling = state.pointer.lock().unwrap().reeling;
    let height = if reeling {
        wh
    } else {
        (drop + rope * 1.3 + charm * 2.4 + 90.0 + stacked_extra * 1.2)
            .max(MIN_HEIGHT)
            .min(wh)
    };

    let _ = window.set_size(LogicalSize::new(ww, height));
    let _ = window.set_position(LogicalPosition::new(wx, wy));
    {
        let mut p = state.pointer.lock().unwrap();
        p.origin = (wx, wy);
        p.scale = scale;
    }

    let geometry = OverlayGeometry {
        width: ww,
        height,
        global_left: wx,
        global_top: wy,
        display_height: wh,
        display_id: displays::monitor_id(&monitor),
    };
    *state.geometry.lock().unwrap() = Some(geometry.clone());
    let _ = app.emit_to(LABEL, "overlay-geometry", geometry);
}

pub fn sync_visibility(app: &AppHandle) {
    let Some(window) = window(app) else { return };
    let settings = app.state::<AppState>().settings.lock().unwrap().clone();
    if settings.onboarding_complete && !settings.hidden {
        let _ = window.show();
    } else {
        let _ = window.hide();
    }
}

fn set_over(app: &AppHandle, over: Option<usize>) {
    if let Some(window) = window(app) {
        platform::set_click_through(&window, over.is_none());
    }
    let _ = app.emit_to(LABEL, "overlay-hover", over);
}

/// The overlay ignores the mouse except while the cursor is over the charm, so the
/// rest of the band never blocks clicks. The webview cannot see the cursor while it
/// ignores events, so the check runs here against the hitbox the charm reports.
pub fn spawn_pointer_watch(app: AppHandle) {
    std::thread::Builder::new()
        .name("dangle-pointer".into())
        .spawn(move || {
            let mut idle = false;
            let mut last_idle_check = std::time::Instant::now();
            let mut last_cursor: Option<((f64, f64), std::time::Instant)> = None;
            let mut last_poke = std::time::Instant::now();
            loop {
                let state = app.state::<AppState>();
                if last_idle_check.elapsed() >= Duration::from_secs(1) {
                    last_idle_check = std::time::Instant::now();
                    let now_idle =
                        platform::seconds_since_input().is_some_and(|s| s > IDLE_AFTER_SECS);
                    if now_idle != idle {
                        idle = now_idle;
                        let _ = app.emit_to(LABEL, "system-idle", idle);
                    }
                }
                let (interactive, reactive) = {
                    let s = state.settings.lock().unwrap();
                    (
                        s.onboarding_complete && !s.hidden && !s.paused,
                        s.mouse_mode == MouseMode::Reactive,
                    )
                };
                let scale = state.pointer.lock().unwrap().scale;
                let cursor = platform::cursor_position(scale);
                let mut near = false;
                let change = {
                    let mut p = state.pointer.lock().unwrap();
                    let over = if p.dragging {
                        p.over
                    } else {
                        match (interactive, cursor) {
                            (true, Some((cx, cy))) => {
                                let mut hit = None;
                                for (i, hb) in p
                                    .hitboxes
                                    .iter()
                                    .enumerate()
                                    .flat_map(|(i, list)| list.iter().map(move |h| (i, h)))
                                {
                                    let dx = cx - (p.origin.0 + hb.x);
                                    let dy = cy - (p.origin.1 + hb.y);
                                    let dist = (dx * dx + dy * dy).sqrt();
                                    near |= dist < hb.r + 240.0;
                                    if hit.is_none() && dist <= hb.r + HIT_PADDING {
                                        hit = Some(i);
                                    }
                                }
                                hit
                            }
                            _ => None,
                        }
                    };
                    if over != p.over {
                        p.over = over;
                        if over.is_some() {
                            p.previous_app = platform::frontmost_app_pid()
                                .filter(|pid| *pid != platform::own_pid());
                        }
                        Some(over)
                    } else {
                        None
                    }
                };
                if let Some(over) = change {
                    set_over(&app, over);
                }
                // Reactive mode: a quick flick of the cursor past a charm nudges it.
                if let Some((cx, cy)) = cursor {
                    let now = std::time::Instant::now();
                    if let Some(((lx, ly), at)) = last_cursor {
                        let dt = now.duration_since(at).as_secs_f64().max(0.001);
                        let (vx, vy) = ((cx - lx) / dt, (cy - ly) / dt);
                        let speed = (vx * vx + vy * vy).sqrt();
                        let p = state.pointer.lock().unwrap();
                        if reactive
                            && interactive
                            && !p.dragging
                            && p.over.is_none()
                            && speed > 900.0
                            && last_poke.elapsed() > Duration::from_millis(140)
                        {
                            let hit = p.hitboxes.iter().enumerate().find_map(|(slot, list)| {
                                list.iter()
                                    .enumerate()
                                    .find(|(_, h)| {
                                        let dx = cx - (p.origin.0 + h.x);
                                        let dy = cy - (p.origin.1 + h.y);
                                        (dx * dx + dy * dy).sqrt() < h.r + 70.0
                                    })
                                    .map(|(body, _)| (slot, body))
                            });
                            drop(p);
                            if let Some((slot, body)) = hit {
                                last_poke = now;
                                let _ = app.emit_to(
                                    LABEL,
                                    "overlay-poke",
                                    serde_json::json!({ "slot": slot, "body": body, "vx": vx, "vy": vy }),
                                );
                            }
                        }
                    }
                    last_cursor = Some(((cx, cy), now));
                }
                let dragging = state.pointer.lock().unwrap().dragging;
                let interval = if dragging || near {
                    12
                } else if reactive && interactive {
                    20
                } else if interactive {
                    50
                } else {
                    250
                };
                std::thread::sleep(Duration::from_millis(interval));
            }
        })
        .expect("spawn pointer watch");
}

/// Re-lays out the overlay when displays are added, removed, or rearranged.
pub fn spawn_display_watch(app: AppHandle) {
    std::thread::Builder::new()
        .name("dangle-displays".into())
        .spawn(move || {
            let fingerprint = |app: &AppHandle| {
                let (tx, rx) = std::sync::mpsc::channel();
                let handle = app.clone();
                let _ = app.run_on_main_thread(move || {
                    let _ = tx.send(displays::fingerprint(&handle));
                });
                rx.recv_timeout(Duration::from_secs(2)).ok()
            };
            let mut last = fingerprint(&app);
            loop {
                std::thread::sleep(Duration::from_secs(2));
                let now = fingerprint(&app);
                if now.is_some() && now != last {
                    last = now;
                    layout(&app);
                    let handle = app.clone();
                    let _ = app.run_on_main_thread(move || {
                        let _ = handle.emit("displays-changed", displays::list(&handle));
                    });
                }
            }
        })
        .expect("spawn display watch");
}
