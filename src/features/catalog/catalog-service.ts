import type {
  CategoryItem,
  DifficultyLevel,
  FeaturedResourceItem,
  ResourceCreditCardRequirement,
  ResourceLanguage,
  ResourceOptionalTag,
  ResourcePricingModel,
  ResourceStandardTag,
  ResourceStatus,
  ResourceType,
  SupportedLocale,
} from "@/config/site";
import { createClient } from "@/lib/supabase/client";
import {
  isSafeExternalUrl,
  normalizeResourceUrl,
} from "@/lib/security/sanitize";
import type { Database } from "@/types/database.types";
import { type CourseMetadata, parseCourseMetadata } from "./course-metadata";
import {
  computeResourceTags,
  filterValidOptionalTags,
  isValidCreditCardRequirement,
  isValidPricingModel,
} from "./validation";

export type CategoryRow = Database["public"]["Tables"]["categories"]["Row"];
export type ResourceRow = Database["public"]["Tables"]["resources"]["Row"] & {
  pricing_model?: ResourcePricingModel | null;
  requires_credit_card?: ResourceCreditCardRequirement | null;
  free_tier_limits?: string | null;
  pricing_notes?: string | null;
  tags?: ResourceStandardTag[] | null;
  course_metadata?: unknown;
};
export type ResourceInsertRow =
  Database["public"]["Tables"]["resources"]["Insert"] & {
    pricing_model?: ResourcePricingModel | null;
    requires_credit_card?: ResourceCreditCardRequirement | null;
    free_tier_limits?: string | null;
    pricing_notes?: string | null;
    tags?: ResourceStandardTag[];
  };
export type BookmarkRow = Database["public"]["Tables"]["bookmarks"]["Row"];

export interface CatalogResourceItem extends FeaturedResourceItem {
  id: string;
  categoryId: string;
  submittedBy?: string | null;
  createdAt?: string;
  courseMetadata?: CourseMetadata | null;
}

export interface CatalogCategoryItem extends CategoryItem {
  id: string;
  sortOrder: number;
}

export interface CatalogQueryParams {
  search?: string;
  categorySlug?: string;
  excludeCategorySlug?: string;
  type?: ResourceType | "all";
  difficulty?: DifficultyLevel | "all";
  language?: ResourceLanguage | "all";
  onlyBookmarks?: boolean;
  bookmarkedIds?: string[];
  sortBy?: "newest" | "alphabetical";
  page?: number;
  pageSize?: number;
}

