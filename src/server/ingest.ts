import "server-only";

import type { ReadingExcerpt } from "@/lib/reading";
import type { IngestionSourceReport } from "@/lib/types";
import {
  firecrawlConfigured,
  firecrawlMap,
  firecrawlScrape,
} from "@/server/firecrawl";

/**
 * Source ingestion for the Company Brain.
 *
 * The Brain is only as good as what it can read. A homepage is the start,
 * not the whole company: we follow pricing, about, docs, changelog and
 * whatever else is public, then go deep on the repository — README, stack
 * files, issues, releases, recent work. Private repos are read only after
 * GitHub login. Everything returned from here is untrusted quoted evidence.
 */

const FETCH_TIMEOUT_MS = 12_000;
const MAX_BYTES = 600_000;
const MAX_SITE_PAGES = 9;
const USER_AGENT =
  "DecisionArena/1.0 (+https://github.com/decision-arena; WebMCP Challenge entry)";

const PRIORITY_PATHS = [
  "/pricing",
  "/plans",
  "/price",
  "/about",
  "/about-us",
  "/company",
  "/product",
  "/products",
  "/features",
  "/platform",
  "/docs",
  "/documentation",
  "/changelog",
  "/updates",
  "/blog",
  "/customers",
  "/case-studies",
  "/security",
  "/trust",
  "/faq",
];

const SKIP_PATH =
  /(\/login|\/signin|\/signup|\/register|\/cart|\/checkout|\/account|\/auth|\/cdn-cgi|\/wp-admin|\.(png|jpe?g|gif|svg|webp|pdf|zip|mp4)$)/i;

const STACK_FILES = [
  "package.json",
  "pnpm-workspace.yaml",
  "pyproject.toml",
  "requirements.txt",
  "Cargo.toml",
  "go.mod",
  "Gemfile",
  "composer.json",
  "Dockerfile",
  "docker-compose.yml",
  "vercel.json",
  "fly.toml",
  "CONTRIBUTING.md",
  "SECURITY.md",
  "CHANGELOG.md",
  "CHANGELOG",
];

export interface WebsitePage {
  url: string;
  title: string;
  role: string;
  headings: string[];
  text: string;
}

export interface WebsiteSource {
  url: string;
  title: string;
  description: string;
  headings: string[];
  ctas: string[];
  text: string;
  pricingText: string | null;
  pages: WebsitePage[];
}

export interface GithubFile {
  path: string;
  text: string;
}

export interface GithubSource {
  owner: string;
  repo: string;
  url: string;
  description: string;
  homepage: string | null;
  topics: string[];
  stars: number;
  forks: number;
  openIssues: number;
  license: string | null;
  createdAt: string;
  pushedAt: string;
  defaultBranch: string;
  languages: string[];
  readme: string;
  tree: string[];
  recentCommits: string[];
  files: GithubFile[];
  issues: string[];
  releases: string[];
  contributors: string[];
}

export interface IngestResult {
  website: WebsiteSource | null;
  github: GithubSource | null;
  reports: IngestionSourceReport[];
}

export interface IngestProgress {
  onExcerpt?: (excerpt: ReadingExcerpt) => void;
}

/* ------------------------------------------------------------------ */
/* URL handling                                                        */
/* ------------------------------------------------------------------ */

export function normaliseUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const withScheme = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
  try {
    const url = new URL(withScheme);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    if (!url.hostname.includes(".")) return null;
    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}

export function parseRepo(raw: string): { owner: string; repo: string } | null {
  const trimmed = raw.trim().replace(/\.git$/, "").replace(/\/+$/, "");
  if (!trimmed) return null;

  const shorthand = /^([\w.-]+)\/([\w.-]+)$/.exec(trimmed);
  if (shorthand) return { owner: shorthand[1], repo: shorthand[2] };

  const url = normaliseUrl(trimmed);
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (!parsed.hostname.endsWith("github.com")) return null;
    const [owner, repo] = parsed.pathname.split("/").filter(Boolean);
    if (!owner || !repo) return null;
    return { owner, repo };
  } catch {
    return null;
  }
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit = {},
  timeoutMs = FETCH_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
      redirect: "follow",
      headers: { "user-agent": USER_AGENT, ...(init.headers ?? {}) },
      cache: "no-store",
    });
  } finally {
    clearTimeout(timer);
  }
}

