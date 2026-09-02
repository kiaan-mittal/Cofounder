import {
  readArenaDraft,
  readOnboardingDraft,
  writeArenaDraft,
  writeOnboardingDraft,
  type ArenaDraft,
  type OnboardingDraft,
} from "@/lib/drafts";
import type { ProjectSummary } from "@/lib/projects";
import { isEphemeralSnapshot, withoutForeignArenas } from "@/lib/guest-workspace";
import { isStaleShowcase, showcaseSnapshot } from "@/lib/showcase-seed";
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
    id?: string;
    name?: string;
    website: string;
    github: string;
    docs_url: string;
    snapshot: PersistedSnapshot | Record<string, never> | null;
    updated_at?: string;
  } | null;
  projects?: ProjectSummary[];
  activeProjectId?: string | null;
};

let saveTimer: number | undefined;
let adoptedProjectId: string | null = null;

async function request(
  method: "GET" | "PUT",
  body?: unknown,
): Promise<RemoteWorkspace | null> {
  try {
    const response = await fetch("/api/workspace", {
      method,
      headers: { "content-type": "application/json" },
      cache: "no-store",
      credentials: "same-origin",
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
  if (isStaleShowcase(remote)) return false;
  if (isEphemeralSnapshot(local) && !isEphemeralSnapshot(remote)) return true;
  if (!isEphemeralSnapshot(local) && isEphemeralSnapshot(remote)) return false;
  if (snapshotIsEmpty(local)) return true;
  return snapshotWeight(remote) > snapshotWeight(local);
}

function applySnapshot(snapshot: PersistedSnapshot) {
  if (isStaleShowcase(snapshot)) {
    useArena.getState().importWorkspace(showcaseSnapshot());
    return;
  }
  const { arenaDraft, ...workspace } = snapshot;
  const cleaned = withoutForeignArenas(
    workspace as unknown as Record<string, unknown>,
  );
  useArena.getState().importWorkspace(cleaned);
  if (arenaDraft && (arenaDraft.question || arenaDraft.context)) {
    const current = readArenaDraft();
    if (!current.question && !current.context) {
      writeArenaDraft(arenaDraft);
    }
  }
}

function rememberProjectDraft(row: NonNullable<RemoteWorkspace["workspace"]>) {
  const current = readOnboardingDraft();
  writeOnboardingDraft({
    ...current,
    website: row.website || "",
    github: row.github || "",
    docsUrl: row.docs_url || "",
    projectName: row.name || current.projectName || "",
    building: current.building,
  });
}

export async function pullRemoteWorkspace() {
  const remote = await request("GET");
  if (!remote?.configured || !remote.workspace) return remote;

  const row = remote.workspace;
  const projectId = remote.activeProjectId ?? row.id ?? null;
  rememberProjectDraft(row);

  const snapshot = (row.snapshot ?? {}) as PersistedSnapshot;
  const switched = Boolean(projectId && projectId !== adoptedProjectId);
  if (switched) {
    adoptedProjectId = projectId;
    applySnapshot(snapshot);
    return remote;
  }

  if (typeof snapshot === "object" && shouldAdoptRemote(getWorkspaceSnapshot(), snapshot)) {
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

export async function flushWorkspaceSave(draft?: OnboardingDraft) {
  if (typeof window === "undefined") return;
  window.clearTimeout(saveTimer);
  const snapshot = getWorkspaceSnapshot();
  if (isEphemeralSnapshot(snapshot)) return;
  await request("PUT", {
    draft: draft ?? readOnboardingDraft(),
    snapshot: {
      ...snapshot,
      arenaDraft: readArenaDraft(),
    },
  });
}

export function scheduleWorkspaceSave(draft?: OnboardingDraft) {
  if (typeof window === "undefined") return;
  window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => {
    void flushWorkspaceSave(draft);
  }, 500);
}

export async function createRemoteProject(input: {
  name: string;
  githubRepoId: number;
  githubOwner: string;
  githubRepoName: string;
  website: string;
  docsUrl?: string;
}): Promise<{ ok: true; project: ProjectSummary } | { ok: false; error: string }> {
  try {
    const response = await fetch("/api/projects", {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify(input),
    });
    const payload = (await response.json().catch(() => ({}))) as {
      error?: string;
      project?: ProjectSummary;
      workspace?: RemoteWorkspace["workspace"];
    };
    if (!response.ok || !payload.project) {
      return {
        ok: false,
        error: payload.error || "The project could not be created.",
      };
    }
    adoptedProjectId = payload.project.id;
    useArena.getState().clearWorkspace();
    if (payload.workspace) rememberProjectDraft(payload.workspace);
    return { ok: true, project: payload.project };
  } catch {
    return { ok: false, error: "The project could not be created." };
  }
}

export async function switchToProject(projectId: string): Promise<boolean> {
  await flushWorkspaceSave();
  try {
    const response = await fetch("/api/projects", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ activeProjectId: projectId }),
    });
    if (!response.ok) return false;
    const payload = (await response.json()) as {
      workspace?: RemoteWorkspace["workspace"];
    };
    adoptedProjectId = projectId;
    const snapshot = payload.workspace?.snapshot;
    if (snapshot && typeof snapshot === "object") {
      applySnapshot(snapshot as PersistedSnapshot);
    } else {
      useArena.getState().clearWorkspace();
    }
    if (payload.workspace) rememberProjectDraft(payload.workspace);
    writeArenaDraft({ question: "", context: "" });
    return true;
  } catch {
    return false;
  }
}
