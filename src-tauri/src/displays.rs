use serde::Serialize;
use tauri::{AppHandle, Monitor};

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DisplayInfo {
    pub id: String,
    pub label: String,
    pub is_primary: bool,
    pub width: f64,
    pub height: f64,
}

pub fn monitor_id(m: &Monitor) -> String {
    let scale = m.scale_factor();
    let size = m.size();
    format!(
        "{}|{}x{}",
        m.name().cloned().unwrap_or_else(|| "display".into()),
        (size.width as f64 / scale).round(),
        (size.height as f64 / scale).round()
    )
}

pub fn list(app: &AppHandle) -> Vec<DisplayInfo> {
    let primary = app.primary_monitor().ok().flatten().map(|m| monitor_id(&m));
    let monitors = app.available_monitors().unwrap_or_default();
    let mut out: Vec<DisplayInfo> = monitors
        .iter()
        .map(|m| {
            let id = monitor_id(m);
            let scale = m.scale_factor();
            DisplayInfo {
                is_primary: primary.as_deref() == Some(id.as_str()),
                label: m.name().cloned().unwrap_or_else(|| "Display".into()),
                width: (m.size().width as f64 / scale).round(),
                height: (m.size().height as f64 / scale).round(),
                id,
            }
        })
        .collect();
    out.sort_by_key(|d| !d.is_primary);
    out
}

/// Resolves the preferred display, falling back to the primary one when it is gone.
pub fn target(app: &AppHandle, preferred: Option<&str>) -> Option<Monitor> {
    let monitors = app.available_monitors().unwrap_or_default();
    if let Some(id) = preferred {
        if let Some(m) = monitors.iter().find(|m| monitor_id(m) == id) {
            return Some(m.clone());
        }
    }
    app.primary_monitor()
        .ok()
        .flatten()
        .or_else(|| monitors.into_iter().next())
}

pub fn fingerprint(app: &AppHandle) -> String {
    app.available_monitors()
        .unwrap_or_default()
        .iter()
        .map(|m| {
            let wa = m.work_area();
            format!(
                "{}@{},{},{},{},{}",
                monitor_id(m),
                wa.position.x,
                wa.position.y,
                wa.size.width,
                wa.size.height,
                m.scale_factor()
            )
        })
        .collect::<Vec<_>>()
        .join(";")
}
