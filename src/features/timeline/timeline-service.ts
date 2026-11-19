import type { SupportedLocale } from "@/config/site";
import {
  FORUM_PUBLIC_PROFILE_SELECT_COLUMNS,
  FORUM_TAG_SELECT_COLUMNS,
  type ForumCategoryItem,
  fetchForumCategories,
} from "@/features/forum/forum-service";
import { createClient } from "@/lib/supabase/client";
import type {
  TimelineCreatePayload,
  TimelineCursor,
  TimelineLinkedResource,
  TimelineMutationResult,
  TimelinePostItem,
  TimelineQueryParams,
  TimelineQueryResult,
  TopicKind,
} from "./types";
import { validateTimelinePost } from "./validation";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type TimelineSupabaseClientLike = any;

export const TIMELINE_TOPIC_SELECT_COLUMNS =
  "id, author_id, category_id, title, body, status, is_pinned, is_locked, accepted_post_id, last_activity_at, created_at, kind, shared_url, resource_id, vote_count";

interface RawTopicRow {
  id: string;
  author_id: string | null;
  category_id: string;
  title: string;
  body: string;
  status: string;
  is_pinned: boolean;
  is_locked: boolean;
  accepted_post_id: string | null;
  last_activity_at: string;
  created_at: string;
  kind: TopicKind;
  shared_url: string | null;
  resource_id: string | null;
  vote_count: number;
}

function getClient(
  override?: TimelineSupabaseClientLike
): TimelineSupabaseClientLike {
  return override ?? createClient();
}

function isRlsOrPermissionError(err: { code?: string; status?: number; message?: string } | null): boolean {
  if (!err) return false;
  const code = (err.code ?? "").toLowerCase();
  const msg = (err.message ?? "").toLowerCase();
  return (
    code === "42501" ||
    code === "pgrst301" ||
    err.status === 401 ||
    err.status === 403 ||
    msg.includes("row-level security") ||
    msg.includes("permission denied")
  );
}

/**
 * Queries the Timeline feed from `public.topics` with cursor/keyset pagination
 * for `newest`, and ranked pagination for `trending` and `top_voted`.
 */
