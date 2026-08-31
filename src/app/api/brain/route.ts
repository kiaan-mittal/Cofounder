import { z } from "zod";

import { id, now } from "@/lib/id";
import type { BrainBuildEvent } from "@/lib/reading";
import type { Company } from "@/lib/types";
import { generateCompanyBrain } from "@/server/brain";
import { readGithubSession } from "@/server/github-oauth";
import { fail, handleRouteError, parseBody } from "@/server/http";
import { ingestGithub, ingestWebsite, keepBestPages } from "@/server/ingest";

export const runtime = "nodejs";
export const maxDuration = 120;

const bodySchema = z.object({
  website: z.string().max(400).default(""),
  github: z.string().max(400).default(""),
  docsUrl: z.string().max(400).optional(),
});

export async function POST(request: Request) {
  try {
    const input = await parseBody(request, bodySchema);

    if (!input.website.trim() && !input.github.trim()) {
      return fail(
        "Give the Arena at least one source to read: a website or a repository.",
      );
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const send = (event: BrainBuildEvent) => {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(event)}\n\n`),
          );
        };

        try {
          if (input.website.trim()) send({ type: "stage", stage: "website" });
          if (input.github.trim()) send({ type: "stage", stage: "github" });

          const githubSession = await readGithubSession();

          const [site, repo, docs] = await Promise.all([
            input.website.trim()
              ? ingestWebsite(input.website, {
                  onExcerpt: (excerpt) => send({ type: "excerpt", excerpt }),
                })
              : Promise.resolve(null),
            input.github.trim()
              ? ingestGithub(input.github, githubSession?.accessToken, {
                  onExcerpt: (excerpt) => send({ type: "excerpt", excerpt }),
                })
              : Promise.resolve(null),
            input.docsUrl?.trim()
              ? ingestWebsite(input.docsUrl, {
                  onExcerpt: (excerpt) => send({ type: "excerpt", excerpt }),
                })
              : Promise.resolve(null),
          ]);

          const reports = [
            site?.report,
            repo?.report,
            docs ? { ...docs.report, kind: "docs" as const } : undefined,
          ].filter((report): report is NonNullable<typeof report> =>
            Boolean(report),
          );

          let website = site?.source ?? null;
          if (docs?.source && website) {
            const docsPages = docs.source.pages.map((page) =>
              page.role === "home" ? { ...page, role: "docs" } : page,
            );
            const pages = keepBestPages([...website.pages, ...docsPages]);
            website = {
              ...website,
              pages,
              pricingText: website.pricingText ?? docs.source.pricingText,
              text: pages
                .map((page) => `[${page.role} ${page.url}]\n${page.text}`)
                .join("\n\n")
                .slice(0, 60_000),
            };
          } else if (!website && docs?.source) {
            website = {
              ...docs.source,
              pages: docs.source.pages.map((page) =>
                page.role === "home" ? { ...page, role: "docs" } : page,
              ),
            };
          }

          if (!website && !repo?.source) {
            send({
              type: "error",
              message:
                "Neither source could be read, so there is nothing to build a Brain from.",
              hint: reports.map((r) => `${r.url}: ${r.detail}`).join(" "),
            });
            controller.close();
            return;
          }

          send({ type: "stage", stage: "separate" });
          send({ type: "stage", stage: "assemble" });

          const { brain, companyName } = await generateCompanyBrain({
            website,
            github: repo?.source ?? null,
          });

          const company: Company = {
            id: id("co"),
            name: companyName,
            website: website?.url ?? input.website,
            github: repo?.source?.url ?? input.github,
            docsUrl: input.docsUrl,
            brain,
            sources: reports,
            createdAt: now(),
          };

          send({ type: "done", company });
        } catch (error) {
          const handled = handleRouteError(error);
          const payload = await handled.json().catch(() => null);
          send({
            type: "error",
            message:
              payload?.error ??
              "Something went wrong while reading your sources.",
            hint: payload?.hint,
          });
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "content-type": "text/event-stream; charset=utf-8",
        "cache-control": "no-cache, no-transform",
        connection: "keep-alive",
      },
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
