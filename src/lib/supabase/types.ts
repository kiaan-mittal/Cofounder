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

export interface WorkspacePayload {
  deviceId: string;
  draft: OnboardingDraft;
  snapshot?: WorkspaceSnapshot;
}
