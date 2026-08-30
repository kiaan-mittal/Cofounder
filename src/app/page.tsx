import Link from "next/link";
import { redirect } from "next/navigation";

import { SecondChair } from "@/components/ink/emblems";
import { ArenaMark, InkRule, InkUnderline } from "@/components/ink/marks";
import { Button } from "@/components/ui/button";
import { WebMCPStatus } from "@/components/webmcp/webmcp-status";
import { readGithubSession } from "@/server/github-oauth";
import { pathAfterLogin } from "@/server/login-path";

const LOOP = [
  { step: "Brain", detail: "Your site and repo become checkable context." },
  { step: "Debate", detail: "Five specialists argue about your decision." },
  { step: "Defense", detail: "You push back. They reassess — partially." },
  { step: "Commit", detail: "You choose, and say what would prove you right." },
  { step: "Reality", detail: "The number lands. Your calibration updates." },
];

export default async function LandingPage() {
  const session = await readGithubSession();
  if (session) {
    redirect(await pathAfterLogin(session.login));
  }

  return (
    <div className="mx-auto max-w-[1400px] px-5">
      <header className="flex h-16 items-center gap-4">
        <div className="flex items-center gap-2.5">
          <ArenaMark />
          <span className="type-display text-[17px] font-semibold">
            Decision Arena
          </span>
        </div>
        <div className="ml-auto flex items-center gap-4">
          <Link
            href="/webmcp"
            className="type-eyebrow hidden transition-colors hover:text-ink sm:block"
          >
            Tool surface
          </Link>
          <a
            href="/api/auth/github?returnTo=/arena"
            className="type-eyebrow text-ink transition-opacity hover:opacity-60"
          >
            Sign in with GitHub
          </a>
          <WebMCPStatus />
        </div>
      </header>

      {/* Hero */}
      <section className="grid gap-12 border-t border-rule pt-14 pb-20 lg:grid-cols-[1.15fr_1fr] lg:gap-20 lg:pt-20">
        <div className="max-w-[36ch]">
          <p className="type-eyebrow">Human + agent decision workspace</p>

          <h1 className="type-display mt-6 text-[clamp(2.75rem,7vw,4.75rem)] font-semibold">
            AI that argues
            <br />
            with you before
            <br />
            <span className="relative inline-block">
              reality does.
              <InkUnderline
                tone="oxblood"
                className="absolute -bottom-2 left-0 w-full"
              />
            </span>
          </h1>

          <p className="mt-9 text-[17px] leading-relaxed text-graphite">
            Founders do not lack information. They lack high-quality
            disagreement. Decision Arena reads your company, argues with your
            next consequential decision from five angles, holds you to a
            measurable prediction, and remembers what actually happened.
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-3">
            <Button asChild size="lg" className="h-11 px-6 text-[15px]">
              <a href="/api/auth/github?returnTo=/arena">
                Sign in with GitHub
              </a>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="h-11 px-6 text-[15px]"
            >
              <Link href="/webmcp">See what agents can do here</Link>
            </Button>
          </div>

          <p className="type-eyebrow mt-8 leading-relaxed">
            Built for the WebMCP Challenge · Runs in ChatGPT&rsquo;s browser and
            in Chrome
          </p>
        </div>

        <div className="flex flex-col justify-center">
          <SecondChair className="max-w-[420px]" />
          <p className="type-eyebrow mt-6 max-w-[38ch] leading-relaxed">
            Fig. 1 — The second chair. Most founders argue with no one before
            reality argues back.
          </p>
        </div>
      </section>

      {/* The loop — numbered because it genuinely is a sequence */}
      <section className="border-t border-rule py-16">
        <h2 className="type-eyebrow">The loop</h2>
        <div className="mt-8 grid gap-px bg-rule sm:grid-cols-2 lg:grid-cols-5">
          {LOOP.map((item, index) => (
            <div key={item.step} className="bg-paper p-6">
              <span className="type-figure text-[11px] text-pencil">
                {String(index + 1).padStart(2, "0")}
              </span>
              <h3 className="type-display mt-3 text-2xl font-semibold">
                {item.step}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-graphite">
                {item.detail}
              </p>
            </div>
          ))}
        </div>
        <p className="mt-6 max-w-[60ch] text-sm leading-relaxed text-graphite">
          The fifth step is the one other tools skip. A decision you never
          measured is a story you told yourself afterwards.
        </p>
      </section>

      {/* The golden moment */}
      <section className="border-t border-rule py-16">
        <h2 className="type-eyebrow">What it feels like</h2>

        <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_1fr] lg:gap-16">
          <div className="space-y-6">
            <figure className="border border-rule bg-leaf px-6 py-5">
              <figcaption className="type-eyebrow text-indigo">
                Founder
              </figcaption>
              <blockquote className="type-display mt-2 text-[26px] leading-tight">
                &ldquo;You&rsquo;re assuming the migration takes two months.
                I&rsquo;ve already built 70% of it.&rdquo;
              </blockquote>
            </figure>

            <figure className="border border-rule bg-leaf px-6 py-5">
              <figcaption className="type-eyebrow text-oxblood">
                The Arena
              </figcaption>
              <blockquote className="type-display mt-2 text-[26px] leading-tight">
                &ldquo;That reduces the migration risk. It doesn&rsquo;t touch
                the opportunity cost of stopping feature work for six
                weeks.&rdquo;
              </blockquote>
            </figure>
          </div>

          <div className="space-y-5 text-[17px] leading-relaxed text-graphite">
            <p>
              The Arena will concede when you are right. It will not concede
              because you pushed. Every reassessment names two things: what your
              defense <em className="text-ink not-italic">did</em> answer, and
              what it did not.
            </p>
            <p>
              And because the workspace is structured state rather than a
              transcript, that second half stays on the page as an unresolved
              objection until you deal with it. You cannot win an argument here
              by scrolling past it.
            </p>
            <InkRule className="max-w-[240px]" />
            <p className="text-sm">
              After a few decisions the Arena stops arguing from theory and
              starts arguing from your record:{" "}
              <span className="ink-highlight text-ink">
                your last five growth predictions were 2.1× optimistic.
              </span>
            </p>
          </div>
        </div>
      </section>

      {/* WebMCP */}
      <section className="border-t border-rule py-16">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.1fr] lg:gap-16">
          <div>
            <h2 className="type-eyebrow">Why this is a WebMCP product</h2>
            <p className="type-display mt-5 text-[32px] leading-tight">
              The agent doesn&rsquo;t describe the workspace. It works in it.
            </p>
            <p className="mt-6 max-w-[46ch] text-[17px] leading-relaxed text-graphite">
              Decision Arena exposes decision primitives to any connected agent
              — read the Company Brain, challenge an argument, flag a
              contradiction, record a prediction. Not{" "}
              <code className="type-figure text-[13px] text-ink">
                click_button
              </code>
              . When an agent calls one, the founder&rsquo;s page changes in
              front of them and they answer back.
            </p>
            <Button asChild variant="outline" className="mt-8">
              <Link href="/webmcp">Open the tool surface</Link>
            </Button>
          </div>

          <pre className="overflow-x-auto border border-rule bg-leaf p-6 text-[12.5px] leading-relaxed">
            <code className="font-mono text-ink">{`await document.modelContext.registerTool({
  name: "flag_contradiction",
  description:
    "Record two things the founder appears to " +
    "believe that cannot both be true.",
  inputSchema: {
    type: "object",
    properties: {
      summary: { type: "string" },
      side_a:  { type: "string" },
      side_b:  { type: "string" },
    },
    required: ["summary", "side_a", "side_b"],
  },
  execute({ summary, side_a, side_b }) {
    arena.addContradiction({ summary, side_a, side_b });
    return { content: [{ type: "text", text: "Flagged." }] };
  },
}, { signal: controller.signal });`}</code>
          </pre>
        </div>
      </section>

      <footer className="flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-rule py-10">
        <span className="type-eyebrow">
          Decision Arena · MIT licensed · WebMCP Challenge 2026
        </span>
        <a
          href="/api/auth/github?returnTo=/arena"
          className="type-eyebrow ml-auto text-ink transition-opacity hover:opacity-60"
        >
          Sign in with GitHub →
        </a>
      </footer>
    </div>
  );
}
