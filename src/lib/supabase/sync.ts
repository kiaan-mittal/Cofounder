import {
  readOnboardingDraft,
  writeOnboardingDraft,
  type OnboardingDraft,
} from "@/lib/drafts";
import {
  getWorkspaceSnapshot,
  snapshotIsEmpty,
  useArena,
  type WorkspaceSnapshot,
} from "@/lib/store";

type RemoteWorkspace = {
  configured: boolean;
  workspace: {
    website: string;
    github: string;
    docs_url: string;
    snapshot: WorkspaceSnapshot | Record<string, never> | null;
  } | null;
};

let saveTimer: number | undefined;

async function request(
  method: "GET" | "PUT",
  body?: unknown,
): Promise<RemoteWorkspace | null> {
  try {
    const response = await fetch("/api/workspace", {
      method,
      headers: { "content-type": "application/json" },
      cache: "no-store",
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!response.ok) return null;
    return (await response.json()) as RemoteWorkspace;
  } catch {
    return null;
  }
}

export async function pullRemoteWorkspace() {
  const remote = await request("GET");
  if (!remote?.configured || !remote.workspace) return remote;

  const row = remote.workspace;
  writeOnboardingDraft({
    website: row.website || "",
    github: row.github || "",
    docsUrl: row.docs_url || "",
    building: readOnboardingDraft().building,
  });

  const snapshot = row.snapshot;
  if (
    snapshot &&
    typeof snapshot === "object" &&
    !snapshotIsEmpty(snapshot as WorkspaceSnapshot) &&
    snapshotIsEmpty(getWorkspaceSnapshot())
  ) {
    useArena.getState().importWorkspace(snapshot as WorkspaceSnapshot);
  }

  return remote;
}

export function scheduleWorkspaceSave(draft?: OnboardingDraft) {
  if (typeof window === "undefined") return;
  window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => {
    void request("PUT", {
      draft: draft ?? readOnboardingDraft(),
      snapshot: getWorkspaceSnapshot(),
    });
  }, 500);
}
