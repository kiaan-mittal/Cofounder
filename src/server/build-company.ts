import "server-only";

import { id, now } from "@/lib/id";
import type { BrainStage } from "@/lib/reading";
import type { Company } from "@/lib/types";
import { generateCompanyBrain } from "@/server/brain";
import {
  ingestSources,
  type IngestProgress,
} from "@/server/ingest";

export type BuildCompanyInput = {
  website: string;
  github: string;
  docsUrl?: string;
  accessToken?: string;
  composioUserId?: string;
  existing?: Company | null;
};

export type BuildCompanyProgress = IngestProgress & {
  onStage?: (stage: BrainStage) => void;
};

export type BuildCompanyResult =
  | { ok: true; company: Company }
  | { ok: false; message: string; hint?: string };

/**
 * Scrape the public site and GitHub repository, then assemble a Company Brain.
 * Used by the onboarding stream and by the three-day refresh cron.
 */
export async function buildCompanyFromSources(
  input: BuildCompanyInput,
  progress?: BuildCompanyProgress,
): Promise<BuildCompanyResult> {
  const website = input.website.trim();
  const github = input.github.trim();
  const docsUrl = input.docsUrl?.trim();

  if (!website && !github) {
    return {
      ok: false,
      message:
        "Give the Arena at least one source to read: a website or a repository.",
    };
  }

  const ingested = await ingestSources(
    {
      website,
      github,
      docsUrl,
      accessToken: input.accessToken,
      composioUserId: input.composioUserId,
    },
    progress,
  );

  if (!ingested.website && !ingested.github) {
    return {
      ok: false,
      message:
        "Neither source could be read, so there is nothing to build a Brain from.",
      hint: ingested.reports.map((r) => `${r.url}: ${r.detail}`).join(" "),
    };
  }

  progress?.onStage?.("separate");
  progress?.onStage?.("assemble");

  const { brain, companyName } = await generateCompanyBrain({
    website: ingested.website,
    github: ingested.github,
  });

  const existing = input.existing;
  const company: Company = {
    id: existing?.id ?? id("co"),
    name: companyName,
    website: ingested.website?.url ?? website,
    github: ingested.github?.url ?? github,
    docsUrl: docsUrl || existing?.docsUrl,
    createdAt: existing?.createdAt ?? now(),
    brain,
    sources: ingested.reports,
  };

  return { ok: true, company };
}
