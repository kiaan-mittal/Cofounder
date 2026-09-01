import { NextResponse } from "next/server";

import { EXPORT_TOOLKITS } from "@/server/composio-export";
import { waitForExportConnection } from "@/server/composio-export";
import { safeReturnTo } from "@/server/github-oauth";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const toolkit = url.searchParams.get("toolkit") ?? "";
  const returnTo = safeReturnTo(url.searchParams.get("returnTo"), "/arena");
  const connectionId =
    url.searchParams.get("connectedAccountId") ||
    url.searchParams.get("connectionId") ||
    url.searchParams.get("id");

  const dest = new URL(returnTo, url.origin);
  if (EXPORT_TOOLKITS.includes(toolkit as (typeof EXPORT_TOOLKITS)[number])) {
    dest.searchParams.set("export", toolkit);
  }

  if (connectionId) {
    try {
      await waitForExportConnection(connectionId, 20_000);
      dest.searchParams.set("export_ok", "1");
    } catch {
      dest.searchParams.set("export_ok", "0");
    }
  } else if (url.searchParams.get("status") === "success") {
    dest.searchParams.set("export_ok", "1");
  }

  return NextResponse.redirect(dest);
}
