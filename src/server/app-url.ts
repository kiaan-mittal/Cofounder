import "server-only";

function vercelOrigin(): string | null {
  const host =
    process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim() ||
    process.env.VERCEL_URL?.trim();
  return host ? `https://${host.replace(/^https?:\/\//, "")}` : null;
}

function isLoopback(origin: string): boolean {
  return /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:|$|\/)/i.test(origin);
}

export function appOrigin(request?: Request): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "");

  // A loopback NEXT_PUBLIC_APP_URL on a deployed instance is always a
  // misconfiguration, and it is one that escapes into published artefacts:
  // a sitemap or share link pointing at localhost is worse than none at all.
  // Prefer the host Vercel tells us about over believing the variable.
  if (fromEnv && !(isLoopback(fromEnv) && process.env.VERCEL)) return fromEnv;

  if (request) {
    const host =
      request.headers.get("x-forwarded-host") ?? request.headers.get("host");
    const proto = request.headers.get("x-forwarded-proto") ?? "http";
    if (host) return `${proto}://${host}`.replace(/\/$/, "");
  }

  // sitemap.ts and robots.ts render without a Request, so they depend on this.
  return vercelOrigin() ?? fromEnv ?? "http://localhost:3000";
}

export function shareUrl(token: string, request?: Request): string {
  return `${appOrigin(request)}/share/${token}`;
}

export function watchUrl(token: string, request?: Request): string {
  return `${appOrigin(request)}/arena?watch=${token}`;
}
