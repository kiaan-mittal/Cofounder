"use client";

import { useEffect, useMemo, useState } from "react";

import { GithubMark } from "@/components/ink/emblems";
import type { GithubRepoChoice } from "@/lib/github";
import { cn } from "@/lib/utils";

export function RepoPicker({
  selectedId,
  onPick,
  initialRepos,
}: {
  selectedId: number | null;
  onPick: (repo: GithubRepoChoice) => void;
  initialRepos?: GithubRepoChoice[];
}) {
  const [repos, setRepos] = useState<GithubRepoChoice[] | null>(
    initialRepos && initialRepos.length > 0 ? initialRepos : null,
  );
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialRepos && initialRepos.length > 0) {
      setRepos(initialRepos);
      return;
    }

    fetch("/api/auth/github/repos", {
      cache: "no-store",
      credentials: "same-origin",
    })
      .then(async (response) => {
        if (!response.ok) {
          const body = (await response.json().catch(() => ({}))) as {
            error?: string;
          };
          throw new Error(
            body.error || "GitHub would not list your repositories.",
          );
        }
        return response.json() as Promise<{ repos?: GithubRepoChoice[] }>;
      })
      .then((payload) => {
        setRepos(payload.repos ?? []);
      })
      .catch((caught: unknown) => {
        setRepos([]);
        setError(
          caught instanceof Error
            ? caught.message
            : "GitHub would not list your repositories.",
        );
      });
  }, [initialRepos]);

  const filtered = useMemo(() => {
    const list = repos ?? [];
    const needle = query.trim().toLowerCase();
    if (!needle) return list;
    return list.filter((repo) => {
      const hay = `${repo.fullName} ${repo.description}`.toLowerCase();
      return hay.includes(needle);
    });
  }, [repos, query]);

  return (
    <div className="space-y-3">
      <label className="sr-only" htmlFor="repo-search">
        Search repositories
      </label>
      <div className="border border-rule bg-leaf focus-within:border-ink focus-within:bg-paper">
        <input
          id="repo-search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search repositories…"
          autoComplete="off"
          spellCheck={false}
          className="h-12 w-full bg-transparent px-4 text-[16px] text-ink outline-none placeholder:text-pencil/80"
        />
      </div>

      {error ? (
        <p className="text-sm text-oxblood">{error}</p>
      ) : repos === null ? (
        <p className="text-[14px] text-graphite">Reading your GitHub repositories.</p>
      ) : filtered.length === 0 ? (
        <p className="text-[14px] text-graphite">
          {query.trim()
            ? "No repository matches that search."
            : "This GitHub account has no repositories the Arena can see."}
        </p>
      ) : (
        <ul className="max-h-[min(28rem,55vh)] space-y-px overflow-y-auto border border-rule bg-rule">
          {filtered.map((repo) => {
            const selected = repo.id === selectedId;
            return (
              <li key={repo.id}>
                <button
                  type="button"
                  onClick={() => onPick(repo)}
                  data-repo-id={repo.id}
                  className={cn(
                    "flex w-full items-start gap-3 bg-paper px-4 py-3 text-left transition-colors",
                    selected ? "bg-ink text-paper" : "hover:bg-leaf",
                  )}
                  aria-pressed={selected}
                >
                  <span
                    className={cn(
                      "mt-1 grid size-3.5 shrink-0 place-items-center rounded-full border",
                      selected ? "border-paper" : "border-rule-strong",
                    )}
                    aria-hidden
                  >
                    {selected ? (
                      <span className="size-1.5 rounded-full bg-paper" />
                    ) : null}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <GithubMark
                        className={cn(
                          "h-3.5 w-3.5 shrink-0",
                          selected ? "text-paper" : "text-ink",
                        )}
                      />
                      <span className="truncate text-[15px] font-medium">
                        {repo.name}
                      </span>
                    </span>
                    <span
                      className={cn(
                        "type-figure mt-1 block truncate text-[12px]",
                        selected ? "text-paper/70" : "text-graphite",
                      )}
                    >
                      {repo.fullName}
                      {repo.private ? " · private" : ""}
                    </span>
                    {repo.description ? (
                      <span
                        className={cn(
                          "mt-1 block text-[13px] leading-snug",
                          selected ? "text-paper/80" : "text-graphite",
                        )}
                      >
                        {repo.description}
                      </span>
                    ) : null}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
