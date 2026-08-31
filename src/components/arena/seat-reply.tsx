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
const POINT_RE = /(?:^|\s)(\d{1,2}[.)]|[-–—•])\s+(?=[A-Za-z“"'])/;

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

function pullPoints(text: string) {
  const hits = [...text.matchAll(new RegExp(POINT_RE, "g"))];
  if (hits.length < 2) {
    return { prose: text, points: [] as string[], closing: "" };
  }

  const first = hits[0].index ?? 0;
  const prose = text.slice(0, first).trim();
  const tail = text.slice(first).trim();
  const chunks = tail.split(POINT_RE).map((part) => part.trim()).filter(Boolean);
  const points = chunks
    .filter((chunk) => !/^(\d{1,2}[.)]|[-–—•])$/.test(chunk))
    .map((chunk) => chunk.replace(/[.;]$/, "").trim())
    .filter((chunk) => chunk.length > 8);

  if (points.length < 2) {
    return { prose: text, points: [] as string[], closing: "" };
  }

  const last = points[points.length - 1];
  const [head, ...tailProse] = last.split(/\n{2,}/);
  points[points.length - 1] = head.replace(/[.;]$/, "").trim();
  let closing = tailProse.join("\n\n").trim();

  const lastBits = splitSentences(points[points.length - 1]);
  if (!closing && lastBits.length > 1 && points[points.length - 1].length > 140) {
    points[points.length - 1] = lastBits[0].replace(/[.;]$/, "").trim();
    closing = lastBits.slice(1).join(" ");
  }

  return { prose, points, closing };
}

function toParagraphs(text: string) {
  const chunks = text
    .split(/\n{2,}/)
    .map((chunk) => chunk.trim())
    .filter(Boolean);

  const paragraphs: string[] = [];
  for (const chunk of chunks) {
    const line = chunk.replace(/\n+/g, " ").replace(/\s{2,}/g, " ").trim();
    if (line.length <= 220) {
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

function absorbColonLists(paragraphs: string[], points: string[]) {
  const kept: string[] = [];
  const extra: string[] = [];

  for (const paragraph of paragraphs) {
    const colon = paragraph.match(/^([^:]{6,80}):\s+(.+)$/s);
    if (!colon) {
      kept.push(paragraph);
      continue;
    }
    const bits = colon[2]
      .split(/;\s+/)
      .map((part) =>
        part
          .replace(/^and\s+/i, "")
          .replace(/[.;]$/, "")
          .trim(),
      )
      .filter((part) => part.length > 6);
    if (bits.length >= 3) {
      extra.push(...bits);
    } else {
      kept.push(paragraph);
    }
  }

  return { paragraphs: kept, points: [...points, ...extra] };
}

export function formatSeatBody(reply: string | undefined) {
  if (!reply?.trim()) {
    return {
      quote: null as string | null,
      paragraphs: [] as string[],
      points: [] as string[],
      closing: [] as string[],
    };
  }

  const cleaned = peelPrefix(scrub(reply));
  const { quote, rest } = pullQuote(cleaned);
  const { prose, points, closing } = pullPoints(peelPrefix(rest));
  const rawParagraphs = toParagraphs(peelPrefix(prose)).filter(
    (paragraph) => paragraph.length > 1,
  );
  const parsed = absorbColonLists(rawParagraphs, points);
  const closingParagraphs = closing ? toParagraphs(closing) : [];

  return {
    quote,
    paragraphs: parsed.paragraphs,
    points: parsed.points,
    closing: closingParagraphs,
  };
}

export function SeatReply({ item }: { item: Reassessment }) {
  const { quote, paragraphs, points, closing } = formatSeatBody(item.reply);
  const hasBody =
    Boolean(quote) ||
    paragraphs.length > 0 ||
    points.length > 0 ||
    closing.length > 0;

  return (
    <article className="max-w-[54ch] border border-rule bg-leaf">
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
          <p className="border-l-2 border-indigo pl-3 text-[15px] leading-relaxed text-graphite">
            You said, &ldquo;{quote}&rdquo;
          </p>
        ) : null}

        {item.streaming ? (
          <p className="text-[15.5px] leading-[1.55] text-ink">
            {item.reply?.trim() ? (
              <span className="whitespace-pre-wrap">{item.reply}</span>
            ) : (
              <span className="text-graphite">The seat is writing.</span>
            )}
            <StreamingCaret />
          </p>
        ) : hasBody ? (
          <>
            {paragraphs.map((paragraph, index) => (
              <p key={index} className="text-[15.5px] leading-[1.55] text-ink">
                {paragraph}
              </p>
            ))}
            {points.length ? (
              <div className="border-t border-rule pt-3">
                <p className="type-eyebrow text-graphite">The terms</p>
                <ol className="mt-2.5 space-y-2.5">
                  {points.map((point, index) => (
                    <li key={index} className="flex gap-3">
                      <span className="type-figure mt-0.5 w-5 shrink-0 text-[11px] text-pencil">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <p className="text-[15px] leading-relaxed text-ink">
                        {point}
                      </p>
                    </li>
                  ))}
                </ol>
              </div>
            ) : null}
            {closing.map((paragraph, index) => (
              <p key={`close-${index}`} className="text-[15.5px] leading-[1.55] text-ink">
                {paragraph}
              </p>
            ))}
          </>
        ) : null}

        {(item.addressed ||
          (item.unaddressed && item.verdict !== "conceded")) &&
        !item.streaming ? (
          <dl className="grid gap-px border border-rule bg-rule sm:grid-cols-2">
            {item.addressed ? (
              <div className="bg-leaf px-3 py-2.5">
                <dt className="type-eyebrow text-indigo">Answered</dt>
                <dd className="mt-1.5 text-[13.5px] leading-relaxed text-graphite">
                  {item.addressed}
                </dd>
              </div>
            ) : (
              <div className="bg-leaf" />
            )}
            {item.unaddressed && item.verdict !== "conceded" ? (
              <div className="bg-leaf px-3 py-2.5">
                <dt className="type-eyebrow text-oxblood">Still open</dt>
                <dd className="mt-1.5 text-[13.5px] leading-relaxed text-graphite">
                  {item.unaddressed}
                </dd>
              </div>
            ) : null}
          </dl>
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

/** First placement on the board: the full argument, not a caption. */
export function SeatOpening({ argument }: { argument: Argument }) {
  const { paragraphs, points, closing } = formatSeatBody(argument.reasoning);
  const body =
    paragraphs.length || points.length || closing.length
      ? { paragraphs, points, closing }
      : {
          paragraphs: argument.reasoning.trim()
            ? [argument.reasoning.trim()]
            : [],
          points: [] as string[],
          closing: [] as string[],
        };

  return (
    <article className="max-w-[54ch] border border-rule bg-leaf">
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
        {body.paragraphs.map((paragraph, index) => (
          <p key={index} className="text-[15.5px] leading-[1.55] text-ink">
            {paragraph}
          </p>
        ))}
        {body.points.length ? (
          <ol className="space-y-2">
            {body.points.map((point, index) => (
              <li key={index} className="flex gap-3">
                <span className="type-figure mt-0.5 w-5 shrink-0 text-[11px] text-pencil">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <p className="text-[15px] leading-relaxed text-ink">{point}</p>
              </li>
            ))}
          </ol>
        ) : null}
        {body.closing.map((paragraph, index) => (
          <p key={`close-${index}`} className="text-[15.5px] leading-[1.55] text-ink">
            {paragraph}
          </p>
        ))}
        {argument.basis.length ? (
          <ul className="flex flex-wrap gap-1.5 pt-1">
            {argument.basis.map((basis, index) => (
              <li
                key={`${basis.label}-${index}`}
                className="border border-rule px-1.5 py-0.5 type-eyebrow text-graphite"
              >
                {basis.label}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </article>
  );
}
