import type { CategoryItem } from "@/config/site";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database.types";
import { parseTagsString, TAG_REGEX } from "./validation";

export type ForumCategoryRow = Database["public"]["Tables"]["categories"]["Row"];
export type ForumTopicRow = Database["public"]["Tables"]["topics"]["Row"];
export type ForumPostRow = Database["public"]["Tables"]["posts"]["Row"];
export type ForumTagRow = Database["public"]["Tables"]["tags"]["Row"];

export interface ForumSupabaseError {
  message?: string;
  code?: string;
  status?: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ForumSupabaseClientLike = any;

export const FORUM_CATEGORY_SELECT_COLUMNS =
  "id, slug, name_en, name_pt, description_en, description_pt, scope, sort_order, is_active";

export const FORUM_TOPIC_SELECT_COLUMNS =
  "id, author_id, category_id, title, body, status, is_pinned, is_locked, accepted_post_id, last_activity_at, created_at, updated_at";

export const FORUM_POST_SELECT_COLUMNS =
  "id, topic_id, author_id, body, status, vote_count, created_at, updated_at";

export const FORUM_TAG_SELECT_COLUMNS = "id, slug, name";

export const FORUM_PUBLIC_PROFILE_SELECT_COLUMNS =
  "id, username, display_name, avatar_url";

const FORBIDDEN_TOPIC_MUTATION_KEYS = [
  "id",
  "author_id",
  "status",
  "is_pinned",
  "is_locked",
  "accepted_post_id",
  "last_activity_at",
  "created_at",
  "updated_at",
  "search_vector",
] as const;

const FORBIDDEN_POST_INSERT_KEYS = [
  "id",
  "author_id",
  "status",
  "vote_count",
  "created_at",
  "updated_at",
] as const;

const FORBIDDEN_POST_UPDATE_KEYS = [
  ...FORBIDDEN_POST_INSERT_KEYS,
  "topic_id",
] as const;

export interface ForumCategoryItem extends CategoryItem {
  id: string;
  sortOrder: number;
}

export interface ForumTagItem {
  id: string;
  slug: string;
  name: string;
}

export interface ForumTopicItem {
  id: string;
  categoryId: string;
  categorySlug: string;
  authorId: string | null;
  authorUsername: string;
  authorDisplayName?: string;
  authorAvatarUrl?: string | null;
  authorRole: "member";
  title: string;
  body: string;
  tags: string[];
  isPinned: boolean;
  isLocked: boolean;
  acceptedPostId: string | null;
  replyCount: number;
  status: "published" | "hidden" | "deleted";
  createdAt: string;
  updatedAt: string;
  lastActivityAt: string;
}

export interface ForumPostItem {
  id: string;
  topicId: string;
  authorId: string | null;
  authorUsername: string;
  authorDisplayName?: string;
  authorAvatarUrl?: string | null;
  authorRole: "member";
  body: string;
  voteCount: number;
  isAcceptedSolution: boolean;
  status: "published" | "hidden" | "deleted";
  createdAt: string;
  updatedAt: string;
}

export type ForumTabFilter = "all" | "unanswered" | "solved";
export type ForumSortBy = "activity" | "newest";

export interface ForumTopicsQueryParams {
  search?: string;
  categorySlug?: string;
  tag?: string;
  tab?: ForumTabFilter;
  sortBy?: ForumSortBy;
  page?: number;
  pageSize?: number;
}

export interface ForumTopicsQueryResult {
  status: "success" | "error";
  items: ForumTopicItem[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  errorMessage?: string;
}

export interface ForumTopicDetailResult {
  status: "found" | "not_found" | "error";
  topic: ForumTopicItem | null;
  posts: ForumPostItem[];
  votedPostIds: string[];
  errorMessage?: string;
}

export type ForumMutationErrorCode =
  | "unauthenticated"
  | "rls_denied"
  | "not_found"
  | "locked"
  | "validation_error"
  | "duplicate"
  | "connection_error"
  | "mutation_failed";

export type ForumTopicMutationResult =
  | {
      status: "success";
      topic: ForumTopicItem;
    }
  | {
      status: "error";
      errorCode: ForumMutationErrorCode;
      message: string;
    };

export type ForumPostMutationResult =
  | {
      status: "success";
      post: ForumPostItem;
    }
  | {
      status: "error";
      errorCode: ForumMutationErrorCode;
      message: string;
    };

export type ForumVoteMutationResult =
  | {
      status: "success";
      postId: string;
      voted: boolean;
      voteCount: number;
    }
  | {
      status: "error";
      errorCode: ForumMutationErrorCode;
      message: string;
    };

export type ForumAcceptPostResult =
  | {
      status: "success";
      topicId: string;
      acceptedPostId: string | null;
    }
  | {
      status: "error";
      errorCode: ForumMutationErrorCode;
      message: string;
    };

function getClient(override?: ForumSupabaseClientLike): ForumSupabaseClientLike {
  return override ?? createClient();
}

function sanitizeIlikeTerm(term: string): string {
  return term
    .trim()
    .replace(/[%_\\]/g, "\\$&")
    .replace(/[(),]/g, " ")
    .slice(0, 100);
}

function isRlsOrPermissionError(error: ForumSupabaseError): boolean {
  const code = (error.code ?? "").toLowerCase();
  const msg = (error.message ?? "").toLowerCase();
  return (
    code === "42501" ||
    code === "pgrst301" ||
    error.status === 401 ||
    error.status === 403 ||
    msg.includes("row-level security") ||
    msg.includes("permission denied") ||
    msg.includes("forbidden")
  );
}

function hasForbiddenKeys(
  payload: Record<string, unknown>,
  forbiddenKeys: readonly string[]
): string[] {
  return forbiddenKeys.filter((key) =>
    Object.prototype.hasOwnProperty.call(payload, key)
  );
}

function isValidUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value
  );
}

