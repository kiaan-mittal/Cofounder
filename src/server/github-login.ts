import "server-only";

import { randomBytes } from "node:crypto";

import {
  composioConfigured,
  composioGithubProxy,
  startGithubConnect,
  waitForGithubConnection,
} from "@/server/composio";
import type { GithubSession } from "@/server/github-oauth";
import { writeOauthState } from "@/server/github-oauth";

export async function beginComposioGithubLogin(input: {
  returnTo: string;
  origin: string;
}): Promise<string | null> {
  if (!composioConfigured()) return null;

  const composioUserId = `da_${randomBytes(16).toString("hex")}`;
  const callbackUrl = `${input.origin}/api/auth/github/callback`;
  const connection = await startGithubConnect(composioUserId, callbackUrl);
  const redirectUrl = connection.redirectUrl;
  if (!redirectUrl) return null;

  await writeOauthState({
    nonce: connection.id,
    returnTo: input.returnTo,
    origin: input.origin,
    composioUserId,
    composioConnectionId: connection.id,
  });

  return redirectUrl;
}

export async function sessionFromComposioUser(
  composioUserId: string,
  connectionId?: string,
): Promise<GithubSession> {
  if (connectionId) {
    await waitForGithubConnection(connectionId);
  }

  const { status, data } = await composioGithubProxy({
    userId: composioUserId,
    endpoint: "/user",
  });

  if (status < 200 || status >= 300 || !data || typeof data !== "object") {
    throw new Error("GitHub connected, but the account could not be read.");
  }

  const user = data as {
    id?: number;
    login?: string;
    name?: string | null;
    avatar_url?: string | null;
  };

  if (!user.login) {
    throw new Error("GitHub connected, but the account had no login.");
  }

  return {
    accessToken: "",
    composioUserId,
    login: user.login,
    name: user.name ?? null,
    avatar: user.avatar_url ?? null,
    githubId: typeof user.id === "number" ? user.id : undefined,
  };
}
