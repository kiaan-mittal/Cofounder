"use client";

const TOKEN_KEY = "da-watch-token";
const WRITE_KEY = "da-watch-write-key";

export function isWatchToken(
  value: string | null | undefined,
): value is string {
  return Boolean(value && value.startsWith("wch_"));
}

export function isWatchPublisher(token: string): boolean {
  try {
    return (
      sessionStorage.getItem(TOKEN_KEY) === token &&
      Boolean(sessionStorage.getItem(WRITE_KEY))
    );
  } catch {
    return false;
  }
}

export function readWatchSession(): { token: string; writeKey: string } | null {
  try {
    const token = sessionStorage.getItem(TOKEN_KEY);
    const writeKey = sessionStorage.getItem(WRITE_KEY);
    if (isWatchToken(token) && writeKey) return { token, writeKey };
    return null;
  } catch {
    return null;
  }
}

export function writeWatchSession(token: string, writeKey: string) {
  try {
    sessionStorage.setItem(TOKEN_KEY, token);
    sessionStorage.setItem(WRITE_KEY, writeKey);
  } catch {
    /* private mode */
  }
}

export function clearWatchSession() {
  try {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(WRITE_KEY);
  } catch {
    /* private mode */
  }
}

export function watchPageUrl(token: string) {
  if (typeof window === "undefined") return `/arena?watch=${token}`;
  return `${window.location.origin}/arena?watch=${token}`;
}