export interface CatalogQueryResult {
  status: "success" | "error";
  items: CatalogResourceItem[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  errorMessage?: string;
}

export interface CatalogDetailResult {
  status: "found" | "not_found" | "error";
  resource: CatalogResourceItem | null;
  category: CatalogCategoryItem | null;
  related: CatalogResourceItem[];
  errorMessage?: string;
}

export interface BookmarksReadResult {
  status: "authenticated" | "unauthenticated" | "error";
  bookmarkedIds: string[];
  bookmarkedSlugs: string[];
  items: CatalogResourceItem[];
  errorMessage?: string;
}

export type BookmarkMutationErrorCode =
  | "unauthenticated"
  | "rls_denied"
  | "not_approved"
  | "connection_error"
  | "mutation_failed";

export type BookmarkMutationResult =
  | {
      status: "success";
      bookmarked: boolean;
      resourceId: string;
    }
  | {
      status: "error";
      errorCode: BookmarkMutationErrorCode;
      message: string;
    };

export interface ResourceSubmissionPayload {
  name: string;
  description: string;
  categoryId: string;
  type: ResourceType;
  url: string;
  language: ResourceLanguage;
  difficulty?: DifficultyLevel | "";
  authorName?: string;
  pricingModel: ResourcePricingModel;
  requiresCreditCard: ResourceCreditCardRequirement;
  freeTierLimits?: string;
  pricingNotes?: string;
  optionalTags?: ResourceOptionalTag[];
}

export type ResourceSubmissionErrorCode =
  | "unauthenticated"
  | "validation_error"
  | "duplicate_url"
  | "rls_denied"
  | "invalid_category"
  | "connection_error"
  | "insert_failed";

export type ResourceSubmissionResult =
  | {
      status: "success";
      resource: CatalogResourceItem;
    }
  | {
      status: "error";
      errorCode: ResourceSubmissionErrorCode;
      message: string;
      fieldErrors?: Partial<
        Record<
          | "name"
          | "description"
          | "categorySlug"
          | "type"
          | "url"
          | "language"
          | "difficulty"
          | "authorName"
          | "pricingModel"
          | "requiresCreditCard"
          | "freeTierLimits"
          | "pricingNotes"
          | "optionalTags",
          string
        >
      >;
    };

export interface CatalogSupabaseError {
  message?: string;
  code?: string;
  status?: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type CatalogSupabaseClientLike = any;

export const RESOURCE_SELECT_COLUMNS =
  "id, slug, name, description, category_id, type, url, language, difficulty, author_name, submitted_by, status, published_at, created_at, pricing_model, requires_credit_card, free_tier_limits, pricing_notes, tags, course_metadata";

export const CATEGORY_SELECT_COLUMNS =
  "id, slug, name_en, name_pt, description_en, description_pt, scope, sort_order, is_active";

const FORBIDDEN_RESOURCE_INSERT_KEYS = [
  "id",
  "slug",
  "submitted_by",
  "status",
  "reviewed_by",
  "reviewed_at",
  "rejection_reason",
  "published_at",
  "created_at",
  "updated_at",
] as const;

function sanitizeIlikeTerm(term: string): string {
  return term
    .trim()
    .replace(/[%_\\]/g, "\\$&")
    .replace(/[(),]/g, " ")
    .slice(0, 100);
}

function isRlsOrPermissionError(error: CatalogSupabaseError): boolean {
  const code = (error.code ?? "").toLowerCase();
  const msg = (error.message ?? "").toLowerCase();
  return (
    code === "42501" ||
    code === "pgrst301" ||
    error.status === 401 ||
    error.status === 403 ||
    msg.includes("row-level security") ||
    msg.includes("permission denied")
  );
}

function isNetworkError(error: CatalogSupabaseError): boolean {
  const msg = (error.message ?? "").toLowerCase();
  return (
    (typeof error.status === "number" && error.status >= 500) ||
    msg.includes("fetch") ||
    msg.includes("network") ||
    msg.includes("timeout") ||
    msg.includes("unavailable")
  );
}

export function mapCategoryRow(row: CategoryRow): CatalogCategoryItem {
  return {
    id: row.id,
    slug: row.slug,
    name_en: row.name_en,
    name_pt: row.name_pt,
    description_en: row.description_en ?? "",
    description_pt: row.description_pt ?? "",
    code: row.slug.slice(0, 4).toUpperCase(),
    accent: "cyan",
    sortOrder: row.sort_order,
  };
}

export function mapResourceRow(
  row: ResourceRow,
  categorySlugById?: Map<string, string>
): CatalogResourceItem {
  const categorySlug =
    categorySlugById?.get(row.category_id) ?? row.category_id;
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description_pt: row.description,
    description_en: row.description,
    categoryId: row.category_id,
    categorySlug,
    type: row.type,
    url: row.url,
    language: (row.language as ResourceLanguage) || "en",
    difficulty: row.difficulty ?? undefined,
    authorName: row.author_name ?? "",
    publishedAt: (row.published_at ?? row.created_at ?? "").slice(0, 10),
    createdAt: row.created_at,
    submittedBy: row.submitted_by,
    status: row.status as ResourceStatus,
    pricingModel: row.pricing_model ?? null,
    requiresCreditCard: row.requires_credit_card ?? null,
    freeTierLimits: row.free_tier_limits ?? null,
    pricingNotes: row.pricing_notes ?? null,
    tags: Array.isArray(row.tags) ? row.tags : [],
    courseMetadata: parseCourseMetadata(row.course_metadata),
  };
}

export async function fetchCatalogCategories(options?: {
  client?: CatalogSupabaseClientLike;
}): Promise<{ status: "success" | "error"; categories: CatalogCategoryItem[] }> {
  try {
    const supabase = options?.client ?? createClient();
    const { data, error } = await supabase
      .from("categories")
      .select(CATEGORY_SELECT_COLUMNS)
      .eq("is_active", true)
      .in("scope", ["resource", "both"])
      .order("sort_order", { ascending: true });

    if (error || !Array.isArray(data)) {
      return { status: "error", categories: [] };
    }

    return {
      status: "success",
      categories: (data as CategoryRow[]).map(mapCategoryRow),
    };
  } catch {
    return { status: "error", categories: [] };
  }
}

export async function queryCatalogResources(
  params: CatalogQueryParams,
  options?: {
    categories?: CatalogCategoryItem[];
    client?: CatalogSupabaseClientLike;
  }
): Promise<CatalogQueryResult> {
  const pageSize = Math.max(1, Math.min(params.pageSize ?? 9, 50));
  const page = Math.max(1, params.page ?? 1);

  try {
    const supabase = options?.client ?? createClient();
    let categories = options?.categories;
    if (!categories) {
      const catRes = await fetchCatalogCategories({ client: supabase });
      categories = catRes.categories;
    }

    const categoryBySlug = new Map(categories.map((c) => [c.slug, c]));
    const categorySlugById = new Map(categories.map((c) => [c.id, c.slug]));

    if (params.onlyBookmarks) {
      const ids = params.bookmarkedIds ?? [];
      if (ids.length === 0) {
        return {
          status: "success",
          items: [],
          totalCount: 0,
          page: 1,
          pageSize,
          totalPages: 1,
        };
      }
    }

    if (
      params.categorySlug &&
      params.categorySlug !== "all" &&
      !categoryBySlug.has(params.categorySlug)
    ) {
      return {
        status: "success",
        items: [],
        totalCount: 0,
        page: 1,
        pageSize,
        totalPages: 1,
      };
    }

    let query = supabase
      .from("resources")
      .select(RESOURCE_SELECT_COLUMNS, { count: "exact" })
      .eq("status", "approved");

    if (params.categorySlug && params.categorySlug !== "all") {
      const cat = categoryBySlug.get(params.categorySlug);
      if (cat) {
        query = query.eq("category_id", cat.id);
      }
    } else if (params.excludeCategorySlug) {
      const excluded = categoryBySlug.get(params.excludeCategorySlug);
      if (excluded) {
        query = query.neq("category_id", excluded.id);
      }
    }

    if (params.type && params.type !== "all") {
      query = query.eq("type", params.type);
    }

    if (params.difficulty && params.difficulty !== "all") {
      query = query.eq("difficulty", params.difficulty);
    }

    if (params.language && params.language !== "all") {
      query = query.eq("language", params.language);
    }

    if (params.onlyBookmarks && params.bookmarkedIds) {
      query = query.in("id", params.bookmarkedIds);
    }

    const sanitizedSearch = params.search ? sanitizeIlikeTerm(params.search) : "";
    if (sanitizedSearch) {
      query = query.or(
        `name.ilike.%${sanitizedSearch}%,description.ilike.%${sanitizedSearch}%,author_name.ilike.%${sanitizedSearch}%`
      );
    }

    if (params.sortBy === "alphabetical") {
      query = query.order("name", { ascending: true });
    } else {
      query = query
        .order("published_at", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false });
    }

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data, count, error } = await query;

