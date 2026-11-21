import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  CATALOG_URL,
  SITE_NAME,
  SITE_URL,
  absoluteUrl,
} from "@/config/seo";
import { isSafeExternalUrl } from "@/lib/security/sanitize";
import type { Database } from "@/types/database.types";

export type JsonLdNode = Record<string, unknown>;

export interface SeoCatalogResource {
  slug: string;
  name: string;
  description: string;
  type: string;
  language: string;
  difficulty: string | null;
  authorName: string;
  publishedAt: string;
  lastModified: string;
  externalUrl: string;
  categoryName: string;
}

export type ResourceCategoryRow = Pick<
  Database["public"]["Tables"]["categories"]["Row"],
  "id" | "slug" | "name_en" | "name_pt"
>;

const RESOURCE_SEO_COLUMNS =
  "slug, name, description, description_pt, description_en, type, language, difficulty, author_name, published_at, created_at, updated_at, url, category_id, status";

type ResourceSeoRow = Pick<
  Database["public"]["Tables"]["resources"]["Row"],
  | "slug"
  | "name"
  | "description"
  | "description_pt"
  | "description_en"
  | "type"
  | "language"
  | "difficulty"
  | "author_name"
  | "published_at"
  | "created_at"
  | "updated_at"
  | "url"
  | "category_id"
  | "status"
>;

const SCHEMA_TYPE_BY_RESOURCE_TYPE: Record<string, string> = {
  article: "Article",
  course: "Course",
  documentation: "TechArticle",
  lab: "LearningResource",
  ctf_platform: "SoftwareApplication",
  framework: "SoftwareApplication",
  repository: "SoftwareApplication",
  script: "SoftwareApplication",
  tool: "SoftwareApplication",
};

function createSeoClient(): SupabaseClient<Database> | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return null;
  }

  try {
    return createClient<Database>(supabaseUrl, supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  } catch {
    return null;
  }
}

function mapResource(
  row: ResourceSeoRow,
  categoryNameById: Map<string, string>
): SeoCatalogResource | null {
  const slug = row.slug?.trim();
  const name = row.name?.trim();
  if (!slug || !name) {
    return null;
  }

  const description = row.description_pt || row.description_en || row.description || "";
  const published = row.published_at ?? row.created_at ?? "";
  const lastModified = row.updated_at ?? published;

  return {
    slug,
    name,
    description,
    type: row.type,
    language: row.language,
    difficulty: row.difficulty,
    authorName: row.author_name?.trim() ?? "",
    publishedAt: published.slice(0, 10),
    lastModified: lastModified.slice(0, 10),
    externalUrl: isSafeExternalUrl(row.url) ? row.url.trim() : "",
    categoryName: categoryNameById.get(row.category_id) ?? "",
  };
}

async function loadCatalogRows(options?: { slug?: string }) {
  const supabase = createSeoClient();
  if (!supabase) {
    return [];
  }

  try {
    const baseQuery = supabase
      .from("resources")
      .select(RESOURCE_SEO_COLUMNS)
      .eq("status", "approved");

    const resourcesQuery = options?.slug
      ? baseQuery.eq("slug", options.slug)
      : baseQuery
          .order("published_at", { ascending: false, nullsFirst: false })
          .order("created_at", { ascending: false })
          .limit(500);

    const [resourcesResult, categoriesResult] = await Promise.all([
      resourcesQuery,
      supabase
        .from("categories")
        .select("id, slug, name_en, name_pt")
        .eq("is_active", true),
    ]);

    if (resourcesResult.error || categoriesResult.error) {
      return [];
    }

    const categoryNameById = new Map(
      ((categoriesResult.data ?? []) as ResourceCategoryRow[]).map((category) => [
        category.id,
        category.name_pt || category.name_en,
      ])
    );

    return ((resourcesResult.data ?? []) as ResourceSeoRow[])
      .map((row) => mapResource(row, categoryNameById))
      .filter((resource): resource is SeoCatalogResource => resource !== null);
  } catch {
    return [];
  }
}

const SITEMAP_PAGE_SIZE = 1000;
const SITEMAP_MAX_PAGES = 20;

/**
 * Every approved resource slug, paginated past the PostgREST row cap, for
 * `/sitemap.xml`. JSON-LD keeps the lighter `loadCatalogRows` window.
 */
