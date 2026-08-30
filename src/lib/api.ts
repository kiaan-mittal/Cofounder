"use client";

/**
 * Client-side calls to the Arena's own routes.
 *
 * Errors arrive as sentences meant for a founder, not status codes — the
 * routes are written to produce them, and this preserves them.
 */

export class ApiError extends Error {
  readonly hint?: string;
  constructor(message: string, hint?: string) {
    super(message);
    this.name = "ApiError";
    this.hint = hint;
  }
}

export async function post<T>(
  path: string,
  body: unknown,
  signal?: AbortSignal,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new ApiError(
      "The Arena could not reach its server. Check your connection and try again.",
    );
  }

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new ApiError(
      payload?.error ?? `The request failed with status ${response.status}.`,
      payload?.hint,
    );
  }

  return payload as T;
}

export async function readEventStream<T>(
  path: string,
  body: unknown,
  onEvent: (event: T) => void,
  signal?: AbortSignal,
): Promise<void> {
  let response: Response;
  try {
    response = await fetch(path, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "text/event-stream",
      },
      body: JSON.stringify(body),
      signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new ApiError(
      "The Arena could not reach its server. Check your connection and try again.",
    );
  }

  if (!response.ok || !response.body) {
    const payload = await response.json().catch(() => null);
    throw new ApiError(
      payload?.error ?? `The request failed with status ${response.status}.`,
      payload?.hint,
    );
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const chunks = buffer.split("\n\n");
    buffer = chunks.pop() ?? "";
    for (const chunk of chunks) {
      const line = chunk
        .split("\n")
        .find((entry) => entry.startsWith("data: "));
      if (!line) continue;
      onEvent(JSON.parse(line.slice(6)) as T);
    }
  }
}
