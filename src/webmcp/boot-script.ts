/**
 * Runs before React. Never installs a shim.
 *
 * ChatGPT desktop (Sol / Terra) binds native WebMCP onto
 * `document.modelContext`. If this script owns that property first, ChatGPT
 * skips its native bind — Site tools stay empty and the page shows the shim
 * box. Ordinary Chrome gets a page-local shim later, from polyfill.ts, after
 * we know native is not coming.
 */
export const WEBMCP_BOOT_SCRIPT = `(function () {
  if (typeof document === "undefined") return;

  function desc(target, name) {
    try { return Object.getOwnPropertyDescriptor(target, name); } catch (e) { return undefined; }
  }
  function isShim(value) {
    return Boolean(value && value.isDecisionArenaPolyfill);
  }
  function isChatGPT() {
    try {
      var ua = navigator.userAgent || "";
      if (/ChatGPT/i.test(ua)) return true;
      var brands = navigator.userAgentData && navigator.userAgentData.brands;
      if (brands) {
        for (var i = 0; i < brands.length; i++) {
          if (/ChatGPT|OpenAI/i.test(brands[i].brand)) return true;
        }
      }
    } catch (e) {}
    return false;
  }
  function peelShim() {
    var own = desc(document, "modelContext");
    if (!own || !own.configurable || !isShim(own.value)) return;
    try { delete document.modelContext; } catch (e) {}
  }

  peelShim();
  if (isChatGPT()) return;
})();`;
