"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { GithubMark } from "@/components/ink/emblems";
import type {
  GithubIdentity,
  GithubRepoChoice,
  GithubStatus,
} from "@/lib/github";
import { cn } from "@/lib/utils";

const LOGIN_ERRORS: Record<string, string> = {
  unconfigured: "GitHub sign-in is not available on this server yet.",
  denied: "GitHub login was cancelled.",
  state: "The GitHub login expired. Sign in again.",
  exchange: "GitHub signed you in, but the Arena could not keep the session.",
};

export function githubErrorMessage(code: string | null): string | null {
  if (!code) return null;
  return LOGIN_ERRORS[code] ?? "GitHub login failed. Try again.";
}

function authHref(
  path: "/api/auth/github" | "/api/auth/github/logout",
  returnTo: string,
) {
  return `${path}?${new URLSearchParams({ returnTo }).toString()}`;
}

export function GithubConnect({
  selectedRepo,
  onPickRepo,
}: {
  selectedRepo?: string;
  onPickRepo?: (fullName: string) => void;
}) {
  const pathname = usePathname() || "/onboarding";
  const [user, setUser] = useState<GithubIdentity | null>(null);
  const [repos, setRepos] = useState<GithubRepoChoice[] | null>(null);

  useEffect(() => {
    fetch("/api/status", { cache: "no-store", credentials: "same-origin" })
      .then((response) => response.json())
      .then((status: GithubStatus) => setUser(status.githubUser))
      .catch(() => setUser(null));
  }, []);

  useEffect(() => {
    if (!user) {
      setRepos(null);
      return;
    }
    fetch("/api/auth/github/repos")
      .then((response) => (response.ok ? response.json() : { repos: [] }))
      .then((payload: { repos?: GithubRepoChoice[] }) => {
        setRepos(payload.repos ?? []);
      })
      .catch(() => setRepos([]));
  }, [user]);

  if (user) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3 border border-rule bg-leaf px-4 py-4">
          <div className="flex min-w-0 items-center gap-3">
            {user.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.avatar}
                alt=""
                width={36}
                height={36}
                className="size-9 object-cover"
              />
            ) : (
              <GithubMark className="h-7 w-7" />
            )}
            <div className="min-w-0">
              <p className="truncate text-[16px] font-medium text-ink">
                {user.name || user.login}
              </p>
              <p className="type-figure text-[12px] text-graphite">
                @{user.login}
              </p>
            </div>
          </div>
        </div>

        {repos && repos.length > 0 && onPickRepo ? (
          <div className="grid gap-2 sm:grid-cols-2">
            {repos.slice(0, 8).map((repo) => {
              const selected = repo.fullName === selectedRepo;
              return (
                <button
                  key={repo.fullName}
                  type="button"
                  onClick={() => onPickRepo(repo.fullName)}
                  className={cn(
                    "border px-3 py-3 text-left transition-colors",
                    selected
                      ? "border-ink bg-ink text-paper"
                      : "border-rule bg-leaf hover:border-ink",
                  )}
                >
                  <p className="type-figure truncate text-[12px]">
                    {repo.fullName}
                  </p>
                  <p
                    className={cn(
                      "type-eyebrow mt-1",
                      selected ? "text-paper/70" : "text-pencil",
                    )}
                  >
                    {repo.private ? "private" : "public"}
                  </p>
                </button>
              );
            })}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="border border-rule bg-leaf px-6 py-8 text-center">
      <GithubMark className="mx-auto h-9 w-9" />
      <h3 className="type-display mt-4 text-[22px] font-semibold">
        Sign in with GitHub
      </h3>
      <p className="mx-auto mt-2 max-w-[36ch] text-[13px] leading-relaxed text-graphite">
        One click. GitHub asks you to authorize, then you are in.
      </p>
      <div className="mx-auto mt-5 max-w-[280px]">
        <a
          href={authHref("/api/auth/github", pathname)}
          className="inline-flex h-12 w-full items-center justify-center gap-2.5 bg-ink text-[15px] font-medium text-paper transition-colors hover:bg-ink/90"
        >
          <GithubMark className="h-4 w-4 text-paper" />
          Sign in with GitHub
        </a>
      </div>
    </div>
  );
}
