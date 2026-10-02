//! Thin OS-specific layer. Everything outside this module stays platform-neutral.

#[cfg(target_os = "macos")]
mod imp {
    use objc2_app_kit::{
        NSApplicationActivationOptions, NSEvent, NSRunningApplication, NSWindow,
        NSWindowCollectionBehavior, NSWorkspace,
    };
    use tauri::WebviewWindow;

    #[repr(C)]
    #[derive(Clone, Copy)]
    struct CGPoint {
        x: f64,
        y: f64,
    }
    #[repr(C)]
    #[derive(Clone, Copy)]
    struct CGSize {
        width: f64,
        height: f64,
    }
    #[repr(C)]
    #[derive(Clone, Copy)]
    struct CGRect {
        origin: CGPoint,
        size: CGSize,
    }

    #[link(name = "CoreGraphics", kind = "framework")]
    extern "C" {
        fn CGMainDisplayID() -> u32;
        fn CGDisplayBounds(display: u32) -> CGRect;
        fn CGEventSourceSecondsSinceLastEventType(state: i32, event_type: u32) -> f64;
        fn CGWindowLevelForKey(key: i32) -> i32;
    }

    /// Seconds since the user last touched the mouse, trackpad, or keyboard.
    pub fn seconds_since_input() -> Option<f64> {
        const COMBINED_SESSION_STATE: i32 = 0;
        const ANY_INPUT_EVENT: u32 = !0;
        let secs = unsafe {
            CGEventSourceSecondsSinceLastEventType(COMBINED_SESSION_STATE, ANY_INPUT_EVENT)
        };
        secs.is_finite().then_some(secs)
    }

    /// Cursor in global logical points with a top-left origin, matching Tauri's
    /// logical window positions on every display regardless of scale factor.
    pub fn cursor_position(_scale: f64) -> Option<(f64, f64)> {
        let point = NSEvent::mouseLocation();
        let main_height = unsafe { CGDisplayBounds(CGMainDisplayID()) }.size.height;
        Some((point.x, main_height - point.y))
    }

    pub fn apply_window_behavior(window: &WebviewWindow, all_spaces: bool, over_fullscreen: bool) {
        let target = window.clone();
        let _ = window.run_on_main_thread(move || {
            let Ok(ptr) = target.ns_window() else { return };
            let ns_window: &NSWindow = unsafe { &*(ptr as *const NSWindow) };
            let mut behavior =
                NSWindowCollectionBehavior::Stationary | NSWindowCollectionBehavior::IgnoresCycle;
            behavior |= if all_spaces {
                NSWindowCollectionBehavior::CanJoinAllSpaces
            } else {
                NSWindowCollectionBehavior::Managed
            };
            behavior |= if over_fullscreen {
                NSWindowCollectionBehavior::FullScreenAuxiliary
            } else {
                NSWindowCollectionBehavior::FullScreenNone
            };
            ns_window.setCollectionBehavior(behavior);
            ns_window.setHidesOnDeactivate(false);
        });
    }

    /// Above the menu bar when on top, so the string can hang from the screen's top edge.
    /// Otherwise just above the desktop icons: over the wallpaper, behind every app window.
    pub fn set_overlay_level(window: &WebviewWindow, on_top: bool) {
        const STATUS_WINDOW_LEVEL: isize = 25;
        const DESKTOP_ICON_LEVEL_KEY: i32 = 18;
        let target = window.clone();
        let _ = window.run_on_main_thread(move || {
            let Ok(ptr) = target.ns_window() else { return };
            let ns_window: &NSWindow = unsafe { &*(ptr as *const NSWindow) };
            let level = if on_top {
                STATUS_WINDOW_LEVEL
            } else {
                unsafe { CGWindowLevelForKey(DESKTOP_ICON_LEVEL_KEY) as isize + 1 }
            };
            ns_window.setLevel(level);
        });
    }

    pub fn set_click_through(window: &WebviewWindow, ignore: bool) {
        let _ = window.set_ignore_cursor_events(ignore);
    }

    pub fn frontmost_app_pid() -> Option<i32> {
        let workspace = NSWorkspace::sharedWorkspace();
        let app = workspace.frontmostApplication()?;
        Some(app.processIdentifier())
    }

    pub fn own_pid() -> i32 {
        std::process::id() as i32
    }

    /// Gives focus back to the app the user was in before they touched the charm.
    pub fn activate_pid(pid: i32) {
        if let Some(app) = NSRunningApplication::runningApplicationWithProcessIdentifier(pid) {
            #[allow(deprecated)]
            app.activateWithOptions(NSApplicationActivationOptions::empty());
        }
    }
}

