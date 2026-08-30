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
  annotations?: {
    readOnlyHint?: boolean;
    destructiveHint?: boolean;
    idempotentHint?: boolean;
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
  inputSchema?: JsonSchema;
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

/**
 * Feature detection exactly as the Chrome guidance recommends: prefer
 * `document.modelContext`, fall back to the deprecated `navigator` location,
 * and never assume either exists.
 */
export function nativeModelContext(): ModelContext | null {
  if (typeof document === "undefined") return null;
  const candidate = document.modelContext ?? navigator.modelContext;
  if (candidate && typeof candidate.registerTool === "function") {
    return candidate;
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
