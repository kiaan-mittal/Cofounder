import { CalibrationView } from "@/app/calibration/calibration-view";
import { loadWorkspaceSnapshot } from "@/server/workspace";

export default async function CalibrationPage() {
  const snapshot = await loadWorkspaceSnapshot();
  return <CalibrationView initialSnapshot={snapshot} />;
}