interface PublicProfileMeta {
  username: string;
  displayName?: string;
  avatarUrl?: string | null;
}

async function fetchPublicProfilesMap(
  supabase: ForumSupabaseClientLike,
  authorIds: Array<string | null | undefined>
): Promise<Map<string, PublicProfileMeta>> {
  const uniqueIds = Array.from(
    new Set(
      authorIds.filter((id): id is string => typeof id === "string" && id.length > 0)
    )
  );
  const map = new Map<string, PublicProfileMeta>();
  if (uniqueIds.length === 0) {
    return map;
  }

  const { data, error } = await supabase
    .from("public_profiles")
    .select(FORUM_PUBLIC_PROFILE_SELECT_COLUMNS)
    .in("id", uniqueIds);

  if (error || !Array.isArray(data)) {
    return map;
  }

  for (const row of data) {
    if (row?.id && row?.username) {
      map.set(row.id, {
        username: row.username,
        displayName: row.display_name ?? undefined,
        avatarUrl: row.avatar_url ?? null,
      });
    }
  }

  return map;
}

async function fetchTagsByTopicIds(
  supabase: ForumSupabaseClientLike,
  topicIds: string[]
): Promise<Map<string, string[]>> {
  const map = new Map<string, string[]>();
  if (topicIds.length === 0) {
    return map;
  }

  const { data: topicTagRows, error: ttError } = await supabase
    .from("topic_tags")
    .select("topic_id, tag_id")
    .in("topic_id", topicIds);

  if (ttError || !Array.isArray(topicTagRows) || topicTagRows.length === 0) {
    return map;
  }

  const tagIds = Array.from(
    new Set(
      topicTagRows
        .map((r: { tag_id?: string }) => r.tag_id)
        .filter((id): id is string => typeof id === "string" && id.length > 0)
    )
  );

  if (tagIds.length === 0) {
    return map;
  }

  const { data: tagRows, error: tError } = await supabase
    .from("tags")
    .select(FORUM_TAG_SELECT_COLUMNS)
    .in("id", tagIds);

  if (tError || !Array.isArray(tagRows)) {
    return map;
  }

  const tagSlugById = new Map<string, string>();
  for (const tag of tagRows) {
    if (tag?.id && tag?.slug) {
      tagSlugById.set(tag.id, tag.slug);
    }
  }

  for (const row of topicTagRows) {
    const slug = tagSlugById.get(row.tag_id);
    if (!slug) continue;
    const list = map.get(row.topic_id) ?? [];
    if (!list.includes(slug)) {
      list.push(slug);
      map.set(row.topic_id, list);
    }
  }

  return map;
}

async function fetchReplyCountsByTopicIds(
  supabase: ForumSupabaseClientLike,
  topicIds: string[]
): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (topicIds.length === 0) {
    return map;
  }

  const { data, error } = await supabase
    .from("posts")
    .select("topic_id")
    .eq("status", "published")
    .in("topic_id", topicIds);

  if (error || !Array.isArray(data)) {
    return map;
  }

  for (const row of data) {
    if (row?.topic_id) {
      map.set(row.topic_id, (map.get(row.topic_id) ?? 0) + 1);
    }
  }

  return map;
}

export function mapForumCategoryRow(row: ForumCategoryRow): ForumCategoryItem {
  return {
    id: row.id,
    slug: row.slug,
    code: row.slug.slice(0, 3).toUpperCase(),
    accent: "cyan",
    name_pt: row.name_pt,
    name_en: row.name_en,
    description_pt: row.description_pt ?? "",
    description_en: row.description_en ?? "",
    sortOrder: row.sort_order,
  };
}

function mapTopicRow(
  row: Omit<ForumTopicRow, "search_vector">,
  categorySlugById: Map<string, string>,
  profilesById: Map<string, PublicProfileMeta>,
  tagsByTopicId: Map<string, string[]>,
  replyCountByTopicId: Map<string, number>
): ForumTopicItem {
  const profile = row.author_id ? profilesById.get(row.author_id) : undefined;
  return {
    id: row.id,
    categoryId: row.category_id,
    categorySlug: categorySlugById.get(row.category_id) ?? "geral",
    authorId: row.author_id,
    authorUsername: profile?.username ?? "membro",
    authorDisplayName: profile?.displayName,
    authorAvatarUrl: profile?.avatarUrl ?? null,
    authorRole: "member",
    title: row.title,
    body: row.body,
    tags: tagsByTopicId.get(row.id) ?? [],
    isPinned: row.is_pinned,
    isLocked: row.is_locked,
    acceptedPostId: row.accepted_post_id,
    replyCount: replyCountByTopicId.get(row.id) ?? 0,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastActivityAt: row.last_activity_at,
  };
}

