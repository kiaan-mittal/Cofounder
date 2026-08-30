"use client";

import { useEffect, useRef } from "react";

import { PromptComposer } from "@/components/arena/prompt-composer";
import { cn } from "@/lib/utils";
import {
  AGENT_PROMPTS,
  useSparringChat,
  type ChatMessage,
  type ChatTool,
} from "@/lib/use-sparring";
import { useWebMCP } from "@/webmcp/provider";

export function AgentConsole({
  embedded = false,
  hideComposer = false,
  chat,
}: {
  embedded?: boolean;
  hideComposer?: boolean;
  chat?: ReturnType<typeof useSparringChat>;
}) {
  const { support, registered, ready } = useWebMCP();
  const local = useSparringChat();
  const sparring = chat ?? local;
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [sparring.messages]);

  const unavailable = ready && support === "unavailable";

  return (
    <div
      className={
        embedded
          ? "flex flex-col"
          : "flex flex-col bg-oxblood-wash/40 md:h-[min(52vh,500px)] md:border-r md:border-rule"
      }
    >
      {embedded ? (
        hideComposer ? null : (
          <p className="type-eyebrow text-oxblood">Ask the agent</p>
        )
      ) : (
        <header className="border-b border-rule bg-paper px-4 py-3">
          <div className="flex items-baseline justify-between gap-3">
            <p className="type-eyebrow text-oxblood">Agent</p>
            <span className="type-eyebrow shrink-0">
              {registered.length} tools
            </span>
          </div>
          <p className="mt-1 text-[13.5px] text-graphite">
            Speaks to you. Writes into the same record through WebMCP.
          </p>
        </header>
      )}

      <div
        className={
          embedded
            ? "px-0 py-3"
            : "min-h-0 flex-1 overflow-y-auto px-4 py-4 max-md:max-h-[220px]"
        }
      >
        {unavailable ? (
          <p className="text-[14px] leading-relaxed text-ink">
            This browser exposes no WebMCP entry point, so the agent has
            nothing to connect to. Your side of the desk still works.
          </p>
        ) : (
          <AgentTranscript
            messages={sparring.messages}
            empty={
              embedded
                ? null
                : "Ask it something. It will answer here, and show every tool it used."
            }
          />
        )}
        <div ref={endRef} />
      </div>

      {unavailable || hideComposer || embedded ? null : (
        <PromptComposer
          value=""
          onChange={() => undefined}
          onSubmit={() => undefined}
          agentOnly
          onAgentSubmit={(goal, display) => void sparring.run(goal, display)}
          agentBusy={sparring.running}
          onAgentStop={sparring.stop}
          agentSuggestions={AGENT_PROMPTS}
          placeholder="Ask the agent. It answers here."
          submitLabel="Ask"
          busyLabel="Working…"
          disabled={unavailable}
        />
      )}
    </div>
  );
}

export function AgentTranscript({
  messages,
  empty,
}: {
  messages: ChatMessage[];
  empty?: string | null;
}) {
  if (messages.length === 0) {
    return empty ? (
      <p className="text-[15px] leading-relaxed text-graphite">{empty}</p>
    ) : null;
  }

  return (
    <ol className="space-y-5">
      {messages.map((message) =>
        message.role === "you" ? (
          <li key={message.id}>
            <p className="type-eyebrow text-indigo">You · agent</p>
            <p className="mt-2 max-w-[52ch] text-[17px] leading-relaxed text-ink">
              {message.text}
            </p>
          </li>
        ) : (
          <li key={message.id}>
            <p className="type-eyebrow text-oxblood">Agent</p>
            {message.tools.length ? (
              <ul className="mt-2 space-y-1.5">
                {message.tools.map((tool, index) => (
                  <ToolStamp key={`${tool.name}-${index}`} tool={tool} />
                ))}
              </ul>
            ) : null}
            {message.pending && !message.text ? (
              <p className="mt-2 text-[14px] leading-relaxed text-graphite">
                {message.thinking || "Working…"}
              </p>
            ) : null}
            {message.text ? (
              <p className="mt-2 max-w-[54ch] whitespace-pre-wrap text-[16px] leading-[1.55] text-ink">
                {message.text}
              </p>
            ) : null}
            {message.error ? (
              <p className="mt-2 text-[13.5px] text-oxblood">{message.error}</p>
            ) : null}
          </li>
        ),
      )}
    </ol>
  );
}

function ToolStamp({ tool }: { tool: ChatTool }) {
  const result = tool.result?.split("\n")[0]?.trim() ?? "";
  return (
    <li className="border border-rule bg-paper px-3 py-2">
      <p className="type-figure text-[12px] text-ink">{tool.name}</p>
      {result ? (
        <p
          className={cn(
            "mt-0.5 line-clamp-2 text-[12.5px] leading-snug",
            tool.ok === false ? "text-oxblood" : "text-graphite",
          )}
        >
          {result}
        </p>
      ) : null}
    </li>
  );
}
