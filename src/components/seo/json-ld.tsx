import type { JsonLdNode } from "@/features/catalog/catalog-seo";

/**
 * Renders a schema.org JSON-LD block. Content comes from the database, so
 * `<` is escaped to keep a crafted name/description from closing the script.
 */
export function JsonLd({ data }: { data: JsonLdNode }) {
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: json }}
    />
  );
}
