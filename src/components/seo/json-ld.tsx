import type { JsonLdNode } from "@/features/catalog/catalog-seo";

/**
 * Renders a schema.org JSON-LD block (server-only). Content comes from the
 * database, so `<` is escaped to keep a crafted name/description from closing
 * the script tag; React renders script children as raw text without escaping
 * them again, which is exactly what JSON-LD needs.
 */
export function JsonLd({ data }: { data: JsonLdNode }) {
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return <script type="application/ld+json">{json}</script>;
}
