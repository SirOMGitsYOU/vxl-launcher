import { invoke } from "@tauri-apps/api/core";
import type { MojangStatusResponse } from "../types/mojang-status";

export async function fetchMojangServiceStatus(): Promise<MojangStatusResponse> {
  return invoke<MojangStatusResponse>("fetch_mojang_service_status_command");
}