    if (error) {
      return {
        status: "error",
        items: [],
        totalCount: 0,
        page,
        pageSize,
        totalPages: 1,
        errorMessage: error.message || "Failed to load catalog resources.",
      };
    }

    const totalCount = typeof count === "number" ? count : (data?.length ?? 0);
    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
    const items = ((data ?? []) as ResourceRow[]).map((row) =>
      mapResourceRow(row, categorySlugById)
    );

    return {
      status: "success",
      items,
      totalCount,
      page: Math.min(page, totalPages),
      pageSize,
      totalPages,
    };
  } catch {
    return {
      status: "error",
      items: [],
      totalCount: 0,
      page,
      pageSize,
      totalPages: 1,
      errorMessage: "Connection error while loading catalog.",
    };
  }
}

export async function fetchCatalogResourceBySlug(
  slug: string,
  options?: { client?: CatalogSupabaseClientLike }
): Promise<CatalogDetailResult> {
  const cleanSlug = slug.trim();
  if (!cleanSlug) {
    return { status: "not_found", resource: null, category: null, related: [] };
  }

  try {
    const supabase = options?.client ?? createClient();
    const [{ categories }, { data, error }] = await Promise.all([
      fetchCatalogCategories({ client: supabase }),
      supabase
        .from("resources")
        .select(RESOURCE_SELECT_COLUMNS)
        .eq("slug", cleanSlug)
        .maybeSingle(),
    ]);

    if (error) {
      return {
        status: "error",
        resource: null,
        category: null,
        related: [],
        errorMessage: error.message,
      };
    }

    if (!data) {
      return { status: "not_found", resource: null, category: null, related: [] };
    }

    const categoryById = new Map(categories.map((c) => [c.id, c]));
    const categorySlugById = new Map(categories.map((c) => [c.id, c.slug]));
    const resource = mapResourceRow(data as ResourceRow, categorySlugById);
    const category = categoryById.get(resource.categoryId) ?? null;

    const { data: relatedData } = await supabase
      .from("resources")
      .select(RESOURCE_SELECT_COLUMNS)
      .eq("status", "approved")
      .eq("category_id", resource.categoryId)
      .neq("id", resource.id)
      .order("published_at", { ascending: false, nullsFirst: false })
      .limit(3);

    const related = Array.isArray(relatedData)
      ? (relatedData as ResourceRow[]).map((row) =>
          mapResourceRow(row, categorySlugById)
        )
      : [];

    return {
      status: "found",
      resource,
      category,
      related,
    };
  } catch {
    return {
      status: "error",
      resource: null,
      category: null,
      related: [],
      errorMessage: "Connection error while loading resource.",
    };
  }
}

