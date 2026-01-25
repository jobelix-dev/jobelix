import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = getSiteUrl();
  const lastModified = new Date();

  const routes = [
    {
      path: "/",
      changeFrequency: "weekly" as const,
      priority: 1,
    },
    {
      path: "/download",
      changeFrequency: "monthly" as const,
      priority: 0.8,
    },
  ];

  return routes.map((route) => ({
    url: route.path === "/" ? siteUrl : `${siteUrl}${route.path}`,
    lastModified,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}
