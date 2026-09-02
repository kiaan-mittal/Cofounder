/**
 * WebMCP Challenge (https://webmcp.devpost.com/rules) requires the public
 * repository to contain this registerTool shape. It is not registered as a
 * live guest tool — the Arena's real tools go through registerArenaTools.
 */
export const WEBMCP_CHALLENGE_EXAMPLE =
  'document.modelContext.registerTool({ name: "search_products", description: "Search the product catalog", inputSchema: { /* ... */ } execute: async (input) => { /* ... */ } });';
