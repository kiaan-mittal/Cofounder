"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";

import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export type ComposerInk = "board" | "agent";

type Suggestion = {
  label: string;
  goal: string;
};

export function PromptComposer({
  value,
  onChange,
  onSubmit,
  busy = false,
  disabled = false,
  variant = "dock",
  placeholder,
  submitLabel,
  busyLabel,
  hint,
  targetLabel = null,
  onClearTarget,
  minChars = 3,
  allowAgent = false,
  agentOnly = false,
  onAgentSubmit,
  agentBusy = false,
  onAgentStop,
  agentSuggestions = [],
  toolName,
  toolDescription,
  toolParamDescription,
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  busy?: boolean;
  disabled?: boolean;
  variant?: "dock" | "briefing";
  placeholder: string;
  submitLabel: string;
  busyLabel: string;
  hint?: string;
  targetLabel?: string | null;
  onClearTarget?: () => void;
  minChars?: number;
  allowAgent?: boolean;
  agentOnly?: boolean;
  onAgentSubmit?: (goal: string, display?: string) => void;
  agentBusy?: boolean;
  onAgentStop?: () => void;
  agentSuggestions?: readonly Suggestion[];
  /** WebMCP Declarative API. Only applied when this is the founder's box. */
  toolName?: string;
  toolDescription?: string;
  toolParamDescription?: string;
}) {
  const [ink, setInk] = useState<ComposerInk>(agentOnly ? "agent" : "board");
  const [agentDraft, setAgentDraft] = useState("");
  const fieldId = useId();
  const areaRef = useRef<HTMLTextAreaElement>(null);

  const agentMode = agentOnly || (allowAgent && ink === "agent");
  const draft = agentMode ? agentDraft : value;
  const waiting = agentMode ? agentBusy : busy;
  const locked = disabled || waiting;
  const words = draft.trim() ? draft.trim().split(/\s+/).length : 0;
  const ready = draft.trim().length >= (agentMode ? 2 : minChars);
  const command = agentMode ? "Ask" : submitLabel;

  useEffect(() => {
    const el = areaRef.current;
    if (!el || variant === "briefing") return;
    el.style.height = "0px";
    el.style.height = `${Math.min(Math.max(el.scrollHeight, 44), 96)}px`;
  }, [draft, variant, agentMode]);

  function send() {
    if (locked || !ready) return;
    if (agentMode) {
      onAgentSubmit?.(agentDraft);
      setAgentDraft("");
      return;
    }
    onSubmit();
  }

  // Switching to the agent tab changes what this box writes, so the
  // declarative tool unregisters with it rather than describing the wrong one.
  const declarative = !agentMode && toolName ? toolName : undefined;

  return (
    <form
      toolname={declarative}
      tooldescription={declarative ? toolDescription : undefined}
      className={cn(
        "bg-paper",
        variant === "briefing" ? "px-5 py-4" : "px-4 py-2.5",
      )}
      onSubmit={(event) => {
        event.preventDefault();
        send();
      }}
    >
      {allowAgent && !agentOnly ? (
        <div className="mb-2 flex items-center gap-px border border-rule">
          <InkTab
            active={!agentMode}
            tone="indigo"
            onClick={() => setInk("board")}
          >
            The board
          </InkTab>
          <InkTab
            active={agentMode}
            tone="oxblood"
            onClick={() => setInk("agent")}
          >
            Fallback agent
          </InkTab>
        </div>
      ) : null}

      {targetLabel && !agentMode ? (
        <div className="mb-1.5 flex items-center justify-between gap-3">
          <p className="type-eyebrow text-indigo">Answering {targetLabel}</p>
          {onClearTarget ? (
            <button
              type="button"
              onClick={onClearTarget}
              className="type-eyebrow text-graphite underline underline-offset-4 hover:text-ink"
            >
              The whole board
            </button>
          ) : null}
        </div>
      ) : null}

      {agentMode && agentSuggestions.length ? (
        <div className="mb-1.5 flex gap-1.5 overflow-x-auto">
          {agentSuggestions.map((prompt) => (
            <button
              key={prompt.label}
              type="button"
              disabled={locked}
              onClick={() => onAgentSubmit?.(prompt.goal, prompt.label)}
              className="type-eyebrow shrink-0 border border-rule bg-leaf px-2 py-1 text-graphite transition-colors hover:border-ink hover:text-ink disabled:opacity-50"
            >
              {prompt.label}
            </button>
          ))}
          {agentBusy ? (
            <button
              type="button"
              className="type-eyebrow shrink-0 text-oxblood underline underline-offset-4"
              onClick={onAgentStop}
            >
              Stop
            </button>
          ) : null}
        </div>
      ) : null}

      {variant === "briefing" ? (
        <div className="border border-indigo/35 bg-paper">
          <div className="flex items-baseline justify-between gap-3 border-b border-indigo/20 px-3 py-2">
            <label htmlFor={fieldId} className="type-eyebrow text-indigo">
              Your judgment
            </label>
            <p className="type-eyebrow text-pencil">
              {words ? `${words} ${words === 1 ? "word" : "words"}` : "empty"}
            </p>
          </div>
          <Textarea
            id={fieldId}
            name="defense"
            toolparamdescription={
              declarative ? toolParamDescription : undefined
            }
            value={draft}
            disabled={locked}
            rows={6}
            placeholder={placeholder}
            className="paper-ruled min-h-[168px] w-full bg-paper px-3 py-3 text-[17.5px] leading-[2rem] caret-indigo shadow-none"
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                event.preventDefault();
                send();
              }
            }}
          />
        </div>
      ) : (
        <div
          className={cn(
            "flex items-end gap-2 border bg-paper",
            agentMode ? "border-oxblood/40" : "border-indigo/35",
          )}
        >
          <label htmlFor={fieldId} className="sr-only">
            {agentMode ? "Ask the agent" : "Your judgment"}
          </label>
          <Textarea
            id={fieldId}
            ref={areaRef}
            name={agentMode ? "agent-message" : "defense"}
            toolparamdescription={
              declarative ? toolParamDescription : undefined
            }
            value={draft}
            disabled={locked}
            rows={2}
            placeholder={
              agentMode
                ? "Ask it to read the brain, challenge a seat, or attack an assumption."
                : placeholder
            }
            className={cn(
              "[field-sizing:fixed] min-h-[44px] flex-1 bg-paper px-3 py-2 text-[15px] leading-snug shadow-none",
              agentMode ? "caret-oxblood" : "caret-indigo",
            )}
            onChange={(event) =>
              agentMode
                ? setAgentDraft(event.target.value)
                : onChange(event.target.value)
            }
            onKeyDown={(event) => {
              if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                event.preventDefault();
                send();
              }
            }}
          />
          <button
            type="submit"
            disabled={locked || !ready}
            className={cn(
              "type-eyebrow mb-1.5 mr-1.5 h-8 shrink-0 px-3.5 text-paper transition-opacity disabled:opacity-40",
              agentMode ? "bg-oxblood" : "bg-ink",
            )}
          >
            {waiting ? (agentMode ? "Working…" : busyLabel) : command}
          </button>
        </div>
      )}

      {variant === "briefing" ? (
        <div className="mt-3 flex items-center justify-between gap-3">
          <p className="min-w-0 text-[12.5px] leading-snug text-graphite">
            {hint}
          </p>
          <button
            type="submit"
            disabled={locked || !ready}
            className="type-eyebrow h-10 shrink-0 bg-ink px-5 text-paper transition-opacity disabled:opacity-40"
          >
            {waiting ? busyLabel : command}
          </button>
        </div>
      ) : null}
    </form>
  );
}

function InkTab({
  active,
  tone,
  onClick,
  children,
}: {
  active: boolean;
  tone: "indigo" | "oxblood";
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "type-eyebrow flex-1 px-3 py-1.5 transition-colors",
        active
          ? tone === "indigo"
            ? "bg-indigo text-paper"
            : "bg-oxblood text-paper"
          : "bg-paper text-graphite hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}
