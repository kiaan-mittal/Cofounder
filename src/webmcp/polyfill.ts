import {
  nativeModelContext,
  platformModelContexts,
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
 * Tool registration for Dissent.
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
/** Set when a stub looked like native but getTools() did not list our tools. */
let ignoreNative = false;

function pageContext(): PageModelContext {
  if (!pageCtx) pageCtx = new PageModelContext();
  return pageCtx;
}

/** The inspector said the flag is off: stop treating the stub as native. */
export function ignoreUnverifiedNative() {
  ignoreNative = true;
}

export function trustedPlatformContexts() {
  if (ignoreNative) return [];
  return platformModelContexts();
}

/** The browser's context, or null when this browser does not implement WebMCP. */
export function browserContext(): ModelContext | null {
  if (ignoreNative) return null;
  const native = nativeModelContext();
  if (native) sawNativeObject = true;
  return native;
}

/**
 * True when the browser has just produced a context the tools are not on yet,
 * so the caller knows to register onto it.
 */
export function adoptNativeIfPresent(): boolean {
  const alreadyHadObject = sawNativeObject;
  const native = browserContext();
  return Boolean(native) && !alreadyHadObject;
}

/**
 * Some embedded browsers expose a `modelContext` whose `registerTool` never
 * settles. After a timeout the page talks to its own object instead — still
 * without writing anything to `document`. A native object that appears later
 * still wins via resolveModelContext.
 */
export function forcePolyfill(): WebMCPSupport {
  if (!ignoreNative && nativeModelContext()) return "native";
  pageContext();
  return "page";
}

/**
 * The context the tools are registered on: the browser's when it has one,
 * otherwise the page's own object. Never null, so founder clicks, Arena seats
 * and the in-page agent work in every browser.
 *
 * Native always wins. The page object is only for browsers with no
 * `document.modelContext` — using it while a native slot exists would make
 * the demo look like a shim.
 */
export function resolveModelContext(): ModelContext | null {
  if (typeof document === "undefined") return null;
  return browserContext() ?? pageContext();
}

/** Which implementation the tools ended up on. Never claim native for a page object. */
export function ensureModelContext(): WebMCPSupport {
  if (typeof document === "undefined") return "unavailable";
  if (browserContext()) return "native";
  pageContext();
  return "page";
}

/** True when the tools are on the page's own object rather than the browser's. */
export function isPolyfilled(): boolean {
  if (ignoreNative) return true;
  return !nativeModelContext();
}