async function readCapped(response: Response): Promise<string> {
  const text = await response.text();
  return text.length > MAX_BYTES ? text.slice(0, MAX_BYTES) : text;
}

async function mapPool<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = [];
  let index = 0;
  async function worker() {
    while (index < items.length) {
      const current = index++;
      results[current] = await fn(items[current]);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, () => worker()),
  );
  return results;
}

/* ------------------------------------------------------------------ */
/* HTML                                                                */
/* ------------------------------------------------------------------ */

function decodeEntities(input: string): string {
  return input
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'");
}

function stripToText(html: string): string {
  return decodeEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<svg[\s\S]*?<\/svg>/gi, " ")
      .replace(/<!--[\s\S]*?-->/g, " ")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/\s+/g, " ")
    .trim();
}

function matchAll(html: string, pattern: RegExp): string[] {
  return [...html.matchAll(pattern)]
    .map((m) => stripToText(m[1] ?? ""))
    .map((s) => s.trim())
    .filter(Boolean);
}

function metaContent(html: string, name: string): string {
  const patterns = [
    new RegExp(
      `<meta[^>]+(?:name|property)=["']${name}["'][^>]*content=["']([^"']*)["']`,
      "i",
    ),
    new RegExp(
      `<meta[^>]+content=["']([^"']*)["'][^>]*(?:name|property)=["']${name}["']`,
      "i",
    ),
  ];
  for (const pattern of patterns) {
    const match = pattern.exec(html);
    if (match?.[1]) return decodeEntities(match[1]).trim();
  }
  return "";
}

function extractLinks(html: string, base: string): string[] {
  const origin = new URL(base);
  const found = new Set<string>();
  for (const match of html.matchAll(/<a\b[^>]*href=["']([^"'#]+)["']/gi)) {
    const href = match[1];
    if (!href || href.startsWith("mailto:") || href.startsWith("javascript:")) {
      continue;
    }
    try {
      const resolved = new URL(href, origin);
      if (resolved.protocol !== "http:" && resolved.protocol !== "https:") {
        continue;
      }
      if (resolved.hostname !== origin.hostname) continue;
      if (SKIP_PATH.test(resolved.pathname)) continue;
      resolved.hash = "";
      resolved.search = "";
      found.add(resolved.toString());
    } catch {
      // ignore malformed hrefs
    }
  }
  return [...found];
}

export function classifyPageRole(url: string): string {
  try {
    const path = new URL(url).pathname.toLowerCase();
    if (path === "/" || path === "") return "home";
    if (/pric|plan|billing/.test(path)) return "pricing";
    if (/about|company|team/.test(path)) return "about";
    if (/doc|guide|help|docs/.test(path)) return "docs";
    if (/changelog|releas|update/.test(path)) return "changelog";
    if (/blog|news|post/.test(path)) return "blog";
    if (/feature|product|platform/.test(path)) return "product";
    if (/secur|trust|privacy|legal/.test(path)) return "trust";
    if (/customer|case/.test(path)) return "customers";
    if (/faq/.test(path)) return "faq";
    return "page";
  } catch {
    return "page";
  }
}

function pageScore(url: string): number {
  const role = classifyPageRole(url);
  const scores: Record<string, number> = {
    home: 110,
    pricing: 100,
    about: 90,
    product: 86,
    docs: 82,
    changelog: 76,
    customers: 70,
    trust: 64,
    blog: 48,
    faq: 44,
    page: 20,
  };
  return scores[role] ?? 20;
}

function canonicalUrl(raw: string): string {
  try {
    const url = new URL(raw);
    url.hash = "";
    if (url.pathname !== "/" && url.pathname.endsWith("/")) {
      url.pathname = url.pathname.slice(0, -1);
    }
    return url.toString();
  } catch {
    return raw;
  }
}

/* ------------------------------------------------------------------ */
/* Website                                                             */
/* ------------------------------------------------------------------ */

function headingsFrom(html: string): string[] {
  return [
    ...matchAll(html, /<h1[^>]*>([\s\S]*?)<\/h1>/gi),
    ...matchAll(html, /<h2[^>]*>([\s\S]*?)<\/h2>/gi),
    ...matchAll(html, /<h3[^>]*>([\s\S]*?)<\/h3>/gi),
  ].slice(0, 40);
}

