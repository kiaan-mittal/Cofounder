import { StreamingCaret } from "@/components/arena/streaming-caret";
import { PerspectiveEmblem } from "@/components/ink/emblems";
import { perspectiveName, perspectiveSeat } from "@/lib/perspectives";
import { cn } from "@/lib/utils";
import type { Argument, Reassessment } from "@/lib/types";

const ID_RE = /\b(?:fact|asm|arg|risk|ev|co|dec|pred)_[a-z0-9]{4,}\b/gi;
const PREFIX_RE =
  /^(?:(?:technical|tech|product|gtm|financial|finance|cfo|cto|contra(?:rian)?)\s*(?:co-?founder)?\s*[:—–-]\s*)+/i;
const QUOTE_RE =
  /(?:you said(?:[,:]|\s+that)?\s*)[“"']([^”"'“]{2,140})[”"']/i;

const VERDICT_TONE: Record<Reassessment["verdict"], string> = {
  conceded: "bg-moss-wash text-moss",
  weakened: "bg-ochre-wash text-ochre",
  unmoved: "bg-oxblood-wash text-oxblood",
  reinforced: "bg-oxblood-wash text-oxblood",
};

function scrub(text: string) {
  return text
    .replace(ID_RE, "")
    .replace(/\(\s*[,;]?\s*\)/g, "")
    .replace(/\s+([.,;:!?])/g, "$1")
    .replace(/[ \t]+/g, " ")
    .replace(/ +\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function peelPrefix(text: string) {
  let out = text.trim();
  for (let i = 0; i < 4; i++) {
    const next = out.replace(PREFIX_RE, "").trim();
    if (next === out) break;
    out = next;
  }
  return out;
}

function splitSentences(text: string) {
  return (
    text
      .match(/[^.!?]+[.!?]+(?:["”']+)?|[^.!?]+$/g)
      ?.map((part) => part.trim()) ?? [text]
  ).filter(Boolean);
}

function pullQuote(text: string) {
  const match = text.match(QUOTE_RE);
  if (!match?.[1]) return { quote: null as string | null, rest: text };
  const quote = match[1].replace(/\s+/g, " ").trim();
  const rest = text.replace(match[0], " ").replace(/\s{2,}/g, " ").trim();
  return { quote, rest };
}

function toParagraphs(text: string) {
  const chunks = text
    .split(/\n{2,}/)
    .map((chunk) => chunk.trim())
    .filter(Boolean);

  const paragraphs: string[] = [];
  for (const chunk of chunks) {
    const line = chunk.replace(/\n+/g, " ").replace(/\s{2,}/g, " ").trim();
    if (line.length <= 280) {
      paragraphs.push(line);
      continue;
    }
    const bits = splitSentences(line);
    for (let i = 0; i < bits.length; i += 2) {
      paragraphs.push(bits.slice(i, i + 2).join(" "));
    }
  }
  return paragraphs;
}

/** Clean prose for a seat card — flowing text, not a form. */
export function formatSeatBody(reply: string | undefined) {
  if (!reply?.trim()) {
    return {
      quote: null as string | null,
      paragraphs: [] as string[],
    };
  }

  const cleaned = peelPrefix(scrub(reply));
  const { quote, rest } = pullQuote(cleaned);

  return {
    quote,
    paragraphs: toParagraphs(peelPrefix(rest)).filter(
      (paragraph) => paragraph.length > 1,
    ),
  };
}

export function SeatReply({
  item,
  className,
}: {
  item: Reassessment;
  className?: string;
}) {
  const { quote, paragraphs } = formatSeatBody(item.reply);
  const hasBody = Boolean(quote) || paragraphs.length > 0;

  return (
    <article className={cn("max-w-[54ch] border border-rule bg-leaf", className)}>
      <header className="flex items-center gap-3 border-b border-rule bg-paper px-3 py-2.5">
        <PerspectiveEmblem
          perspective={item.perspective}
          className="size-9 shrink-0 text-oxblood"
        />
        <div className="min-w-0 flex-1">
          <p className="type-eyebrow text-oxblood">
            {perspectiveSeat(item.perspective)}
          </p>
          <p className="mt-0.5 truncate text-[13.5px] text-graphite">
            {perspectiveName(item.perspective)}
          </p>
        </div>
        <span
          className={cn(
            "type-eyebrow shrink-0 px-1.5 py-0.5",
            item.streaming && !item.addressed
              ? "text-pencil"
              : VERDICT_TONE[item.verdict],
          )}
        >
          {item.streaming && !item.addressed ? "writing" : item.verdict}
        </span>
      </header>

      <div className="space-y-3 px-3.5 py-3.5">
        {quote ? (
          <p className="text-[15px] leading-relaxed text-graphite">
            You said, &ldquo;{quote}&rdquo;
          </p>
        ) : null}

        {item.streaming ? (
          <p className="text-[15.5px] leading-[1.65] text-ink">
            {item.reply?.trim() ? (
              <span className="whitespace-pre-wrap">{item.reply}</span>
            ) : (
              <span className="text-graphite">The seat is writing.</span>
            )}
            <StreamingCaret />
          </p>
        ) : hasBody ? (
          paragraphs.map((paragraph, index) => (
            <p key={index} className="text-[15.5px] leading-[1.65] text-ink">
              {paragraph}
            </p>
          ))
        ) : null}

        {!item.streaming && item.addressed ? (
          <p className="text-[15px] leading-relaxed text-graphite">
            You covered {item.addressed}
            {item.unaddressed && item.verdict !== "conceded"
              ? `. Still open: ${item.unaddressed}`
              : ""}
            .
          </p>
        ) : !item.streaming &&
          item.unaddressed &&
          item.verdict !== "conceded" ? (
          <p className="text-[15px] leading-relaxed text-graphite">
            Still open: {item.unaddressed}
          </p>
        ) : null}
      </div>
    </article>
  );
}

const STANCE_COPY: Record<Argument["stance"], string> = {
  for: "for",
  against: "against",
  conditional: "only if",
};

/** First placement on the board: the full argument, as readable prose. */
export function SeatOpening({
  argument,
  className,
}: {
  argument: Argument;
  className?: string;
}) {
  const { paragraphs } = formatSeatBody(argument.reasoning);
  const body = paragraphs.length
    ? paragraphs
    : argument.reasoning.trim()
      ? [argument.reasoning.trim()]
      : [];

  return (
    <article className={cn("max-w-[54ch] border border-rule bg-leaf", className)}>
      <header className="flex items-center gap-3 border-b border-rule bg-paper px-3 py-2.5">
        <PerspectiveEmblem
          perspective={argument.perspective}
          className="size-9 shrink-0 text-oxblood"
        />
        <div className="min-w-0 flex-1">
          <p className="type-eyebrow text-oxblood">
            {perspectiveSeat(argument.perspective)}
          </p>
          <p className="mt-0.5 truncate text-[13.5px] text-graphite">
            {perspectiveName(argument.perspective)} · {STANCE_COPY[argument.stance]}
          </p>
        </div>
      </header>
      <div className="space-y-3 px-3.5 py-3.5">
        <p className="text-[17px] font-semibold leading-snug text-ink">
          {argument.claim}
        </p>
        {body.map((paragraph, index) => (
          <p key={index} className="text-[15.5px] leading-[1.65] text-ink">
            {paragraph}
          </p>
        ))}
        {argument.basis.length ? (
          <p className="pt-1 text-[13px] leading-relaxed text-graphite">
            {argument.basis.map((item) => item.label).join(" · ")}
          </p>
        ) : null}
      </div>
    </article>
  );
}
