import type { MetadataRoute } from "next";
import { CATALOG_URL, SITE_URL } from "@/config/seo";
import { fetchSeoCatalogResourceEntries } from "@/features/catalog/catalog-seo";

export const revalidate = 3600;

/**
 * Only URLs that anonymous visitors can actually load belong here.
 *
 * `/forum/*`, `/cybercrime-research/*`, `/profile/*`, `/catalog/bookmarks` and
 * `/catalog/submit` are gated by `src/proxy.ts` and answer 307 to `/login`.
 */
function staticRoutes(): MetadataRoute.Sitemap {
  return [
    {
      url: SITE_URL,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: CATALOG_URL,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/login`,
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: `${SITE_URL}/register`,
      changeFrequency: "monthly",
      priority: 0.3,
    },
  ];
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const resources = await fetchSeoCatalogResourceEntries();

  return [
    ...staticRoutes(),
    ...resources.map((resource) => ({
      url: `${CATALOG_URL}/${encodeURIComponent(resource.slug)}`,
      lastModified: resource.lastModified || undefined,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ];
}
