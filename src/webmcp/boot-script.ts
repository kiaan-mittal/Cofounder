/**
 * Runs before React. ChatGPT desktop (Sol / Terra) injects native WebMCP as
 * a getter on Document — often after the first script, and often not as an
 * own data property. A boot polyfill that `defineProperty`s `modelContext`
 * shadows that getter, so the model talks to an empty native registry while
 * the page labels itself a shim.
 *
 * This script only installs the shim if the platform never binds native.
 */
export const WEBMCP_BOOT_SCRIPT = `(function () {
  if (typeof document === "undefined") return;

  function desc(target, name) {
    try { return Object.getOwnPropertyDescriptor(target, name); } catch (e) { return undefined; }
  }
  function isShim(value) {
    return Boolean(value && value.isDecisionArenaPolyfill);
  }
  function usable(value) {
    return Boolean(value && typeof value.registerTool === "function" && !isShim(value));
  }
  function looksNative(d) {
    if (!d) return false;
    if (typeof d.get === "function") return true;
    return usable(d.value);
  }
  function platformBound() {
    return looksNative(desc(document, "modelContext"))
      || looksNative(desc(Document.prototype, "modelContext"))
      || looksNative(desc(navigator, "modelContext"))
      || looksNative(desc(Navigator.prototype, "modelContext"));
  }
  function peelShim() {
    var own = desc(document, "modelContext");
    if (!own || !own.configurable || !isShim(own.value)) return;
    var proto = desc(Document.prototype, "modelContext");
    var navOk = false;
    try { navOk = usable(navigator.modelContext); } catch (e) {}
    if (looksNative(proto) || navOk) {
      try { delete document.modelContext; } catch (e2) {}
    }
  }
  function nativeReady() {
    peelShim();
    if (platformBound()) return true;
    try { if (usable(document.modelContext)) return true; } catch (e) {}
    try { if (usable(navigator.modelContext)) return true; } catch (e2) {}
    return false;
  }
  if (nativeReady()) return;

  function install() {
    if (nativeReady()) return;
    var own = desc(document, "modelContext");
    if (own && typeof own.get === "function") return;
    if (own && usable(own.value)) return;
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
  }

  function later(ms) { setTimeout(install, ms); }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () { later(0); });
  } else {
    later(0);
  }
  later(400);
  later(1600);
})();`;
