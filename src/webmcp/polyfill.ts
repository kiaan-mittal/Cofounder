import {
  nativeModelContext,
  type GetToolsOptions,
  type ModelContext,
  type RegisterToolOptions,
  type RegisteredTool,
  type ToolDefinition,
  type ToolExecuteOptions,
  type ToolResult,
  type WebMCPSupport,
} from "@/webmcp/spec";

/**
 * A spec-shaped shim for `document.modelContext`.
 *
 * WebMCP is not yet in any stable browser. Without a shim, a judge opening
 * Decision Arena in ordinary Chrome would see a dead feature, and the page's
 * own sparring agent — which is an "author-provided agent" in the explainer's
 * terms — would have nothing to talk to.
 *
 * So: if the browser implements WebMCP, we use it and this file does nothing.
 * If it does not, we install the same interface locally. Tool definitions,
 * schemas, discovery and execution paths are identical either way, which is
 * what makes the demo honest — the agent is never given a private back door
 * into the app, only `getTools()` and `executeTool()`.
 *
 * The shim is intentionally page-local: it exposes tools to in-page agents,
 * not across origins, and implements no more of the spec than the app uses.
 */

interface Entry {
  tool: ToolDefinition;
  options?: RegisterToolOptions;
}

class PolyfilledModelContext extends EventTarget implements ModelContext {
  readonly #tools = new Map<string, Entry>();

  /** Marks this object as the shim so the UI can label it accurately. */
  readonly isDecisionArenaPolyfill = true;

  async registerTool(
    tool: ToolDefinition,
    options?: RegisterToolOptions,
  ): Promise<void> {
    if (!tool?.name || typeof tool.execute !== "function") {
      throw new TypeError(
        "registerTool requires a tool with a name and an execute callback.",
      );
    }

    this.#tools.set(tool.name, { tool, options });

    // The spec has no unregisterTool(); lifetime is controlled by AbortSignal.
    options?.signal?.addEventListener(
      "abort",
      () => {
        this.#tools.delete(tool.name);
        this.#notify();
      },
      { once: true },
    );

    this.#notify();
  }

  async getTools(_options?: GetToolsOptions): Promise<RegisteredTool[]> {
    return [...this.#tools.values()].map(({ tool }) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
      origin: window.location.origin,
      window,
    }));
  }

  async executeTool(
    tool: RegisteredTool,
    args: Record<string, unknown> | string = {},
    options?: ToolExecuteOptions,
  ): Promise<ToolResult | string> {
    const entry = this.#tools.get(tool.name);
    if (!entry) {
      throw new DOMException(
        `No tool named "${tool.name}" is registered.`,
        "NotFoundError",
      );
    }
    if (options?.signal?.aborted) {
      throw new DOMException("Tool execution was aborted.", "AbortError");
    }
    let parsed: Record<string, unknown> = {};
    if (typeof args === "string") {
      try {
        const value = JSON.parse(args);
        if (value && typeof value === "object") {
          parsed = value as Record<string, unknown>;
        }
      } catch {
        parsed = {};
      }
    } else {
      parsed = args ?? {};
    }
    return entry.tool.execute(parsed, { signal: options?.signal });
  }

  #notify() {
    this.dispatchEvent(new Event("toolchange"));
  }
}

let installed: WebMCPSupport | null = null;

/**
 * Idempotent. Returns which implementation the page ended up with, so the
 * status indicator can tell the truth rather than claiming native support.
 */
export function ensureModelContext(): WebMCPSupport {
  if (typeof document === "undefined") return "unavailable";
  if (installed) return installed;

  if (nativeModelContext()) {
    installed = "native";
    return installed;
  }

  try {
    Object.defineProperty(document, "modelContext", {
      value: new PolyfilledModelContext(),
      configurable: true,
      writable: true,
    });
    installed = "polyfill";
  } catch {
    installed = "unavailable";
  }

  return installed;
}

export function isPolyfilled(): boolean {
  return (
    (document.modelContext as unknown as { isDecisionArenaPolyfill?: boolean })
      ?.isDecisionArenaPolyfill === true
  );
}
