import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { GithubMark } from "@/components/ink/emblems";
import { ArenaMark, InkUnderline } from "@/components/ink/marks";
import { githubErrorMessage } from "@/lib/github";
import { readGithubSession } from "@/server/github-oauth";
import { pathAfterLogin } from "@/server/login-path";

export const metadata: Metadata = {
  title: "Sign in",
  description:
    "Sign in with GitHub. Decision Arena reads the repository and site you point it at so the first decision opens already knowing the company.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ github_error?: string; returnTo?: string }>;
}) {
  const session = await readGithubSession();
  if (session) {
    redirect(await pathAfterLogin(session.login));
  }

  const params = await searchParams;
  const error = githubErrorMessage(params.github_error ?? null);
  const returnTo =
    params.returnTo && params.returnTo.startsWith("/") && !params.returnTo.startsWith("//")
      ? params.returnTo
      : "/login";
  const start = `/api/auth/github?${new URLSearchParams({ returnTo }).toString()}`;
  const create = `/api/auth/github?${new URLSearchParams({ returnTo: "/onboarding" }).toString()}`;

  return (
    <div className="mx-auto flex min-h-dvh max-w-[1400px] flex-col px-5">
      <header className="flex h-16 items-center gap-2.5">
        <Link href="/" className="flex items-center gap-2.5">
          <ArenaMark />
          <span className="type-display text-[17px] font-semibold">
            Decision Arena
          </span>
        </Link>
      </header>

      <div className="flex flex-1 flex-col items-center justify-center pb-24">
        <div className="w-full max-w-[28rem] border border-rule bg-leaf px-8 py-12 text-center">
          <p className="type-eyebrow">Your account</p>
          <h1 className="type-display mt-4 text-[clamp(2rem,5vw,2.75rem)] font-semibold">
            <span className="relative inline-block">
              Welcome back
              <InkUnderline className="absolute -bottom-1 left-0 w-full" />
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-[32ch] text-[16px] leading-relaxed text-graphite">
            Use your GitHub account — not the one that built this app. You pick
            the repository. Then the website. Then a project that belongs to
            you.
          </p>
          <p className="mx-auto mt-4 max-w-[36ch] text-[14px] leading-relaxed text-graphite">
            Judging? You do not need this.{" "}
            <Link href="/arena" className="text-ink underline underline-offset-4">
              Open the public floor
            </Link>{" "}
            — IndieTerminal is already loaded.
          </p>

          {error ? (
            <div className="mt-6 border border-rule bg-oxblood-wash px-4 py-3 text-left">
              <p className="text-sm text-ink">{error}</p>
            </div>
          ) : null}

          <a
            href={start}
            className="mt-8 inline-flex h-12 w-full items-center justify-center gap-2.5 bg-ink text-[15px] font-medium text-paper transition-colors hover:bg-ink/90"
          >
            <GithubMark className="h-4 w-4 text-paper" />
            Continue with GitHub
          </a>

          <p className="type-eyebrow mt-8 text-pencil">or</p>
          <p className="mt-3 text-[14px] text-graphite">
            Don&rsquo;t have an account? GitHub will make one. If this browser
            is already signed into the wrong GitHub user, switch accounts there
            first.
          </p>
          <a
            href={create}
            className="mt-2 inline-block text-[15px] text-ink underline underline-offset-4 hover:text-graphite"
          >
            Create an account with GitHub
          </a>
        </div>
      </div>
    </div>
  );
}
