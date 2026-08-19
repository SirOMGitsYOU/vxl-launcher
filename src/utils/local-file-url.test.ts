import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearLocalFileUrlCache,
  isDisplayableRemoteUrl,
  isUnsafeLocalResourceUrl,
  localFileToDisplayUrl,
  toFilesystemPath,
} from "./local-file-url";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

import { invoke } from "@tauri-apps/api/core";

describe("local-file-url", () => {
  beforeEach(() => {
    vi.mocked(invoke).mockReset();
    clearLocalFileUrlCache();
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      writable: true,
      value: vi.fn(() => "blob:avatar"),
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      writable: true,
      value: vi.fn(),
    });
  });

  afterEach(() => {
    clearLocalFileUrlCache();
  });

  it("does not treat file URLs as displayable", () => {
    expect(
      isDisplayableRemoteUrl(
        "file:///C:/Users/Peter/AppData/Roaming/vxl/VXLLauncher/meta/nmsr_face_cache/face.png",
      ),
    ).toBe(false);
    expect(isDisplayableRemoteUrl("https://nmsr.nickac.dev/face/abc")).toBe(true);
    expect(isDisplayableRemoteUrl("blob:http://localhost/1")).toBe(true);
  });

  it("flags local filesystem paths as unsafe for img src", () => {
    expect(
      isUnsafeLocalResourceUrl(
        "file:///C:/Users/Peter/AppData/Roaming/vxl/VXLLauncher/meta/nmsr_face_cache/face.png",
      ),
    ).toBe(true);
    expect(
      isUnsafeLocalResourceUrl(
        "C:\\Users\\Peter\\AppData\\Roaming\\vxl\\VXLLauncher\\meta\\nmsr_face_cache\\face.png",
      ),
    ).toBe(true);
    expect(isUnsafeLocalResourceUrl("blob:http://localhost/1")).toBe(false);
  });

  it("converts file:// URLs to filesystem paths", () => {
    expect(
      toFilesystemPath(
        "file:///C:/Users/Peter/AppData/Roaming/vxl/VXLLauncher/meta/nmsr_face_cache/face_v1_abc_64_true.png",
      ),
    ).toBe(
      "C:\\Users\\Peter\\AppData\\Roaming\\vxl\\VXLLauncher\\meta\\nmsr_face_cache\\face_v1_abc_64_true.png",
    );
  });

  it("reads file:// paths via the backend and returns a blob URL", async () => {
    vi.mocked(invoke).mockResolvedValue(new Uint8Array([137, 80, 78, 71]));

    const url = await localFileToDisplayUrl(
      "file:///C:/Users/Peter/AppData/Roaming/vxl/VXLLauncher/meta/nmsr_face_cache/face_v1_abc_64_true.png",
    );

    expect(url).toBe("blob:avatar");
    expect(url.startsWith("file:")).toBe(false);
    expect(invoke).toHaveBeenCalledWith("read_file_bytes", {
      filePath:
        "C:\\Users\\Peter\\AppData\\Roaming\\vxl\\VXLLauncher\\meta\\nmsr_face_cache\\face_v1_abc_64_true.png",
    });
  });
});