export async function fetchTimelineFeed(
  params: TimelineQueryParams,
  options?: {
    categories?: ForumCategoryItem[];
    client?: TimelineSupabaseClientLike;
  }
): Promise<TimelineQueryResult> {
  const pageSize = Math.max(1, Math.min(params.pageSize ?? 12, 30));
  const sortBy = params.sortBy ?? "newest";

  try {
    const supabase = getClient(options?.client);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.id) {
      return {
        status: "unauthenticated",
        items: [],
        nextCursor: null,
        hasMore: false,
      };
    }

    let categories = options?.categories;
    if (!categories || categories.length === 0) {
      const catRes = await fetchForumCategories({ client: supabase });
      categories = catRes.categories;
    }
    const categoryById = new Map(categories.map((c) => [c.id, c]));
    const categoryBySlug = new Map(categories.map((c) => [c.slug, c]));

    let query = supabase
      .from("topics")
      .select(TIMELINE_TOPIC_SELECT_COLUMNS)
      .eq("status", "published");

    if (params.kind && params.kind !== "all") {
      query = query.eq("kind", params.kind);
    }

    if (params.categorySlug && params.categorySlug !== "all") {
      const cat = categoryBySlug.get(params.categorySlug);
      if (!cat) {
        return { status: "success", items: [], nextCursor: null, hasMore: false };
      }
      query = query.eq("category_id", cat.id);
    }

    if (sortBy === "newest") {
      if (params.cursor) {
        query = query.or(
          `created_at.lt.${params.cursor.createdAt},and(created_at.eq.${params.cursor.createdAt},id.lt.${params.cursor.id})`
        );
      }
      query = query
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .limit(pageSize + 1);
    } else if (sortBy === "top_voted") {
      const offset = Math.max(0, params.offset ?? 0);
      query = query
        .order("vote_count", { ascending: false })
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .range(offset, offset + pageSize);
    } else {
      // trending: recent activity + engagement
      const offset = Math.max(0, params.offset ?? 0);
      query = query
        .order("last_activity_at", { ascending: false })
        .order("vote_count", { ascending: false })
        .order("id", { ascending: false })
        .range(offset, offset + pageSize);
    }

    const { data, error } = await query;
    if (error) {
      return {
        status: "error",
        items: [],
        nextCursor: null,
        hasMore: false,
        errorMessage: error.message || "Failed to load timeline.",
      };
    }

    const rawRows = (data ?? []) as RawTopicRow[];
    const hasMore = rawRows.length > pageSize;
    const rows = hasMore ? rawRows.slice(0, pageSize) : rawRows;

    if (rows.length === 0) {
      return { status: "success", items: [], nextCursor: null, hasMore: false };
    }

    const topicIds = rows.map((r) => r.id);
    const authorIds = Array.from(
      new Set(rows.map((r) => r.author_id).filter((id): id is string => Boolean(id)))
    );
    const resourceIds = Array.from(
      new Set(rows.map((r) => r.resource_id).filter((id): id is string => Boolean(id)))
    );

    const [
      profilesRes,
      postsRes,
      topicTagsRes,
      userVotesRes,
      resourcesRes,
    ] = await Promise.all([
      authorIds.length > 0
        ? supabase
            .from("profiles")
            .select(FORUM_PUBLIC_PROFILE_SELECT_COLUMNS)
            .in("id", authorIds)
        : Promise.resolve({ data: [] }),
      supabase
        .from("posts")
        .select("topic_id")
        .eq("status", "published")
        .in("topic_id", topicIds),
      supabase
        .from("topic_tags")
        .select("topic_id, tag_id")
        .in("topic_id", topicIds),
      supabase
        .from("topic_votes")
        .select("topic_id")
        .eq("user_id", user.id)
        .in("topic_id", topicIds),
      resourceIds.length > 0
        ? supabase
            .from("resources")
            .select("id, slug, name, type, url")
            .eq("status", "approved")
            .in("id", resourceIds)
        : Promise.resolve({ data: [] }),
    ]);

    const profileMap = new Map<
      string,
      { username: string; display_name: string | null; avatar_url: string | null }
    >();
    ((profilesRes.data ?? []) as Array<{
      id: string;
      username: string;
      display_name: string | null;
      avatar_url: string | null;
    }>).forEach((p) => profileMap.set(p.id, p));

    const replyCountMap = new Map<string, number>();
    ((postsRes.data ?? []) as Array<{ topic_id: string }>).forEach((p) => {
      replyCountMap.set(p.topic_id, (replyCountMap.get(p.topic_id) ?? 0) + 1);
    });

    const tagLinks = (topicTagsRes.data ?? []) as Array<{
      topic_id: string;
      tag_id: string;
    }>;
    const tagIds = Array.from(new Set(tagLinks.map((l) => l.tag_id)));
    const tagSlugMap = new Map<string, string>();
    if (tagIds.length > 0) {
      const tagsRes = await supabase
        .from("tags")
        .select(FORUM_TAG_SELECT_COLUMNS)
        .in("id", tagIds);
      ((tagsRes.data ?? []) as Array<{ id: string; slug: string }>).forEach(
        (t) => tagSlugMap.set(t.id, t.slug)
      );
    }

    const topicTagsMap = new Map<string, string[]>();
    tagLinks.forEach((link) => {
      const slug = tagSlugMap.get(link.tag_id);
      if (!slug) return;
      const list = topicTagsMap.get(link.topic_id) ?? [];
      if (!list.includes(slug)) list.push(slug);
      topicTagsMap.set(link.topic_id, list);
    });

    const votedSet = new Set(
      ((userVotesRes.data ?? []) as Array<{ topic_id: string }>).map(
        (v) => v.topic_id
      )
    );

    const resourceMap = new Map<string, TimelineLinkedResource>();
    ((resourcesRes.data ?? []) as TimelineLinkedResource[]).forEach((r) =>
      resourceMap.set(r.id, r)
    );

    const items: TimelinePostItem[] = rows.map((row) => {
      const cat = categoryById.get(row.category_id);
      const author = row.author_id ? profileMap.get(row.author_id) : undefined;
      return {
        id: row.id,
        categoryId: row.category_id,
        categorySlug: cat?.slug ?? "blue-team",
        categoryNamePt: cat?.name_pt ?? "Comunidade",
        categoryNameEn: cat?.name_en ?? "Community",
        authorId: row.author_id,
        authorUsername: author?.username ?? "vexor_member",
        authorDisplayName: author?.display_name ?? null,
        authorAvatarUrl: author?.avatar_url ?? null,
        title: row.title,
        body: row.body,
        kind: row.kind ?? "discussion",
        sharedUrl: row.shared_url ?? null,
        resourceId: row.resource_id ?? null,
        linkedResource: row.resource_id
          ? (resourceMap.get(row.resource_id) ?? null)
          : null,
        tags: topicTagsMap.get(row.id) ?? [],
        voteCount: row.vote_count ?? 0,
        userHasVoted: votedSet.has(row.id),
        replyCount: replyCountMap.get(row.id) ?? 0,
        isPinned: Boolean(row.is_pinned),
        isLocked: Boolean(row.is_locked),
        acceptedPostId: row.accepted_post_id ?? null,
        lastActivityAt: row.last_activity_at,
        createdAt: row.created_at,
      };
    });

    const lastRow = rows[rows.length - 1];
    const nextCursor: TimelineCursor | null =
      sortBy === "newest" && hasMore && lastRow
        ? { createdAt: lastRow.created_at, id: lastRow.id }
        : null;

    return {
      status: "success",
      items,
      nextCursor,
      hasMore,
    };
  } catch (err) {
    return {
      status: "error",
      items: [],
      nextCursor: null,
      hasMore: false,
      errorMessage: err instanceof Error ? err.message : "Failed to load timeline.",
    };
  }
}

