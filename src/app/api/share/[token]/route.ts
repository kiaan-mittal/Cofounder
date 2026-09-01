import { fail, handleRouteError } from "@/server/http";
import { readDecisionShare } from "@/server/shares";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await context.params;
    if (!token?.startsWith("shr_")) {
      return fail("That share link is not valid.", 404);
    }
    const brief = await readDecisionShare(token);
    if (!brief) return fail("This share has expired or never existed.", 404);
    return Response.json({ brief });
  } catch (error) {
    return handleRouteError(error);
  }
}
