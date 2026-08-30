/**
 * ChatGPT desktop + Chrome native WebMCP speak a slightly different
 * dialect than our page shim. Keep the translation here so a judge's
 * browser does not get a tool it cannot call.
 */

/** Origins that may discover tools if they sit in the frame tree. */
export const AGENT_ORIGINS = [
  "https://chatgpt.com",
  "https://chat.openai.com",
  "https://www.chatgpt.com",
];

/** Page origin plus ChatGPT, so native allowlists do not hide tools from us. */
export function toolAudience(): string[] {
  const origins = new Set(AGENT_ORIGINS);
  if (typeof window !== "undefined" && window.location.origin) {
    origins.add(window.location.origin);
  }
  return [...origins];
}

export function readToolOutput(result: unknown): { text: string; ok: boolean } {
  if (typeof result === "string") {
    return { text: result, ok: true };
  }
  if (result && typeof result === "object") {
    const payload = result as {
      content?: Array<{ text?: string }>;
      isError?: boolean;
    };
    if (Array.isArray(payload.content)) {
      return {
        text: payload.content.map((part) => part.text ?? "").join("\n"),
        ok: payload.isError !== true,
      };
    }
  }
  return { text: String(result ?? ""), ok: true };
}

export function coerceToolArgs(
  args: unknown,
): Record<string, unknown> {
  if (!args) return {};
  if (typeof args === "string") {
    try {
      const parsed = JSON.parse(args);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      return {};
    }
    return {};
  }
  if (typeof args === "object" && !Array.isArray(args)) {
    return args as Record<string, unknown>;
  }
  return {};
}

export function nativeToolText(result: {
  content: Array<{ text: string }>;
  isError?: boolean;
}): string {
  return result.content.map((part) => part.text).join("\n");
}
