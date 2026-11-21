import type { MetadataRoute } from "next";
import { SITE_URL } from "@/config/seo";

export const revalidate = 3600;

/**
 * Only URLs that anonymous visitors can actually load belong here.
 *
 * `/catalog/*`, `/forum/*`, `/cybercrime-research/*` and `/profile/*` are
 * gated by `src/proxy.ts` and answer 307 to `/login`, so listing them (or
 * their resources) would send crawlers to a redirect. Revisit this file when
 * those areas become publicly readable.
 */
const PUBLIC_ROUTES: Array<{
  path: string;
  changeFrequency: NonNullable<
    MetadataRoute.Sitemap[number]["changeFrequency"]
  >;
  priority: number;
}> = [
  { path: "", changeFrequency: "daily", priority: 1 },
  { path: "/login", changeFrequency: "monthly", priority: 0.3 },
  { path: "/register", changeFrequency: "monthly", priority: 0.3 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  return PUBLIC_ROUTES.map((route) => ({
    url: `${SITE_URL}${route.path}`,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}
