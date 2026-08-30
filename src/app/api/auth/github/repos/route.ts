import { NextResponse } from "next/server";

import type { GithubRepoChoice } from "@/lib/github";
import { fail, handleRouteError } from "@/server/http";
import { readGithubSession } from "@/server/github-oauth";

export const runtime = "nodejs";

export async function GET() {
  try {
    const session = await readGithubSession();
    if (!session) {
      return fail("Sign in with GitHub to list your repositories.", 401);
    }

    const response = await fetch(
      "https://api.github.com/user/repos?per_page=100&sort=updated&affiliation=owner,collaborator,organization_member",
      {
        headers: {
          accept: "application/vnd.github+json",
          authorization: `Bearer ${session.accessToken}`,
          "x-github-api-version": "2022-11-28",
          "user-agent": "DecisionArena/1.0",
        },
        cache: "no-store",
      },
    );

    if (!response.ok) {
      return fail(
        "GitHub would not list your repositories.",
        502,
        `GitHub returned ${response.status}.`,
      );
    }

    const rows = (await response.json()) as Array<{
      full_name?: string;
      private?: boolean;
      description?: string | null;
    }>;

    const repos: GithubRepoChoice[] = rows
      .filter((row) => typeof row.full_name === "string" && row.full_name)
      .map((row) => ({
        fullName: row.full_name as string,
        private: Boolean(row.private),
        description: row.description ?? "",
      }));

    return NextResponse.json({ repos });
  } catch (error) {
    return handleRouteError(error);
  }
}
