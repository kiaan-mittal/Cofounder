import { OnboardingView } from "@/app/onboarding/onboarding-view";
import type { GithubRepoChoice } from "@/lib/github";
import { listGithubRepos } from "@/server/github-repos";
import { requireGithubLogin } from "@/server/require-session";

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
