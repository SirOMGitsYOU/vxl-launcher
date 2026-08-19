/**
 * Turns unknown invoke/updater errors into a readable string.
 * Tauri often rejects with nested objects, which String(err) renders as "[object Object]".
 */
export function formatErrorMessage(error: unknown, depth = 0): string {
  if (error == null) {
    return "Unknown error";
  }

  if (depth > 6) {
    return "Unknown error";
  }

  if (typeof error === "string") {
    const trimmed = error.trim();
    if (
      (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
      (trimmed.startsWith("[") && trimmed.endsWith("]"))
    ) {
      try {
        return formatErrorMessage(JSON.parse(trimmed), depth + 1);
      } catch {
        return error;
      }
    }
    return error;
  }

  if (error instanceof Error) {
    return formatErrorMessage(error.message, depth + 1) || error.name;
  }

  if (typeof error === "object") {
    const obj = error as Record<string, unknown>;
    for (const key of ["message", "error", "kind", "data", "reason"]) {
      const nested = obj[key];
      if (nested == null || nested === error) {
        continue;
      }
      const formatted = formatErrorMessage(nested, depth + 1);
      if (formatted && formatted !== "[object Object]") {
        return formatted;
      }
    }

    try {
      const json = JSON.stringify(error);
      if (json && json !== "{}" && json !== "[]") {
        return json;
      }
    } catch {
      // Ignore circular structures and fall through.
    }
  }

  const fallback = String(error);
  return fallback === "[object Object]" ? "Unknown error" : fallback;
}
