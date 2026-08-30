"use client";

import { RoundComposer } from "@/components/arena/decision-board";
import { perspectiveName } from "@/lib/perspectives";
import type { Defense, Reassessment } from "@/lib/types";

export function FounderDesk({
  defenses,
  reassessments,
  value,
  busy,
  committed,
  onChange,
  onSubmit,
}: {
  defenses: Defense[];
  reassessments: Reassessment[];
  value: string;
  busy: boolean;
  committed: boolean;
  onChange: (value: string) => void;
  onSubmit: () => void;
}) {
  return (
    <div className="flex flex-col bg-indigo-wash/50 md:h-[min(52vh,500px)]">
      <header className="border-b border-rule bg-paper px-4 py-3">
        <p className="type-eyebrow text-indigo">Founder · CEO</p>
        <p className="mt-1 text-[13.5px] text-graphite">
          Defense and judgment. The seats reassess from this.
        </p>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 max-md:max-h-[220px]">
        {defenses.length === 0 ? (
          <div className="flex min-h-[88px] flex-col justify-end md:min-h-[160px]">
            <p className="text-[15px] leading-relaxed text-graphite">
              You have not spoken yet. Write what you actually believe.
            </p>
          </div>
        ) : (
          <ol className="space-y-5">
            {defenses.map((item) => {
              const replies = reassessments.filter(
                (entry) => entry.defenseId === item.id,
              );
              return (
                <li key={item.id} className="ml-8">
                  <p className="type-eyebrow text-indigo">You</p>
                  <p className="mt-1.5 border border-rule bg-paper px-3 py-2.5 text-[15px] leading-relaxed text-ink">
                    {item.text}
                  </p>
                  {replies.length ? (
                    <ul className="mt-2 space-y-1.5">
                      {replies.map((reply) => (
                        <li
                          key={reply.id}
                          className="text-[13px] leading-snug text-graphite"
                        >
                          <span className="type-eyebrow text-oxblood">
                            {perspectiveName(reply.perspective)} · {reply.verdict}
                          </span>
                          <span className="mt-0.5 block">{reply.unaddressed}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              );
            })}
          </ol>
        )}
      </div>

      {committed ? (
        <p className="border-t border-rule px-4 py-4 text-[14px] text-graphite">
          This decision is committed.
        </p>
      ) : (
        <RoundComposer
          value={value}
          busy={busy}
          onChange={onChange}
          onSubmit={onSubmit}
        />
      )}
    </div>
  );
}
