import "server-only";

import { isEphemeralCompanyId } from "@/lib/guest-workspace";
import { createServerSupabase } from "@/lib/supabase/server";
import type { Company } from "@/lib/types";
import { buildCompanyFromSources } from "@/server/build-company";
import { readSealedGithubToken } from "@/server/github-token";

/** Skip a brain that was rebuilt in the last 60 hours so overlapping crons do not double-charge. */
const STALE_AFTER_MS = 60 * 60 * 1000 * 60;
/** Each rebuild can take a couple of minutes; stay inside the function budget. */
const MAX_PER_RUN = 4;

export type BrainRefreshResult = {
  login: string;
  status: "refreshed" | "skipped" | "failed";
  detail: string;
};

type ProjectCronRow = {
  id: string;
  label: string;
  website: string;
  github: string;
  docs_url: string;
  snapshot: Record<string, unknown> | null;
  github_token_sealed?: string | null;
  composio_user_id?: string | null;
};

function asCompany(value: unknown): Company | null {
  if (!value || typeof value !== "object") return null;
  const company = value as Partial<Company>;
  if (!company.id || !company.brain) return null;
  return company as Company;
}

function sourcesFor(row: ProjectCronRow, company: Company | null) {
  const website = (row.website || company?.website || "").trim();
  const github = (row.github || company?.github || "").trim();
  const docsUrl = (row.docs_url || company?.docsUrl || "").trim();
  return { website, github, docsUrl };
}

function generatedAtMs(company: Company | null) {
  const stamp = company?.brain?.generatedAt;
  if (!stamp) return 0;
  const ms = Date.parse(stamp);
  return Number.isFinite(ms) ? ms : 0;
}

function isStale(company: Company | null) {
  const generated = generatedAtMs(company);
  if (!generated) return true;
  return Date.now() - generated >= STALE_AFTER_MS;
}

function githubSlug(owner: string, name: string) {
  if (!owner || !name) return "";
  return `${owner}/${name}`;
}

async function listRefreshTargets() {
  const supabase = createServerSupabase();
  if (!supabase) return { supabase: null, rows: [] as ProjectCronRow[] };

  const joined = await supabase.from("projects").select(`
      id,
      name,
      website_url,
      github_owner,
      github_repo_name,
      docs_url,
      snapshot,
      users (
        github_login,
        github_token_sealed,
        composio_user_id
      )
    `);

  const projects =
    joined.error && /composio_user_id/i.test(joined.error.message)
      ? await supabase.from("projects").select(`
      id,
      name,
      website_url,
      github_owner,
      github_repo_name,
      docs_url,
      snapshot,
      users (
        github_login,
        github_token_sealed
      )
    `)
      : joined;

  if (!projects.error) {
    const rows: ProjectCronRow[] = (projects.data ?? []).map((row) => {
      const user = Array.isArray(row.users) ? row.users[0] : row.users;
      return {
        id: row.id as string,
        label: `${user?.github_login ?? "user"}/${row.name}`,
        website: (row.website_url as string) || "",
        github: githubSlug(
          (row.github_owner as string) || "",
          (row.github_repo_name as string) || "",
        ),
        docs_url: (row.docs_url as string) || "",
        snapshot:
          row.snapshot && typeof row.snapshot === "object"
            ? (row.snapshot as Record<string, unknown>)
            : {},
        github_token_sealed: user?.github_token_sealed ?? null,
        composio_user_id:
          user && "composio_user_id" in user
            ? ((user as { composio_user_id?: string | null }).composio_user_id ??
              null)
            : null,
      };
    });
    return { supabase, rows };
  }

  console.error(
    "Brain refresh: projects table unavailable, falling back:",
    projects.error.message,
  );

  const withToken = await supabase
    .from("workspaces")
    .select("device_id, website, github, docs_url, snapshot, github_token_sealed");

  const source = withToken.error
    ? await supabase
        .from("workspaces")
        .select("device_id, website, github, docs_url, snapshot")
    : withToken;

  if (source.error) {
    console.error("Brain refresh: could not list workspaces:", source.error.message);
    return { supabase, rows: [] as ProjectCronRow[] };
  }

  const rows: ProjectCronRow[] = (source.data ?? []).map((row) => ({
    id: row.device_id as string,
    label: row.device_id as string,
    website: (row.website as string) || "",
    github: (row.github as string) || "",
    docs_url: (row.docs_url as string) || "",
    snapshot:
      row.snapshot && typeof row.snapshot === "object"
        ? (row.snapshot as Record<string, unknown>)
        : {},
    github_token_sealed:
      "github_token_sealed" in row
        ? ((row.github_token_sealed as string | null) ?? null)
        : null,
  }));

  return { supabase, rows, legacy: true as const };
}

