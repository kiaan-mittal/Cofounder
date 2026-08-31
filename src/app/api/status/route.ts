import { NextResponse } from "next/server";

import type { GithubStatus } from "@/lib/github";
import { supabaseConfigured } from "@/lib/supabase/env";
import {
  githubOAuthConfigured,
  publicGithubIdentity,
  readGithubSession,
} from "@/server/github-oauth";
import { llmConfigured } from "@/server/llm";
import { composioConfigured } from "@/server/composio";

export const runtime = "nodejs";

/** Lets the client show an honest banner instead of failing mid-decision. */
export async function GET() {
  const session = await readGithubSession();
  const body: GithubStatus = {
    model: llmConfigured(),
    github: Boolean(process.env.GITHUB_TOKEN),
    githubOAuth: githubOAuthConfigured(),
    githubUser: publicGithubIdentity(session),
    supabase: supabaseConfigured(),
    composio: composioConfigured(),
  };
  return NextResponse.json(body, {
    headers: { "cache-control": "no-store" },
  });
}
