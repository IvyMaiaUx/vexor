import type { ReactNode } from "react";
import { JsonLd } from "@/components/seo/json-ld";
import {
  buildResourceJsonLd,
  fetchSeoCatalogResourceBySlug,
} from "@/features/catalog/catalog-seo";

export const revalidate = 3600;

/**
 * Server-renders schema.org JSON-LD for a catalog resource. The visible detail
 * UI remains the existing client component in `page.tsx`.
 */
export default async function ResourceDetailLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const resource = await fetchSeoCatalogResourceBySlug(slug);

  return (
    <>
      {resource ? <JsonLd data={buildResourceJsonLd(resource)} /> : null}
      {children}
    </>
  );
}
