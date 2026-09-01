import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ArenaMark } from "@/components/ink/marks";
import type { DecisionBrief } from "@/lib/decision-brief";
import { readDecisionShare } from "@/server/shares";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const { token } = await params;
  const brief = token?.startsWith("shr_") ? await readDecisionShare(token) : null;
  if (!brief) return { title: "Decision record" };
  return {
    title: brief.question,
    description: brief.commitRefused
      ? `${brief.company} · confirm_commit was refused. ${brief.deadlock ? "Deadlock" : brief.leaningLabel}`
      : `${brief.company} · ${brief.deadlock ? "Deadlock" : brief.leaningLabel}. What would change it: ${brief.whatWouldChangeIt}`,
  };
}

export default async function SharePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (!token?.startsWith("shr_")) notFound();
  const brief = await readDecisionShare(token);
  if (!brief) notFound();

  return (
    <div className="mx-auto max-w-[860px] px-5 py-12 lg:py-16">
      <header className="flex items-center gap-2.5">
        <Link href="/" className="flex items-center gap-2.5">
          <ArenaMark />
          <span className="type-display text-[17px] font-semibold text-ink">
            Decision Arena
          </span>
        </Link>
        <p className="type-eyebrow ml-auto text-graphite">Public record</p>
      </header>

      {brief.commitRefused ? (
        <p className="mt-12 border border-rule bg-oxblood-wash px-5 py-4">
          <span className="type-eyebrow text-oxblood">
            confirm_commit was refused
          </span>
          <span className="mt-2 block text-[15px] leading-relaxed text-ink">
            An agent asked to finish this decision. The page said no. Agents
            proposed. The founder commits.
          </span>
        </p>
      ) : null}

      <p className="type-eyebrow mt-12">{brief.company}</p>
      <h1 className="type-display mt-4 text-[clamp(1.8rem,4vw,3rem)] font-semibold leading-[1.05]">
        {brief.question}
      </h1>
      <p className="mt-4 text-[15px] leading-relaxed text-graphite">
        {brief.status} · Arena {brief.arenaConfidence}% · Founder{" "}
        {brief.founderConfidence}%
      </p>
      {brief.context ? (
        <p className="mt-3 max-w-[62ch] text-[16px] leading-relaxed text-graphite">
          {brief.context}
        </p>
      ) : null}

      <section className="mt-10 border border-rule bg-leaf px-5 py-4">
        {brief.deadlock ? (
          <p className="type-eyebrow text-oxblood">Arena deadlock</p>
        ) : (
          <p className="type-eyebrow">On the table</p>
        )}
        <p className="type-display mt-2 text-[22px] font-semibold leading-tight">
          {brief.deadlock
            ? (brief.deadlockNote ?? brief.leaningLabel)
            : brief.leaningLabel}
        </p>
        <p className="mt-3 text-[14.5px] leading-relaxed text-ink">
          What would change it: {brief.whatWouldChangeIt}
        </p>
      </section>

      <section className="mt-12">
        <h2 className="type-eyebrow">The seats</h2>
        <ul className="mt-5 space-y-6">
          {brief.seats.map((seat) => (
            <li key={`${seat.seat}-${seat.claim}`} className="border-t border-rule pt-5">
              <p className="type-eyebrow">
                {seat.seat} · {seat.stance}
              </p>
              <p className="mt-2 text-[17px] font-medium leading-snug text-ink">
                {seat.claim}
              </p>
              <p className="mt-2 text-[15px] leading-relaxed text-graphite">
                {seat.reasoning}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <OpenItems brief={brief} />

      <p className="mt-14 max-w-[52ch] text-[14px] leading-relaxed text-graphite">
        {brief.commitRefused
          ? "This is a record, not a chat. confirm_commit was refused. Agents proposed. The founder commits."
          : "This is a record, not a chat. Agents proposed. The founder commits."}
      </p>
      <Link
        href="/arena"
        className="type-eyebrow mt-4 inline-block text-ink underline underline-offset-4"
      >
        Open Decision Arena
      </Link>
    </div>
  );
}

function OpenItems({ brief }: { brief: DecisionBrief }) {
  if (
    !brief.contradictions.length &&
    !brief.evidence.length &&
    !brief.risks.length
  ) {
    return null;
  }
  return (
    <section className="mt-12 grid gap-8 border-t border-rule pt-8 md:grid-cols-3">
      <div>
        <h2 className="type-eyebrow">Contradictions</h2>
        <ul className="mt-3 space-y-3">
          {brief.contradictions.length ? (
            brief.contradictions.map((item) => (
              <li key={item.summary} className="text-[14px] leading-relaxed">
                <span className="text-ink">{item.summary}</span>
                <span className="mt-1 block text-graphite">
                  {item.sideA} / {item.sideB}
                </span>
              </li>
            ))
          ) : (
            <li className="text-[14px] text-pencil">None open.</li>
          )}
        </ul>
      </div>
      <div>
        <h2 className="type-eyebrow">Evidence</h2>
        <ul className="mt-3 space-y-3">
          {brief.evidence.length ? (
            brief.evidence.map((item) => (
              <li key={item} className="text-[14px] leading-relaxed text-ink">
                {item}
              </li>
            ))
          ) : (
            <li className="text-[14px] text-pencil">None outstanding.</li>
          )}
        </ul>
      </div>
      <div>
        <h2 className="type-eyebrow">Risks</h2>
        <ul className="mt-3 space-y-3">
          {brief.risks.length ? (
            brief.risks.map((item) => (
              <li key={item.title} className="text-[14px] leading-relaxed">
                <span className="text-ink">{item.title}</span>
                <span className="mt-1 block text-graphite">{item.detail}</span>
              </li>
            ))
          ) : (
            <li className="text-[14px] text-pencil">None open.</li>
          )}
        </ul>
      </div>
    </section>
  );
}
