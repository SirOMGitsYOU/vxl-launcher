export const v2 = {
  surface: {
    base: "var(--surface-base)",
    raised: "var(--surface-raised)",
    overlay: "var(--surface-overlay)",
  },
  border: "var(--surface-border)",
  borderStrong: "var(--surface-border-strong)",
  text: {
    primary: "var(--text-primary)",
    secondary: "var(--text-secondary)",
    muted: "var(--text-muted)",
  },
  accent: "var(--accent)",
  radius: "8px",
} as const;

export const selectTabBase =
  "vxl-select-tab inline-flex items-center gap-2 px-3.5 py-2 text-sm transition-colors";
export const selectTabActive = "vxl-select-tab-active";
export const selectTabInactive =
  "text-[var(--text-secondary)] hover:text-white hover:bg-[var(--surface-overlay)]/60";

export const cardBase =
  "rounded-xl border border-[var(--surface-border)] bg-[var(--surface-overlay)] transition-all duration-150";
export const cardInteractive =
  "cursor-pointer vxl-list-item-accent-hover";
export const cardSelected =
  "border-[var(--accent)] vxl-accent-glow bg-[rgba(var(--accent-rgb),0.06)]";
export const listItemAccentHover = "vxl-list-item-accent-hover";
