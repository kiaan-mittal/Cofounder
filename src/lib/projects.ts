export interface ProjectSummary {
  id: string;
  name: string;
  githubOwner: string;
  githubRepoName: string;
  githubRepoId: number | null;
  websiteUrl: string;
  updatedAt: string;
}

export interface ProjectListPayload {
  configured: boolean;
  projects: ProjectSummary[];
  activeProjectId: string | null;
}

export interface WorkspaceProjectPayload {
  configured: boolean;
  workspace: {
    id: string;
    name: string;
    website: string;
    github: string;
    docs_url: string;
    snapshot: Record<string, unknown> | null;
    updated_at?: string;
  } | null;
  projects: ProjectSummary[];
  activeProjectId: string | null;
}
