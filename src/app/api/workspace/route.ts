import { NextResponse } from "next/server";

import { isEphemeralCompanyId } from "@/lib/guest-workspace";
import { supabaseConfigured } from "@/lib/supabase/env";
import { createServerSupabase } from "@/lib/supabase/server";
import { persistGithubAccessToken } from "@/server/github-token";
import { readGithubSession, sealSecret } from "@/server/github-oauth";
import { fail, handleRouteError } from "@/server/http";
import {
  findUserByLogin,
  listProjectsForUser,
  ProjectAccessError,
  resolveActiveProject,
  saveOwnedProject,
  toProjectSummary,
  upsertGithubUser,
  workspaceFromProject,
} from "@/server/projects";
import { loadLegacyWorkspace } from "@/server/workspace";

export const runtime = "nodejs";

export async function GET() {
  if (!supabaseConfigured()) {
    return NextResponse.json(
      {
        configured: false,
        workspace: null,
        projects: [],
        activeProjectId: null,
      },
      { headers: { "cache-control": "no-store" } },
    );
  }

  const session = await readGithubSession();
  if (!session) {
    return NextResponse.json(
      {
        configured: true,
        workspace: null,
        projects: [],
        activeProjectId: null,
      },
      { headers: { "cache-control": "no-store" } },
    );
  }

  try {
    const user = await findUserByLogin(session.login);
    if (!user) {
      const legacy = await loadLegacyWorkspace(session.login);
      return NextResponse.json(
        {
          configured: true,
          workspace: legacy,
          projects: [],
          activeProjectId: null,
        },
        { headers: { "cache-control": "no-store" } },
      );
    }

    const projects = await listProjectsForUser(user.id);
    const active = await resolveActiveProject(user.id, { persist: true });

    if (active) {
      return NextResponse.json(
        {
          configured: true,
          workspace: workspaceFromProject(active),
          projects: projects.map(toProjectSummary),
          activeProjectId: active.id,
        },
        { headers: { "cache-control": "no-store" } },
      );
    }

    const legacy = await loadLegacyWorkspace(session.login);
    return NextResponse.json(
      {
        configured: true,
        workspace: legacy,
        projects: projects.map(toProjectSummary),
        activeProjectId: null,
      },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PUT(request: Request) {
  if (!supabaseConfigured()) {
    return NextResponse.json({ configured: false, saved: false });
  }

  const session = await readGithubSession();
  if (!session) {
    return NextResponse.json({ configured: true, saved: false }, { status: 401 });
  }

  try {
    const user =
      (await findUserByLogin(session.login)) ?? (await upsertGithubUser(session));
    const active = user
      ? await resolveActiveProject(user.id, { persist: true })
      : null;

    const body = (await request.json().catch(() => ({}))) as {
      draft?: { website?: string; github?: string; docsUrl?: string };
      snapshot?: Record<string, unknown>;
    };

    await persistGithubAccessToken(session.login, session.accessToken);

    if (active && user) {
      const incoming = body.snapshot;
      const incomingCompany =
        incoming && typeof incoming.company === "object" && incoming.company
          ? (incoming.company as { id?: string })
          : null;
      const storedCompany =
        active.snapshot &&
        typeof active.snapshot === "object" &&
        "company" in active.snapshot &&
        active.snapshot.company &&
        typeof active.snapshot.company === "object"
          ? (active.snapshot.company as { id?: string })
          : null;
      const skipDemoOverwrite =
        isEphemeralCompanyId(incomingCompany?.id) &&
        Boolean(storedCompany?.id) &&
        !isEphemeralCompanyId(storedCompany?.id);

      const saved = await saveOwnedProject(user.id, active.id, {
        website: body.draft?.website,
        docsUrl: body.draft?.docsUrl,
        snapshot: skipDemoOverwrite ? undefined : incoming,
      });

      return NextResponse.json({
        configured: true,
        saved: true,
        activeProjectId: saved.id,
      });
    }

    const supabase = createServerSupabase();
    if (!supabase) return fail("Supabase is not configured.", 503);

    const { error } = await supabase.from("workspaces").upsert(
      {
        device_id: session.login,
        website: body.draft?.website ?? "",
        github: body.draft?.github ?? "",
        docs_url: body.draft?.docsUrl ?? "",
        snapshot: body.snapshot ?? {},
        updated_at: new Date().toISOString(),
        github_token_sealed: sealSecret(session.accessToken),
      },
      { onConflict: "device_id" },
    );

    if (error) {
      return fail(error.message, 500);
    }

    return NextResponse.json({ configured: true, saved: true });
  } catch (error) {
    if (error instanceof ProjectAccessError) {
      return fail(error.message, error.status);
    }
    return handleRouteError(error);
  }
}
