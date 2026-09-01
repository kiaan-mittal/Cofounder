import { redirect } from "next/navigation";

/** Canonical judging URL. The floor is already loaded. No account. */
export default function TryPage() {
  redirect("/arena");
}
