import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  removeBootSplash,
  signalBackendReady,
  signalFrontendReady,
} from "./boot-splash";

describe("boot-splash", () => {
  beforeEach(() => {
    window.__bootSplashRemoved = undefined;
    document.body.innerHTML = '<div id="boot-splash"></div>';
  });

  it("dismisses only when backend and frontend are ready", () => {
    signalBackendReady();
    expect(document.getElementById("boot-splash")).not.toBeNull();

    signalFrontendReady();
    expect(document.getElementById("boot-splash")).toBeNull();
  });

  it("removeBootSplash is idempotent", () => {
    removeBootSplash();
    removeBootSplash();
    expect(window.__bootSplashRemoved).toBe(true);
  });
});
