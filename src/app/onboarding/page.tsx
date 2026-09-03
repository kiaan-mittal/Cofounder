import type { Metadata } from "next";
import { OnboardingView } from "@/app/onboarding/onboarding-view";
import type { GithubRepoChoice } from "@/lib/github";
import { listGithubRepos } from "@/server/github-repos";
import { requireGithubLogin } from "@/server/require-session";

export const metadata: Metadata = {
  title: "Load the company",
  description:
    "Point Dissent at a repository and a site so the floor opens already knowing what the company builds.",
  robots: { index: false, follow: false },
};

export default async function OnboardingPage() {
  const session = await requireGithubLogin("/onboarding");
  let repos: GithubRepoChoice[] = [];
  try {
    repos = await listGithubRepos(session);
  } catch {
    repos = [];
  }
  return <OnboardingView repos={repos} />;
}