function mapPostRow(
  row: ForumPostRow,
  acceptedPostId: string | null,
  profilesById: Map<string, PublicProfileMeta>
): ForumPostItem {
  const profile = row.author_id ? profilesById.get(row.author_id) : undefined;
  return {
    id: row.id,
    topicId: row.topic_id,
    authorId: row.author_id,
    authorUsername: profile?.username ?? "membro",
    authorDisplayName: profile?.displayName,
    authorAvatarUrl: profile?.avatarUrl ?? null,
    authorRole: "member",
    body: row.body,
    voteCount: row.vote_count,
    isAcceptedSolution: acceptedPostId === row.id,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function fetchForumCategories(options?: {
  client?: ForumSupabaseClientLike;
}): Promise<{
  status: "success" | "error";
  categories: ForumCategoryItem[];
  errorMessage?: string;
}> {
  try {
    const supabase = getClient(options?.client);
    const { data, error } = await supabase
      .from("categories")
      .select(FORUM_CATEGORY_SELECT_COLUMNS)
      .eq("is_active", true)
      .in("scope", ["forum", "both"])
      .order("sort_order", { ascending: true });

    if (error) {
      return {
        status: "error",
        categories: [],
        errorMessage: error.message ?? "Failed to fetch forum categories.",
      };
    }

    const rows = Array.isArray(data) ? (data as ForumCategoryRow[]) : [];
    return {
      status: "success",
      categories: rows.map(mapForumCategoryRow),
    };
  } catch (err) {
    return {
      status: "error",
      categories: [],
      errorMessage:
        err instanceof Error ? err.message : "Failed to fetch forum categories.",
    };
  }
}

export async function fetchForumTags(options?: {
  client?: ForumSupabaseClientLike;
}): Promise<{
  status: "success" | "error";
  tags: ForumTagItem[];
  errorMessage?: string;
}> {
  try {
    const supabase = getClient(options?.client);
    const { data, error } = await supabase
      .from("tags")
      .select(FORUM_TAG_SELECT_COLUMNS)
      .order("slug", { ascending: true });

    if (error) {
      return {
        status: "error",
        tags: [],
        errorMessage: error.message ?? "Failed to fetch forum tags.",
      };
    }

    const rows = Array.isArray(data) ? (data as ForumTagRow[]) : [];
    return {
      status: "success",
      tags: rows.map((r) => ({ id: r.id, slug: r.slug, name: r.name })),
    };
  } catch (err) {
    return {
      status: "error",
      tags: [],
      errorMessage:
        err instanceof Error ? err.message : "Failed to fetch forum tags.",
    };
  }
}

export async function queryForumTopics(
  params: ForumTopicsQueryParams = {},
  options?: {
    categories?: ForumCategoryItem[];
    client?: ForumSupabaseClientLike;
  }
): Promise<ForumTopicsQueryResult> {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.max(1, Math.min(50, params.pageSize ?? 8));

  try {
    const supabase = getClient(options?.client);

    let categories = options?.categories;
    if (!categories || categories.length === 0) {
      const catResult = await fetchForumCategories({ client: supabase });
      if (catResult.status === "error") {
        return {
          status: "error",
          items: [],
          totalCount: 0,
          page,
          pageSize,
          totalPages: 1,
          errorMessage: catResult.errorMessage,
        };
      }
      categories = catResult.categories;
    }

    const categorySlugById = new Map(categories.map((c) => [c.id, c.slug]));
    const categoryIdBySlug = new Map(categories.map((c) => [c.slug, c.id]));

    let tagTopicIds: string[] | null = null;
    if (params.tag && params.tag.trim()) {
      const normalizedSlug = params.tag.trim().toLowerCase();
      const { data: tagRow, error: tagErr } = await supabase
        .from("tags")
        .select("id")
        .eq("slug", normalizedSlug)
        .maybeSingle();

      if (tagErr) {
        return {
          status: "error",
          items: [],
          totalCount: 0,
          page,
          pageSize,
          totalPages: 1,
          errorMessage: tagErr.message ?? "Failed to filter by tag.",
        };
      }

      if (!tagRow?.id) {
        return {
          status: "success",
          items: [],
          totalCount: 0,
          page: 1,
          pageSize,
          totalPages: 1,
        };
      }

      const { data: ttRows, error: ttErr } = await supabase
        .from("topic_tags")
        .select("topic_id")
        .eq("tag_id", tagRow.id);

      if (ttErr) {
        return {
          status: "error",
          items: [],
          totalCount: 0,
          page,
          pageSize,
          totalPages: 1,
          errorMessage: ttErr.message ?? "Failed to filter by tag.",
        };
      }

      tagTopicIds = Array.isArray(ttRows)
        ? ttRows.map((r: { topic_id: string }) => r.topic_id)
        : [];

      if (tagTopicIds.length === 0) {
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

    let answeredTopicIds: string[] = [];
    if (params.tab === "unanswered") {
      const { data: postTopicRows, error: postTopicErr } = await supabase
        .from("posts")
        .select("topic_id")
        .eq("status", "published");

      if (postTopicErr) {
        return {
          status: "error",
          items: [],
          totalCount: 0,
          page,
          pageSize,
          totalPages: 1,
          errorMessage:
            postTopicErr.message ?? "Failed to filter unanswered topics.",
        };
      }

      answeredTopicIds = Array.from(
        new Set(
          (Array.isArray(postTopicRows) ? postTopicRows : [])
            .map((r: { topic_id?: string }) => r.topic_id)
            .filter((id): id is string => typeof id === "string" && id.length > 0)
        )
      );
    }

    let query = supabase
      .from("topics")
      .select(FORUM_TOPIC_SELECT_COLUMNS, { count: "exact" })
      .eq("status", "published");

    if (params.categorySlug && params.categorySlug !== "all") {
      const catId = categoryIdBySlug.get(params.categorySlug);
      if (!catId) {
        return {
          status: "success",
          items: [],
          totalCount: 0,
          page: 1,
          pageSize,
          totalPages: 1,
        };
      }
      query = query.eq("category_id", catId);
    }

    if (tagTopicIds !== null) {
      query = query.in("id", tagTopicIds);
    }

    if (params.tab === "solved") {
      query = query.not("accepted_post_id", "is", null);
    } else if (params.tab === "unanswered" && answeredTopicIds.length > 0) {
      query = query.not("id", "in", `(${answeredTopicIds.join(",")})`);
    }

    const safeSearch = params.search ? sanitizeIlikeTerm(params.search) : "";
    if (safeSearch) {
      query = query.or(
        `title.ilike.%${safeSearch}%,body.ilike.%${safeSearch}%`
      );
    }

    query = query.order("is_pinned", { ascending: false });
    if (params.sortBy === "newest") {
      query = query.order("created_at", { ascending: false });
    } else {
      query = query.order("last_activity_at", { ascending: false });
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
        errorMessage: error.message ?? "Failed to query forum topics.",
      };
    }

    const rows = Array.isArray(data)
      ? (data as Array<Omit<ForumTopicRow, "search_vector">>)
      : [];
    const totalCount = typeof count === "number" ? count : rows.length;
    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

    const topicIds = rows.map((r) => r.id);
    const [profilesById, tagsByTopicId, replyCountByTopicId] = await Promise.all([
      fetchPublicProfilesMap(
        supabase,
        rows.map((r) => r.author_id)
      ),
      fetchTagsByTopicIds(supabase, topicIds),
      fetchReplyCountsByTopicIds(supabase, topicIds),
    ]);

    const items = rows.map((row) =>
      mapTopicRow(
        row,
        categorySlugById,
        profilesById,
        tagsByTopicId,
        replyCountByTopicId
      )
    );

    return {
      status: "success",
      items,
      totalCount,
      page: Math.min(page, totalPages),
      pageSize,
      totalPages,
    };
  } catch (err) {
    return {
      status: "error",
      items: [],
      totalCount: 0,
      page,
      pageSize,
      totalPages: 1,
      errorMessage:
        err instanceof Error ? err.message : "Failed to query forum topics.",
    };
  }
}

export async function fetchForumTopicDetail(
  topicId: string,
  options?: {
    categories?: ForumCategoryItem[];
    client?: ForumSupabaseClientLike;
  }
): Promise<ForumTopicDetailResult> {
  if (!topicId || !isValidUuid(topicId)) {
    return {
      status: "not_found",
      topic: null,
      posts: [],
      votedPostIds: [],
    };
  }

  try {
    const supabase = getClient(options?.client);

    let categories = options?.categories;
    if (!categories || categories.length === 0) {
      const catResult = await fetchForumCategories({ client: supabase });
      if (catResult.status === "error") {
        return {
          status: "error",
          topic: null,
          posts: [],
          votedPostIds: [],
          errorMessage: catResult.errorMessage,
        };
      }
      categories = catResult.categories;
    }

    const categorySlugById = new Map(categories.map((c) => [c.id, c.slug]));

    const { data: topicData, error: topicError } = await supabase
      .from("topics")
      .select(FORUM_TOPIC_SELECT_COLUMNS)
      .eq("id", topicId)
      .eq("status", "published")
      .maybeSingle();

    if (topicError) {
      return {
        status: "error",
        topic: null,
        posts: [],
        votedPostIds: [],
        errorMessage: topicError.message ?? "Failed to load topic.",
      };
    }

    if (!topicData) {
      return {
        status: "not_found",
        topic: null,
        posts: [],
        votedPostIds: [],
      };
    }

    const topicRow = topicData as Omit<ForumTopicRow, "search_vector">;

    const { data: postsData, error: postsError } = await supabase
      .from("posts")
      .select(FORUM_POST_SELECT_COLUMNS)
      .eq("topic_id", topicId)
      .eq("status", "published")
      .order("created_at", { ascending: true });

    if (postsError) {
      return {
        status: "error",
        topic: null,
        posts: [],
        votedPostIds: [],
        errorMessage: postsError.message ?? "Failed to load topic replies.",
      };
    }

    const postRows = Array.isArray(postsData) ? (postsData as ForumPostRow[]) : [];
    const postIds = postRows.map((p) => p.id);

    const [profilesById, tagsByTopicId] = await Promise.all([
      fetchPublicProfilesMap(supabase, [
        topicRow.author_id,
        ...postRows.map((p) => p.author_id),
      ]),
      fetchTagsByTopicIds(supabase, [topicRow.id]),
    ]);

    let votedPostIds: string[] = [];
    if (postIds.length > 0) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user?.id) {
        const { data: voteRows } = await supabase
          .from("votes")
          .select("post_id")
          .eq("user_id", user.id)
          .in("post_id", postIds);

        if (Array.isArray(voteRows)) {
          votedPostIds = voteRows
            .map((v: { post_id?: string }) => v.post_id)
            .filter((id): id is string => typeof id === "string");
        }
      }
    }

    const replyCountByTopicId = new Map([[topicRow.id, postRows.length]]);
    const topic = mapTopicRow(
      topicRow,
      categorySlugById,
      profilesById,
      tagsByTopicId,
      replyCountByTopicId
    );
    const posts = postRows.map((row) =>
      mapPostRow(row, topicRow.accepted_post_id, profilesById)
    );

    return {
      status: "found",
      topic,
      posts,
      votedPostIds,
    };
  } catch (err) {
    return {
      status: "error",
      topic: null,
      posts: [],
      votedPostIds: [],
      errorMessage:
        err instanceof Error ? err.message : "Failed to load topic detail.",
    };
  }
}

async function resolveOrCreateTagIds(
  supabase: ForumSupabaseClientLike,
  cleanedSlugs: string[]
): Promise<{ ok: true; tagIds: string[] } | { ok: false; message: string }> {
  const uniqueSlugs = Array.from(new Set(cleanedSlugs)).slice(0, 5);
  if (uniqueSlugs.length === 0) {
    return { ok: true, tagIds: [] };
  }

  const { data: existingRows, error: selectErr } = await supabase
    .from("tags")
    .select(FORUM_TAG_SELECT_COLUMNS)
    .in("slug", uniqueSlugs);

  if (selectErr) {
    return {
      ok: false,
      message: selectErr.message ?? "Failed to resolve tags.",
    };
  }

  const idBySlug = new Map<string, string>();
  if (Array.isArray(existingRows)) {
    for (const row of existingRows) {
      if (row?.slug && row?.id) {
        idBySlug.set(row.slug, row.id);
      }
    }
  }

  const missingSlugs = uniqueSlugs.filter((slug) => !idBySlug.has(slug));
  for (const slug of missingSlugs) {
    const { data: inserted, error: insertErr } = await supabase
      .from("tags")
      .insert({ slug, name: slug })
      .select(FORUM_TAG_SELECT_COLUMNS)
      .single();

    if (insertErr) {
      if (insertErr.code === "23505") {
        const { data: refetched } = await supabase
          .from("tags")
          .select(FORUM_TAG_SELECT_COLUMNS)
          .eq("slug", slug)
          .maybeSingle();
        if (refetched?.id) {
          idBySlug.set(slug, refetched.id);
          continue;
        }
      }
      return {
        ok: false,
        message: insertErr.message ?? `Failed to register tag "${slug}".`,
      };
    }

    if (inserted?.id) {
      idBySlug.set(slug, inserted.id);
    }
  }

  const tagIds = uniqueSlugs
    .map((slug) => idBySlug.get(slug))
    .filter((id): id is string => Boolean(id));
  return { ok: true, tagIds };
}

export async function createForumTopic(
  input: {
    title: string;
    body: string;
    categoryId: string;
    tags?: string[] | string;
    [extra: string]: unknown;
  },
  options?: {
    categories?: ForumCategoryItem[];
    client?: ForumSupabaseClientLike;
  }
): Promise<ForumTopicMutationResult> {
  const forbidden = hasForbiddenKeys(
    input as Record<string, unknown>,
    FORBIDDEN_TOPIC_MUTATION_KEYS
  );
  if (forbidden.length > 0) {
    return {
      status: "error",
      errorCode: "validation_error",
      message: `Forbidden topic fields supplied: ${forbidden.join(", ")}`,
    };
  }

  const title = (input.title ?? "").trim();
  const body = (input.body ?? "").trim();
  const categoryId = (input.categoryId ?? "").trim();

  if (title.length < 5 || title.length > 200) {
    return {
      status: "error",
      errorCode: "validation_error",
      message: "Topic title must be between 5 and 200 characters.",
    };
  }
  if (body.length < 10 || body.length > 20000) {
    return {
      status: "error",
      errorCode: "validation_error",
      message: "Topic body must be between 10 and 20000 characters.",
    };
  }
  if (!isValidUuid(categoryId)) {
    return {
      status: "error",
      errorCode: "validation_error",
      message: "Valid category is required.",
    };
  }

  const rawTags = Array.isArray(input.tags)
    ? input.tags
    : typeof input.tags === "string"
      ? parseTagsString(input.tags)
      : [];
  const cleanedTags = Array.from(
    new Set(rawTags.map((t) => t.trim().toLowerCase()).filter(Boolean))
  ).slice(0, 5);

  for (const tag of cleanedTags) {
    if (!TAG_REGEX.test(tag)) {
      return {
        status: "error",
        errorCode: "validation_error",
        message: `Invalid tag format: ${tag}`,
      };
    }
  }

  try {
    const supabase = getClient(options?.client);
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user?.id) {
      return {
        status: "error",
        errorCode: "unauthenticated",
        message: "Authentication required to create a topic.",
      };
    }

    // Only granted columns: (category_id, title, body)
    const { data, error } = await supabase
      .from("topics")
      .insert({
        category_id: categoryId,
        title,
        body,
      })
      .select(FORUM_TOPIC_SELECT_COLUMNS)
      .single();

    if (error || !data) {
      if (error && isRlsOrPermissionError(error)) {
        return {
          status: "error",
          errorCode: "rls_denied",
          message: error.message ?? "Permission denied to create topic.",
        };
      }
      if (error?.code === "23503" || error?.code === "23514") {
        return {
          status: "error",
          errorCode: "validation_error",
          message: error.message ?? "Invalid topic category or constraints.",
        };
      }
      return {
        status: "error",
        errorCode: "mutation_failed",
        message: error?.message ?? "Failed to create topic.",
      };
    }

    const topicRow = data as Omit<ForumTopicRow, "search_vector">;

    if (cleanedTags.length > 0) {
      const tagResult = await resolveOrCreateTagIds(supabase, cleanedTags);
      if (tagResult.ok && tagResult.tagIds.length > 0) {
        await supabase.from("topic_tags").insert(
          tagResult.tagIds.map((tagId) => ({
            topic_id: topicRow.id,
            tag_id: tagId,
          }))
        );
      }
    }

    const categories = options?.categories ?? [];
    const categorySlugById = new Map(categories.map((c) => [c.id, c.slug]));
    const profilesById = await fetchPublicProfilesMap(supabase, [
      topicRow.author_id,
    ]);
    const tagsByTopicId = new Map([[topicRow.id, cleanedTags]]);
    const replyCountByTopicId = new Map([[topicRow.id, 0]]);

    return {
      status: "success",
      topic: mapTopicRow(
        topicRow,
        categorySlugById,
        profilesById,
        tagsByTopicId,
        replyCountByTopicId
      ),
    };
  } catch (err) {
    return {
      status: "error",
      errorCode: "connection_error",
      message: err instanceof Error ? err.message : "Failed to create topic.",
    };
  }
}

