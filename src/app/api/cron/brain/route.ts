import { NextResponse } from "next/server";

import { refreshStaleBrains } from "@/server/refresh-brain";

export const runtime = "nodejs";
export const maxDuration = 300;
export const dynamic = "force-dynamic";

function authorized(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  const header = request.headers.get("authorization");
  if (secret) return header === `Bearer ${secret}`;
  if (process.env.NODE_ENV !== "production") return true;
  return false;
}

async function run(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { results, scanned } = await refreshStaleBrains();
    const refreshed = results.filter((item) => item.status === "refreshed").length;
    const failed = results.filter((item) => item.status === "failed").length;
    return NextResponse.json({
      ok: failed === 0,
      scanned,
      refreshed,
      failed,
      results,
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    console.error("Brain refresh cron failed:", detail);
    return NextResponse.json(
      { ok: false, error: "Brain refresh failed.", hint: detail },
      { status: 500 },
    );
  }
}

/** Vercel Cron sends GET. The GitHub Actions workflow uses the same endpoint. */
export async function GET(request: Request) {
  return run(request);
}

export async function POST(request: Request) {
  return run(request);
}
