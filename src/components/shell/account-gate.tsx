import { AccountMenu } from "@/components/shell/account-menu";
import {
  publicGithubIdentity,
  readGithubSession,
} from "@/server/github-oauth";

export async function AccountGate() {
  const session = await readGithubSession();
  return <AccountMenu initialUser={publicGithubIdentity(session)} />;
}