/**
 * Publishes a new Timeline post in `public.topics` (using `kind`, `shared_url`, `resource_id`)
 * and associates up to 5 tags via `public.tags` + `public.topic_tags`.
 */
export async function createTimelinePost(
  payload: TimelineCreatePayload,
  locale: SupportedLocale,
  options?: {
    categories?: ForumCategoryItem[];
    client?: TimelineSupabaseClientLike;
  }
): Promise<TimelineMutationResult<TimelinePostItem>> {
  const isPt = locale === "pt-BR";
  const validation = validateTimelinePost(payload, locale);
  if (!validation.valid) {
    return {
      status: "error",
      errorCode: "validation_error",
      message: validation.error || "Invalid post.",
    };
  }

  try {
    const supabase = getClient(options?.client);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.id) {
      return {
        status: "error",
        errorCode: "unauthenticated",
        message: isPt
          ? "Faça login para publicar na timeline."
          : "Sign in to publish to the timeline.",
      };
    }

    const insertPayload: Record<string, unknown> = {
      category_id: payload.categoryId,
      title: validation.normalizedTitle,
      body: validation.normalizedBody,
      kind: payload.kind,
      shared_url: validation.normalizedUrl,
      resource_id: payload.resourceId || null,
    };

    const { data: inserted, error } = await supabase
      .from("topics")
      .insert(insertPayload)
      .select(TIMELINE_TOPIC_SELECT_COLUMNS)
      .single();

    if (error || !inserted) {
      if (isRlsOrPermissionError(error)) {
        return {
          status: "error",
          errorCode: "rls_denied",
          message: isPt
            ? "Sem permissão para publicar (verifique se sua conta está ativa)."
            : "Permission denied to publish (verify your account is active).",
        };
      }
      return {
        status: "error",
        errorCode: "mutation_failed",
        message:
          error?.message ||
          (isPt ? "Não foi possível publicar." : "Could not publish post."),
      };
    }

    const row = inserted as RawTopicRow;
    const attachedTags: string[] = [];

    for (const slug of validation.tags.slice(0, 5)) {
      const { data: existingTag } = await supabase
        .from("tags")
        .select("id, slug")
        .eq("slug", slug)
        .maybeSingle();

      let tagId = (existingTag as { id?: string } | null)?.id ?? null;
      if (!tagId) {
        const { data: createdTag } = await supabase
          .from("tags")
          .insert({ slug, name: slug })
          .select("id")
          .maybeSingle();
        tagId = (createdTag as { id?: string } | null)?.id ?? null;
      }

      if (tagId) {
        const { error: linkErr } = await supabase
          .from("topic_tags")
          .insert({ topic_id: row.id, tag_id: tagId });
        if (!linkErr) {
          attachedTags.push(slug);
        }
      }
    }

    const { data: profileRow } = await supabase
      .from("profiles")
      .select(FORUM_PUBLIC_PROFILE_SELECT_COLUMNS)
      .eq("id", user.id)
      .maybeSingle();

    let linkedResource: TimelineLinkedResource | null = null;
    if (row.resource_id) {
      const { data: resRow } = await supabase
        .from("resources")
        .select("id, slug, name, type, url")
        .eq("id", row.resource_id)
        .eq("status", "approved")
        .maybeSingle();
      if (resRow) {
        linkedResource = resRow as TimelineLinkedResource;
      }
    }

    const cat = options?.categories?.find((c) => c.id === row.category_id);
    const prof = profileRow as {
      username?: string;
      display_name?: string | null;
      avatar_url?: string | null;
    } | null;

    return {
      status: "success",
      data: {
        id: row.id,
        categoryId: row.category_id,
        categorySlug: cat?.slug ?? "blue-team",
        categoryNamePt: cat?.name_pt ?? "Comunidade",
        categoryNameEn: cat?.name_en ?? "Community",
        authorId: row.author_id,
        authorUsername: prof?.username ?? "vexor_member",
        authorDisplayName: prof?.display_name ?? null,
        authorAvatarUrl: prof?.avatar_url ?? null,
        title: row.title,
        body: row.body,
        kind: row.kind ?? payload.kind,
        sharedUrl: row.shared_url ?? null,
        resourceId: row.resource_id ?? null,
        linkedResource,
        tags: attachedTags,
        voteCount: row.vote_count ?? 0,
        userHasVoted: false,
        replyCount: 0,
        isPinned: Boolean(row.is_pinned),
        isLocked: Boolean(row.is_locked),
        acceptedPostId: row.accepted_post_id ?? null,
        lastActivityAt: row.last_activity_at,
        createdAt: row.created_at,
      },
    };
  } catch (err) {
    return {
      status: "error",
      errorCode: "connection_error",
      message: err instanceof Error ? err.message : "Network error.",
    };
  }
}

