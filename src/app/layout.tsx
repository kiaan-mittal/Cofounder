import type { Metadata } from "next";
import localFont from "next/font/local";

import { InkFilters } from "@/components/ink/ink-filters";
import { AccountGate } from "@/components/shell/account-gate";
import { AppChrome } from "@/components/shell/app-chrome";
import { appOrigin } from "@/server/app-url";
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
  metadataBase: new URL(appOrigin()),
  title: {
    default: "Dissent. Make your decision defend itself",
    template: "%s · Dissent",
  },
  description:
    "Give it a decision. Invite opposing perspectives. Attack the assumptions. Commit when the argument survives. Dissent exposes its deliberation system to agents through WebMCP.",
  applicationName: "Dissent",
  icons: {
    icon: "/icon",
    apple: "/apple-icon",
  },
  openGraph: {
    type: "website",
    siteName: "Dissent",
    title: "Dissent. Make your decision defend itself",
    description:
      "Five dissenters argue your decision. ChatGPT joins through WebMCP. You confirm the commit.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Dissent. Make your decision defend itself",
    description:
      "Five dissenters argue your decision. ChatGPT joins through WebMCP. You confirm the commit.",
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
      {/*
        `document.modelContext` belongs to the browser. This page never
        writes a shim there — ChatGPT Sol/Terra skip their native bind if
        the slot is already taken. Tools register on the real object when
        it exists; the in-page fallback stays private to the page.
      */}
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
