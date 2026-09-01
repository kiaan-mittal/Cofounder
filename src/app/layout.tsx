import type { Metadata } from "next";
import localFont from "next/font/local";

import { InkFilters } from "@/components/ink/ink-filters";
import { AccountGate } from "@/components/shell/account-gate";
import { AppChrome } from "@/components/shell/app-chrome";
import { readGithubSession } from "@/server/github-oauth";
import { loadHeaderProjects } from "@/server/projects";

import "./globals.css";

const fraunces = localFont({
  src: "./fonts/Fraunces-Variable.woff2",
  variable: "--font-fraunces",
  display: "swap",
  weight: "100 900",
});

const instrumentSans = localFont({
  src: "./fonts/InstrumentSans-Variable.woff2",
  variable: "--font-instrument-sans",
  display: "swap",
  weight: "400 700",
});

const jetbrainsMono = localFont({
  src: "./fonts/JetBrainsMono-Variable.woff2",
  variable: "--font-jetbrains-mono",
  display: "swap",
  weight: "100 800",
});

export const metadata: Metadata = {
  title: "Decision Arena — AI that argues with you before reality does",
  description:
    "A decision workspace where founders and AI agents challenge each other's reasoning, commit to predictions, and learn from outcomes. Built on WebMCP.",
  icons: {
    icon: "/brand/decision-arena-icon.png",
    apple: "/apple-icon.png",
  },
};

// Next 15.5 webpack can omit clientReferenceManifest for statically
// rendered routes. Force a request-time render so every page carries one.
export const dynamic = "force-dynamic";

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await readGithubSession();
  const header = await loadHeaderProjects(session);
  return (
    // The font variables must land on :root, because the design tokens compose
    // them there (--font-display is built from --font-fraunces). Declared on
    // <body> they would be invalid at :root and every heading would silently
    // fall back to the sans face.
    <html
      lang="en"
      className={`${fraunces.variable} ${instrumentSans.variable} ${jetbrainsMono.variable}`}
    >
      <body suppressHydrationWarning>
        <InkFilters />
        <div className="flex min-h-dvh flex-col">
          <AppChrome
            account={<AccountGate />}
            signedIn={Boolean(session)}
            projects={header.projects}
            activeProjectId={header.activeProjectId}
          />
          <main className="flex-1">{children}</main>
        </div>
      </body>
    </html>
  );
}