export async function updateForumTopic(
  topicId: string,
  input: {
    title: string;
    body: string;
    categoryId: string;
    tags?: string[];
    [extra: string]: unknown;
  },
  options?: {
    categories?: ForumCategoryItem[];
    client?: ForumSupabaseClientLike;
  }
): Promise<ForumTopicMutationResult> {
  if (!isValidUuid(topicId)) {
    return {
      status: "error",
      errorCode: "not_found",
      message: "Invalid topic ID.",
    };
  }

  const forbidden = hasForbiddenKeys(
    input as Record<string, unknown>,
    FORBIDDEN_TOPIC_MUTATION_KEYS
  );
  if (forbidden.length > 0) {
    return {
      status: "error",
      errorCode: "validation_error",
      message: `Forbidden topic fields supplied: ${forbidden.join(", ")}`,
    };
  }

  const title = (input.title ?? "").trim();
  const body = (input.body ?? "").trim();
  const categoryId = (input.categoryId ?? "").trim();

  if (title.length < 5 || title.length > 200) {
    return {
      status: "error",
      errorCode: "validation_error",
      message: "Topic title must be between 5 and 200 characters.",
    };
  }
  if (body.length < 10 || body.length > 20000) {
    return {
      status: "error",
      errorCode: "validation_error",
      message: "Topic body must be between 10 and 20000 characters.",
    };
  }
  if (!isValidUuid(categoryId)) {
    return {
      status: "error",
      errorCode: "validation_error",
      message: "Valid category is required.",
    };
  }

  try {
    const supabase = getClient(options?.client);
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user?.id) {
      return {
        status: "error",
        errorCode: "unauthenticated",
        message: "Authentication required to edit a topic.",
      };
    }

    // Only granted columns: (category_id, title, body)
    // RLS `topics_update_owner` enforces author_id = auth.uid(), published, not is_locked
    const { data, error } = await supabase
      .from("topics")
      .update({
        category_id: categoryId,
        title,
        body,
      })
      .eq("id", topicId)
      .eq("author_id", user.id)
      .eq("status", "published")
      .select(FORUM_TOPIC_SELECT_COLUMNS)
      .maybeSingle();

    if (error) {
      if (isRlsOrPermissionError(error)) {
        return {
          status: "error",
          errorCode: "rls_denied",
          message: error.message ?? "Permission denied to edit this topic.",
        };
      }
      return {
        status: "error",
        errorCode: "mutation_failed",
        message: error.message ?? "Failed to update topic.",
      };
    }

    if (!data) {
      return {
        status: "error",
        errorCode: "rls_denied",
        message: "Topic not found, locked, or you are not the author.",
      };
    }

    const topicRow = data as Omit<ForumTopicRow, "search_vector">;
    const categories = options?.categories ?? [];
    const categorySlugById = new Map(categories.map((c) => [c.id, c.slug]));
    const [profilesById, tagsByTopicId, replyCountByTopicId] = await Promise.all([
      fetchPublicProfilesMap(supabase, [topicRow.author_id]),
      fetchTagsByTopicIds(supabase, [topicRow.id]),
      fetchReplyCountsByTopicIds(supabase, [topicRow.id]),
    ]);

    return {
      status: "success",
      topic: mapTopicRow(
        topicRow,
        categorySlugById,
        profilesById,
        tagsByTopicId,
        replyCountByTopicId
      ),
    };
  } catch (err) {
    return {
      status: "error",
      errorCode: "connection_error",
      message: err instanceof Error ? err.message : "Failed to update topic.",
    };
  }
}

