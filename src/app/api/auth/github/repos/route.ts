import { NextResponse } from "next/server";

import { fail, handleRouteError } from "@/server/http";
import { readGithubSession } from "@/server/github-oauth";
import { listGithubRepos } from "@/server/github-repos";

export const runtime = "nodejs";

export async function GET() {
  try {
    const session = await readGithubSession();
    if (!session) {
      return fail("Sign in with GitHub to list your repositories.", 401);
    }

    const repos = await listGithubRepos(session);
    return NextResponse.json({ repos });
  } catch (error) {
    return handleRouteError(error);
  }
}
