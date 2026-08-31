"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import type { ProjectSummary } from "@/lib/projects";
import { switchToProject } from "@/lib/supabase/sync";
import { cn } from "@/lib/utils";

export function ProjectSwitcher({
  signedIn,
  initialProjects = [],
  initialActiveId = null,
}: {
  signedIn: boolean;
  initialProjects?: ProjectSummary[];
  initialActiveId?: string | null;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const [projects, setProjects] = useState<ProjectSummary[]>(initialProjects);
  const [activeId, setActiveId] = useState<string | null>(initialActiveId);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setProjects(initialProjects);
    setActiveId(initialActiveId);
  }, [initialActiveId, initialProjects]);

  useEffect(() => {
    if (!signedIn) return;
    let cancelled = false;
    fetch("/api/projects", { cache: "no-store", credentials: "same-origin" })
      .then((response) => (response.ok ? response.json() : null))
      .then(
        (payload: {
          projects?: ProjectSummary[];
          activeProjectId?: string | null;
        } | null) => {
          if (cancelled || !payload) return;
          const next = payload.projects ?? [];
          if (next.length === 0 && initialProjects.length > 0) return;
          setProjects(next);
          setActiveId(payload.activeProjectId ?? null);
        },
      )
      .catch(() => {
        if (!cancelled && initialProjects.length === 0) setProjects([]);
      });
    return () => {
      cancelled = true;
    };
  }, [signedIn, pathname, initialProjects.length]);

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

  if (!signedIn) return null;

  const active = projects.find((project) => project.id === activeId) ?? projects[0];
  const label = active?.name ?? "Add a project";

  async function select(projectId: string) {
    if (projectId === activeId || busy) {
      if (detailsRef.current) detailsRef.current.open = false;
      return;
    }
    setBusy(true);
    const ok = await switchToProject(projectId);
    setBusy(false);
    if (detailsRef.current) detailsRef.current.open = false;
    if (!ok) return;
    setActiveId(projectId);
    router.refresh();
  }

  return (
    <details ref={detailsRef} className="relative">
      <summary className="flex max-w-[220px] cursor-pointer list-none items-center gap-2 border border-rule bg-paper px-2.5 py-1.5 transition-colors hover:border-ink [&::-webkit-details-marker]:hidden">
        <span className="type-eyebrow truncate text-ink">{label}</span>
        <span className="type-eyebrow text-pencil" aria-hidden>
          ▾
        </span>
      </summary>
      <div className="absolute right-0 z-50 mt-2 w-64 border border-rule bg-paper p-2 shadow-[0_12px_32px_rgba(24,21,18,0.08)]">
        <p className="type-eyebrow px-2 py-1.5 text-pencil">Projects</p>
        {projects.length === 0 ? (
          <p className="px-2 py-2 text-[13px] text-graphite">
            None yet. Connect a repository to create one.
          </p>
        ) : (
          <ul className="max-h-64 overflow-y-auto">
            {projects.map((project) => {
              const current = project.id === (active?.id ?? activeId);
              return (
                <li key={project.id}>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void select(project.id)}
                    className={cn(
                      "flex w-full items-baseline gap-2 px-2 py-2 text-left text-[14px] transition-colors hover:bg-leaf",
                      current && "bg-tape",
                    )}
                  >
                    <span className="w-3 shrink-0 type-eyebrow text-ink">
                      {current ? "✓" : ""}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-ink">
                        {project.name}
                      </span>
                      {project.githubRepoName ? (
                        <span className="type-figure block truncate text-[11px] text-graphite">
                          {project.githubOwner}/{project.githubRepoName}
                        </span>
                      ) : null}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        <div className="mt-1 border-t border-rule pt-1">
          <Link
            href="/onboarding"
            className="flex px-2 py-2 text-[14px] text-ink hover:bg-leaf"
            onClick={() => {
              if (detailsRef.current) detailsRef.current.open = false;
            }}
          >
            + Add project
          </Link>
        </div>
      </div>
    </details>
  );
}
