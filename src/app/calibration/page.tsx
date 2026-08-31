import { CalibrationView } from "@/app/calibration/calibration-view";
import { requireGithubLogin } from "@/server/require-session";
import { loadWorkspaceSnapshot } from "@/server/workspace";

export default async function CalibrationPage() {
  await requireGithubLogin("/calibration");
  const snapshot = await loadWorkspaceSnapshot();
  return <CalibrationView initialSnapshot={snapshot} />;
}
