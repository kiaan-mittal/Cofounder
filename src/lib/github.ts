export interface GithubIdentity {
  login: string;
  name: string | null;
  avatar: string | null;
}

export interface GithubRepoChoice {
  fullName: string;
  private: boolean;
  description: string;
}

export interface GithubStatus {
  model: boolean;
  github: boolean;
  githubOAuth: boolean;
  githubUser: GithubIdentity | null;
  supabase: boolean;
}
