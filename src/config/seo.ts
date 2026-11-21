/**
 * Canonical public origin used for metadata, sitemap, robots and JSON-LD.
 * Keep it in sync with `metadataBase` in `src/app/layout.tsx`.
 */
export const SITE_URL = "https://vexorsec.com.br";
export const SITE_NAME = "VEXOR";
export const CATALOG_PATH = "/catalog";
export const CATALOG_URL = `${SITE_URL}${CATALOG_PATH}`;

/** Builds an absolute canonical URL for a path that starts with "/". */
export function absoluteUrl(path: string): string {
  return `${SITE_URL}${path}`;
}
