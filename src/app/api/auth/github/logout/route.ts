import { NextResponse } from "next/server";

import { clearGithubSession, safeReturnTo } from "@/server/github-oauth";

export const runtime = "nodejs";

export async function GET(request: Request) {
  await clearGithubSession();
  const url = new URL(request.url);
  return NextResponse.redirect(
    new URL(safeReturnTo(url.searchParams.get("returnTo"), "/"), url.origin),
  );
}