export async function createForumPost(
  input: {
    topicId: string;
    body: string;
    [extra: string]: unknown;
  },
  options?: { client?: ForumSupabaseClientLike }
): Promise<ForumPostMutationResult> {
  const forbidden = hasForbiddenKeys(
    input as Record<string, unknown>,
    FORBIDDEN_POST_INSERT_KEYS
  );
  if (forbidden.length > 0) {
    return {
      status: "error",
      errorCode: "validation_error",
      message: `Forbidden post fields supplied: ${forbidden.join(", ")}`,
    };
  }

  const topicId = (input.topicId ?? "").trim();
  const body = (input.body ?? "").trim();

  if (!isValidUuid(topicId)) {
    return {
      status: "error",
      errorCode: "validation_error",
      message: "Valid topic ID is required.",
    };
  }
  if (body.length < 1 || body.length > 10000) {
    return {
      status: "error",
      errorCode: "validation_error",
      message: "Reply body must be between 1 and 10000 characters.",
    };
  }

  try {
    const supabase = getClient(options?.client);
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user?.id) {
      return {
        status: "error",
        errorCode: "unauthenticated",
        message: "Authentication required to post a reply.",
      };
    }

    // Only granted columns: (topic_id, body)
    const { data, error } = await supabase
      .from("posts")
      .insert({
        topic_id: topicId,
        body,
      })
      .select(FORUM_POST_SELECT_COLUMNS)
      .single();

    if (error || !data) {
      if (error && isRlsOrPermissionError(error)) {
        return {
          status: "error",
          errorCode: "rls_denied",
          message:
            error.message ??
            "Permission denied to reply (topic may be locked or account suspended).",
        };
      }
      return {
        status: "error",
        errorCode: "mutation_failed",
        message: error?.message ?? "Failed to post reply.",
      };
    }

    const postRow = data as ForumPostRow;
    const profilesById = await fetchPublicProfilesMap(supabase, [
      postRow.author_id,
    ]);

    return {
      status: "success",
      post: mapPostRow(postRow, null, profilesById),
    };
  } catch (err) {
    return {
      status: "error",
      errorCode: "connection_error",
      message: err instanceof Error ? err.message : "Failed to post reply.",
    };
  }
}

