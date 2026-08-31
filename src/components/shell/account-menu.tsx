"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { GithubMark } from "@/components/ink/emblems";
import type { GithubIdentity, GithubStatus } from "@/lib/github";

function authHref(
  path: "/api/auth/github" | "/api/auth/github/logout",
  returnTo: string,
) {
  return `${path}?${new URLSearchParams({ returnTo }).toString()}`;
}

export function AccountMenu({
  initialUser = null,
}: {
  initialUser?: GithubIdentity | null;
}) {
  const [user, setUser] = useState<GithubIdentity | null>(initialUser);
  const detailsRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    fetch("/api/status", { cache: "no-store", credentials: "same-origin" })
      .then((response) => response.json())
      .then((status: GithubStatus) => setUser(status.githubUser))
      .catch(() => setUser(null));
  }, []);

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      const root = detailsRef.current;
      if (!root?.open) return;
      if (event.target instanceof Node && !root.contains(event.target)) {
        root.open = false;
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  if (!user) {
    return (
      <Link
        href="/login"
        className="inline-flex h-9 items-center gap-2 bg-ink px-3 text-[13px] font-medium text-paper transition-colors hover:bg-ink/90"
      >
        <GithubMark className="h-3.5 w-3.5 text-paper" />
        Sign in
      </Link>
    );
  }

  const displayName = user.name?.trim() || user.login;

  return (
    <details ref={detailsRef} className="relative">
      <summary className="flex cursor-pointer list-none items-center gap-2 rounded-none border border-rule bg-paper py-1 pr-2.5 pl-1 transition-colors hover:border-ink [&::-webkit-details-marker]:hidden">
        {user.avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.avatar}
            alt=""
            width={28}
            height={28}
            className="size-7 shrink-0 object-cover"
          />
        ) : (
          <span className="grid size-7 place-items-center bg-tape">
            <GithubMark className="h-3.5 w-3.5" />
          </span>
        )}
        <span className="hidden max-w-[140px] truncate text-[13px] font-medium text-ink sm:block">
          {displayName}
        </span>
      </summary>

      <div className="absolute right-0 z-50 mt-2 w-56 border border-rule bg-paper p-3 shadow-[0_12px_32px_rgba(24,21,18,0.08)]">
        <div className="flex items-center gap-3">
          {user.avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.avatar}
              alt=""
              width={36}
              height={36}
              className="size-9 shrink-0 object-cover"
            />
          ) : (
            <span className="grid size-9 place-items-center bg-tape">
              <GithubMark className="h-4 w-4" />
            </span>
          )}
          <div className="min-w-0">
            <p className="truncate text-[14px] font-medium text-ink">
              {displayName}
            </p>
            <p className="type-figure truncate text-[11px] text-graphite">
              @{user.login}
            </p>
          </div>
        </div>
        <a
          href={authHref("/api/auth/github/logout", "/")}
          className="mt-3 flex h-9 items-center justify-center border border-rule text-[13px] text-ink transition-colors hover:border-ink hover:bg-leaf"
        >
          Sign out
        </a>
      </div>
    </details>
  );
}
