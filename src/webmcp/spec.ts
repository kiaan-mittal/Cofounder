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

/**
 * `page` means the browser does not implement WebMCP, so the tools live on an
 * object the page constructed for its own agent. Nothing is ever written to
 * `document.modelContext` in that case.
 */
export type WebMCPSupport = "native" | "page" | "unavailable";

export function isPageContext(value: unknown): boolean {
  return Boolean(
    value &&
      typeof value === "object" &&
      (value as { isDecisionArenaPageContext?: boolean })
        .isDecisionArenaPageContext === true,
  );
}

function usableNative(value: unknown): ModelContext | null {
  if (
    value &&
    typeof value === "object" &&
    typeof (value as ModelContext).registerTool === "function" &&
    !isPageContext(value)
  ) {
    return value as ModelContext;
  }
  return null;
}

/** True when this function is the browser's, not a JS shim or extension stub. */
export function isBrowserNativeFunction(fn: unknown): boolean {
  if (typeof fn !== "function") return false;
  try {
    return Function.prototype.toString.call(fn).includes("[native code]");
  } catch {
    return false;
  }
}

/**
 * The host's `document.modelContext` — Chrome's native getter, or Sol/Terra's
 * JS bridge. Both are the real platform slot. The only thing that is not
 * native is our own page object (`isDecisionArenaPageContext`).
 *
 * `[native code]` is not required: Sol exposes a scripted bridge that still
 * implements registerTool / getTools / executeTool for site tools.
 */
export function isPlatformModelContext(
  value: unknown,
): value is ModelContext {
  return usableNative(value) !== null;
}

function readSlot(
  desc: PropertyDescriptor | undefined,
  receiver: object,
): unknown {
  if (!desc) return undefined;
  if (typeof desc.get === "function") {
    try {
      return desc.get.call(receiver);
    } catch {
      return undefined;
    }
  }
  return desc.value;
}

function collectRawSlots(): unknown[] {
  if (typeof document === "undefined") return [];
  return [
    readSlot(descriptor(document, "modelContext"), document),
    readSlot(descriptor(Document.prototype, "modelContext"), document),
  ];
}

/** Every distinct browser-native context exposed through the Document slot. */
export function platformModelContexts(): ModelContext[] {
  const found: ModelContext[] = [];
  const seen = new Set<object>();
  for (const slot of collectRawSlots()) {
    if (!isPlatformModelContext(slot) || seen.has(slot)) continue;
    seen.add(slot);
    found.push(slot);
  }
  return found;
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

function isNativeGetter(desc: PropertyDescriptor | undefined): boolean {
  return Boolean(desc?.get && isBrowserNativeFunction(desc.get));
}

/**
 * True when the platform has already bound `modelContext` — a native getter
 * that may not have returned an object yet. A JS getter (extension stub,
 * page shim) does not count; treating it as native is how the header said
 * "native 17" while the inspector said the Chrome flag was off.
 */
export function nativePlatformBound(): boolean {
  if (typeof document === "undefined") return false;
  return (
    isNativeGetter(descriptor(document, "modelContext")) ||
    isNativeGetter(descriptor(Document.prototype, "modelContext")) ||
    platformModelContexts().length > 0
  );
}

/**
 * Native support is claimed only for a usable `document.modelContext` that
 * is not this page's own object. Sol/Terra bridge that slot in JS; Chrome
 * with the WebMCP flag uses a native getter. Proof is registerTool plus
 * getTools() returning those tools — not a painted label.
 */
export function nativeModelContext(): ModelContext | null {
  return platformModelContexts()[0] ?? null;
}

export interface WebMCPDiagnostics {
  userAgent: string;
  documentOwn: "absent" | "getter" | "object";
  documentPrototype: "absent" | "getter" | "object";
  navigatorSlot: "absent" | "object";
  nativeFound: boolean;
  /** WebMCP is only exposed to origin-isolated, secure documents. */
  originIsolated: boolean;
  secureContext: boolean;
}

/**
 * What this browser actually exposes, read straight off the property
 * descriptors. Shown on /webmcp so a browser that never binds WebMCP can be
 * told apart from one whose binding the page shadowed.
 */
export function webmcpDiagnostics(): WebMCPDiagnostics {
  if (typeof document === "undefined") {
    return {
      userAgent: "",
      documentOwn: "absent",
      documentPrototype: "absent",
      navigatorSlot: "absent",
      nativeFound: false,
      originIsolated: false,
      secureContext: false,
    };
  }

  const own = descriptor(document, "modelContext");
  const proto = descriptor(Document.prototype, "modelContext");

  return {
    userAgent: navigator.userAgent ?? "",
    documentOwn: !own
      ? "absent"
      : typeof own.get === "function"
        ? "getter"
        : "object",
    documentPrototype: !proto
      ? "absent"
      : typeof proto.get === "function"
        ? "getter"
        : "object",
    navigatorSlot: navigator.modelContext ? "object" : "absent",
    nativeFound: Boolean(nativeModelContext()),
    originIsolated: window.originAgentCluster === true,
    secureContext: window.isSecureContext === true,
  };
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
