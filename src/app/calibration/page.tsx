import type { Metadata } from "next";
import { CalibrationView } from "@/app/calibration/calibration-view";
import { loadWorkspaceSnapshot } from "@/server/workspace";

export const metadata: Metadata = {
  title: "Calibration",
  description:
    "How this founder's predictions have scored against reality, by domain, with the sample size each calibration score rests on.",
};

export default async function CalibrationPage() {
  const snapshot = await loadWorkspaceSnapshot();
  return <CalibrationView initialSnapshot={snapshot} />;
}
