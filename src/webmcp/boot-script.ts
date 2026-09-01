/**
 * Runs before React. ChatGPT looks for document.modelContext as soon as the
 * document exists; waiting on the client graph meant the entry point was
 * missing while the page still said "checking…".
 *
 * React then registerTool()s onto this same object.
 */
export const WEBMCP_BOOT_SCRIPT = `(function () {
  if (typeof document === "undefined") return;
  var own = Object.getOwnPropertyDescriptor(document, "modelContext");
  if (own && own.value && typeof own.value.registerTool === "function") return;
  class DecisionArenaModelContext extends EventTarget {
    constructor() {
      super();
      this._tools = new Map();
      this.isDecisionArenaPolyfill = true;
    }
    async registerTool(tool, options) {
      if (!tool || !tool.name || typeof tool.execute !== "function") {
        throw new TypeError("registerTool requires a tool with a name and an execute callback.");
      }
      this._tools.set(tool.name, { tool: tool, options: options });
      var self = this;
      if (options && options.signal) {
        options.signal.addEventListener("abort", function () {
          self._tools.delete(tool.name);
          self.dispatchEvent(new Event("toolchange"));
        }, { once: true });
      }
      this.dispatchEvent(new Event("toolchange"));
    }
    async getTools() {
      var origin = location.origin;
      var list = [];
      this._tools.forEach(function (entry) {
        list.push({
          name: entry.tool.name,
          description: entry.tool.description,
          title: entry.tool.title,
          inputSchema: entry.tool.inputSchema,
          annotations: entry.tool.annotations,
          origin: origin,
          window: window
        });
      });
      return list;
    }
    async executeTool(tool, args, options) {
      var entry = this._tools.get(tool && tool.name);
      if (!entry) {
        throw new DOMException('No tool named "' + (tool && tool.name) + '" is registered.', "NotFoundError");
      }
      if (options && options.signal && options.signal.aborted) {
        throw new DOMException("Tool execution was aborted.", "AbortError");
      }
      var parsed = args && typeof args === "object" ? args : {};
      if (typeof args === "string") {
        try {
          var value = JSON.parse(args);
          if (value && typeof value === "object") parsed = value;
        } catch (e) {
          parsed = {};
        }
      }
      return entry.tool.execute(parsed, { signal: options && options.signal });
    }
  }
  var ctx = new DecisionArenaModelContext();
  try {
    Object.defineProperty(document, "modelContext", {
      value: ctx,
      configurable: true,
      writable: true
    });
  } catch (e) {
    try { document.modelContext = ctx; } catch (e2) {}
  }
})();`;
