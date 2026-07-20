import motdParser from "@sfirew/minecraft-motd-parser";
import DOMPurify from "dompurify";

export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
  });
}

/**
 * Parses Minecraft MOTD (Message of the Day) or similar formatted text to HTML.
 */
export function parseMotdToHtml(motd: unknown): string {
  if (!motd) return '<span class="text-white/50">No description</span>';
  try {
    const html = motdParser.autoToHTML(motd);
    return sanitizeHtml(
      html || '<span class="text-white/50">No description</span>',
    );
  } catch (err) {
    console.error("Failed to parse MOTD:", err);
    if (typeof motd === "string") {
      const cleaned = motdParser.cleanCodes(motd);
      return sanitizeHtml(
        cleaned
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;")
          .replace(/'/g, "&#039;"),
      );
    }
    try {
      return sanitizeHtml(JSON.stringify(motd));
    } catch {
      return '<span class="text-red-400">Invalid MOTD format</span>';
    }
  }
}