/**
 * Re-scrape each project's website and GitHub repo, then rewrite the Brain
 * while leaving decisions and the rest of the snapshot intact.
 */
export async function refreshStaleBrains(): Promise<{
  results: BrainRefreshResult[];
  scanned: number;
}> {
  const listed = await listRefreshTargets();
  const { supabase, rows } = listed;
  const legacy = "legacy" in listed && listed.legacy;
  if (!supabase) {
    return {
      scanned: 0,
      results: [
        {
          login: "-",
          status: "failed",
          detail: "Supabase is not configured, so there is no workspace to refresh.",
        },
      ],
    };
  }

  const ranked = rows
    .map((row) => {
      const snapshot =
        row.snapshot && typeof row.snapshot === "object" ? row.snapshot : {};
      const company = asCompany(snapshot.company);
      return { row, snapshot, company };
    })
    .filter(({ row, company }) => {
      if (isEphemeralCompanyId(company?.id)) return false;
      const sources = sourcesFor(row, company);
      return Boolean(sources.website || sources.github);
    })
    .sort((a, b) => generatedAtMs(a.company) - generatedAtMs(b.company));

  const stale = ranked.filter(({ company }) => isStale(company));
  const due = stale.slice(0, MAX_PER_RUN);
  const results: BrainRefreshResult[] = [
    ...ranked
      .filter(({ company }) => !isStale(company))
      .map(({ row }) => ({
        login: row.label,
        status: "skipped" as const,
        detail: "Brain was rebuilt recently.",
      })),
    ...stale.slice(MAX_PER_RUN).map(({ row }) => ({
      login: row.label,
      status: "skipped" as const,
      detail: "Queued for a later run.",
    })),
  ];

  for (const { row, snapshot, company } of due) {
    const sources = sourcesFor(row, company);
    try {
      const built = await buildCompanyFromSources({
        ...sources,
        accessToken: readSealedGithubToken(row.github_token_sealed),
        composioUserId: row.composio_user_id || undefined,
        existing: company,
      });

      if (!built.ok) {
        console.error("Brain refresh failed for", row.label, built.message);
        results.push({
          login: row.label,
          status: "failed",
          detail: built.hint ? `${built.message} ${built.hint}` : built.message,
        });
        continue;
      }

      const nextSnapshot = { ...snapshot, company: built.company };
      const { error } = legacy
        ? await supabase
            .from("workspaces")
            .update({
              website: sources.website,
              github: sources.github,
              docs_url: sources.docsUrl,
              snapshot: nextSnapshot,
              updated_at: new Date().toISOString(),
            })
            .eq("device_id", row.id)
        : await supabase
            .from("projects")
            .update({
              website_url: sources.website,
              docs_url: sources.docsUrl,
              snapshot: nextSnapshot,
              updated_at: new Date().toISOString(),
            })
            .eq("id", row.id);

      if (error) {
        console.error("Brain refresh save failed for", row.label, error.message);
        results.push({
          login: row.label,
          status: "failed",
          detail: error.message,
        });
        continue;
      }

      results.push({
        login: row.label,
        status: "refreshed",
        detail: `${built.company.name} · ${built.company.sources.filter((s) => s.ok).length} sources read`,
      });
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      console.error("Brain refresh crashed for", row.label, detail);
      results.push({
        login: row.label,
        status: "failed",
        detail,
      });
    }
  }

  return { results, scanned: ranked.length };
}