export async function fetchUserBookmarks(options?: {
  client?: CatalogSupabaseClientLike;
}): Promise<BookmarksReadResult> {
  try {
    const supabase = options?.client ?? createClient();
    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData.user) {
      return {
        status: "unauthenticated",
        bookmarkedIds: [],
        bookmarkedSlugs: [],
        items: [],
      };
    }

    const [{ categories }, { data: bookmarkRows, error: bmError }] =
      await Promise.all([
        fetchCatalogCategories({ client: supabase }),
        supabase
          .from("bookmarks")
          .select("resource_id, created_at")
          .eq("user_id", userData.user.id)
          .order("created_at", { ascending: false }),
      ]);

    if (bmError) {
      return {
        status: "error",
        bookmarkedIds: [],
        bookmarkedSlugs: [],
        items: [],
        errorMessage: bmError.message,
      };
    }

    const resourceIds = ((bookmarkRows ?? []) as BookmarkRow[]).map(
      (b) => b.resource_id
    );

    if (resourceIds.length === 0) {
      return {
        status: "authenticated",
        bookmarkedIds: [],
        bookmarkedSlugs: [],
        items: [],
      };
    }

    const { data: resRows, error: resError } = await supabase
      .from("resources")
      .select(RESOURCE_SELECT_COLUMNS)
      .eq("status", "approved")
      .in("id", resourceIds);

    if (resError) {
      return {
        status: "error",
        bookmarkedIds: resourceIds,
        bookmarkedSlugs: [],
        items: [],
        errorMessage: resError.message,
      };
    }

    const categorySlugById = new Map(categories.map((c) => [c.id, c.slug]));
    const rowById = new Map(
      ((resRows ?? []) as ResourceRow[]).map((r) => [
        r.id,
        mapResourceRow(r, categorySlugById),
      ])
    );

    // Preserve bookmark created_at descending order
    const items: CatalogResourceItem[] = [];
    for (const id of resourceIds) {
      const mapped = rowById.get(id);
      if (mapped) {
        items.push(mapped);
      }
    }

    return {
      status: "authenticated",
      bookmarkedIds: items.map((item) => item.id),
      bookmarkedSlugs: items.map((item) => item.slug),
      items,
    };
  } catch {
    return {
      status: "error",
      bookmarkedIds: [],
      bookmarkedSlugs: [],
      items: [],
      errorMessage: "Connection error while loading bookmarks.",
    };
  }
}

function getBookmarkErrorMessage(
  code: BookmarkMutationErrorCode,
  locale: SupportedLocale
): string {
  const isPt = locale === "pt-BR";
  switch (code) {
    case "unauthenticated":
      return isPt
        ? "Faça login para salvar recursos nos seus favoritos."
        : "Sign in to save resources to your bookmarks.";
    case "rls_denied":
      return isPt
        ? "Ação não permitida pela política de segurança (conta suspensa ou sem permissão)."
        : "Action denied by security policy (suspended or unauthorized account).";
    case "not_approved":
      return isPt
        ? "Apenas recursos aprovados podem ser favoritados."
        : "Only approved resources can be bookmarked.";
    case "connection_error":
      return isPt
        ? "Erro de conexão ao atualizar favoritos. Tente novamente."
        : "Connection error while updating bookmarks. Please try again.";
    case "mutation_failed":
      return isPt
        ? "Não foi possível atualizar seus favoritos."
        : "Could not update your bookmarks.";
  }
}

