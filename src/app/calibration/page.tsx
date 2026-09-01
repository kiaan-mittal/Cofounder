import type { Metadata } from "next";
import { CalibrationView } from "@/app/calibration/calibration-view";
import { requireGithubLogin } from "@/server/require-session";
import { loadWorkspaceSnapshot } from "@/server/workspace";

export const metadata: Metadata = {
  title: "Calibration",
  description:
    "How this founder's predictions have scored against reality, by domain, with the sample size each calibration score rests on.",
  robots: { index: false, follow: false },
};

export default async function CalibrationPage() {
  await requireGithubLogin("/calibration");
  const snapshot = await loadWorkspaceSnapshot();
  return <CalibrationView initialSnapshot={snapshot} />;
}
