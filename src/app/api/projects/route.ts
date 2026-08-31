import { z } from "zod";

import { persistGithubAccessToken } from "@/server/github-token";
import { readGithubSession, readProjectCookie } from "@/server/github-oauth";
import { fail, handleRouteError, parseBody } from "@/server/http";
import {
  createProjectForUser,
  findUserByLogin,
  listProjectSummariesForUser,
  ProjectAccessError,
  requireUser,
  setActiveProject,
  toProjectSummary,
  upsertGithubUser,
  workspaceFromProject,
} from "@/server/projects";

export const runtime = "nodejs";

const createSchema = z.object({
  name: z.string().trim().min(1).max(120),
  githubRepoId: z.number().int().positive(),
  githubOwner: z.string().trim().min(1).max(120),
  githubRepoName: z.string().trim().min(1).max(120),
  website: z.string().trim().max(400).default(""),
  docsUrl: z.string().trim().max(400).optional(),
});

const switchSchema = z.object({
  activeProjectId: z.string().trim().min(1),
});

export async function GET() {
  try {
    const session = await readGithubSession();
    if (!session) return fail("Sign in with GitHub first.", 401);

    const user =
      (await upsertGithubUser(session)) ?? (await findUserByLogin(session.login));
    if (!user) {
      return Response.json(
        {
          configured: true,
          projects: [],
          activeProjectId: null,
        },
        { headers: { "cache-control": "no-store" } },
      );
    }

    const projects = await listProjectSummariesForUser(user.id);
    const requested = await readProjectCookie();
    const active =
      projects.find((project) => project.id === requested) ?? projects[0] ?? null;

    return Response.json(
      {
        configured: true,
        projects,
        activeProjectId: active?.id ?? null,
      },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof ProjectAccessError) {
      return fail(error.message, error.status);
    }
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await readGithubSession();
    if (!session) return fail("Sign in with GitHub first.", 401);

    const input = await parseBody(request, createSchema);
    const project = await createProjectForUser(session, {
      name: input.name,
      githubRepoId: input.githubRepoId,
      githubOwner: input.githubOwner,
      githubRepoName: input.githubRepoName,
      websiteUrl: input.website,
      docsUrl: input.docsUrl,
    });
    await persistGithubAccessToken(session.login, session.accessToken);

    return Response.json({
      project: toProjectSummary(project),
      workspace: workspaceFromProject(project),
    });
  } catch (error) {
    if (error instanceof ProjectAccessError) {
      return fail(error.message, error.status);
    }
    return handleRouteError(error);
  }
}

export async function PUT(request: Request) {
  try {
    const session = await readGithubSession();
    if (!session) return fail("Sign in with GitHub first.", 401);

    const input = await parseBody(request, switchSchema);
    const user = await requireUser(session);
    const project = await setActiveProject(user.id, input.activeProjectId);

    return Response.json({
      project: toProjectSummary(project),
      workspace: workspaceFromProject(project),
    });
  } catch (error) {
    if (error instanceof ProjectAccessError) {
      return fail(error.message, error.status);
    }
    return handleRouteError(error);
  }
}