export async function toggleUserBookmark(
  resourceId: string,
  currentlyBookmarked: boolean,
  options: {
    locale: SupportedLocale;
    client?: CatalogSupabaseClientLike;
  }
): Promise<BookmarkMutationResult> {
  if (!resourceId) {
    return {
      status: "error",
      errorCode: "mutation_failed",
      message: getBookmarkErrorMessage("mutation_failed", options.locale),
    };
  }

  try {
    const supabase = options.client ?? createClient();
    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData.user) {
      return {
        status: "error",
        errorCode: "unauthenticated",
        message: getBookmarkErrorMessage("unauthenticated", options.locale),
      };
    }

    if (currentlyBookmarked) {
      const { error } = await supabase
        .from("bookmarks")
        .delete()
        .eq("user_id", userData.user.id)
        .eq("resource_id", resourceId);

      if (error) {
        const code: BookmarkMutationErrorCode = isRlsOrPermissionError(error)
          ? "rls_denied"
          : isNetworkError(error)
          ? "connection_error"
          : "mutation_failed";
        return {
          status: "error",
          errorCode: code,
          message: getBookmarkErrorMessage(code, options.locale),
        };
      }

      return { status: "success", bookmarked: false, resourceId };
    }

    // Insert relies on PostgreSQL default `user_id = auth.uid()` and RLS `bookmarks_insert`
    const { error } = await supabase
      .from("bookmarks")
      .insert({ resource_id: resourceId });

    if (error) {
      // Unique constraint (23505) means already bookmarked: treat idempotently
      if (error.code === "23505") {
        return { status: "success", bookmarked: true, resourceId };
      }
      const code: BookmarkMutationErrorCode = isRlsOrPermissionError(error)
        ? "rls_denied"
        : isNetworkError(error)
        ? "connection_error"
        : "mutation_failed";
      return {
        status: "error",
        errorCode: code,
        message: getBookmarkErrorMessage(code, options.locale),
      };
    }

    return { status: "success", bookmarked: true, resourceId };
  } catch {
    return {
      status: "error",
      errorCode: "connection_error",
      message: getBookmarkErrorMessage("connection_error", options.locale),
    };
  }
}

export async function clearUserBookmarks(options: {
  locale: SupportedLocale;
  client?: CatalogSupabaseClientLike;
}): Promise<{ status: "success" | "error"; message?: string }> {
  try {
    const supabase = options.client ?? createClient();
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      return {
        status: "error",
        message: getBookmarkErrorMessage("unauthenticated", options.locale),
      };
    }

    const { error } = await supabase
      .from("bookmarks")
      .delete()
      .eq("user_id", userData.user.id);

    if (error) {
      const code: BookmarkMutationErrorCode = isRlsOrPermissionError(error)
        ? "rls_denied"
        : isNetworkError(error)
        ? "connection_error"
        : "mutation_failed";
      return {
        status: "error",
        message: getBookmarkErrorMessage(code, options.locale),
      };
    }

    return { status: "success" };
  } catch {
    return {
      status: "error",
      message: getBookmarkErrorMessage("connection_error", options.locale),
    };
  }
}

/**
 * Safely migrates legacy localStorage bookmark slugs (`cybersec_bookmarks`)
 * for the currently authenticated user only, resolving against approved DB
 * resources and skipping duplicates.
 */
export async function migrateLegacyLocalBookmarks(
  legacySlugs: string[],
  options?: { client?: CatalogSupabaseClientLike }
): Promise<{ migratedCount: number; completed: boolean }> {
  const cleanSlugs = Array.from(
    new Set(
      legacySlugs
        .map((s) => (typeof s === "string" ? s.trim() : ""))
        .filter(Boolean)
    )
  ).slice(0, 50);

  if (cleanSlugs.length === 0) {
    return { migratedCount: 0, completed: true };
  }

  try {
    const supabase = options?.client ?? createClient();
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      return { migratedCount: 0, completed: false };
    }

    const { data: approvedRows, error: resError } = await supabase
      .from("resources")
      .select("id, slug")
      .eq("status", "approved")
      .in("slug", cleanSlugs);

    if (resError || !Array.isArray(approvedRows)) {
      return { migratedCount: 0, completed: false };
    }

    if (approvedRows.length === 0) {
      return { migratedCount: 0, completed: true };
    }

    const { data: existingRows, error: existingError } = await supabase
      .from("bookmarks")
      .select("resource_id")
      .eq("user_id", userData.user.id);

    if (existingError) {
      return { migratedCount: 0, completed: false };
    }

    const existingSet = new Set(
      ((existingRows ?? []) as { resource_id: string }[]).map(
        (r) => r.resource_id
      )
    );

    const toInsert = (approvedRows as { id: string }[])
      .map((r) => r.id)
      .filter((id) => !existingSet.has(id));

    if (toInsert.length === 0) {
      return { migratedCount: 0, completed: true };
    }

    const { error: insertError } = await supabase
      .from("bookmarks")
      .insert(toInsert.map((resource_id) => ({ resource_id })));

    if (insertError && insertError.code !== "23505") {
      return { migratedCount: 0, completed: false };
    }

    return { migratedCount: toInsert.length, completed: true };
  } catch {
    return { migratedCount: 0, completed: false };
  }
}

