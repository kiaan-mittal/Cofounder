import "server-only";

import type { GithubRepoChoice } from "@/lib/github";
import { githubFetch } from "@/server/github-api";
import type { GithubSession } from "@/server/github-oauth";

type GithubRepoRow = {
  id?: number;
  name?: string;
  full_name?: string;
  private?: boolean;
  description?: string | null;
  owner?: { login?: string };
};

function asChoice(row: GithubRepoRow): GithubRepoChoice | null {
  const owner = row.owner?.login;
  const name = row.name;
  const fullName = row.full_name;
  if (typeof row.id !== "number" || !owner || !name || !fullName) return null;
  return {
    id: row.id,
    owner,
    name,
    fullName,
    private: Boolean(row.private),
    description: row.description ?? "",
  };
}

function authFrom(session: GithubSession) {
  return {
    accessToken: session.accessToken || undefined,
    composioUserId: session.composioUserId,
  };
}

export async function listGithubRepos(
  session: GithubSession,
): Promise<GithubRepoChoice[]> {
  const repos: GithubRepoChoice[] = [];
  const seen = new Set<number>();
  const auth = authFrom(session);

  for (let page = 1; page <= 3; page += 1) {
    const response = await githubFetch(
      `https://api.github.com/user/repos?per_page=100&page=${page}&sort=updated&affiliation=owner`,
      auth,
    );

    if (!response.ok) {
      if (page === 1) {
        throw new Error(
          `GitHub would not list your repositories (${response.status}).`,
        );
      }
      break;
    }

    const rows = (await response.json()) as GithubRepoRow[];
    if (!Array.isArray(rows)) break;
    for (const row of rows) {
      const choice = asChoice(row);
      if (!choice || seen.has(choice.id)) continue;
      seen.add(choice.id);
      repos.push(choice);
    }
    if (rows.length < 100) break;
  }

  return repos;
}
