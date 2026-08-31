import type { OnboardingDraft } from "@/lib/drafts";
import type { WorkspaceSnapshot } from "@/lib/store";

export interface WorkspaceRow {
  device_id: string;
  website: string;
  github: string;
  docs_url: string;
  snapshot: WorkspaceSnapshot | Record<string, never>;
  updated_at: string;
}

export interface UserRow {
  id: string;
  github_id: number | null;
  github_login: string;
  github_name: string | null;
  avatar_url: string | null;
  composio_user_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectRow {
  id: string;
  user_id: string;
  name: string;
  github_repo_id: number | null;
  github_owner: string;
  github_repo_name: string;
  website_url: string;
  docs_url: string;
  snapshot: WorkspaceSnapshot | Record<string, never>;
  created_at: string;
  updated_at: string;
}

export interface WorkspacePayload {
  deviceId: string;
  draft: OnboardingDraft;
  snapshot?: WorkspaceSnapshot;
}