export async function updateForumPost(
  postId: string,
  input: {
    body: string;
    [extra: string]: unknown;
  },
  options?: { client?: ForumSupabaseClientLike }
): Promise<ForumPostMutationResult> {
  if (!isValidUuid(postId)) {
    return {
      status: "error",
      errorCode: "not_found",
      message: "Invalid post ID.",
    };
  }

  const forbidden = hasForbiddenKeys(
    input as Record<string, unknown>,
    FORBIDDEN_POST_UPDATE_KEYS
  );
  if (forbidden.length > 0) {
    return {
      status: "error",
      errorCode: "validation_error",
      message: `Forbidden post fields supplied: ${forbidden.join(", ")}`,
    };
  }

  const body = (input.body ?? "").trim();
  if (body.length < 1 || body.length > 10000) {
    return {
      status: "error",
      errorCode: "validation_error",
      message: "Reply body must be between 1 and 10000 characters.",
    };
  }

  try {
    const supabase = getClient(options?.client);
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user?.id) {
      return {
        status: "error",
        errorCode: "unauthenticated",
        message: "Authentication required to edit a reply.",
      };
    }

    // Only granted column: (body)
    const { data, error } = await supabase
      .from("posts")
      .update({ body })
      .eq("id", postId)
      .eq("author_id", user.id)
      .eq("status", "published")
      .select(FORUM_POST_SELECT_COLUMNS)
      .maybeSingle();

    if (error) {
      if (isRlsOrPermissionError(error)) {
        return {
          status: "error",
          errorCode: "rls_denied",
          message: error.message ?? "Permission denied to edit this reply.",
        };
      }
      return {
        status: "error",
        errorCode: "mutation_failed",
        message: error.message ?? "Failed to update reply.",
      };
    }

    if (!data) {
      return {
        status: "error",
        errorCode: "rls_denied",
        message: "Reply not found, topic locked, or you are not the author.",
      };
    }

    const postRow = data as ForumPostRow;
    const profilesById = await fetchPublicProfilesMap(supabase, [
      postRow.author_id,
    ]);

    return {
      status: "success",
      post: mapPostRow(postRow, null, profilesById),
    };
  } catch (err) {
    return {
      status: "error",
      errorCode: "connection_error",
      message: err instanceof Error ? err.message : "Failed to update reply.",
    };
  }
}

