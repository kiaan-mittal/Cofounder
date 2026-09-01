import type { MetadataRoute } from "next";

import { appOrigin } from "@/server/app-url";

/**
 * Routes an unauthenticated visitor can actually read. The judging floor
 * (Arena, Brain, WebMCP) is public; sign-in is only for loading your own repo.
 */
const PUBLIC_ROUTES: Array<{
  path: string;
  priority: number;
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
}> = [
  { path: "/", priority: 1, changeFrequency: "weekly" },
  { path: "/webmcp", priority: 0.9, changeFrequency: "monthly" },
  { path: "/arena", priority: 0.9, changeFrequency: "weekly" },
  { path: "/try", priority: 0.8, changeFrequency: "weekly" },
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