export async function fetchSeoCatalogResourceEntries(): Promise<
  Array<{ slug: string; lastModified: string }>
> {
  const supabase = createSeoClient();
  if (!supabase) {
    return [];
  }

  const entries: Array<{ slug: string; lastModified: string }> = [];

  try {
    for (let page = 0; page < SITEMAP_MAX_PAGES; page += 1) {
      const from = page * SITEMAP_PAGE_SIZE;
      const { data, error } = await supabase
        .from("resources")
        .select("slug, updated_at, published_at, created_at")
        .eq("status", "approved")
        .order("slug", { ascending: true })
        .range(from, from + SITEMAP_PAGE_SIZE - 1);

      if (error || !Array.isArray(data)) {
        return entries;
      }

      for (const row of data) {
        const slug = row.slug?.trim();
        if (!slug) {
          continue;
        }
        const lastModified = row.updated_at ?? row.published_at ?? row.created_at ?? "";
        entries.push({ slug, lastModified: lastModified.slice(0, 10) });
      }

      if (data.length < SITEMAP_PAGE_SIZE) {
        break;
      }
    }
  } catch {
    return entries;
  }

  return entries;
}

/** Approved catalog resources for the sitemap and collection JSON-LD. */
export async function fetchSeoCatalogResources(): Promise<SeoCatalogResource[]> {
  return loadCatalogRows();
}

/** Single approved resource (nulls out when missing or Supabase is not configured). */
export async function fetchSeoCatalogResourceBySlug(
  slug: string
): Promise<SeoCatalogResource | null> {
  const cleanSlug = slug?.trim();
  if (!cleanSlug) {
    return null;
  }
  const [resource] = await loadCatalogRows({ slug: cleanSlug });
  return resource ?? null;
}

function languageToBcp47(language: string): string | string[] | undefined {
  switch (language) {
    case "pt-BR":
      return "pt-BR";
    case "en":
      return "en";
    case "multilingual":
      return ["pt-BR", "en"];
    default:
      return undefined;
  }
}

/** schema.org node describing one catalog resource detail page. */
export function buildResourceJsonLd(resource: SeoCatalogResource): JsonLdNode {
  const schemaType =
    SCHEMA_TYPE_BY_RESOURCE_TYPE[resource.type] ?? "SoftwareApplication";
  const resourceUrl = absoluteUrl(
    `/catalog/${encodeURIComponent(resource.slug)}`
  );

  const node: JsonLdNode = {
    "@context": "https://schema.org",
    "@type": schemaType,
    name: resource.name,
    description: resource.description || undefined,
    url: resourceUrl,
    mainEntityOfPage: resourceUrl,
    inLanguage: languageToBcp47(resource.language),
    datePublished: resource.publishedAt || undefined,
    dateModified: resource.lastModified || undefined,
    author: resource.authorName
      ? { "@type": "Organization", name: resource.authorName }
      : undefined,
    publisher: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
    isPartOf: {
      "@type": "CollectionPage",
      "@id": CATALOG_URL,
      name: `${SITE_NAME} — Catálogo de recursos`,
      url: CATALOG_URL,
    },
    sameAs: resource.externalUrl || undefined,
    keywords: resource.categoryName || undefined,
  };

  if (schemaType === "SoftwareApplication") {
    node.applicationCategory = "SecurityApplication";
    node.operatingSystem = "Any";
  }

  return node;
}

/** schema.org CollectionPage + ItemList for the catalog directory. */
export function buildCatalogJsonLd(
  resources: SeoCatalogResource[]
): JsonLdNode | null {
  if (resources.length === 0) {
    return null;
  }

  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `Catálogo de recursos de cibersegurança — ${SITE_NAME}`,
    description:
      "Ferramentas, repositórios, laboratórios e materiais de cibersegurança revisados pela comunidade VEXOR.",
    url: CATALOG_URL,
    inLanguage: "pt-BR",
    isPartOf: { "@type": "WebSite", name: SITE_NAME, url: SITE_URL },
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: resources.length,
      itemListElement: resources.map((resource, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: resource.name,
        url: absoluteUrl(`/catalog/${encodeURIComponent(resource.slug)}`),
      })),
    },
  };
}
