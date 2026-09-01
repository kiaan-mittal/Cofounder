"use client";

import { useCallback, useRef, useState } from "react";

import {
  runSparringAgent,
  WebMCPUnavailableError,
  type AgentStep,
} from "@/webmcp/agent";

export const AGENT_PROMPTS = [
  {
    label: "Stress-test a launch",
    goal: "Call stress_test_decision with this question: Should I spend the next month of runway launching this product now? It returns the verdict — tell me whether the seats are deadlocked, the strongest attack, and the one thing that would change the call. Do not confirm_commit.",
  },
  {
    label: "Find my blind spot",
    goal: "Read get_company_brain and get_current_decision. Add one argument I am missing with add_argument, from the seat that should have said it. Then tell me, in a few sentences, what I am not seeing.",
  },
  {
    label: "Check this against my history",
    goal: "Read get_decision_history. If I am repeating a failed rationale, flag_contradiction quoting both sides. Then tell me plainly whether I have made this mistake before.",
  },
  {
    label: "Attack my weakest assumption",
    goal: "Find the weakest assumption in the Company Brain. challenge_argument or add_risk against the claim that rests on it. Then tell me which assumption you attacked and why.",
  },
  {
    label: "Send this to Slack",
    goal: "Call share_decision with destination slack. If the result has a connectUrl, tell me to open it, then stop. If it already sent, give me the share link and say the record left the chat. Do not confirm_commit.",
  },
] as const;

export type ChatTool = {
  name: string;
  args?: Record<string, unknown>;
  result?: string;
  ok?: boolean;
};

export type ChatMessage =
  | { id: string; role: "you"; text: string }
  | {
      id: string;
      role: "agent";
      text: string;
      tools: ChatTool[];
      thinking: string;
      pending: boolean;
      error?: string;
    };

export function useSparringChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [running, setRunning] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const nextId = useRef(0);

  const stop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const run = useCallback(async (goal: string, display?: string) => {
    const spoken = (display ?? goal).trim();
    if (spoken.length < 2) return;

    const youId = `you-${nextId.current++}`;
    const agentId = `agent-${nextId.current++}`;

    setMessages((previous) => [
      ...previous,
      { id: youId, role: "you", text: spoken },
      {
        id: agentId,
        role: "agent",
        text: "",
        tools: [],
        thinking: "",
        pending: true,
      },
    ]);
    setRunning(true);

    const controller = new AbortController();
    abortRef.current = controller;

    const onStep = (step: AgentStep) => {
      setMessages((previous) =>
        previous.map((message) => {
          if (message.id !== agentId || message.role !== "agent") return message;
          if (step.kind === "thought") {
            return { ...message, thinking: step.text };
          }
          if (step.kind === "tool" && step.tool) {
            return {
              ...message,
              thinking: "",
              tools: [
                ...message.tools,
                {
                  name: step.tool,
                  args: step.args,
                  result: step.result,
                  ok: step.ok,
                },
              ],
            };
          }
          if (step.kind === "message") {
            return {
              ...message,
              text: step.text,
              thinking: step.pending ? message.thinking : "",
              pending: step.pending ?? false,
            };
          }
          if (step.kind === "error") {
            return { ...message, error: step.text };
          }
          return message;
        }),
      );
    };

    try {
      await runSparringAgent({
        goal,
        signal: controller.signal,
        onStep,
      });
    } catch (caught) {
      const text =
        caught instanceof DOMException && caught.name === "AbortError"
          ? "Stopped."
          : caught instanceof WebMCPUnavailableError
            ? caught.message
            : caught instanceof Error
              ? caught.message
              : "The agent could not complete its turn.";
      setMessages((previous) =>
        previous.map((message) =>
          message.id === agentId && message.role === "agent"
            ? { ...message, pending: false, error: text }
            : message,
        ),
      );
    } finally {
      setRunning(false);
      abortRef.current = null;
    }
  }, []);

  return { messages, running, run, stop };
}