export async function togglePostVote(
  postId: string,
  currentlyVoted: boolean,
  options?: { client?: ForumSupabaseClientLike }
): Promise<ForumVoteMutationResult> {
  if (!isValidUuid(postId)) {
    return {
      status: "error",
      errorCode: "not_found",
      message: "Invalid post ID.",
    };
  }

  try {
    const supabase = getClient(options?.client);
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user?.id) {
      return {
        status: "error",
        errorCode: "unauthenticated",
        message: "Authentication required to vote.",
      };
    }

    let nextVoted = !currentlyVoted;

    if (currentlyVoted) {
      const { error: deleteErr } = await supabase
        .from("votes")
        .delete()
        .eq("post_id", postId)
        .eq("user_id", user.id);

      if (deleteErr) {
        if (isRlsOrPermissionError(deleteErr)) {
          return {
            status: "error",
            errorCode: "rls_denied",
            message: deleteErr.message ?? "Permission denied to remove vote.",
          };
        }
        return {
          status: "error",
          errorCode: "mutation_failed",
          message: deleteErr.message ?? "Failed to remove vote.",
        };
      }
      nextVoted = false;
    } else {
      // Only granted column: (post_id). user_id defaults to auth.uid() in PostgreSQL.
      const { error: insertErr } = await supabase
        .from("votes")
        .insert({ post_id: postId });

      if (insertErr) {
        if (insertErr.code === "23505") {
          // Already voted — treat as idempotent voted=true
          nextVoted = true;
        } else if (isRlsOrPermissionError(insertErr)) {
          return {
            status: "error",
            errorCode: "rls_denied",
            message:
              insertErr.message ??
              "Cannot vote on this post (own post, non-published, or suspended).",
          };
        } else {
          return {
            status: "error",
            errorCode: "mutation_failed",
            message: insertErr.message ?? "Failed to register vote.",
          };
        }
      } else {
        nextVoted = true;
      }
    }

    // Re-read authoritative vote_count updated by votes_after_change trigger
    const { data: postRow } = await supabase
      .from("posts")
      .select("vote_count")
      .eq("id", postId)
      .maybeSingle();

    const voteCount =
      typeof postRow?.vote_count === "number" ? postRow.vote_count : 0;

    return {
      status: "success",
      postId,
      voted: nextVoted,
      voteCount,
    };
  } catch (err) {
    return {
      status: "error",
      errorCode: "connection_error",
      message: err instanceof Error ? err.message : "Failed to toggle vote.",
    };
  }
}

