export interface GithubIdentity {
  login: string;
  name: string | null;
  avatar: string | null;
  githubId?: number;
}

export interface GithubRepoChoice {
  id: number;
  owner: string;
  name: string;
  fullName: string;
  private: boolean;
  description: string;
}

export const GITHUB_LOGIN_ERRORS: Record<string, string> = {
  unconfigured:
    "GitHub sign-in is not available yet. Add COMPOSIO_API_KEY, then try again.",
  denied: "GitHub login was cancelled.",
  state: "The GitHub login expired. Sign in again.",
  exchange: "GitHub signed you in, but Dissent could not keep the session.",
  composio:
    "Composio could not start GitHub login. Check COMPOSIO_API_KEY, then try again.",
};

export function githubErrorMessage(code: string | null): string | null {
  if (!code) return null;
  return GITHUB_LOGIN_ERRORS[code] ?? "GitHub login failed. Try again.";
}

export interface GithubStatus {
  model: boolean;
  github: boolean;
  githubOAuth: boolean;
  githubUser: GithubIdentity | null;
  supabase: boolean;
  composio: boolean;
}
