import type { MetadataRoute } from "next";
import { SITE_URL } from "@/config/seo";
import { fetchSeoCatalogResources } from "@/features/catalog/catalog-seo";

export const revalidate = 3600;

type SitemapFrequency = NonNullable<
  MetadataRoute.Sitemap[number]["changeFrequency"]
>;

const STATIC_ROUTES: Array<{
  path: string;
  changeFrequency: SitemapFrequency;
  priority: number;
}> = [
  { path: "", changeFrequency: "daily", priority: 1 },
  { path: "/catalog", changeFrequency: "daily", priority: 0.9 },
  { path: "/forum", changeFrequency: "daily", priority: 0.8 },
  { path: "/cybercrime-research", changeFrequency: "weekly", priority: 0.8 },
  {
    path: "/cybercrime-research/cases",
    changeFrequency: "weekly",
    priority: 0.6,
  },
  {
    path: "/cybercrime-research/discussions",
    changeFrequency: "weekly",
    priority: 0.6,
  },
  {
    path: "/cybercrime-research/labs",
    changeFrequency: "weekly",
    priority: 0.6,
  },
  {
    path: "/cybercrime-research/library",
    changeFrequency: "weekly",
    priority: 0.6,
  },
];

function toLastModified(value: string): Date | undefined {
  if (!value) {
    return undefined;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const resources = await fetchSeoCatalogResources();

  return [
    ...STATIC_ROUTES.map((route) => ({
      url: `${SITE_URL}${route.path}`,
      changeFrequency: route.changeFrequency,
      priority: route.priority,
    })),
    ...resources.map((resource) => ({
      url: `${SITE_URL}/catalog/${encodeURIComponent(resource.slug)}`,
      lastModified: toLastModified(resource.lastModified),
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
  ];
}
