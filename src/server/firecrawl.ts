import "server-only";

/**
 * Optional Firecrawl path for Company Brain ingestion.
 *
 * When FIRECRAWL_API_KEY is set, the Brain can read JavaScript-rendered
 * sites and discover more pages than a single HTML fetch. When it is not,
 * ingest falls back to the built-in crawler. Either way the founder only
 * sees pages, never the vendor.
 */

const DEFAULT_API = "https://api.firecrawl.dev";

export function firecrawlConfigured(): boolean {
  return Boolean(process.env.FIRECRAWL_API_KEY?.trim());
}

function firecrawlUrl(path: string): string {
  const base = (process.env.FIRECRAWL_API_URL?.trim() || DEFAULT_API).replace(
    /\/+$/,
    "",
  );
  return `${base}${path}`;
}

export interface FirecrawlPage {
  url: string;
  title: string;
  description: string;
  markdown: string;
  links: string[];
}

async function firecrawlPost<T>(
  path: string,
  body: Record<string, unknown>,
  timeoutMs = 22_000,
): Promise<T | null> {
  const key = process.env.FIRECRAWL_API_KEY?.trim();
  if (!key) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(firecrawlUrl(path), {
      method: "POST",
      signal: controller.signal,
      headers: {
        authorization: `Bearer ${key}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function firecrawlScrape(
  url: string,
): Promise<FirecrawlPage | null> {
  const payload = await firecrawlPost<{
    success?: boolean;
    data?: {
      markdown?: string;
      links?: string[];
      metadata?: {
        title?: string;
        description?: string;
        sourceURL?: string;
      };
    };
  }>("/v1/scrape", {
    url,
    formats: ["markdown", "links"],
    onlyMainContent: true,
  });

  const data = payload?.data;
  const markdown = data?.markdown?.trim() ?? "";
  if (!markdown) return null;

  return {
    url: data?.metadata?.sourceURL || url,
    title: data?.metadata?.title ?? "",
    description: data?.metadata?.description ?? "",
    markdown,
    links: Array.isArray(data?.links) ? data.links : [],
  };
}

export async function firecrawlMap(url: string, limit = 40): Promise<string[]> {
  const payload = await firecrawlPost<{
    success?: boolean;
    links?: Array<string | { url?: string }>;
  }>("/v1/map", { url, limit });

  if (!payload?.links) return [];
  return payload.links
    .map((item) => (typeof item === "string" ? item : item.url ?? ""))
    .filter(Boolean);
}
