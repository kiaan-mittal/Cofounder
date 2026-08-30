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

function asPage(
  url: string,
  data:
    | {
        markdown?: string;
        links?: string[];
        metadata?: {
          title?: string;
          description?: string;
          sourceURL?: string;
        };
      }
    | undefined,
): FirecrawlPage | null {
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

  const v1 = await firecrawlPost<{
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
  }>("/v1/scrape", body);

  const fromV1 = asPage(url, v1?.data);
  if (fromV1) return fromV1;

  const v2 = await firecrawlPost<{
    markdown?: string;
    links?: string[];
    metadata?: {
      title?: string;
      description?: string;
      sourceURL?: string;
    };
    data?: {
      markdown?: string;
      links?: string[];
      metadata?: {
        title?: string;
        description?: string;
        sourceURL?: string;
      };
    };
  }>("/v2/scrape", body);

  return asPage(url, v2?.data ?? v2 ?? undefined);
}

export async function firecrawlMap(
  url: string,
  options: { limit?: number; search?: string } | number = 80,
): Promise<string[]> {
  const limit = typeof options === "number" ? options : (options.limit ?? 80);
  const search = typeof options === "number" ? undefined : options.search;
  const body: Record<string, unknown> = {
    url,
    limit,
    includeSubdomains: false,
  };
  if (search) body.search = search;

  const payload = await firecrawlPost<{
    success?: boolean;
    links?: Array<string | { url?: string }>;
  }>("/v1/map", body);

  const links = payload?.links;
  if (!links?.length) {
    const v2 = await firecrawlPost<{
      links?: Array<string | { url?: string }>;
    }>("/v2/map", body);
    return readMapLinks(v2?.links);
  }
  return readMapLinks(links);
}

function readMapLinks(
  links: Array<string | { url?: string }> | undefined,
): string[] {
  if (!links) return [];
  return links
    .map((item) => (typeof item === "string" ? item : item.url ?? ""))
    .filter(Boolean);
}
