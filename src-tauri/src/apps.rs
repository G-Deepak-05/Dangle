//! Installed-app discovery and launching for "app charms". Paths are never taken from the
//! webview at launch time: a charm stores its target, and only scanned apps are accepted.

use serde::Serialize;
use std::path::{Path, PathBuf};

#[derive(Clone, Debug, Serialize, PartialEq, Eq)]
pub struct InstalledApp {
    pub name: String,
    pub path: String,
}

#[cfg(target_os = "macos")]
fn roots() -> Vec<PathBuf> {
    let mut dirs = vec![
        PathBuf::from("/Applications"),
        PathBuf::from("/Applications/Utilities"),
        PathBuf::from("/System/Applications"),
        PathBuf::from("/System/Applications/Utilities"),
    ];
    if let Some(home) = std::env::var_os("HOME") {
        dirs.push(PathBuf::from(home).join("Applications"));
    }
    dirs
}

#[cfg(target_os = "windows")]
fn roots() -> Vec<PathBuf> {
    ["ProgramData", "APPDATA"]
        .iter()
        .filter_map(std::env::var_os)
        .map(|base| PathBuf::from(base).join(r"Microsoft\Windows\Start Menu\Programs"))
        .collect()
}

#[cfg(not(any(target_os = "macos", target_os = "windows")))]
fn roots() -> Vec<PathBuf> {
    Vec::new()
}

fn is_app_entry(path: &Path) -> bool {
    let ext = path
        .extension()
        .and_then(|e| e.to_str())
        .map(|e| e.to_ascii_lowercase());
    if cfg!(target_os = "macos") {
        ext.as_deref() == Some("app") && path.is_dir()
    } else {
        ext.as_deref() == Some("lnk") && path.is_file()
    }
}

fn scan(dir: &Path, depth: u8, out: &mut Vec<InstalledApp>) {
    let Ok(entries) = std::fs::read_dir(dir) else {
        return;
    };
    for entry in entries.flatten() {
        let path = entry.path();
        if is_app_entry(&path) {
            let name = path
                .file_stem()
                .map(|s| s.to_string_lossy().to_string())
                .unwrap_or_default();
            let lower = name.to_ascii_lowercase();
            if name.is_empty() || lower.contains("uninstall") {
                continue;
            }
            out.push(InstalledApp {
                name,
                path: path.to_string_lossy().to_string(),
            });
        } else if depth > 0 && path.is_dir() {
            scan(&path, depth - 1, out);
        }
    }
}

pub fn list() -> Vec<InstalledApp> {
    let depth = if cfg!(target_os = "windows") { 3 } else { 1 };
    let mut apps = Vec::new();
    for root in roots() {
        scan(&root, depth, &mut apps);
    }
    apps.sort_by(|a, b| {
        a.name
            .to_lowercase()
            .cmp(&b.name.to_lowercase())
            .then(a.path.cmp(&b.path))
    });
    apps.dedup_by(|a, b| a.name.eq_ignore_ascii_case(&b.name));
    apps
}

/// Only paths that the scan itself produced may become or launch an app charm.
pub fn is_known(path: &str) -> bool {
    let candidate = Path::new(path);
    is_app_entry(candidate)
        && roots().iter().any(|root| candidate.starts_with(root))
        && !path.contains("..")
}

pub fn launch(path: &str) -> Result<(), String> {
    if !is_known(path) {
        return Err("That app is no longer installed.".into());
    }
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("/usr/bin/open")
            .arg("-a")
            .arg(path)
            .spawn()
            .map(|_| ())
            .map_err(|_| "Couldn't open that app.".to_string())
    }
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x0800_0000;
        std::process::Command::new("explorer.exe")
            .arg(path)
            .creation_flags(CREATE_NO_WINDOW)
            .spawn()
            .map(|_| ())
            .map_err(|_| "Couldn't open that app.".to_string())
    }
    #[cfg(not(any(target_os = "macos", target_os = "windows")))]
    {
        Err("Opening apps isn't supported on this system yet.".into())
    }
}

/// The app's own icon as a PNG, drawn by AppKit. Must run on the main thread.
#[cfg(target_os = "macos")]
pub fn icon_png(path: &str, size: u32) -> Option<Vec<u8>> {
    use objc2::AllocAnyThread;
    use objc2_app_kit::{
        NSBitmapImageFileType, NSBitmapImageRep, NSDeviceRGBColorSpace, NSGraphicsContext,
        NSWorkspace,
    };
    use objc2_foundation::{NSDictionary, NSPoint, NSRect, NSSize, NSString};

    let icon = NSWorkspace::sharedWorkspace().iconForFile(&NSString::from_str(path));
    let side = size as isize;
    unsafe {
        let rep = NSBitmapImageRep::initWithBitmapDataPlanes_pixelsWide_pixelsHigh_bitsPerSample_samplesPerPixel_hasAlpha_isPlanar_colorSpaceName_bytesPerRow_bitsPerPixel(
            NSBitmapImageRep::alloc(),
            std::ptr::null_mut(),
            side,
            side,
            8,
            4,
            true,
            false,
            NSDeviceRGBColorSpace,
            0,
            0,
        )?;
        let ctx = NSGraphicsContext::graphicsContextWithBitmapImageRep(&rep)?;
        NSGraphicsContext::saveGraphicsState_class();
        NSGraphicsContext::setCurrentContext(Some(&ctx));
        icon.setSize(NSSize::new(size as f64, size as f64));
        icon.drawInRect(NSRect::new(
            NSPoint::new(0.0, 0.0),
            NSSize::new(size as f64, size as f64),
        ));
        ctx.flushGraphics();
        NSGraphicsContext::restoreGraphicsState_class();
        let data = rep
            .representationUsingType_properties(NSBitmapImageFileType::PNG, &NSDictionary::new())?;
        Some(data.to_vec())
    }
}

#[cfg(not(target_os = "macos"))]
pub fn icon_png(_path: &str, _size: u32) -> Option<Vec<u8>> {
    None
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn rejects_paths_outside_app_folders() {
        assert!(!is_known("/tmp/evil.app"));
        assert!(!is_known("/Applications/../tmp/evil.app"));
        assert!(!is_known("/bin/sh"));
    }

    #[cfg(target_os = "macos")]
    #[test]
    fn finds_system_apps() {
        let apps = list();
        assert!(apps
            .iter()
            .any(|a| a.name == "Calculator" || a.name == "TextEdit"));
        assert!(apps.iter().all(|a| is_known(&a.path)));
    }
}
