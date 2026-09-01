import Link from "next/link";
import { redirect } from "next/navigation";

import { SeatReply } from "@/components/arena/seat-reply";
import {
  CommitNeedle,
  FiveSeats,
  PerspectiveEmblem,
  SecondChair,
} from "@/components/ink/emblems";
import { InkRule, InkUnderline } from "@/components/ink/marks";
import {
  StructuredData,
  landingSchema,
} from "@/components/seo/structured-data";
import { BalanceSketch, TableSketch } from "@/components/ink/table-drawings";
import { Button } from "@/components/ui/button";
import { PERSPECTIVES } from "@/lib/perspectives";
import type { Reassessment } from "@/lib/types";
import { appOrigin } from "@/server/app-url";
import { readGithubSession } from "@/server/github-oauth";
import { pathAfterLogin } from "@/server/login-path";

const LOOP = [
  { step: "Brain", detail: "Your repo and site, split into facts and bets — already loaded." },
  { step: "Decision", detail: "One question with more than one honest answer." },
  { step: "Arena", detail: "An agent writes on this table. It cannot close it." },
  { step: "State", detail: "Open evidence and contradictions block the commit." },
  { step: "Commit", detail: "Only you. Then a number that can be wrong." },
  { step: "Calibrate", detail: "Reality scores it. The next room already knows." },
];

const NOT_A_CHAT = [
  {
    mark: "01",
    title: "It cannot inherit the company.",
    body: "A new chat starts empty. You paste a brief, or you don't. Here the GitHub repo, the site, and the last scored predictions are already in the room. The agent reads them. You do not re-explain yourself.",
  },
  {
    mark: "02",
    title: "It cannot write only in the transcript.",
    body: "In a chat, a contradiction is a paragraph. Here it is an object on your table, in the same ink the seats use, and it blocks commit until you deal with it. Close the tab. It is still there tomorrow.",
  },
  {
    mark: "03",
    title: "It cannot finish the decision.",
    body: "ChatGPT can recommend you ship. It cannot press commit. The last irreversible act stays with the person who lives with it. Agents propose. Founders commit.",
  },
];

const SPECIMEN: Reassessment = {
  id: "specimen",
  decisionId: "specimen",
  defenseId: "specimen",
  argumentId: "specimen",
  perspective: "financial",
  verdict: "unmoved",
  addressed: "You named a feature you intend to ship.",
  unaddressed:
    "You did not name the cash that pays for it, or the date that cash has to arrive.",
  reply: `You said you would "manage to add new features." Managing is not a number.

I will not sign a live index we cannot price. Weekly snapshots on the core set. Daily only as a paid add-on, after we know the unit cost.

- Three months of data cost at the scope you want
- A price that covers it without eating runway
- A kill date if the add-on does not sell

Until then I stay against.`,
  strengthDelta: 0,
  createdAt: "2026-08-31T00:00:00.000Z",
};

