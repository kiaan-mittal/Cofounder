import {
  isArenaPolyfill,
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
 * Never install an own data property over a native getter. ChatGPT desktop
 * Sol/Terra expose `document.modelContext` that way; shadowing it makes the
 * page look like a shim while the model talks to an empty native registry.
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

let installed: WebMCPSupport | null = null;
let shim: PolyfilledModelContext | null = null;
let skipNative = false;
let sawNativeObject = false;

function earlyPolyfill(): ModelContext | null {
  if (typeof document === "undefined") return null;
  const own = Object.getOwnPropertyDescriptor(document, "modelContext");
  const value = own?.value as
    | (ModelContext & { isDecisionArenaPolyfill?: boolean })
    | undefined;
  if (value?.isDecisionArenaPolyfill && typeof value.registerTool === "function") {
    return value;
  }
  return null;
}

function canInstallOwnShim(): boolean {
  if (nativePlatformBound()) return false;
  const own = Object.getOwnPropertyDescriptor(document, "modelContext");
  if (own && typeof own.get === "function") return false;
  if (own?.value && typeof own.value.registerTool === "function" && !isArenaPolyfill(own.value)) {
    return false;
  }
  return true;
}

/**
 * If our shim is an own data property sitting over a native getter / navigator
 * binding, delete it so `document.modelContext` is the platform again.
 */
export function unshadowNative(): ModelContext | null {
  if (typeof document === "undefined") return null;
  const own = Object.getOwnPropertyDescriptor(document, "modelContext");
  if (own?.configurable && isArenaPolyfill(own.value)) {
    const proto = Object.getOwnPropertyDescriptor(
      Document.prototype,
      "modelContext",
    );
    const protoNative = Boolean(
      proto &&
        (typeof proto.get === "function" ||
          (proto.value && !isArenaPolyfill(proto.value))),
    );
    if (protoNative || nativePlatformBound() || nativeModelContext()) {
      try {
        delete (document as Document & { modelContext?: ModelContext })
          .modelContext;
      } catch {
        /* ignore */
      }
    }
  }
  const native = nativeModelContext();
  if (native) sawNativeObject = true;
  return native;
}

/**
 * True when we just moved onto a real native context that still needs tools
 * registered (shim → native, or a getter that only started returning now).
 */
export function adoptNativeIfPresent(): boolean {
  if (nativePlatformBound() || nativeModelContext()) {
    skipNative = false;
  }
  const before = installed;
  const alreadyHadObject = sawNativeObject;
  const native = unshadowNative();
  if (!native && !nativePlatformBound()) return false;
  installed = "native";
  if (before === "polyfill") return Boolean(native);
  return Boolean(native) && !alreadyHadObject;
}

/**
 * Give ChatGPT desktop a beat to attach native WebMCP before we own-property
 * a shim onto `document`. Ordinary Chrome has no binding, so we bail early.
 */
export async function waitForNativeContext(
  ms = 2000,
): Promise<ModelContext | null> {
  if (typeof document === "undefined") return null;
  const started = Date.now();
  while (Date.now() - started < ms) {
    const native = unshadowNative();
    if (native) return native;
    const bound = nativePlatformBound();
    if (!bound && Date.now() - started > 700) break;
    await new Promise<void>((resolve) => {
      window.setTimeout(resolve, 80);
    });
  }
  return unshadowNative();
}

/**
 * Cursor's embedded browser (and some stubs) expose a `modelContext` whose
 * `registerTool` never resolves. After a timeout we talk to our own shim —
 * but never if the platform bound a native getter (ChatGPT Sol / Chrome flag).
 */
export function forcePolyfill(): WebMCPSupport {
  if (nativePlatformBound() || nativeModelContext()) {
    skipNative = false;
    unshadowNative();
    installed = "native";
    return "native";
  }
  skipNative = true;
  installed = null;
  return ensureModelContext();
}

/** The context the page actually uses — native, or the shim after a hang. */
export function resolveModelContext(): ModelContext | null {
  if (typeof document === "undefined") return null;
  if (!skipNative) {
    const native = unshadowNative();
    if (native) return native;
  }
  if (skipNative) {
    return earlyPolyfill() ?? shim ?? (shim = new PolyfilledModelContext());
  }
  return earlyPolyfill() ?? shim;
}

/**
 * Idempotent. Returns which implementation the page ended up with, so the
 * status indicator can tell the truth rather than claiming native support.
 */
export function ensureModelContext(): WebMCPSupport {
  if (typeof document === "undefined") return "unavailable";

  if (!skipNative) {
    const native = unshadowNative();
    if (native) {
      installed = "native";
      return installed;
    }
    if (nativePlatformBound()) {
      installed = "native";
      return installed;
    }
  }

  if (installed) return installed;

  if (!canInstallOwnShim()) {
    installed = nativeModelContext() ? "native" : "unavailable";
    return installed;
  }

  if (!shim) shim = new PolyfilledModelContext();
  try {
    Object.defineProperty(document, "modelContext", {
      value: shim,
      configurable: true,
      writable: true,
    });
    installed = "polyfill";
  } catch {
    try {
      document.modelContext = shim;
      installed = "polyfill";
    } catch {
      // Native stub is non-configurable. Tools still run through `shim`.
      installed = "polyfill";
    }
  }

  return installed;
}

export function isPolyfilled(): boolean {
  if (skipNative && shim) return true;
  if (nativeModelContext()) return false;
  return isArenaPolyfill(document.modelContext);
}
