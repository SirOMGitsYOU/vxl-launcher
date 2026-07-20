export const MODRINTH_SEARCH_DEBUG = false;

export function debugLog(...args: unknown[]): void {
  if (MODRINTH_SEARCH_DEBUG) {
    console.log(...args);
  }
}
