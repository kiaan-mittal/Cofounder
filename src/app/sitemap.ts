import type { MetadataRoute } from "next";

import { appOrigin } from "@/server/app-url";

/**
 * Only routes an unauthenticated visitor can actually read. The workspace
 * routes redirect to /login, and listing a redirect as a sitemap entry
 * advertises a page that does not exist for the reader.
 */
const PUBLIC_ROUTES: Array<{
  path: string;
  priority: number;
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
}> = [
  { path: "/", priority: 1, changeFrequency: "weekly" },
  { path: "/webmcp", priority: 0.9, changeFrequency: "monthly" },
  { path: "/login", priority: 0.3, changeFrequency: "yearly" },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const origin = appOrigin();
  const lastModified = new Date();

  return PUBLIC_ROUTES.map((route) => ({
    url: `${origin}${route.path}`,
    lastModified,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}
