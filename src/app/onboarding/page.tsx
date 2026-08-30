"use client";

import { useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

import { BrainBuilding } from "@/components/brain/brain-building";
import { InkUnderline } from "@/components/ink/marks";
import { GithubConnect, githubErrorMessage } from "@/components/shell/github-connect";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ApiError, readEventStream } from "@/lib/api";
import type { GithubStatus } from "@/lib/github";
import { demoSnapshot } from "@/lib/demo-seed";
import {
  readOnboardingDraft,
  writeOnboardingDraft,
  type OnboardingDraft,
} from "@/lib/drafts";
import type { BrainBuildEvent, BrainStage, ReadingExcerpt } from "@/lib/reading";
import { useArena } from "@/lib/store";
import { pullRemoteWorkspace, scheduleWorkspaceSave } from "@/lib/supabase/sync";

export default function OnboardingPage() {
  const router = useRouter();
  const setCompany = useArena((state) => state.setCompany);
  const importWorkspace = useArena((state) => state.importWorkspace);

  const [website, setWebsite] = useState("");
  const [github, setGithub] = useState("");
  const [docsUrl, setDocsUrl] = useState("");
  const [building, setBuilding] = useState(false);
  const [stage, setStage] = useState<BrainStage>("website");
  const [excerpts, setExcerpts] = useState<ReadingExcerpt[]>([]);
  const [error, setError] = useState<{ message: string; hint?: string } | null>(
    null,
  );
  const [modelReady, setModelReady] = useState<boolean | null>(null);
  const buildLock = useRef(false);

  useLayoutEffect(() => {
    const draft = readOnboardingDraft();
    setWebsite(draft.website);
    setGithub(draft.github);
    setDocsUrl(draft.docsUrl);
    if (draft.building && (draft.website || draft.github)) {
      setBuilding(true);
    }
  }, []);

  useEffect(() => {
    const loginError = githubErrorMessage(
      new URLSearchParams(window.location.search).get("github_error"),
    );
    if (loginError) {
      setError({ message: loginError });
    }

    fetch("/api/status")
      .then((r) => r.json())
      .then((s: GithubStatus) => setModelReady(Boolean(s.model)))
      .catch(() => setModelReady(null));

    void pullRemoteWorkspace().then(() => {
      const remote = readOnboardingDraft();
      setWebsite((current) => current || remote.website);
      setGithub((current) => current || remote.github);
      setDocsUrl((current) => current || remote.docsUrl);
    });
  }, []);

  useEffect(() => {
    const draft = readOnboardingDraft();
    if (draft.building && (draft.website || draft.github) && !buildLock.current) {
      void runBuild(draft);
    }
    // Resume a build that was interrupted by a remount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function remember(next: Partial<OnboardingDraft>) {
    const draft = {
      website,
      github,
      docsUrl,
      ...next,
    };
    writeOnboardingDraft(draft);
    scheduleWorkspaceSave(draft);
  }

  async function runBuild(draft: OnboardingDraft) {
    if (buildLock.current) return;
    buildLock.current = true;
    setError(null);
    setBuilding(true);
    setStage(draft.website ? "website" : "github");
    setExcerpts([]);
    writeOnboardingDraft({ ...draft, building: true });

    try {
      let completed = false;
      await readEventStream<BrainBuildEvent>(
        "/api/brain",
        {
          website: draft.website,
          github: draft.github,
          docsUrl: draft.docsUrl.trim() || undefined,
        },
        (event) => {
          if (event.type === "stage") setStage(event.stage);
          if (event.type === "excerpt") {
            setExcerpts((current) => {
              const without = current.filter(
                (item) => item.url !== event.excerpt.url,
              );
              return [...without, event.excerpt];
            });
          }
          if (event.type === "error") {
            throw new ApiError(event.message, event.hint);
          }
          if (event.type === "done") {
            completed = true;
            writeOnboardingDraft({ ...draft, building: false });
            setCompany(event.company);
            scheduleWorkspaceSave({ ...draft, building: false });
            router.push("/arena");
          }
        },
      );
      if (!completed) {
        throw new ApiError(
          "The build ended before a Company Brain was assembled.",
        );
      }
    } catch (caught) {
      writeOnboardingDraft({ ...draft, building: false });
      setBuilding(false);
      buildLock.current = false;
      if (caught instanceof ApiError) {
        setError({ message: caught.message, hint: caught.hint });
      } else {
        setError({ message: "Something went wrong while reading your sources." });
      }
    }
  }

  async function build(event: React.FormEvent) {
    event.preventDefault();

    if (!website.trim() && !github.trim()) {
      setError({
        message: "Give the Arena at least one source: a website or a repository.",
      });
      return;
    }

    await runBuild({ website, github, docsUrl, building: true });
  }

  function loadWorkedExample() {
    importWorkspace(demoSnapshot());
    router.push("/arena");
  }

  if (building) {
    return (
      <BrainBuilding
        website={website}
        github={github}
        stage={stage}
        excerpts={excerpts}
      />
    );
  }

  return (
    <div className="mx-auto max-w-[1400px] px-5 py-14 lg:py-20">
      <div className="grid gap-14 lg:grid-cols-[1fr_1fr] lg:gap-24">
        <div className="max-w-[42ch]">
          <p className="type-eyebrow">Step one</p>
          <h1 className="type-display mt-5 text-[clamp(2.25rem,5vw,3.5rem)] font-semibold">
            <span className="relative inline-block">
              Build your Company Brain.
              <InkUnderline className="absolute -bottom-1 left-0 w-full" />
            </span>
          </h1>
          <p className="mt-8 text-[17px] leading-relaxed text-graphite">
            The Arena crawls the public site and the repository — not one
            page, as much as it can reach — then separates what those sources
            actually state from what you appear to be assuming. The
            assumptions are what it will argue with.
          </p>

          <div className="mt-10 space-y-3 text-sm leading-relaxed text-graphite">
            <p>
              <span className="type-eyebrow text-moss">Fact</span>{" "}
              &mdash; something your site or repository says, with the quote
              attached.
            </p>
            <p>
              <span className="type-eyebrow text-ochre">Assumption</span>{" "}
              &mdash; something you are betting on that no source proves.
            </p>
          </div>

          <p className="mt-10 max-w-[46ch] text-[13px] leading-relaxed text-pencil">
            Only the URLs you enter here are read. Sign in with GitHub if the
            repository is private. Nothing is written back.
          </p>
        </div>

        <div>
          <form onSubmit={build} className="space-y-6" autoComplete="off">
            <Field
              id="website"
              label="Company website"
              hint="The homepage is the start. The Brain follows pricing, docs, changelog and the rest of the public site."
              prefix="https://"
            >
              <Input
                id="website"
                name="website"
                value={website}
                onChange={(event) => {
                  const value = event.target.value.replace(/^https?:\/\//i, "");
                  setWebsite(value);
                  remember({ website: value });
                }}
                placeholder="yourcompany.com"
                autoComplete="off"
                inputMode="url"
                spellCheck={false}
              />
            </Field>

            <GithubConnect
              selectedRepo={github}
              onPickRepo={(fullName) => {
                setGithub(fullName);
                remember({ github: fullName });
              }}
            />

            <Field
              id="github"
              label="GitHub repository"
              hint="Public or private. Sign in above if the repository is not public."
              prefix="github.com/"
            >
              <Input
                id="github"
                name="github"
                value={github}
                onChange={(event) => {
                  const value = event.target.value
                    .replace(/^https?:\/\//i, "")
                    .replace(/^(www\.)?github\.com\//i, "")
                    .replace(/\.git$/, "");
                  setGithub(value);
                  remember({ github: value });
                }}
                placeholder="you/your-repo"
                autoComplete="off"
                spellCheck={false}
              />
            </Field>

            <Field
              id="docs"
              label="Documentation or product URL"
              hint="Only if it says something the homepage does not."
              optional
              prefix="https://"
            >
              <Input
                id="docs"
                name="docs"
                value={docsUrl}
                onChange={(event) => {
                  const value = event.target.value.replace(/^https?:\/\//i, "");
                  setDocsUrl(value);
                  remember({ docsUrl: value });
                }}
                placeholder="docs.yourcompany.com"
                autoComplete="off"
                inputMode="url"
                spellCheck={false}
              />
            </Field>

            {error ? (
              <div className="border border-rule bg-oxblood-wash px-4 py-3">
                <p className="text-sm text-ink">{error.message}</p>
                {error.hint ? (
                  <p className="mt-1.5 text-[13px] text-graphite">{error.hint}</p>
                ) : null}
              </div>
            ) : null}

            {modelReady === false ? (
              <div className="border border-rule bg-ochre-wash px-4 py-3">
                <p className="text-sm text-ink">
                  No model credentials are configured, so the Arena cannot build
                  a Brain from live sources yet.
                </p>
                <p className="mt-1.5 text-[13px] text-graphite">
                  Set <code className="type-figure">OPENAI_API_KEY</code> in{" "}
                  <code className="type-figure">.env.local</code> and restart,
                  or open the worked example below.
                </p>
              </div>
            ) : null}

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Button type="submit" size="lg" className="h-11 px-6 text-[15px]">
                Build my Company Brain
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="lg"
                onClick={loadWorkedExample}
                className="h-11 text-[15px] text-graphite"
              >
                Open the worked example
              </Button>
            </div>
          </form>

          <div className="mt-8 border-t border-rule pt-6">
            <p className="type-eyebrow">The worked example</p>
            <p className="mt-3 max-w-[52ch] text-sm leading-relaxed text-graphite">
              A fictional company with eighteen months of recorded decisions,
              eight predictions that have already met reality, and the
              calibration profile that fell out of them. Use it to see the parts
              of the Arena that normally take months to earn. It is clearly
              marked as sample data throughout.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
