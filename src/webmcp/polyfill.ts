import {
  isPageContext,
  nativeModelContext,
  nativePlatformBound,
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
 * Tool registration for Decision Arena.
 *
 * `document.modelContext` belongs to the browser. This file never writes to
 * it — not at boot, not as a fallback, not ever. When the browser implements
 * WebMCP, the Arena registers its tools on the real thing through the
 * imperative API and that is the only context in play.
 *
 * When the browser does not implement WebMCP, the tools still have to live
 * somewhere, because the page ships its own sparring agent — an
 * "author-provided agent" in the explainer's terms — and the Arena's own
 * seats call tools rather than reaching into the store. So the same interface
 * is constructed as an ordinary page object and kept private to the page.
 * Nothing is published to the platform slot, so a browser that binds WebMCP
 * at any point finds it untouched.
 */

interface Entry {
  tool: ToolDefinition;
  options?: RegisterToolOptions;
}

class PageModelContext extends EventTarget implements ModelContext {
  readonly #tools = new Map<string, Entry>();

  /** Marks this as the page's own object, never the browser's. */
  readonly isDecisionArenaPageContext = true;

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
      title: tool.title,
      inputSchema: tool.inputSchema,
      annotations: tool.annotations,
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

let pageCtx: PageModelContext | null = null;
let sawNativeObject = false;

/**
 * Some embedded browsers expose a `modelContext` whose `registerTool` never
 * settles. After a timeout the page stops waiting on it and talks to its own
 * object instead — still without writing anything to `document`.
 */
let skipNative = false;

function pageContext(): PageModelContext {
  if (!pageCtx) pageCtx = new PageModelContext();
  return pageCtx;
}

/** The browser's context, or null when this browser does not implement WebMCP. */
export function browserContext(): ModelContext | null {
  const native = nativeModelContext();
  if (native) sawNativeObject = true;
  return native;
}

/**
 * True when the browser has just produced a context the tools are not on yet,
 * so the caller knows to register onto it.
 */
export function adoptNativeIfPresent(): boolean {
  if (nativePlatformBound() || nativeModelContext()) skipNative = false;
  const alreadyHadObject = sawNativeObject;
  const native = browserContext();
  return Boolean(native) && !alreadyHadObject;
}

/** Stop waiting on a native context that never settles. */
export function forcePolyfill(): WebMCPSupport {
  if (nativePlatformBound() || nativeModelContext()) {
    skipNative = false;
    return "native";
  }
  skipNative = true;
  pageContext();
  return "page";
}

/**
 * The context the tools are registered on: the browser's when it has one,
 * otherwise the page's own object. Never null, so founder clicks, Arena seats
 * and the in-page agent work in every browser.
 */
export function resolveModelContext(): ModelContext | null {
  if (typeof document === "undefined") return null;
  if (!skipNative) {
    const native = browserContext();
    if (native) return native;
  }
  return pageContext();
}

/** Which implementation the tools ended up on. */
export function ensureModelContext(): WebMCPSupport {
  if (typeof document === "undefined") return "unavailable";
  if (!skipNative && (browserContext() || nativePlatformBound())) {
    return "native";
  }
  pageContext();
  return "page";
}

/** True when the tools are on the page's own object rather than the browser's. */
export function isPolyfilled(): boolean {
  if (skipNative) return true;
  return !nativeModelContext();
}
