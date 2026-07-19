let watcherStarted = false;
let backendReady = false;
let frontendReady = false;

export function removeBootSplash(): void {
  if (window.__bootSplashRemoved) {
    return;
  }

  window.__bootSplashRemoved = true;
  window.__stopBootSplashAnimation?.();
  document.getElementById("boot-splash")?.remove();
}

function tryDismissBootSplash(): void {
  if (backendReady && frontendReady) {
    removeBootSplash();
  }
}

export function signalBackendReady(): void {
  backendReady = true;
  tryDismissBootSplash();
}

export function signalFrontendReady(): void {
  frontendReady = true;
  tryDismissBootSplash();
}

export async function watchBootSplashDismissal(): Promise<void> {
  if (watcherStarted) {
    return;
  }
  watcherStarted = true;

  window.setTimeout(() => {
    console.warn("[startup] Splash safety timeout reached; dismissing splash.");
    signalBackendReady();
    signalFrontendReady();
  }, 90000);

  const [{ invoke }, { listen }] = await Promise.all([
    import("@tauri-apps/api/core"),
    import("@tauri-apps/api/event"),
  ]);

  listen("app-ready", signalBackendReady).catch((error) => {
    console.warn("[startup] Failed to listen for app-ready:", error);
  });

  const maxAttempts = 600;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      const ready = await invoke<boolean>("is_launcher_ready");
      if (ready) {
        signalBackendReady();
        return;
      }
    } catch {
      // IPC may not be ready yet during very early startup.
    }

    await new Promise((resolve) => window.setTimeout(resolve, 100));
  }

  console.warn("[startup] Timed out waiting for launcher readiness; continuing startup.");
  signalBackendReady();
}

declare global {
  interface Window {
    __bootSplashRemoved?: boolean;
    __stopBootSplashAnimation?: () => void;
  }
}
