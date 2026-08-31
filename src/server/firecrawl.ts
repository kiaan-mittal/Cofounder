import "server-only";

/**
 * Optional Firecrawl path for Company Brain ingestion.
 *
 * When FIRECRAWL_API_KEY is set, the Brain maps the public site and scrapes
 * the pages that matter — homepage, pricing, docs — including JavaScript
 * rendered copy. When it is not, ingest falls back to the built-in reader.
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

type ScrapePayload = {
  markdown?: string;
  links?: string[];
  metadata?: {
    title?: string;
    description?: string;
    sourceURL?: string;
  };
  data?: ScrapePayload;
};

async function firecrawlPost<T>(
  path: string,
  body: Record<string, unknown>,
  timeoutMs = 28_000,
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

function asPage(url: string, data: ScrapePayload | undefined): FirecrawlPage | null {
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

export async function firecrawlScrape(
  url: string,
  options: { onlyMainContent?: boolean; waitFor?: number } = {},
): Promise<FirecrawlPage | null> {
  const onlyMainContent = options.onlyMainContent ?? false;
  const waitFor = options.waitFor ?? 2_000;
  const body = {
    url,
    formats: ["markdown", "links"],
    onlyMainContent,
    waitFor,
    timeout: 25_000,
    blockAds: true,
  };

  // v2 is current. maxAge: 0 so a Brain rebuild is not a two-day-old cache.
  const v2 = await firecrawlPost<ScrapePayload>("/v2/scrape", {
    ...body,
    maxAge: 0,
  });
  const fromV2 = asPage(url, v2?.data ?? v2 ?? undefined);
  if (fromV2) return fromV2;

  const v1 = await firecrawlPost<{ success?: boolean; data?: ScrapePayload }>(
    "/v1/scrape",
    body,
  );
  return asPage(url, v1?.data);
}

export async function firecrawlMap(
  url: string,
  options: { limit?: number; search?: string } | number = 40,
): Promise<string[]> {
  const limit = typeof options === "number" ? options : (options.limit ?? 40);
  const search = typeof options === "number" ? undefined : options.search;
  const body: Record<string, unknown> = {
    url,
    limit,
    includeSubdomains: false,
  };
  if (search) body.search = search;

  const v2 = await firecrawlPost<{
    links?: Array<string | { url?: string }>;
  }>("/v2/map", body);
  const fromV2 = readMapLinks(v2?.links);
  if (fromV2.length) return fromV2;

  const v1 = await firecrawlPost<{
    success?: boolean;
    links?: Array<string | { url?: string }>;
  }>("/v1/map", body);
  return readMapLinks(v1?.links);
}

function readMapLinks(
  links: Array<string | { url?: string }> | undefined,
): string[] {
  if (!links) return [];
  return links
    .map((item) => (typeof item === "string" ? item : item.url ?? ""))
    .filter(Boolean);
}
