"use client";

import { useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

import { BrainBuilding } from "@/components/brain/brain-building";
import { InkUnderline } from "@/components/ink/marks";
import { RepoPicker } from "@/components/shell/repo-picker";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ApiError, readEventStream } from "@/lib/api";
import type { GithubRepoChoice, GithubStatus } from "@/lib/github";
import { githubErrorMessage } from "@/lib/github";
import { demoSnapshot } from "@/lib/demo-seed";
import {
  readOnboardingDraft,
  writeOnboardingDraft,
  type OnboardingDraft,
} from "@/lib/drafts";
import type { BrainBuildEvent, BrainStage, ReadingExcerpt } from "@/lib/reading";
import { useArena } from "@/lib/store";
import {
  createRemoteProject,
  pullRemoteWorkspace,
  scheduleWorkspaceSave,
} from "@/lib/supabase/sync";

type Step = "repo" | "site";

export function OnboardingView({
  repos = [],
}: {
  repos?: GithubRepoChoice[];
}) {
  const router = useRouter();
  const [resumeExisting, setResumeExisting] = useState(false);
  const setCompany = useArena((state) => state.setCompany);
  const importWorkspace = useArena((state) => state.importWorkspace);

  const [step, setStep] = useState<Step>("repo");
  const [website, setWebsite] = useState("");
  const [github, setGithub] = useState("");
  const [githubRepoId, setGithubRepoId] = useState<number | null>(null);
  const [githubOwner, setGithubOwner] = useState("");
  const [githubRepoName, setGithubRepoName] = useState("");
  const [projectName, setProjectName] = useState("");
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
    const resume =
      new URLSearchParams(window.location.search).get("existing") === "1";
    setResumeExisting(resume);

    const draft = readOnboardingDraft();
    if (!resume && !draft.building) {
      writeOnboardingDraft({
        website: "",
        github: "",
        docsUrl: "",
        building: false,
        projectName: "",
        githubRepoId: null,
        githubOwner: "",
        githubRepoName: "",
      });
      setWebsite("");
      setGithub("");
      setDocsUrl("");
      setGithubRepoId(null);
      setGithubOwner("");
      setGithubRepoName("");
      setProjectName("");
      setStep("repo");
      return;
    }

    setWebsite(draft.website);
    setGithub(draft.github);
    setDocsUrl(draft.docsUrl);
    setGithubRepoId(draft.githubRepoId ?? null);
    setGithubOwner(draft.githubOwner || "");
    setGithubRepoName(draft.githubRepoName || "");
    setProjectName(draft.projectName || draft.githubRepoName || "");
    if (resume && draft.github) {
      setStep("site");
    }
    if (draft.building && (draft.website || draft.github)) {
      setBuilding(true);
    }
  }, []);

  useEffect(() => {
    const loginError = githubErrorMessage(
      new URLSearchParams(window.location.search).get("github_error"),
    );
    if (loginError) setError({ message: loginError });

    fetch("/api/status")
      .then((r) => r.json())
      .then((s: GithubStatus) => setModelReady(Boolean(s.model)))
      .catch(() => setModelReady(null));

    if (resumeExisting) {
      void pullRemoteWorkspace().then(() => {
        const remote = readOnboardingDraft();
        setWebsite((current) => current || remote.website);
        setGithub((current) => current || remote.github);
        setDocsUrl((current) => current || remote.docsUrl);
        setProjectName((current) => current || remote.projectName || "");
        if (remote.github) setStep("site");
      });
    }
  }, [resumeExisting]);

  useEffect(() => {
    const draft = readOnboardingDraft();
    if (draft.building && (draft.website || draft.github) && !buildLock.current) {
      void runBuild(draft);
    }
    // Resume a build that was interrupted by a remount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function snapshotDraft(next: Partial<OnboardingDraft> = {}): OnboardingDraft {
    return {
      website,
      github,
      docsUrl,
      githubRepoId,
      githubOwner,
      githubRepoName,
      projectName,
      ...next,
    };
  }

  function remember(next: Partial<OnboardingDraft>) {
    writeOnboardingDraft(snapshotDraft(next));
  }

  function pickRepo(repo: GithubRepoChoice) {
    const repoId = Number(repo.id);
    setGithub(repo.fullName);
    setGithubRepoId(Number.isFinite(repoId) ? repoId : null);
    setGithubOwner(repo.owner);
    setGithubRepoName(repo.name);
    setProjectName((current) => current || repo.name);
    remember({
      github: repo.fullName,
      githubRepoId: Number.isFinite(repoId) ? repoId : null,
      githubOwner: repo.owner,
      githubRepoName: repo.name,
      projectName: projectName || repo.name,
    });
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

  function continueFromRepo() {
    if (githubRepoId == null || !githubOwner || !githubRepoName) {
      setError({ message: "Choose the repository this project is for." });
      return;
    }
    setError(null);
    setStep("site");
  }

  async function createProject(event: React.FormEvent) {
    event.preventDefault();

    if (!githubRepoId || !githubOwner || !githubRepoName) {
      setError({ message: "Choose the repository this project is for." });
      setStep("repo");
      return;
    }

    if (!website.trim()) {
      setError({ message: "Add the website URL this repository ships." });
      return;
    }

    const name = projectName.trim() || githubRepoName;
    const draft = snapshotDraft({
      projectName: name,
      website,
      building: true,
    });

    if (!resumeExisting) {
      const created = await createRemoteProject({
        name,
        githubRepoId,
        githubOwner,
        githubRepoName,
        website,
        docsUrl,
      });
      if (!created.ok) {
        setError({ message: created.error });
        return;
      }
      router.refresh();
    }

    await runBuild(draft);
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
    <div className="mx-auto max-w-[720px] px-5 py-14 lg:py-20">
      <p className="type-eyebrow">
        {step === "repo" ? "Connect a repository" : "Connect your website"}
      </p>
      <h1 className="type-display mt-5 text-[clamp(2.25rem,5vw,3.5rem)] font-semibold">
        <span className="relative inline-block">
          {step === "repo" ? "Choose the repository." : "Name the project."}
          <InkUnderline className="absolute -bottom-1 left-0 w-full" />
        </span>
      </h1>
      <p className="mt-8 max-w-[46ch] text-[17px] leading-relaxed text-graphite">
        {step === "repo"
          ? "These are repositories on the GitHub account you just signed in with. Pick one. The Arena will not guess."
          : "The project name starts as the repository name. You can change it later without renaming the repo. Then the public site the Brain will read."}
      </p>

      <div className="mt-10">
          {step === "repo" ? (
            <div className="space-y-6">
              <RepoPicker
                selectedId={githubRepoId}
                onPick={pickRepo}
                initialRepos={repos}
              />
              {error ? (
                <div className="border border-rule bg-oxblood-wash px-4 py-3">
                  <p className="text-sm text-ink">{error.message}</p>
                </div>
              ) : null}
              <Button
                type="button"
                size="lg"
                className="h-11 px-6 text-[15px]"
                disabled={githubRepoId == null}
                onClick={continueFromRepo}
              >
                Continue
              </Button>
            </div>
          ) : (
            <form onSubmit={createProject} className="space-y-6" autoComplete="off">
              <div className="border border-rule bg-leaf px-4 py-4">
                <p className="type-eyebrow">Repository</p>
                <p className="mt-2 text-[16px] font-medium text-ink">
                  {githubRepoName || github}
                </p>
                <p className="type-figure mt-1 text-[12px] text-graphite">
                  github.com/{github || `${githubOwner}/${githubRepoName}`}
                </p>
                {!resumeExisting ? (
                  <button
                    type="button"
                    className="type-eyebrow mt-3 text-ink underline underline-offset-4"
                    onClick={() => setStep("repo")}
                  >
                    Choose a different repository
                  </button>
                ) : null}
              </div>

              <Field
                id="project-name"
                label="Project name"
                hint="Defaults to the repository name. This is what the navbar shows."
              >
                <Input
                  id="project-name"
                  name="project-name"
                  value={projectName}
                  onChange={(event) => {
                    const value = event.target.value;
                    setProjectName(value);
                    remember({ projectName: value });
                  }}
                  placeholder={githubRepoName || "buildings-lol"}
                  autoComplete="off"
                  spellCheck={false}
                />
              </Field>

              <Field
                id="website"
                label="Website URL"
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
                    No model credentials are configured, so the Arena cannot
                    build a Brain from live sources yet.
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
                  Create project
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
          )}
        </div>
    </div>
  );
}
