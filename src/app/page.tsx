import Link from "next/link";
import { redirect } from "next/navigation";

import { CopyLine } from "@/components/ink/copy-line";
import { SecondChair } from "@/components/ink/emblems";
import { InkUnderline } from "@/components/ink/marks";
import {
  StructuredData,
  landingSchema,
} from "@/components/seo/structured-data";
import {
  JUDGE_CALLS,
  JUDGE_COMPANY,
  JUDGE_DECISION,
  JUDGE_PROMPT,
  JUDGE_STEPS,
} from "@/lib/judge-path";
import { appOrigin } from "@/server/app-url";
import { readGithubSession } from "@/server/github-oauth";
import { pathAfterLogin } from "@/server/login-path";

export default async function LandingPage() {
  const session = await readGithubSession();
  if (session) {
    redirect(await pathAfterLogin(session.login));
  }

  const origin = appOrigin();

  return (
    <div className="mx-auto max-w-[1120px] px-5">
      <StructuredData data={landingSchema(origin)} />

      <section className="grid items-center gap-10 pt-12 pb-12 md:grid-cols-2 md:gap-14 lg:gap-20 lg:pt-20 lg:pb-16">
        <div>
          <p className="type-eyebrow">No account · {JUDGE_COMPANY} is loaded</p>
          <h1 className="type-display mt-5 text-[clamp(2.4rem,5.8vw,4.1rem)] font-semibold">
            A live decision.
            <br />
            ChatGPT can join.
            <br />
            <span className="relative inline-block">
              It cannot commit.
              <InkUnderline
                tone="oxblood"
                className="absolute -bottom-2 left-0 w-full"
              />
            </span>
          </h1>
          <p className="mt-8 max-w-[42ch] text-[18px] leading-relaxed text-graphite">
            Open the Arena. IndieTerminal is already on the table. Copy the
            prompt, paste it into ChatGPT with this page open — or ask the
            in-page agent. Either way the tools fire. You do not need an
            account.
          </p>
          <div className="mt-10 flex flex-wrap items-baseline gap-x-6 gap-y-3">
            <Link
              href="/arena"
              className="inline-flex h-12 items-center bg-ink px-6 text-[16px] font-medium text-paper transition-opacity hover:opacity-90"
            >
              Open IndieTerminal
            </Link>
            <Link
              href="/webmcp"
              className="text-[15px] text-graphite underline decoration-rule underline-offset-4 hover:text-ink hover:decoration-ink"
            >
              How the tools work
            </Link>
          </div>
        </div>

        <div className="border border-rule bg-leaf px-5 py-5 sm:px-7 sm:py-6">
          <SecondChair className="mx-auto max-w-[420px]" />
          <div className="mt-6 border-t border-rule pt-4">
            <p className="type-eyebrow">Loaded example</p>
            <p className="type-display mt-2 text-[22px] font-semibold">
              {JUDGE_COMPANY}
            </p>
            <p className="mt-2 text-[15px] leading-relaxed text-ink">
              {JUDGE_DECISION}
            </p>
          </div>
        </div>
      </section>

      <section className="border-t border-rule py-14">
        <p className="type-eyebrow">How to try it</p>
        <ol className="mt-8 grid gap-8 lg:grid-cols-3">
          {JUDGE_STEPS.map((step) => (
            <li key={step.n}>
              <span className="type-figure text-[13px] text-pencil">
                {step.n}
              </span>
              <h2 className="type-display mt-3 text-[26px] font-semibold">
                {step.title}
              </h2>
                {step.n === "02" ? (
                <div className="mt-4">
                  <CopyLine text={JUDGE_PROMPT} />
                </div>
              ) : (
                <p className="mt-3 text-[16px] leading-relaxed text-graphite">
                  {step.detail}
                </p>
              )}
            </li>
          ))}
        </ol>
      </section>

      <section className="border-t border-rule py-14">
        <p className="type-eyebrow">The three calls</p>
        <ul className="mt-8 grid gap-px bg-rule sm:grid-cols-3">
          {JUDGE_CALLS.map((item) => (
            <li key={item.tool} className="bg-paper p-6">
              <code className="type-figure text-[14px] text-ink">
                {item.tool}
              </code>
              <p className="mt-3 text-[16px] leading-relaxed text-graphite">
                {item.happens}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <footer className="flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-rule py-10">
        <span className="type-eyebrow">
          Decision Arena · MIT · the page is the room
        </span>
        <Link
          href="/arena"
          className="type-eyebrow ml-auto text-ink underline underline-offset-4"
        >
          Open IndieTerminal →
        </Link>
      </footer>
    </div>
  );
}