/**
 * Submits a new resource to `public.resources` respecting PostgreSQL column-level
 * grants (`name, description, category_id, type, url, language, difficulty, author_name`)
 * and RLS (`submitted_by = auth.uid()`, `status = 'pending'`).
 */
export async function submitCatalogResource(
  payload: ResourceSubmissionPayload,
  options: {
    locale: SupportedLocale;
    client?: CatalogSupabaseClientLike;
  }
): Promise<ResourceSubmissionResult> {
  const isPt = options.locale === "pt-BR";

  // Reject any attempt to inject privileged/server-owned columns
  const rawPayload = payload as unknown as Record<string, unknown>;
  for (const forbidden of FORBIDDEN_RESOURCE_INSERT_KEYS) {
    if (Object.prototype.hasOwnProperty.call(rawPayload, forbidden)) {
      return {
        status: "error",
        errorCode: "rls_denied",
        message: isPt
          ? "Campos privilegiados (status, slug, autoria) não podem ser definidos pelo cliente."
          : "Privileged fields (status, slug, ownership) cannot be set by the client.",
      };
    }
  }

  const fieldErrors: NonNullable<
    Extract<ResourceSubmissionResult, { status: "error" }>["fieldErrors"]
  > = {};

  const trimmedName = payload.name.trim();
  if (trimmedName.length < 2 || trimmedName.length > 120) {
    fieldErrors.name = isPt
      ? "O nome deve ter entre 2 e 120 caracteres."
      : "Name must be between 2 and 120 characters.";
  }

  const trimmedDesc = payload.description.trim();
  if (trimmedDesc.length < 10 || trimmedDesc.length > 2000) {
    fieldErrors.description = isPt
      ? "A descrição deve ter entre 10 e 2000 caracteres."
      : "Description must be between 10 and 2000 characters.";
  }

  const trimmedUrl = payload.url.trim();
  if (!isSafeExternalUrl(trimmedUrl) || trimmedUrl.length > 2048) {
    fieldErrors.url = isPt
      ? "Informe uma URL HTTP/HTTPS válida (máx. 2048 caracteres)."
      : "Enter a valid HTTP/HTTPS URL (max 2048 characters).";
  }

  if (!payload.categoryId || !payload.categoryId.trim()) {
    fieldErrors.categorySlug = isPt
      ? "Selecione uma categoria válida."
      : "Select a valid category.";
  }

  const trimmedAuthor = (payload.authorName ?? "").trim();
  if (trimmedAuthor.length > 120) {
    fieldErrors.authorName = isPt
      ? "O nome do autor deve ter no máximo 120 caracteres."
      : "Author name must be at most 120 characters.";
  }

  if (!isValidPricingModel(payload.pricingModel)) {
    fieldErrors.pricingModel = isPt
      ? "Selecione um modelo de preço válido (Grátis, Freemium ou Pago)."
      : "Select a valid pricing model (Free, Freemium, or Paid).";
  }

  if (!isValidCreditCardRequirement(payload.requiresCreditCard)) {
    fieldErrors.requiresCreditCard = isPt
      ? "Informe uma opção válida para exigência de cartão de crédito."
      : "Select a valid credit card requirement option.";
  }

  const trimmedFreeLimits = (payload.freeTierLimits ?? "").trim();
  if (trimmedFreeLimits.length > 1000) {
    fieldErrors.freeTierLimits = isPt
      ? "As limitações do plano gratuito devem ter no máximo 1000 caracteres."
      : "Free tier limits must be at most 1000 characters.";
  }

  const trimmedPricingNotes = (payload.pricingNotes ?? "").trim();
  if (trimmedPricingNotes.length > 500) {
    fieldErrors.pricingNotes = isPt
      ? "As informações adicionais de preço devem ter no máximo 500 caracteres."
      : "Additional pricing notes must be at most 500 characters.";
  }

  const optionalTagsCheck = filterValidOptionalTags(payload.optionalTags);
  if (!optionalTagsCheck.valid) {
    fieldErrors.optionalTags = isPt
      ? "Tags complementares inválidas."
      : "Invalid complementary tags.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      status: "error",
      errorCode: "validation_error",
      message: isPt
        ? "Verifique os campos destacados antes de enviar."
        : "Please review the highlighted fields before submitting.",
      fieldErrors,
    };
  }

  try {
    const supabase = options.client ?? createClient();
    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData.user) {
      return {
        status: "error",
        errorCode: "unauthenticated",
        message: isPt
          ? "Você precisa estar autenticado para submeter recursos."
          : "You must be signed in to submit resources.",
      };
    }

    const normalizedUrl = normalizeResourceUrl(trimmedUrl);
    const computedTags = computeResourceTags(
      payload.pricingModel,
      payload.requiresCreditCard,
      optionalTagsCheck.sanitized
    );

    // Strictly send ONLY columns granted to `authenticated` (slug/status set by DB)
    const insertRow: Omit<ResourceInsertRow, "slug"> & { slug?: string } = {
      name: trimmedName,
      description: trimmedDesc,
      category_id: payload.categoryId.trim(),
      type: payload.type,
      url: normalizedUrl,
      language: payload.language,
      difficulty: payload.difficulty || null,
      author_name: trimmedAuthor || null,
      pricing_model: payload.pricingModel,
      requires_credit_card: payload.requiresCreditCard,
      free_tier_limits: trimmedFreeLimits || null,
      pricing_notes: trimmedPricingNotes || null,
      tags: computedTags,
    };

    const { data, error } = await supabase
      .from("resources")
      .insert(insertRow)
      .select(RESOURCE_SELECT_COLUMNS)
      .maybeSingle();

    if (error) {
      const code = (error.code ?? "").toLowerCase();
      const msg = (error.message ?? "").toLowerCase();

      if (code === "23505" || msg.includes("duplicate key")) {
        return {
          status: "error",
          errorCode: "duplicate_url",
          message: isPt
            ? "Esta URL já foi submetida ou já existe no catálogo."
            : "This URL has already been submitted or exists in the catalog.",
          fieldErrors: {
            url: isPt
              ? "Esta URL já existe no catálogo."
              : "This URL already exists in the catalog.",
          },
        };
      }

      if (isRlsOrPermissionError(error)) {
        return {
          status: "error",
          errorCode: "rls_denied",
          message: isPt
            ? "Submissão bloqueada pela política de segurança (conta suspensa ou categoria inválida)."
            : "Submission blocked by security policy (suspended account or invalid category).",
        };
      }

      if (code === "23503") {
        return {
          status: "error",
          errorCode: "invalid_category",
          message: isPt
            ? "Categoria selecionada não é válida."
            : "Selected category is not valid.",
        };
      }

      if (code === "23514" || code === "22001") {
        return {
          status: "error",
          errorCode: "validation_error",
          message: isPt
            ? "Os dados enviados violam as restrições do banco."
            : "Submitted data violates database constraints.",
        };
      }

      if (isNetworkError(error)) {
        return {
          status: "error",
          errorCode: "connection_error",
          message: isPt
            ? "Erro de conexão ao enviar recurso. Tente novamente."
            : "Connection error while submitting resource. Please try again.",
        };
      }

      return {
        status: "error",
        errorCode: "insert_failed",
        message: isPt
          ? "Não foi possível enviar o recurso. Tente novamente."
          : "Could not submit the resource. Please try again.",
      };
    }

    if (!data) {
      return {
        status: "error",
        errorCode: "rls_denied",
        message: isPt
          ? "Submissão não confirmada pela política de segurança."
          : "Submission could not be confirmed by security policy.",
      };
    }

    return {
      status: "success",
      resource: mapResourceRow(data as ResourceRow),
    };
  } catch {
    return {
      status: "error",
      errorCode: "connection_error",
      message: isPt
        ? "Erro de conexão ao enviar recurso. Tente novamente."
        : "Connection error while submitting resource. Please try again.",
    };
  }
}
