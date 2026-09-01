import { composioConfigured } from "@/server/composio";
import {
  connectedExportToolkits,
  EXPORT_LOGOS,
} from "@/server/composio-export";
import { readGithubSession } from "@/server/github-oauth";
import { fail, handleRouteError } from "@/server/http";

export const runtime = "nodejs";

export async function GET() {
  try {
    const session = await readGithubSession();
    if (!session) return fail("Sign in first.", 401);
    const userId = session.composioUserId || `da_export_${session.login}`;
    const connected = composioConfigured()
      ? await connectedExportToolkits(userId)
      : [];
    return Response.json({
      composio: composioConfigured(),
      connected,
      logos: EXPORT_LOGOS,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
