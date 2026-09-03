"use client";

import { useCallback, useRef, useState } from "react";

import {
  runSparringAgent,
  WebMCPUnavailableError,
  type AgentStep,
} from "@/webmcp/agent";
import { JUDGE_DECISION } from "@/lib/judge-path";

export const AGENT_PROMPTS = [
  {
    label: "Stress-test this floor",
    goal: `Call stress_test_decision with this question: ${JUDGE_DECISION} Wait until five dissenters have written. It returns the verdict: FOR/AGAINST, scores, flip conditions, next move. Then call get_current_decision. Do not confirm_commit yet.`,
  },
  {
    label: "Find my blind spot",
    goal: "Read get_company_brain and get_current_decision. Add one argument I am missing with add_argument, from the seat that should have said it. Then tell me, in a few sentences, what I am not seeing.",
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
  running?: boolean;
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
        thinking: "Working…",
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
            const tools = [...message.tools];
            const open = tools.findLastIndex(
              (tool) => tool.name === step.tool && tool.running,
            );
            if (open >= 0 && step.result !== undefined) {
              tools[open] = {
                ...tools[open],
                result: step.result,
                ok: step.ok,
                running: false,
              };
            } else if (open < 0) {
              tools.push({
                name: step.tool,
                args: step.args,
                result: step.result,
                ok: step.ok,
                running: step.result === undefined,
              });
            }
            return {
              ...message,
              thinking: step.result === undefined ? `Calling ${step.tool}…` : "",
              tools,
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
