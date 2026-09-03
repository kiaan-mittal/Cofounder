"use client";

export type WorkspacePath =
  | "/history"
  | "/calibration"
  | "/brain"
  | "/webmcp"
  | "/arena";

/**
 * Client-side hop so a tool result can return before the founder sees Brain,
 * History, Calibration, or WebMCP. Full reloads would wipe the guest floor,
 * so this clicks the existing header link (Next.js) or asks chrome to
 * router.push.
 */
export function openWorkspacePage(path: WorkspacePath) {
  if (typeof window === "undefined") return;
  if (window.location.pathname === path) return;
  void import("@/lib/supabase/sync").then((mod) => {
    mod.rememberGuestWorkspace();
  });
  window.setTimeout(() => {
    const link = document.querySelector<HTMLAnchorElement>(
      `header nav a[href="${path}"]`,
    );
    if (link) {
      link.click();
      return;
    }
    window.dispatchEvent(new CustomEvent("arena:navigate", { detail: path }));
  }, 400);
}
