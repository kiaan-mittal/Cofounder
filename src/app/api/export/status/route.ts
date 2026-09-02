import { composioConfigured } from "@/server/composio";
import {
  connectedExportToolkits,
  EXPORT_LOGOS,
} from "@/server/composio-export";
import { resolveExportUser } from "@/server/export-identity";
import { handleRouteError } from "@/server/http";

export const runtime = "nodejs";

export async function GET() {
  try {
    const { userId, signedIn } = await resolveExportUser();
    const connected = composioConfigured()
      ? await connectedExportToolkits(userId)
      : [];
    return Response.json({
      composio: composioConfigured(),
      signedIn,
      connected,
      logos: EXPORT_LOGOS,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
