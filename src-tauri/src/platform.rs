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
    }

    /// Cursor in global logical points with a top-left origin, matching Tauri's
    /// logical window positions on every display regardless of scale factor.
    pub fn cursor_position() -> Option<(f64, f64)> {
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

#[cfg(not(target_os = "macos"))]
mod imp {
    use tauri::WebviewWindow;

    pub fn cursor_position() -> Option<(f64, f64)> {
        None
    }
    pub fn apply_window_behavior(window: &WebviewWindow, all_spaces: bool, _over_fullscreen: bool) {
        let _ = window.set_visible_on_all_workspaces(all_spaces);
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
