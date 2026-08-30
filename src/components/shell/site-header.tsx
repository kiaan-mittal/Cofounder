"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import type { ReactNode } from "react";

import { ArenaMark } from "@/components/ink/marks";
import { WebMCPStatus } from "@/components/webmcp/webmcp-status";
import { useArena } from "@/lib/store";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/brain", label: "Brain" },
  { href: "/arena", label: "Arena" },
  { href: "/canvas", label: "Canvas" },
  { href: "/history", label: "History" },
  { href: "/calibration", label: "Calibration" },
  { href: "/webmcp", label: "WebMCP" },
];

export function SiteHeader({ account }: { account: ReactNode }) {
  const pathname = usePathname();
  const company = useArena((state) => state.company);

  if (pathname === "/") return null;

  return (
    <header className="sticky top-0 z-40 border-b border-rule bg-paper/90 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-[1400px] items-center gap-6 px-5">
        <Link href="/" className="flex shrink-0 items-center gap-2.5">
          <ArenaMark />
          <span className="type-display text-[17px] font-semibold text-ink">
            Decision Arena
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {NAV.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "type-eyebrow rounded px-2.5 py-1.5 transition-colors hover:text-ink",
                  active && "bg-tape text-ink",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          {company ? (
            <span className="type-eyebrow hidden truncate lg:block">
              {company.name}
            </span>
          ) : null}
          {account}
          <WebMCPStatus />
        </div>
      </div>
    </header>
  );
}
