import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import {
  resetCrafatarAvatarCache,
  useCrafatarAvatar,
} from "./useCrafatarAvatar";
import { MinecraftSkinService } from "../services/minecraft-skin-service";
import { localFileToDisplayUrl } from "../utils/local-file-url";

vi.mock("../services/minecraft-skin-service", () => ({
  MinecraftSkinService: {
    getCrafatarAvatar: vi.fn(),
  },
}));

vi.mock("../utils/local-file-url", async () => {
  const actual = await vi.importActual<typeof import("../utils/local-file-url")>(
    "../utils/local-file-url",
  );
  return {
    ...actual,
    localFileToDisplayUrl: vi.fn(),
  };
});

const LOCAL_PATH =
  "C:\\Users\\Peter\\AppData\\Roaming\\vxl\\VXLLauncher\\meta\\nmsr_face_cache\\face_v1_1484aaa5790044d1a6df17b62ca35ce0_64_true.png";

describe("useCrafatarAvatar", () => {
  beforeEach(() => {
    resetCrafatarAvatarCache();
    vi.mocked(MinecraftSkinService.getCrafatarAvatar).mockReset();
    vi.mocked(localFileToDisplayUrl).mockReset();
  });

  afterEach(() => {
    resetCrafatarAvatarCache();
  });

  it("does not expose a raw filesystem path when two components load the same avatar", async () => {
    let resolvePath!: (path: string) => void;
    vi.mocked(MinecraftSkinService.getCrafatarAvatar).mockImplementation(
      () =>
        new Promise<string>((resolve) => {
          resolvePath = resolve;
        }),
    );
    vi.mocked(localFileToDisplayUrl).mockResolvedValue("blob:face-avatar");

    const first = renderHook(() =>
      useCrafatarAvatar({ uuid: "1484aaa5-7900-44d1-a6df-17b62ca35ce0" }),
    );
    const second = renderHook(() =>
      useCrafatarAvatar({ uuid: "1484aaa5-7900-44d1-a6df-17b62ca35ce0" }),
    );

    resolvePath(LOCAL_PATH);

    await waitFor(() => {
      expect(first.result.current).toBe("blob:face-avatar");
      expect(second.result.current).toBe("blob:face-avatar");
    });

    expect(first.result.current?.startsWith("file:")).toBe(false);
    expect(second.result.current).not.toBe(LOCAL_PATH);
    expect(MinecraftSkinService.getCrafatarAvatar).toHaveBeenCalledTimes(1);
  });
});
