import type { MetadataRoute } from "next";
import { CATALOG_URL, SITE_URL } from "@/config/seo";
import { fetchSeoCatalogResourceEntries } from "@/features/catalog/catalog-seo";

export const revalidate = 3600;

/**
 * Only URLs that anonymous visitors and search crawlers can actually load
 * with HTTP 200 belong here.
 *
 * `/login`, `/register`, `/forum/*`, `/cybercrime-research/*`, `/profile/*`,
 * `/catalog/bookmarks` and `/catalog/submit` are excluded because they are
 * disallowed in `robots.ts` or gated by `src/proxy.ts`.
 */
function staticRoutes(latestResourceDate?: string): MetadataRoute.Sitemap {
  return [
    {
      url: SITE_URL,
      lastModified: latestResourceDate || undefined,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: CATALOG_URL,
      lastModified: latestResourceDate || undefined,
      changeFrequency: "daily",
      priority: 0.9,
    },
  ];
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const resources = await fetchSeoCatalogResourceEntries();
  const latestResourceDate = resources.reduce(
    (latest, item) =>
      item.lastModified && item.lastModified > latest
        ? item.lastModified
        : latest,
    ""
  );

  return [
    ...staticRoutes(latestResourceDate || undefined),
    ...resources.map((resource) => ({
      url: `${CATALOG_URL}/${encodeURIComponent(resource.slug)}`,
      lastModified: resource.lastModified || undefined,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ];
}