#[cfg(target_os = "windows")]
mod imp {
    use std::sync::atomic::{AtomicBool, Ordering};
    use tauri::WebviewWindow;
    use windows_sys::Win32::Foundation::POINT;
    use windows_sys::Win32::System::SystemInformation::GetTickCount;
    use windows_sys::Win32::UI::Input::KeyboardAndMouse::{GetLastInputInfo, LASTINPUTINFO};
    use windows_sys::Win32::UI::WindowsAndMessaging::{
        GetCursorPos, GetWindowLongPtrW, SetWindowLongPtrW, GWL_EXSTYLE, WS_EX_LAYERED,
        WS_EX_TRANSPARENT,
    };

    static CLICK_THROUGH: AtomicBool = AtomicBool::new(true);

    /// Tauri's set_ignore_cursor_events rewrites every window style and forces a frame
    /// change, which makes Windows paint a title bar on this undecorated window. Flip only
    /// WS_EX_TRANSPARENT instead, keeping the window layered so nothing else changes.
    pub fn set_click_through(window: &WebviewWindow, ignore: bool) {
        CLICK_THROUGH.store(ignore, Ordering::Relaxed);
        let target = window.clone();
        let _ = window.run_on_main_thread(move || {
            let Ok(hwnd) = target.hwnd() else { return };
            let hwnd = hwnd.0 as windows_sys::Win32::Foundation::HWND;
            unsafe {
                let current = GetWindowLongPtrW(hwnd, GWL_EXSTYLE);
                let mut next = current | WS_EX_LAYERED as isize;
                if ignore {
                    next |= WS_EX_TRANSPARENT as isize;
                } else {
                    next &= !(WS_EX_TRANSPARENT as isize);
                }
                if next != current {
                    SetWindowLongPtrW(hwnd, GWL_EXSTYLE, next);
                }
            }
        });
    }

    /// Cursor in logical pixels. Windows reports physical pixels, so divide by the
    /// overlay display's scale to match the logical window origin.
    pub fn cursor_position(scale: f64) -> Option<(f64, f64)> {
        let mut p = POINT { x: 0, y: 0 };
        if unsafe { GetCursorPos(&mut p) } == 0 {
            return None;
        }
        let scale = if scale > 0.0 { scale } else { 1.0 };
        Some((p.x as f64 / scale, p.y as f64 / scale))
    }

    pub fn seconds_since_input() -> Option<f64> {
        let mut info = LASTINPUTINFO {
            cbSize: std::mem::size_of::<LASTINPUTINFO>() as u32,
            dwTime: 0,
        };
        if unsafe { GetLastInputInfo(&mut info) } == 0 {
            return None;
        }
        let now = unsafe { GetTickCount() };
        Some(now.wrapping_sub(info.dwTime) as f64 / 1000.0)
    }

    pub fn apply_window_behavior(
        _window: &WebviewWindow,
        _all_spaces: bool,
        _over_fullscreen: bool,
    ) {
    }

    pub fn set_overlay_level(window: &WebviewWindow, on_top: bool) {
        let _ = window.set_always_on_top(on_top);
        let _ = window.set_always_on_bottom(!on_top);
        // Changing z-order makes Tauri rebuild the window styles, dropping our bits.
        set_click_through(window, CLICK_THROUGH.load(Ordering::Relaxed));
    }

    // The overlay is created non-focusable (WS_EX_NOACTIVATE), so it never steals focus
    // and there is nothing to give back.
    pub fn frontmost_app_pid() -> Option<i32> {
        None
    }
    pub fn own_pid() -> i32 {
        std::process::id() as i32
    }
    pub fn activate_pid(_pid: i32) {}
}

#[cfg(not(any(target_os = "macos", target_os = "windows")))]
mod imp {
    use tauri::WebviewWindow;

    pub fn cursor_position(_scale: f64) -> Option<(f64, f64)> {
        None
    }
    pub fn seconds_since_input() -> Option<f64> {
        None
    }
    pub fn set_click_through(window: &WebviewWindow, ignore: bool) {
        let _ = window.set_ignore_cursor_events(ignore);
    }
    pub fn apply_window_behavior(window: &WebviewWindow, all_spaces: bool, _over_fullscreen: bool) {
        let _ = window.set_visible_on_all_workspaces(all_spaces);
    }
    pub fn set_overlay_level(window: &WebviewWindow, on_top: bool) {
        let _ = window.set_always_on_top(on_top);
    }
    pub fn frontmost_app_pid() -> Option<i32> {
        None
    }
    pub fn own_pid() -> i32 {
        std::process::id() as i32
    }
    pub fn activate_pid(_pid: i32) {}
}

pub use imp::*;
