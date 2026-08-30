import {
  readArenaDraft,
  readOnboardingDraft,
  writeArenaDraft,
  writeOnboardingDraft,
  type ArenaDraft,
  type OnboardingDraft,
} from "@/lib/drafts";
import {
  getWorkspaceSnapshot,
  snapshotIsEmpty,
  snapshotWeight,
  useArena,
  type WorkspaceSnapshot,
} from "@/lib/store";

type PersistedSnapshot = WorkspaceSnapshot & {
  arenaDraft?: ArenaDraft;
};

type RemoteWorkspace = {
  configured: boolean;
  workspace: {
    website: string;
    github: string;
    docs_url: string;
    snapshot: PersistedSnapshot | Record<string, never> | null;
    updated_at?: string;
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

export function shouldAdoptRemote(
  local: Partial<WorkspaceSnapshot>,
  remote: Partial<WorkspaceSnapshot> | null | undefined,
) {
  if (!remote || snapshotIsEmpty(remote)) return false;
  if (snapshotIsEmpty(local)) return true;
  return snapshotWeight(remote) > snapshotWeight(local);
}

function applySnapshot(snapshot: PersistedSnapshot) {
  const { arenaDraft, ...workspace } = snapshot;
  useArena.getState().importWorkspace(workspace);
  if (arenaDraft && (arenaDraft.question || arenaDraft.context)) {
    const current = readArenaDraft();
    if (!current.question && !current.context) {
      writeArenaDraft(arenaDraft);
    }
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

  const snapshot = row.snapshot as PersistedSnapshot | null;
  if (
    snapshot &&
    typeof snapshot === "object" &&
    shouldAdoptRemote(getWorkspaceSnapshot(), snapshot)
  ) {
    applySnapshot(snapshot);
  }

  return remote;
}

export function adoptSnapshotIfRicher(
  snapshot: Partial<WorkspaceSnapshot> | null | undefined,
) {
  if (!snapshot || snapshotIsEmpty(snapshot)) return;
  if (!shouldAdoptRemote(getWorkspaceSnapshot(), snapshot)) return;
  applySnapshot(snapshot as PersistedSnapshot);
}

export function scheduleWorkspaceSave(draft?: OnboardingDraft) {
  if (typeof window === "undefined") return;
  window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => {
    void request("PUT", {
      draft: draft ?? readOnboardingDraft(),
      snapshot: {
        ...getWorkspaceSnapshot(),
        arenaDraft: readArenaDraft(),
      },
    });
  }, 500);
}
