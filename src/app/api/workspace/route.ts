import { NextResponse } from "next/server";

import { supabaseConfigured } from "@/lib/supabase/env";
import { createServerSupabase } from "@/lib/supabase/server";
import { readGithubSession } from "@/server/github-oauth";

export const runtime = "nodejs";

export async function GET() {
  if (!supabaseConfigured()) {
    return NextResponse.json(
      { configured: false, workspace: null },
      { headers: { "cache-control": "no-store" } },
    );
  }

  const session = await readGithubSession();
  const supabase = createServerSupabase();
  if (!supabase || !session) {
    return NextResponse.json(
      { configured: Boolean(supabase), workspace: null },
      { headers: { "cache-control": "no-store" } },
    );
  }

  const { data, error } = await supabase
    .from("workspaces")
    .select("website, github, docs_url, snapshot, updated_at")
    .eq("device_id", session.login)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { configured: true, workspace: null, error: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json(
    { configured: true, workspace: data },
    { headers: { "cache-control": "no-store" } },
  );
}

export async function PUT(request: Request) {
  if (!supabaseConfigured()) {
    return NextResponse.json({ configured: false, saved: false });
  }

  const session = await readGithubSession();
  const supabase = createServerSupabase();
  if (!supabase || !session) {
    return NextResponse.json({ configured: Boolean(supabase), saved: false });
  }

  const body = (await request.json().catch(() => ({}))) as {
    draft?: { website?: string; github?: string; docsUrl?: string };
    snapshot?: Record<string, unknown>;
  };

  const { error } = await supabase.from("workspaces").upsert(
    {
      device_id: session.login,
      website: body.draft?.website ?? "",
      github: body.draft?.github ?? "",
      docs_url: body.draft?.docsUrl ?? "",
      snapshot: body.snapshot ?? {},
      updated_at: new Date().toISOString(),
    },
    { onConflict: "device_id" },
  );

  if (error) {
    return NextResponse.json(
      { configured: true, saved: false, error: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ configured: true, saved: true });
}
