import type { Metadata } from "next";
import { Fraunces, Instrument_Sans, JetBrains_Mono } from "next/font/google";

import { InkFilters } from "@/components/ink/ink-filters";
import { AccountGate } from "@/components/shell/account-gate";
import { AppChrome } from "@/components/shell/app-chrome";

import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  axes: ["SOFT", "WONK", "opsz"],
  display: "swap",
});

const instrumentSans = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-instrument-sans",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Decision Arena — AI that argues with you before reality does",
  description:
    "A decision workspace where founders and AI agents challenge each other's reasoning, commit to predictions, and learn from outcomes. Built on WebMCP.",
};

// Next 15.5 webpack can omit clientReferenceManifest for statically
// rendered routes. Force a request-time render so every page carries one.
export const dynamic = "force-dynamic";

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    // The font variables must land on :root, because the design tokens compose
    // them there (--font-display is built from --font-fraunces). Declared on
    // <body> they would be invalid at :root and every heading would silently
    // fall back to the sans face.
    <html
      lang="en"
      className={`${fraunces.variable} ${instrumentSans.variable} ${jetbrainsMono.variable}`}
    >
      <body>
        <InkFilters />
        <div className="flex min-h-dvh flex-col">
          <AppChrome account={<AccountGate />} />
          <main className="flex-1">{children}</main>
        </div>
      </body>
    </html>
  );
}
