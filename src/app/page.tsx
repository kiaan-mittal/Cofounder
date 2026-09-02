import Link from "next/link";
import { redirect } from "next/navigation";

import { CopyLine } from "@/components/ink/copy-line";
import { FiveSeats, SecondChair } from "@/components/ink/emblems";
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
import { WEBMCP_CHALLENGE_EXAMPLE } from "@/webmcp/challenge-example";

const STEP_WASH = ["bg-indigo-wash", "bg-ochre-wash", "bg-moss-wash"] as const;
const CALL_WASH = ["bg-indigo-wash", "bg-oxblood-wash", "bg-moss-wash"] as const;

const REGISTER_SNIPPET = `${WEBMCP_CHALLENGE_EXAMPLE}

document.modelContext.registerTool({
  name: "stress_test_decision",
  description: "Seat five perspectives against the live decision.",
  inputSchema: {
    type: "object",
    properties: { question: { type: "string" } },
  },
  execute: async (input) => {
    /* the page writes; only the founder can commit */
  },
});`;

export default async function LandingPage() {
  const session = await readGithubSession();
  if (session) {
    redirect(await pathAfterLogin(session.login));
  }

  const origin = appOrigin();

  return (
    <div className="mx-auto max-w-[1120px] px-5">
      <StructuredData data={landingSchema(origin)} />
      <p className="sr-only">{WEBMCP_CHALLENGE_EXAMPLE}</p>

      <section className="grid items-center gap-10 pt-12 pb-12 md:grid-cols-2 md:gap-14 lg:gap-20 lg:pt-20 lg:pb-16">
        <div>
          <p className="type-eyebrow text-indigo">
            No account · {JUDGE_COMPANY} is loaded
          </p>
          <h1 className="type-display mt-5 text-[clamp(2.4rem,5.8vw,4.1rem)] font-semibold">
            A <span className="ink-highlight">live decision</span>.
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
          <p className="mt-8 max-w-[44ch] text-[18px] leading-relaxed text-graphite">
            Decision Arena is a table, not a chatbot. Five seats — tech,
            product, GTM, finance, contrarian — argue a real company decision
            on the page. Copy the prompt into ChatGPT with this page open, or
            ask the in-page agent. Either way the tools fire. Only you can
            close it.
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

        <div className="relative overflow-hidden border border-rule bg-paper px-5 py-5 sm:px-7 sm:py-6">
          <div
            aria-hidden
            className="pointer-events-none absolute -left-10 -top-12 size-44 rounded-full bg-indigo-wash"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -right-8 top-10 size-36 rounded-full bg-ochre-wash"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute bottom-6 left-1/3 size-28 rounded-full bg-moss-wash"
          />
          <div className="relative">
            <SecondChair className="mx-auto max-w-[420px]" />
            <div className="mt-6 border-t border-rule pt-4">
              <p className="type-eyebrow text-indigo">Loaded example</p>
              <p className="type-display mt-2 text-[22px] font-semibold">
                {JUDGE_COMPANY}
              </p>
              <p className="mt-2 text-[15px] leading-relaxed text-ink">
                {JUDGE_DECISION}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-rule py-14">
        <p className="type-eyebrow">What this is</p>
        <div className="mt-8 grid items-start gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
          <div>
            <h2 className="type-display text-[clamp(1.8rem,3.2vw,2.4rem)] font-semibold">
              The page is the room. The agent is a guest at the table.
            </h2>
            <p className="mt-5 max-w-[52ch] text-[17px] leading-relaxed text-graphite">
              Open the Arena and IndieTerminal is already on the floor — a
              real product, a live question, no sign-in. Paste a prompt into
              ChatGPT. Tools fire on this page. The five seats write. You
              watch. When the agent tries to commit, the page says no.
            </p>
            <p className="mt-4 max-w-[52ch] text-[17px] leading-relaxed text-graphite">
              The Company Brain is the map underneath: users, code, product,
              market, risks, bets, drawn from the repo and the site. Take a
              node to the Arena when you want it argued.
            </p>
          </div>
          <div className="border border-rule bg-ochre-wash/80 px-5 py-6">
            <FiveSeats />
            <p className="mt-4 text-[14px] leading-relaxed text-graphite">
              Five chairs. One empty seat is yours. The red one is the
              contrarian — the only job that is supposed to be unwelcome.
            </p>
          </div>
        </div>
      </section>

      <section className="border-t border-rule py-14">
        <p className="type-eyebrow">How to try it</p>
        <ol className="mt-8 grid gap-5 lg:grid-cols-3">
          {JUDGE_STEPS.map((step, index) => (
            <li key={step.n} className={`border border-rule px-5 py-5 ${STEP_WASH[index]}`}>
              <span className="type-figure text-[13px] text-pencil">
                {step.n}
              </span>
              <h2 className="type-display mt-3 text-[26px] font-semibold">
                {step.title}
              </h2>
              {step.n === "02" ? (
                <div className="mt-4">
                  <CopyLine text={JUDGE_PROMPT} className="bg-paper" />
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
        <ul className="mt-8 grid gap-5 sm:grid-cols-3">
          {JUDGE_CALLS.map((item, index) => (
            <li key={item.tool} className={`border border-rule p-6 ${CALL_WASH[index]}`}>
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

      <section className="border-t border-rule py-14">
        <p className="type-eyebrow">WebMCP on the page</p>
        <h2 className="type-display mt-4 max-w-[28ch] text-[clamp(1.6rem,2.8vw,2.1rem)] font-semibold">
          The browser discovers tools the way Devpost asked —{" "}
          <span className="text-indigo">registerTool</span> on the document.
        </h2>
        <p className="mt-4 max-w-[54ch] text-[16px] leading-relaxed text-graphite">
          Decision Arena does not wrap the agent in a custom protocol. It
          publishes tools on <code className="type-figure text-[13px] text-ink">document.modelContext</code>.
          ChatGPT in a WebMCP browser can find them, call them, and still
          cannot commit for you.
        </p>
        <pre className="mt-6 overflow-x-auto border border-rule bg-ink px-5 py-5 text-[12.5px] leading-relaxed text-paper">
          <code>{REGISTER_SNIPPET}</code>
        </pre>
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
