import type { MetadataRoute } from "next";

import { appOrigin } from "@/server/app-url";

export default function robots(): MetadataRoute.Robots {
  const origin = appOrigin();
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Share tokens are unguessable capability links. A crawler that
        // indexed one would publish a founder's private decision record.
        disallow: ["/api/", "/share/"],
      },
    ],
    sitemap: `${origin}/sitemap.xml`,
    host: origin,
  };
}