export async function setAcceptedForumPost(
  topicId: string,
  postId: string | null,
  options?: { client?: ForumSupabaseClientLike }
): Promise<ForumAcceptPostResult> {
  if (!isValidUuid(topicId) || (postId !== null && !isValidUuid(postId))) {
    return {
      status: "error",
      errorCode: "validation_error",
      message: "Invalid topic or post ID.",
    };
  }

  try {
    const supabase = getClient(options?.client);
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user?.id) {
      return {
        status: "error",
        errorCode: "unauthenticated",
        message: "Authentication required to set accepted answer.",
      };
    }

    const rpcArgs =
      postId !== null
        ? { p_topic_id: topicId, p_post_id: postId }
        : { p_topic_id: topicId };

    const { error } = await supabase.rpc("set_accepted_post", rpcArgs);

    if (error) {
      if (isRlsOrPermissionError(error)) {
        return {
          status: "error",
          errorCode: "rls_denied",
          message: error.message ?? "Not authorized to set accepted answer.",
        };
      }
      if (error.code === "P0002") {
        return {
          status: "error",
          errorCode: "not_found",
          message: error.message ?? "Topic not found.",
        };
      }
      if (error.code === "22023") {
        return {
          status: "error",
          errorCode: "locked",
          message:
            error.message ??
            "Topic is locked, not published, or post does not belong to topic.",
        };
      }
      return {
        status: "error",
        errorCode: "mutation_failed",
        message: error.message ?? "Failed to set accepted answer.",
      };
    }

    return {
      status: "success",
      topicId,
      acceptedPostId: postId,
    };
  } catch (err) {
    return {
      status: "error",
      errorCode: "connection_error",
      message:
        err instanceof Error ? err.message : "Failed to set accepted answer.",
    };
  }
}
