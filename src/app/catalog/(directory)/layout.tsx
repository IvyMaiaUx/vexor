import type { ReactNode } from "react";
import { JsonLd } from "@/components/seo/json-ld";
import {
  buildCatalogJsonLd,
  fetchSeoCatalogResources,
} from "@/features/catalog/catalog-seo";

export const revalidate = 3600;

/**
 * Adds server-rendered structured data to the catalog directory only, so the
 * client-side catalog UI in `page.tsx` stays untouched.
 */
export default async function CatalogDirectoryLayout({
  children,
}: {
  children: ReactNode;
}) {
  const resources = await fetchSeoCatalogResources();
  const jsonLd = buildCatalogJsonLd(resources);

  return (
    <>
      {jsonLd ? <JsonLd data={jsonLd} /> : null}
      {children}
    </>
  );
}
