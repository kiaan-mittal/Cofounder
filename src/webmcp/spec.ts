/**
 * WebMCP — spec surface.
 *
 * Mirrors the W3C Web Machine Learning CG explainer for `document.modelContext`
 * (registerTool / getTools / executeTool / toolchange). Nothing here is
 * Decision Arena specific; it is only the shape of the platform API so the
 * rest of the app can be written against the real standard.
 *
 * https://github.com/webmachinelearning/webmcp
 */

export interface JsonSchema {
  type: "object";
  properties?: Record<string, unknown>;
  required?: string[];
  [key: string]: unknown;
}

export interface ToolResultContent {
  type: "text";
  text: string;
}

export interface ToolResult {
  content: ToolResultContent[];
  isError?: boolean;
}

export interface ToolExecuteOptions {
  signal?: AbortSignal;
}

export interface ToolDefinition {
  name: string;
  description: string;
  title?: string;
  inputSchema?: JsonSchema;
  /**
   * WebMCP defines only these two. MCP's destructiveHint / idempotentHint /
   * openWorldHint are deliberately absent: agents reading a page registry do
   * not consume them, so a consequence belongs in the description instead.
   */
  annotations?: {
    readOnlyHint?: boolean;
    untrustedContentHint?: boolean;
  };
  execute: (
    args: Record<string, unknown> | string,
    options?: ToolExecuteOptions,
  ) => ToolResult | string | Promise<ToolResult | string>;
}

export interface RegisterToolOptions {
  /** Aborting this signal unregisters the tool. There is no unregisterTool(). */
  signal?: AbortSignal;
  /** Secure origins allowed to discover and run this tool. */
  exposedTo?: string[];
}

export interface RegisteredTool {
  name: string;
  description: string;
  title?: string;
  inputSchema?: JsonSchema;
  annotations?: ToolDefinition["annotations"];
  origin: string;
  window?: Window | null;
}

export interface GetToolsOptions {
  fromOrigins?: string[];
}

export interface ModelContext extends EventTarget {
  registerTool(
    tool: ToolDefinition,
    options?: RegisterToolOptions,
  ): Promise<void>;
  getTools(options?: GetToolsOptions): Promise<RegisteredTool[]>;
  executeTool(
    tool: RegisteredTool,
    args?: Record<string, unknown> | string,
    options?: ToolExecuteOptions,
  ): Promise<ToolResult | string>;
}

declare global {
  interface Document {
    modelContext?: ModelContext;
  }
  interface Navigator {
    /** Deprecated in Chromium 150. Read only as a compatibility fallback. */
    modelContext?: ModelContext;
  }
}

export type WebMCPSupport = "native" | "polyfill" | "unavailable";

export function isArenaPolyfill(value: unknown): boolean {
  return Boolean(
    value &&
      typeof value === "object" &&
      (value as { isDecisionArenaPolyfill?: boolean }).isDecisionArenaPolyfill ===
        true,
  );
}

function usableNative(value: unknown): ModelContext | null {
  if (
    value &&
    typeof value === "object" &&
    typeof (value as ModelContext).registerTool === "function" &&
    !isArenaPolyfill(value)
  ) {
    return value as ModelContext;
  }
  return null;
}

function descriptor(
  target: object,
  name: "modelContext",
): PropertyDescriptor | undefined {
  try {
    return Object.getOwnPropertyDescriptor(target, name);
  } catch {
    return undefined;
  }
}

function descriptorLooksNative(desc: PropertyDescriptor | undefined): boolean {
  if (!desc) return false;
  if (typeof desc.get === "function") return true;
  return Boolean(usableNative(desc.value));
}

/**
 * True when the platform has already bound `modelContext` — including a
 * getter on Document / Navigator that has not returned an object yet.
 * Installing an own data property on `document` would shadow that binding
 * (ChatGPT desktop Sol/Terra does this).
 */
export function nativePlatformBound(): boolean {
  if (typeof document === "undefined") return false;
  return (
    descriptorLooksNative(descriptor(document, "modelContext")) ||
    descriptorLooksNative(descriptor(Document.prototype, "modelContext")) ||
    descriptorLooksNative(descriptor(navigator, "modelContext")) ||
    descriptorLooksNative(descriptor(Navigator.prototype, "modelContext"))
  );
}

/**
 * Feature detection exactly as the Chrome guidance recommends: prefer
 * `document.modelContext`, fall back to the deprecated `navigator` location,
 * and never assume either exists.
 *
 * The page's own shim is ignored so a shadowed native getter still wins.
 */
export function nativeModelContext(): ModelContext | null {
  if (typeof document === "undefined") return null;

  const own = descriptor(document, "modelContext");
  if (own?.get) {
    try {
      const fromGet = usableNative(own.get.call(document));
      if (fromGet) return fromGet;
    } catch {
      /* getter threw */
    }
  } else {
    const fromOwn = usableNative(own?.value);
    if (fromOwn) return fromOwn;
  }

  try {
    const proto = descriptor(Document.prototype, "modelContext");
    if (proto?.get) {
      const fromProto = usableNative(proto.get.call(document));
      if (fromProto) return fromProto;
    } else {
      const fromProtoVal = usableNative(proto?.value);
      if (fromProtoVal) return fromProtoVal;
    }
  } catch {
    /* ignore */
  }

  try {
    const fromNav = usableNative(navigator.modelContext);
    if (fromNav) return fromNav;
  } catch {
    /* ignore */
  }

  return null;
}

export function toolResult(summary: string, data?: unknown): ToolResult {
  const text =
    data === undefined
      ? summary
      : `${summary}\n\n${JSON.stringify(data, null, 2)}`;
  return { content: [{ type: "text", text }] };
}

export function toolError(message: string): ToolResult {
  return { content: [{ type: "text", text: message }], isError: true };
}
