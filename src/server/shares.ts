import "server-only";

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { isDecisionBrief, type DecisionBrief } from "@/lib/decision-brief";
import { id } from "@/lib/id";
import { createServerSupabase } from "@/lib/supabase/server";
import { shareUrl } from "@/server/app-url";

const LOCAL_FILE = join(process.cwd(), ".decision-shares.local.json");

type ShareRow = {
  token: string;
  userLogin: string | null;
  projectId: string | null;
  decisionId: string | null;
  brief: DecisionBrief;
  createdAt: string;
};

function readLocal(): ShareRow[] {
  try {
    if (!existsSync(LOCAL_FILE)) return [];
    const raw = JSON.parse(readFileSync(LOCAL_FILE, "utf8")) as unknown;
    return Array.isArray(raw) ? (raw as ShareRow[]) : [];
  } catch {
    return [];
  }
}

function writeLocal(rows: ShareRow[]) {
  try {
    writeFileSync(LOCAL_FILE, `${JSON.stringify(rows.slice(0, 80), null, 2)}\n`);
  } catch {
    /* optional local cache */
  }
}

export async function createDecisionShare(input: {
  brief: DecisionBrief;
  userLogin?: string | null;
  projectId?: string | null;
  decisionId?: string | null;
  request?: Request;
}): Promise<{ token: string; url: string }> {
  const token = id("shr");
  const createdAt = new Date().toISOString();
  const supabase = createServerSupabase();
  if (supabase) {
    const { error } = await supabase.from("decision_shares").insert({
      token,
      user_login: input.userLogin ?? null,
      project_id: input.projectId ?? null,
      decision_id: input.decisionId ?? null,
      brief: input.brief,
      created_at: createdAt,
    });
    if (error) {
      writeLocal([
        {
          token,
          userLogin: input.userLogin ?? null,
          projectId: input.projectId ?? null,
          decisionId: input.decisionId ?? null,
          brief: input.brief,
          createdAt,
        },
        ...readLocal(),
      ]);
    }
  } else {
    writeLocal([
      {
        token,
        userLogin: input.userLogin ?? null,
        projectId: input.projectId ?? null,
        decisionId: input.decisionId ?? null,
        brief: input.brief,
        createdAt,
      },
      ...readLocal(),
    ]);
  }
  return { token, url: shareUrl(token, input.request) };
}

export async function readDecisionShare(token: string): Promise<DecisionBrief | null> {
  const supabase = createServerSupabase();
  if (supabase) {
    const { data } = await supabase
      .from("decision_shares")
      .select("brief")
      .eq("token", token)
      .maybeSingle();
    if (data && isDecisionBrief(data.brief)) return data.brief;
  }
  const local = readLocal().find((row) => row.token === token);
  return local?.brief ?? null;
}
