use log::{error, info};
use std::sync::atomic::{AtomicBool, Ordering};
use tauri::{AppHandle, Emitter, Manager};

static APP_READY: AtomicBool = AtomicBool::new(false);

pub fn is_app_ready() -> bool {
    APP_READY.load(Ordering::SeqCst)
}

pub fn show_main_window(app_handle: &AppHandle) {
    if let Some(main_window) = app_handle.get_webview_window("main") {
        if let Err(e) = main_window.show() {
            error!("Failed to show main window: {}", e);
        } else if let Err(e) = main_window.set_focus() {
            error!("Failed to focus main window: {}", e);
        }
    } else {
        error!("Could not get main window handle to show it.");
    }
}

pub fn emit_app_ready(app_handle: &AppHandle) {
    APP_READY.store(true, Ordering::SeqCst);

    if let Some(main_window) = app_handle.get_webview_window("main") {
        if let Err(e) = main_window.emit("app-ready", ()) {
            error!("Failed to emit app-ready to main window: {}", e);
        }
    }

    if let Err(e) = app_handle.emit("app-ready", ()) {
        error!("Failed to emit app-ready event: {}", e);
    }

    info!("App ready event emitted.");
}