/**
 * Toggles an UP vote in `public.topic_votes` for a Timeline post.
 */
export async function toggleTimelineTopicVote(
  topicId: string,
  currentlyVoted: boolean,
  locale: SupportedLocale,
  options?: { client?: TimelineSupabaseClientLike }
): Promise<TimelineMutationResult<{ voted: boolean }>> {
  const isPt = locale === "pt-BR";
  try {
    const supabase = getClient(options?.client);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.id) {
      return {
        status: "error",
        errorCode: "unauthenticated",
        message: isPt ? "Faça login para dar UP." : "Sign in to upvote.",
      };
    }

    if (currentlyVoted) {
      const { error } = await supabase
        .from("topic_votes")
        .delete()
        .eq("user_id", user.id)
        .eq("topic_id", topicId);

      if (error) {
        return {
          status: "error",
          errorCode: isRlsOrPermissionError(error) ? "rls_denied" : "mutation_failed",
          message: error.message || "Could not remove vote.",
        };
      }
      return { status: "success", data: { voted: false } };
    }

    const { error } = await supabase
      .from("topic_votes")
      .insert({ topic_id: topicId });

    if (error && error.code !== "23505") {
      return {
        status: "error",
        errorCode: isRlsOrPermissionError(error) ? "rls_denied" : "mutation_failed",
        message: error.message || "Could not add vote.",
      };
    }

    return { status: "success", data: { voted: true } };
  } catch (err) {
    return {
      status: "error",
      errorCode: "connection_error",
      message: err instanceof Error ? err.message : "Network error.",
    };
  }
}

/**
 * Searches approved catalog resources for linking inside the Timeline Composer.
 */
export async function searchCatalogResourcesForComposer(
  queryText: string,
  options?: { client?: TimelineSupabaseClientLike }
): Promise<TimelineLinkedResource[]> {
  try {
    const supabase = getClient(options?.client);
    const sanitized = queryText.trim().replace(/[%_\\,()]/g, " ").slice(0, 60);
    let query = supabase
      .from("resources")
      .select("id, slug, name, type, url")
      .eq("status", "approved")
      .order("name", { ascending: true })
      .limit(8);

    if (sanitized) {
      query = query.ilike("name", `%${sanitized}%`);
    }

    const { data, error } = await query;
    if (error || !Array.isArray(data)) return [];
    return data as TimelineLinkedResource[];
  } catch {
    return [];
  }
}