export default async function LandingPage() {
  const session = await readGithubSession();
  if (session) {
    redirect(await pathAfterLogin(session.login));
  }

  const origin = appOrigin();

  return (
    <div className="mx-auto max-w-[1400px] px-5">
      <StructuredData data={landingSchema(origin)} />

      {/* Hero */}
      <section className="grid gap-12 pt-14 pb-20 lg:grid-cols-[1.15fr_1fr] lg:gap-20 lg:pt-20">
        <div className="max-w-[36ch]">
          <p className="type-eyebrow">A decision ChatGPT can join, not own</p>

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
            Five seats arguing is a prompt. This is the other thing: a
            company-owned decision that already knows your repo, your misses,
            and the evidence still open. Agents write on the same table you
            see. They are not allowed to end it.
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-3">
            <Button asChild size="lg" className="h-11 px-6 text-[15px]">
              <Link href="/arena">Open the Arena</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="h-11 px-6 text-[15px]"
            >
              <Link href="/webmcp">See the guest protocol</Link>
            </Button>
          </div>

          <p className="type-eyebrow mt-8 leading-relaxed">
            No account. IndieTerminal is already loaded. Sign in with GitHub
            only if you want to point the Arena at your own repository.
          </p>
        </div>

        <div className="flex flex-col justify-center">
          <SecondChair className="max-w-[420px]" />
          <p className="type-eyebrow mt-6 max-w-[38ch] leading-relaxed">
            Fig. 1 — The second chair. Most founders argue with no one before
            reality argues back.
          </p>
          <div className="mt-8 border border-rule bg-leaf px-4 py-4">
            <FiveSeats />
            <ul className="mt-3 flex justify-between px-1">
              {PERSPECTIVES.map((seat) => (
                <li key={seat.id} className="flex flex-col items-center gap-1">
                  <PerspectiveEmblem perspective={seat.id} className="size-9" />
                  <span className="type-eyebrow">{seat.mark}</span>
                </li>
              ))}
            </ul>
          </div>
          <p className="type-eyebrow mt-4 max-w-[42ch] leading-relaxed">
            Fig. 2 — The five seats. They write first. You answer on the record.
          </p>
        </div>
      </section>

      <section className="border-t border-rule py-16">
        <h2 className="type-eyebrow">The question this has to survive</h2>
        <p className="type-display mt-5 max-w-[22ch] text-[clamp(1.8rem,3.5vw,2.6rem)] font-semibold leading-[1.08]">
          Cool — but couldn&rsquo;t ChatGPT just do this?
        </p>
        <p className="mt-5 max-w-[58ch] text-[17px] leading-relaxed text-graphite">
          Strip the protocol name off the page. The talking still looks like a
          chat with extra chairs. The product is what remains when the chat
          ends, what the chat is forbidden to do while it is open, and the
          record it can send to Slack or Notion — a link that still works after
          the tab closes.
        </p>
        <ol className="mt-10 grid gap-px bg-rule lg:grid-cols-3">
          {NOT_A_CHAT.map((item) => (
            <li key={item.mark} className="bg-paper p-6">
              <span className="type-figure text-[11px] text-pencil">
                {item.mark}
              </span>
              <h3 className="type-display mt-3 text-[22px] font-semibold leading-tight">
                {item.title}
              </h3>
              <p className="mt-3 text-[15px] leading-relaxed text-graphite">
                {item.body}
              </p>
            </li>
          ))}
        </ol>
      </section>

      <section className="border-t border-rule py-16">
        <div className="grid gap-12 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
          <div>
            <h2 className="type-eyebrow">Who sits across from you</h2>
            <p className="type-display mt-5 max-w-[20ch] text-[clamp(1.8rem,3.5vw,2.6rem)] font-semibold leading-[1.08]">
              High-quality disagreement, before you ship.
            </p>
            <p className="mt-5 max-w-[46ch] text-[17px] leading-relaxed text-graphite">
              The public floor is already loaded with a real company. Five seats
              argue the next decision. Sign in with GitHub only if you want to
              replace it with your own repository and site.
            </p>
            <Button asChild size="lg" className="mt-8 h-11 px-6 text-[15px]">
              <Link href="/arena">Open the Arena</Link>
            </Button>
          </div>
          <div className="border border-rule bg-leaf px-5 py-5">
            <TableSketch writing={[]} ready={[]} filled={[]} />
            <ul className="mt-6 space-y-4">
              {PERSPECTIVES.map((seat) => (
                <li key={seat.id} className="flex gap-3">
                  <PerspectiveEmblem
                    perspective={seat.id}
                    className="size-10 shrink-0"
                  />
                  <div>
                    <p className="type-eyebrow">{seat.mark}</p>
                    <p className="mt-1 text-[14px] leading-relaxed text-graphite">
                      {seat.remit}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="border-t border-rule py-16">
        <div className="grid gap-12 lg:grid-cols-[1fr_1.05fr] lg:items-start lg:gap-16">
          <div>
            <h2 className="type-eyebrow">They answer on the record</h2>
            <p className="type-display mt-5 max-w-[18ch] text-[clamp(1.8rem,3.5vw,2.6rem)] font-semibold leading-[1.08]">
              Not a dump. A seat, speaking.
            </p>
            <p className="mt-5 max-w-[46ch] text-[17px] leading-relaxed text-graphite">
              Technical, Product, GTM, Finance, and the Contrarian write like
              people across a table: what they heard, what they will not sign,
              and the hole that is still open. You answer. The card does not
              scroll away.
            </p>
            <Button asChild size="lg" className="mt-8 h-11 px-6 text-[15px]">
              <Link href="/arena">Sit the board</Link>
            </Button>
          </div>
          <figure>
            <SeatReply item={SPECIMEN} />
            <figcaption className="type-eyebrow mt-4 max-w-[46ch] leading-relaxed">
              Fig. 3 — A seat answers. Quote, terms, and the thing still unpaid.
            </figcaption>
          </figure>
        </div>
      </section>

      {/* The loop — numbered because it genuinely is a sequence */}
      <section className="border-t border-rule py-16">
        <h2 className="type-eyebrow">The loop</h2>
        <div className="mt-8 grid gap-px bg-rule sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
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
          Calibration is the step other tools skip. A decision you never
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
            <FiveSeats className="max-w-[360px] text-ink" />
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

      <section className="border-t border-rule py-16">
        <div className="grid gap-12 lg:grid-cols-[1fr_1fr] lg:items-center lg:gap-16">
          <div className="border border-rule bg-leaf px-6 py-6">
            <CommitNeedle />
            <BalanceSketch forPct={36} className="mt-4" />
            <p className="type-eyebrow mt-5 leading-relaxed">
              Fig. 4 — You put a number on it before reality does.
            </p>
          </div>
          <div>
            <h2 className="type-eyebrow">Then you weigh it</h2>
            <p className="type-display mt-5 max-w-[16ch] text-[clamp(1.8rem,3.5vw,2.6rem)] font-semibold leading-[1.08]">
              A decision without a number is a story.
            </p>
            <p className="mt-5 max-w-[46ch] text-[17px] leading-relaxed text-graphite">
              After the seats have spoken you commit, attach a prediction, and
              come back when the date lands. That record is what the next
              argument is made of.
            </p>
            <Button asChild size="lg" className="mt-8 h-11 px-6 text-[15px]">
              <Link href="/arena">Open the Arena</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* WebMCP */}
      <section className="border-t border-rule py-16">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.1fr] lg:gap-16">
          <div>
            <h2 className="type-eyebrow">Why an agent is a guest here</h2>
            <p className="type-display mt-5 text-[32px] leading-tight">
              The agent doesn&rsquo;t describe the workspace. It works in it.
            </p>
            <p className="mt-6 max-w-[46ch] text-[17px] leading-relaxed text-graphite">
              That is the only reason the protocol matters. ChatGPT in a thread
              is the room. ChatGPT on this page is a guest with named verbs:
              read the brain, flag a contradiction, request evidence, propose a
              commit. Not{" "}
              <code className="type-figure text-[13px] text-ink">
                click_button
              </code>
              . When it calls one, your table changes. When it calls{" "}
              <code className="type-figure text-[13px] text-ink">
                confirm_commit
              </code>
              , the page says no.
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
          Decision Arena · MIT licensed · the page is the room
        </span>
        <Link
          href="/arena"
          className="type-eyebrow ml-auto text-ink transition-opacity hover:opacity-60"
        >
          Open the Arena →
        </Link>
      </footer>
    </div>
  );
}