function headingsFromMarkdown(markdown: string): string[] {
  return markdown
    .split("\n")
    .map((line) => line.replace(/^#{1,3}\s+/, "").trim())
    .filter((line, index, lines) => {
      const original = markdown.split("\n")[index] ?? "";
      return /^#{1,3}\s+/.test(original) && line.length > 1;
    })
    .slice(0, 24);
}

function pageFromHtml(
  url: string,
  html: string,
): Omit<WebsitePage, "role"> & { description: string; ctas: string[] } {
  const text = stripToText(html);
  return {
    url,
    title:
      matchAll(html, /<title[^>]*>([\s\S]*?)<\/title>/gi)[0] ??
      metaContent(html, "og:title"),
    headings: headingsFrom(html),
    text,
    description:
      metaContent(html, "description") || metaContent(html, "og:description"),
    ctas: [
      ...matchAll(html, /<a[^>]*>([\s\S]*?)<\/a>/gi),
      ...matchAll(html, /<button[^>]*>([\s\S]*?)<\/button>/gi),
    ]
      .filter((label) => label.length > 1 && label.length < 40)
      .slice(0, 40),
  };
}

function pageFromMarkdown(
  url: string,
  markdown: string,
  title: string,
): Omit<WebsitePage, "role"> {
  const text = markdown.replace(/```[\s\S]*?```/g, " ").replace(/\s+/g, " ").trim();
  return {
    url,
    title,
    headings: headingsFromMarkdown(markdown),
    text,
  };
}

function asWebsitePage(
  parsed: Omit<WebsitePage, "role">,
): WebsitePage {
  return {
    ...parsed,
    role: classifyPageRole(parsed.url),
    text: parsed.text.slice(0, 8_000),
  };
}

function emitPageExcerpt(
  page: WebsitePage,
  onExcerpt?: (excerpt: ReadingExcerpt) => void,
) {
  onExcerpt?.(pageExcerpt(page));
}

async function fetchHtmlPage(url: string): Promise<{
  html: string;
  finalUrl: string;
} | null> {
  try {
    const response = await fetchWithTimeout(url, {
      headers: { accept: "text/html,application/xhtml+xml" },
    });
    if (!response.ok) return null;
    const html = await readCapped(response);
    return { html, finalUrl: response.url || url };
  } catch {
    return null;
  }
}

async function discoverSiteUrls(homeUrl: string, html: string): Promise<string[]> {
  const origin = new URL(homeUrl);
  const discovered = new Set<string>([canonicalUrl(homeUrl)]);

  for (const link of extractLinks(html, homeUrl)) {
    discovered.add(canonicalUrl(link));
  }

  for (const path of PRIORITY_PATHS) {
    discovered.add(canonicalUrl(new URL(path, origin).toString()));
  }

  try {
    const sitemap = await fetchWithTimeout(new URL("/sitemap.xml", origin).toString());
    if (sitemap.ok) {
      const xml = await readCapped(sitemap);
      for (const match of xml.matchAll(/<loc>\s*([^<]+)\s*<\/loc>/gi)) {
        const loc = match[1]?.trim();
        if (!loc) continue;
        try {
          const parsed = new URL(loc);
          if (parsed.hostname === origin.hostname && !SKIP_PATH.test(parsed.pathname)) {
            discovered.add(canonicalUrl(parsed.toString()));
          }
        } catch {
          // ignore
        }
      }
    }
  } catch {
    // sitemap is optional
  }

  if (firecrawlConfigured()) {
    for (const link of await firecrawlMap(homeUrl, 40)) {
      try {
        const parsed = new URL(link);
        if (parsed.hostname === origin.hostname && !SKIP_PATH.test(parsed.pathname)) {
          discovered.add(canonicalUrl(parsed.toString()));
        }
      } catch {
        // ignore
      }
    }
  }

  return [...discovered]
    .sort((a, b) => pageScore(b) - pageScore(a))
    .slice(0, MAX_SITE_PAGES);
}

async function readSitePage(url: string): Promise<WebsitePage | null> {
  if (firecrawlConfigured()) {
    const scraped = await firecrawlScrape(url);
    if (scraped?.markdown) {
      return asWebsitePage(
        pageFromMarkdown(
          scraped.url || url,
          scraped.markdown,
          scraped.title,
        ),
      );
    }
  }

  const fetched = await fetchHtmlPage(url);
  if (!fetched) return null;
  const parsed = pageFromHtml(fetched.finalUrl, fetched.html);
  if (parsed.text.length < 80) return null;
  return asWebsitePage(parsed);
}

export async function ingestWebsite(
  rawUrl: string,
  progress?: IngestProgress,
): Promise<{ source: WebsiteSource | null; report: IngestionSourceReport }> {
  const url = normaliseUrl(rawUrl);
  if (!url) {
    return {
      source: null,
      report: {
        kind: "website",
        url: rawUrl,
        ok: false,
        detail: "That does not look like a web address. Try example.com.",
      },
    };
  }

  try {
    const home = await fetchHtmlPage(url);
    const firecrawlHome =
      firecrawlConfigured() && (!home || stripToText(home.html).length < 160)
        ? await firecrawlScrape(url)
        : null;

    if (!home && !firecrawlHome) {
      return {
        source: null,
        report: {
          kind: "website",
          url,
          ok: false,
          detail: "The site could not be reached from the server.",
        },
      };
    }

    const homeParsed = home
      ? pageFromHtml(home.finalUrl, home.html)
      : {
          url: firecrawlHome!.url,
          title: firecrawlHome!.title,
          headings: headingsFromMarkdown(firecrawlHome!.markdown),
          text: firecrawlHome!.markdown,
          description: firecrawlHome!.description,
          ctas: [] as string[],
        };

    if (homeParsed.text.length < 80 && !firecrawlHome) {
      return {
        source: null,
        report: {
          kind: "website",
          url,
          ok: false,
          detail:
            "The page rendered almost no text on the server, so there was nothing to read.",
        },
      };
    }

    const homeUrl = home?.finalUrl || firecrawlHome?.url || url;
    const homePage = asWebsitePage({
      url: homeUrl,
      title: homeParsed.title || firecrawlHome?.title || "",
      headings: homeParsed.headings.length
        ? homeParsed.headings
        : firecrawlHome
          ? headingsFromMarkdown(firecrawlHome.markdown)
          : [],
      text:
        firecrawlHome && homeParsed.text.length < 160
          ? firecrawlHome.markdown
          : homeParsed.text,
    });

    const pages = new Map<string, WebsitePage>();
    pages.set(canonicalUrl(homePage.url), homePage);
    emitPageExcerpt(homePage, progress?.onExcerpt);

    const candidates = await discoverSiteUrls(
      homeUrl,
      home?.html ?? "",
    );
    const extras = candidates.filter(
      (candidate) => canonicalUrl(candidate) !== canonicalUrl(homePage.url),
    );

    await mapPool(extras, 4, async (candidate) => {
      const page = await readSitePage(candidate);
      if (!page) return null;
      const key = canonicalUrl(page.url);
      if (pages.has(key)) return null;
      pages.set(key, page);
      emitPageExcerpt(page, progress?.onExcerpt);
      return page;
    });

    const uniquePages = [...pages.values()].sort(
      (a, b) => pageScore(b.url) - pageScore(a.url),
    );

    const pricingPage = uniquePages.find((page) => page.role === "pricing");
    const combinedText = uniquePages
      .map((page) => `[${page.role} ${page.url}]\n${page.text}`)
      .join("\n\n");

    const pricingIndex = combinedText
      .toLowerCase()
      .search(/\bpricing\b|\bper month\b|\/mo\b|\$\d+/);
    const pricingText =
      pricingPage?.text.slice(0, 1_200) ??
      (pricingIndex >= 0 ? combinedText.slice(pricingIndex, pricingIndex + 900) : null);

    const source: WebsiteSource = {
      url: homeUrl,
      title: homeParsed.title || firecrawlHome?.title || "",
      description: homeParsed.description || firecrawlHome?.description || "",
      headings: uniquePages.flatMap((page) => page.headings).slice(0, 60),
      ctas: [...new Set(homeParsed.ctas)],
      text: combinedText.slice(0, 36_000),
      pricingText,
      pages: uniquePages,
    };

    return {
      source,
      report: {
        kind: "website",
        url: homeUrl,
        ok: true,
        detail: `Read ${uniquePages.length} public page${uniquePages.length === 1 ? "" : "s"} (${uniquePages
          .map((page) => page.role)
          .filter((role, index, list) => list.indexOf(role) === index)
          .join(", ")}).`,
        bytes: combinedText.length,
        pages: uniquePages.map((page) => ({
          url: page.url,
          title: page.title || page.role,
          role: page.role,
        })),
      },
    };
  } catch (error) {
    const aborted = error instanceof Error && error.name === "AbortError";
    return {
      source: null,
      report: {
        kind: "website",
        url,
        ok: false,
        detail: aborted
          ? "The site took longer than 12 seconds to respond."
          : "The site could not be reached from the server.",
      },
    };
  }
}

/* ------------------------------------------------------------------ */
/* GitHub                                                              */
/* ------------------------------------------------------------------ */

function githubHeaders(
  accessToken: string | undefined,
  extra: Record<string, string> = {},
) {
  const headers: Record<string, string> = {
    accept: "application/vnd.github+json",
    "x-github-api-version": "2022-11-28",
    ...extra,
  };
  const token = accessToken || process.env.GITHUB_TOKEN;
  if (token) {
    headers.authorization = `Bearer ${token}`;
  }
  return headers;
}

async function githubJson<T>(
  url: string,
  accessToken: string | undefined,
): Promise<T | null> {
  try {
    const response = await fetchWithTimeout(url, {
      headers: githubHeaders(accessToken),
    });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

async function githubRaw(
  url: string,
  accessToken: string | undefined,
): Promise<string> {
  try {
    const response = await fetchWithTimeout(url, {
      headers: githubHeaders(accessToken, {
        accept: "application/vnd.github.raw",
      }),
    });
    return response.ok ? await readCapped(response) : "";
  } catch {
    return "";
  }
}

export async function ingestGithub(
  rawRepo: string,
  accessToken?: string,
  progress?: IngestProgress,
): Promise<{ source: GithubSource | null; report: IngestionSourceReport }> {
  const parsed = parseRepo(rawRepo);
  if (!parsed) {
    return {
      source: null,
      report: {
        kind: "github",
        url: rawRepo,
        ok: false,
        detail: "Use a repository as github.com/owner/repo or owner/repo.",
      },
    };
  }

  const { owner, repo } = parsed;
  const apiBase = `https://api.github.com/repos/${owner}/${repo}`;
  const url = `https://github.com/${owner}/${repo}`;

  try {
    const meta = await fetchWithTimeout(apiBase, {
      headers: githubHeaders(accessToken),
    });

    if (meta.status === 404) {
      return {
        source: null,
        report: {
          kind: "github",
          url,
          ok: false,
          detail: accessToken
            ? "That repository was not found, or this GitHub account cannot read it."
            : "That repository is private or does not exist. Sign in with GitHub to read a private repository.",
        },
      };
    }
    if (meta.status === 403 || meta.status === 429) {
      return {
        source: null,
        report: {
          kind: "github",
          url,
          ok: false,
          detail:
            "GitHub rate-limited the request. Sign in with GitHub, or set GITHUB_TOKEN, to raise the limit.",
        },
      };
    }
    if (!meta.ok) {
      return {
        source: null,
        report: {
          kind: "github",
          url,
          ok: false,
          detail: `GitHub returned ${meta.status}. The Brain will be built without the repository.`,
        },
      };
    }

    const info = (await meta.json()) as Record<string, unknown>;
    const defaultBranch = (info.default_branch as string) || "main";

    const [readme, languages, tree, commits, issues, releases, contributors] =
      await Promise.all([
        githubRaw(`${apiBase}/readme`, accessToken),
        githubJson<Record<string, number>>(`${apiBase}/languages`, accessToken),
        githubJson<Array<{ name: string; type: string }>>(
          `${apiBase}/contents/`,
          accessToken,
        ),
        githubJson<
          Array<{ commit?: { message?: string; author?: { date?: string } } }>
        >(`${apiBase}/commits?per_page=16`, accessToken),
        githubJson<
          Array<{
            title?: string;
            state?: string;
            pull_request?: unknown;
            labels?: Array<{ name?: string }>;
          }>
        >(`${apiBase}/issues?state=open&per_page=16`, accessToken),
        githubJson<Array<{ name?: string; tag_name?: string; body?: string }>>(
          `${apiBase}/releases?per_page=8`,
          accessToken,
        ),
        githubJson<Array<{ login?: string; contributions?: number }>>(
          `${apiBase}/contributors?per_page=10`,
          accessToken,
        ),
      ]);

    const entries = Array.isArray(tree)
      ? tree.map((item) => `${item.name}${item.type === "dir" ? "/" : ""}`)
      : [];

    const commitMessages = Array.isArray(commits)
      ? commits
          .map((c) => {
            const message = c.commit?.message?.split("\n")[0] ?? "";
            const date = c.commit?.author?.date?.slice(0, 10) ?? "";
            return message ? `${date} ${message}` : "";
          })
          .filter(Boolean)
      : [];

    const issueLines = Array.isArray(issues)
      ? issues
          .filter((issue) => !issue.pull_request)
          .map((issue) => {
            const labels = (issue.labels ?? [])
              .map((label) => label.name)
              .filter(Boolean)
              .join(", ");
            return `${issue.title ?? ""}${labels ? ` [${labels}]` : ""}`;
          })
          .filter(Boolean)
          .slice(0, 12)
      : [];

    const releaseLines = Array.isArray(releases)
      ? releases
          .map((release) => {
            const name = release.name || release.tag_name || "";
            const body = release.body?.split("\n").find((line) => line.trim()) ?? "";
            return body ? `${name} — ${body.slice(0, 160)}` : name;
          })
          .filter(Boolean)
      : [];

    const contributorLines = Array.isArray(contributors)
      ? contributors
          .map((person) =>
            person.login
              ? `${person.login}${person.contributions ? ` (${person.contributions})` : ""}`
              : "",
          )
          .filter(Boolean)
      : [];

    const wantedFiles = STACK_FILES.filter((path) =>
      entries.some((entry) => entry.replace(/\/$/, "") === path),
    ).slice(0, 8);

    const files = (
      await mapPool(wantedFiles, 4, async (path) => {
        const text = await githubRaw(`${apiBase}/contents/${path}`, accessToken);
        if (!text.trim()) return null;
        return { path, text: text.slice(0, 4_000) } satisfies GithubFile;
      })
    ).filter((file): file is GithubFile => Boolean(file));

    const source: GithubSource = {
      owner,
      repo,
      url,
      description: (info.description as string) ?? "",
      homepage: (info.homepage as string) || null,
      topics: (info.topics as string[]) ?? [],
      stars: (info.stargazers_count as number) ?? 0,
      forks: (info.forks_count as number) ?? 0,
      openIssues: (info.open_issues_count as number) ?? 0,
      license:
        ((info.license as { spdx_id?: string } | null)?.spdx_id as string) ??
        null,
      createdAt: (info.created_at as string) ?? "",
      pushedAt: (info.pushed_at as string) ?? "",
      defaultBranch,
      languages: Object.keys(languages ?? {}),
      readme: readme.slice(0, 14_000),
      tree: entries.slice(0, 80),
      recentCommits: commitMessages,
      files,
      issues: issueLines,
      releases: releaseLines,
      contributors: contributorLines,
    };

    progress?.onExcerpt?.(githubExcerpt(source));

    return {
      source,
      report: {
        kind: "github",
        url,
        ok: true,
        detail: `Read the tree, ${commitMessages.length} commits, ${files.length} stack files, ${issueLines.length} open issues and ${releaseLines.length} releases.`,
        bytes: readme.length + files.reduce((sum, file) => sum + file.text.length, 0),
        files: files.map((file) => file.path),
        pages: [
          { url, title: `${owner}/${repo}`, role: "repository" },
          ...files.map((file) => ({
            url: `${url}/blob/${defaultBranch}/${file.path}`,
            title: file.path,
            role: "file",
          })),
        ],
      },
    };
  } catch (error) {
    const aborted = error instanceof Error && error.name === "AbortError";
    return {
      source: null,
      report: {
        kind: "github",
        url,
        ok: false,
        detail: aborted
          ? "GitHub took longer than 12 seconds to respond."
          : "GitHub could not be reached from the server.",
      },
    };
  }
}

export function pageExcerpt(page: WebsitePage): ReadingExcerpt {
  const sentences = page.text
    .split(/(?<=[.?!])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 40)
    .slice(0, 5);

  return {
    source: page.role === "docs" ? "docs" : "website",
    title: page.title || page.role,
    url: page.url,
    lines: [
      { kind: "meta" as const, text: page.role },
      ...page.headings.slice(0, 6).map((text) => ({
        kind: "heading" as const,
        text,
      })),
      ...sentences.map((text) => ({
        kind: "body" as const,
        text: text.slice(0, 220),
      })),
    ],
  };
}

export function websiteExcerpt(source: WebsiteSource): ReadingExcerpt {
  const home = source.pages.find((page) => page.role === "home") ?? source.pages[0];
  if (home) return pageExcerpt(home);

  const sentences = source.text
    .split(/(?<=[.?!])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 40)
    .slice(0, 7);

  return {
    source: "website",
    title: source.title || source.url,
    url: source.url,
    lines: [
      source.description
        ? { kind: "meta" as const, text: source.description }
        : null,
      ...source.headings.slice(0, 8).map((text) => ({
        kind: "heading" as const,
        text,
      })),
      ...sentences.map((text) => ({
        kind: "body" as const,
        text: text.slice(0, 240),
      })),
    ].filter((line): line is NonNullable<typeof line> => Boolean(line)),
  };
}

export function githubExcerpt(source: GithubSource): ReadingExcerpt {
  const readmeLines = source.readme
    .split("\n")
    .map((line) => line.replace(/^#+\s*/, "").trim())
    .filter((line) => line.length > 12 && !line.startsWith("```"))
    .slice(0, 6);

  return {
    source: "github",
    title: `${source.owner}/${source.repo}`,
    url: source.url,
    lines: [
      source.description
        ? { kind: "meta" as const, text: source.description }
        : null,
      source.languages.length
        ? { kind: "meta" as const, text: source.languages.join(" · ") }
        : null,
      source.files.length
        ? {
            kind: "file" as const,
            text: `Read ${source.files.map((file) => file.path).join(", ")}`,
          }
        : null,
      ...source.issues.slice(0, 4).map((text) => ({
        kind: "issue" as const,
        text,
      })),
      ...source.recentCommits.slice(0, 5).map((text) => ({
        kind: "commit" as const,
        text,
      })),
      ...readmeLines.map((text) => ({
        kind: "body" as const,
        text: text.slice(0, 200),
      })),
    ].filter((line): line is NonNullable<typeof line> => Boolean(line)),
  };
}

export async function ingestSources(
  input: {
    website: string;
    github: string;
    docsUrl?: string;
    accessToken?: string;
  },
  progress?: IngestProgress,
): Promise<IngestResult> {
  const tasks: Array<Promise<unknown>> = [];
  const reports: IngestionSourceReport[] = [];

  let website: WebsiteSource | null = null;
  let github: GithubSource | null = null;
  let docs: WebsiteSource | null = null;

  if (input.website.trim()) {
    tasks.push(
      ingestWebsite(input.website, progress).then((r) => {
        website = r.source;
        reports.push(r.report);
      }),
    );
  }
  if (input.github.trim()) {
    tasks.push(
      ingestGithub(input.github, input.accessToken, progress).then((r) => {
        github = r.source;
        reports.push(r.report);
      }),
    );
  }
  if (input.docsUrl?.trim()) {
    tasks.push(
      ingestWebsite(input.docsUrl, progress).then((r) => {
        docs = r.source;
        reports.push({ ...r.report, kind: "docs" });
      }),
    );
  }

  await Promise.all(tasks);

  const docsSource = docs as WebsiteSource | null;
  const websiteSource = website as WebsiteSource | null;
  if (docsSource && websiteSource) {
    websiteSource.text = `${websiteSource.text}\n\n[documentation]\n${docsSource.text}`.slice(
      0,
      40_000,
    );
    websiteSource.pages = [...websiteSource.pages, ...docsSource.pages];
  }

  return {
    website: websiteSource ?? docsSource,
    github,
    reports,
  };
}
