import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import {
  requireServerAuthorization,
  type ServerAuthClientLike,
} from "@/lib/supabase/auth";
import type {
  AdminActionResult,
  AdminAuditEntry,
  AdminAuditFilters,
  AdminAuditSummary,
  AdminDashboardStats,
  AdminReport,
  AdminResource,
  AdminStats,
  AdminUser,
  AdminUserFilters,
  AdminUsersSummary,
  DbUserRole,
  ModerationAction,
  ModerationPriority,
  ModerationQueueFilter,
  ModerationQueueItem,
  PaginatedResult,
  PaginationParams,
  ReportReason,
  ReportStatus,
  ReportTargetType,
  ResourceStatus,
} from "../types";
import { paginateItems } from "../services/shared";
import { mapSupabaseAdminError } from "../utils/admin-error-mapper";
import {
  classifyAuditSeverity,
  sanitizeAuditMetadata,
} from "../utils/audit-export";

export type AdminSupabaseClient = SupabaseClient<Database>;

export interface HandlerResponse<T> {
  status: number;
  body: T | { error: string; code?: string };
}

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_REGEX.test(value.trim());
}

function getPeriodCutoffIso(period?: string): string | null {
  if (!period || period === "all") return null;
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  if (period === "today") {
    const start = new Date();
    start.setUTCHours(0, 0, 0, 0);
    return start.toISOString();
  }
  if (period === "24h") return new Date(now - dayMs).toISOString();
  if (period === "7d") return new Date(now - 7 * dayMs).toISOString();
  if (period === "30d") return new Date(now - 30 * dayMs).toISOString();
  if (period === "90d") return new Date(now - 90 * dayMs).toISOString();
  return null;
}

async function authorizeAdminRequest(
  supabase: AdminSupabaseClient,
  requiredLevel: "moderator" | "admin"
): Promise<
  | { ok: true; actorId: string }
  | { ok: false; response: HandlerResponse<never> }
> {
  const { resolution, check } = await requireServerAuthorization(
    requiredLevel,
    supabase as unknown as ServerAuthClientLike
  );
  if (!check.allowed || resolution.status !== "authenticated") {
    return {
      ok: false,
      response: {
        status: check.httpStatus,
        body: {
          error:
            check.httpStatus === 401
              ? "Authentication required."
              : "Forbidden: insufficient administrative privileges.",
          code: check.reason,
        },
      },
    };
  }
  return { ok: true, actorId: resolution.user.id };
}

async function loadProfilesMap(
  supabase: AdminSupabaseClient,
  ids: string[]
): Promise<
  Map<string, { username: string; display_name: string | null; role: DbUserRole }>
> {
  const uniqueIds = Array.from(new Set(ids.filter((id) => isValidUuid(id))));
  const map = new Map<
    string,
    { username: string; display_name: string | null; role: DbUserRole }
  >();
  if (uniqueIds.length === 0) return map;

  const { data } = await supabase
    .from("profiles")
    .select("id, username, display_name, role")
    .in("id", uniqueIds);

  if (Array.isArray(data)) {
    for (const row of data) {
      map.set(row.id, {
        username: row.username,
        display_name: row.display_name,
        role: row.role,
      });
    }
  }
  return map;
}

// ============================================================================
// 1. Dashboard Handler
// ============================================================================

export async function handleGetAdminDashboard(
  supabase: AdminSupabaseClient
): Promise<HandlerResponse<AdminDashboardStats>> {
  const auth = await authorizeAdminRequest(supabase, "moderator");
  if (!auth.ok) return auth.response;

  const [
    totalUsersRes,
    suspendedUsersRes,
    pendingResourcesRes,
    approvedResourcesRes,
    rejectedResourcesRes,
    totalResourcesRes,
    totalTopicsRes,
    totalPostsRes,
    openReportsRes,
  ] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("is_suspended", true),
    supabase
      .from("resources")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    supabase
      .from("resources")
      .select("id", { count: "exact", head: true })
      .eq("status", "approved"),
    supabase
      .from("resources")
      .select("id", { count: "exact", head: true })
      .eq("status", "rejected"),
    supabase.from("resources").select("id", { count: "exact", head: true }),
    supabase.from("topics").select("id", { count: "exact", head: true }),
    supabase.from("posts").select("id", { count: "exact", head: true }),
    supabase
      .from("reports")
      .select("id", { count: "exact", head: true })
      .in("status", ["open", "reviewing"]),
  ]);

  const errors = [
    totalUsersRes.error,
    suspendedUsersRes.error,
    pendingResourcesRes.error,
    approvedResourcesRes.error,
    rejectedResourcesRes.error,
    totalResourcesRes.error,
    totalTopicsRes.error,
    totalPostsRes.error,
    openReportsRes.error,
  ].filter(Boolean);

  if (errors.length > 0) {
    const mapped = mapSupabaseAdminError(errors[0], "Failed to load dashboard statistics.");
    return { status: mapped.httpStatus, body: { error: mapped.message, code: mapped.code } };
  }

  const totalUsers = totalUsersRes.count ?? 0;
  const suspendedUsers = suspendedUsersRes.count ?? 0;
  const activeUsers = Math.max(0, totalUsers - suspendedUsers);
  const pendingResources = pendingResourcesRes.count ?? 0;
  const publishedResources = approvedResourcesRes.count ?? 0;
  const rejectedResources = rejectedResourcesRes.count ?? 0;
  const totalResources = totalResourcesRes.count ?? 0;
  const totalTopics = totalTopicsRes.count ?? 0;
  const totalPosts = totalPostsRes.count ?? 0;
  const openReports = openReportsRes.count ?? 0;

  // Cybercrime Research pending count (gracefully 0 if table is not yet deployed)
  let pendingResearch = 0;
  const pendingResearchRes = await (supabase as unknown as {
    from: (table: string) => {
      select: (
        cols: string,
        opts: { count: "exact"; head: true }
      ) => { eq: (col: string, val: string) => Promise<{ count: number | null; error: { code?: string; message?: string } | null }> };
    };
  })
    .from("research_submissions")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");

  if (!pendingResearchRes.error) {
    pendingResearch = pendingResearchRes.count ?? 0;
  } else if (pendingResearchRes.error.code !== "42P01") {
    const mapped = mapSupabaseAdminError(
      pendingResearchRes.error,
      "Failed to load research statistics."
    );
    return { status: mapped.httpStatus, body: { error: mapped.message, code: mapped.code } };
  }

  const baseStats: AdminStats = {
    totalUsers,
    activeUsers,
    suspendedUsers,
    publishedResources,
    pendingResources,
    rejectedResources,
    totalTopics,
    totalPosts,
    pendingResearch,
    openReports,
    recentAuditActionsCount: 0,
  };

  return {
    status: 200,
    body: {
      ...baseStats,
      totalPublications: totalResources + totalTopics + totalPosts,
      pendingModerationItems: pendingResources,
    },
  };
}

// ============================================================================
// 2. Users Handlers
// ============================================================================

function mapProfileRowToAdminUser(
  row: Database["public"]["Tables"]["profiles"]["Row"]
): AdminUser {
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name ?? row.username,
    avatarUrl: row.avatar_url ?? undefined,
    bio: row.bio ?? undefined,
    interests: Array.isArray(row.interests) ? row.interests : [],
    githubUrl: row.github_url ?? undefined,
    linkedinUrl: row.linkedin_url ?? undefined,
    preferredLanguage: row.preferred_locale === "en" ? "en" : "pt-BR",
    role: row.role,
    status: row.is_suspended ? "suspended" : "active",
    isSuspended: row.is_suspended,
    createdAt: row.created_at,
  };
}

export async function handleListAdminUsers(
  supabase: AdminSupabaseClient,
  filters?: AdminUserFilters,
  pagination?: PaginationParams
): Promise<HandlerResponse<PaginatedResult<AdminUser>>> {
  const auth = await authorizeAdminRequest(supabase, "admin");
  if (!auth.ok) return auth.response;

  let query = supabase
    .from("profiles")
    .select(
      "id, username, display_name, avatar_url, bio, interests, github_url, linkedin_url, preferred_locale, role, is_suspended, created_at, updated_at"
    )
    .order("created_at", { ascending: false });

  if (filters?.role && filters.role !== "all") {
    query = query.eq("role", filters.role);
  }
  if (filters?.suspendedOnly || filters?.status === "suspended") {
    query = query.eq("is_suspended", true);
  } else if (filters?.status === "active") {
    query = query.eq("is_suspended", false);
  }

  const cutoff = getPeriodCutoffIso(filters?.period);
  if (cutoff) {
    query = query.gte("created_at", cutoff);
  }

  const { data, error } = await query;
  if (error) {
    const mapped = mapSupabaseAdminError(error, "Failed to list users.");
    return { status: mapped.httpStatus, body: { error: mapped.message, code: mapped.code } };
  }

  let users = (data ?? []).map(mapProfileRowToAdminUser);

  if (filters?.query?.trim()) {
    const q = filters.query.trim().toLowerCase();
    users = users.filter(
      (u) =>
        u.username.toLowerCase().includes(q) ||
        u.displayName.toLowerCase().includes(q) ||
        u.id.toLowerCase().includes(q)
    );
  }

  return {
    status: 200,
    body: paginateItems(users, pagination),
  };
}

export async function handleGetAdminUserById(
  supabase: AdminSupabaseClient,
  userId: string
): Promise<HandlerResponse<AdminUser | null>> {
  const auth = await authorizeAdminRequest(supabase, "admin");
  if (!auth.ok) return auth.response;

  if (!isValidUuid(userId)) {
    return { status: 400, body: { error: "Invalid user ID format.", code: "invalid_input" } };
  }

  const { data, error } = await supabase
    .from("profiles")
    .select(
      "id, username, display_name, avatar_url, bio, interests, github_url, linkedin_url, preferred_locale, role, is_suspended, created_at, updated_at"
    )
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    const mapped = mapSupabaseAdminError(error, "Failed to fetch user.");
    return { status: mapped.httpStatus, body: { error: mapped.message, code: mapped.code } };
  }

  return {
    status: 200,
    body: data ? mapProfileRowToAdminUser(data) : null,
  };
}

export async function handleGetAdminUsersSummary(
  supabase: AdminSupabaseClient
): Promise<HandlerResponse<AdminUsersSummary>> {
  const auth = await authorizeAdminRequest(supabase, "admin");
  if (!auth.ok) return auth.response;

  const { data, error } = await supabase
    .from("profiles")
    .select("id, role, is_suspended");

  if (error) {
    const mapped = mapSupabaseAdminError(error, "Failed to load users summary.");
    return { status: mapped.httpStatus, body: { error: mapped.message, code: mapped.code } };
  }

  const rows = data ?? [];
  const totalUsers = rows.length;
  const suspendedUsers = rows.filter((u) => u.is_suspended).length;
  const activeUsers = totalUsers - suspendedUsers;
  const adminUsers = rows.filter((u) => u.role === "admin").length;
  const activeAdminUsers = rows.filter(
    (u) => u.role === "admin" && !u.is_suspended
  ).length;
  const moderatorUsers = rows.filter((u) => u.role === "moderator").length;

  return {
    status: 200,
    body: {
      totalUsers,
      activeUsers,
      suspendedUsers,
      adminUsers,
      activeAdminUsers,
      moderatorUsers,
    },
  };
}

export async function handleUpdateAdminUserRole(
  supabase: AdminSupabaseClient,
  payload: { targetUserId?: unknown; newRole?: unknown }
): Promise<HandlerResponse<AdminActionResult>> {
  const auth = await authorizeAdminRequest(supabase, "admin");
  if (!auth.ok) return auth.response;

  const { targetUserId, newRole } = payload;
  if (!isValidUuid(targetUserId)) {
    return { status: 400, body: { error: "Invalid target user ID.", code: "invalid_input" } };
  }
  if (newRole !== "member" && newRole !== "moderator" && newRole !== "admin") {
    return { status: 400, body: { error: "Invalid role value.", code: "invalid_input" } };
  }
  if (targetUserId === auth.actorId && newRole !== "admin") {
    return {
      status: 403,
      body: {
        error: "Administrators cannot demote themselves.",
        code: "self_demote",
      },
    };
  }

  const { error } = await supabase.rpc("admin_set_user_role", {
    p_user_id: targetUserId,
    p_role: newRole as DbUserRole,
  });

  if (error) {
    const mapped = mapSupabaseAdminError(error, "Failed to update user role.");
    return {
      status: mapped.httpStatus,
      body: { success: false, error: mapped.message, statusCode: mapped.httpStatus },
    };
  }

  return {
    status: 200,
    body: {
      success: true,
      statusCode: 200,
    },
  };
}

export async function handleUpdateAdminUserSuspension(
  supabase: AdminSupabaseClient,
  payload: { targetUserId?: unknown; suspended?: unknown; reason?: unknown }
): Promise<HandlerResponse<AdminActionResult>> {
  const auth = await authorizeAdminRequest(supabase, "admin");
  if (!auth.ok) return auth.response;

  const { targetUserId, suspended, reason } = payload;
  if (!isValidUuid(targetUserId)) {
    return { status: 400, body: { error: "Invalid target user ID.", code: "invalid_input" } };
  }
  if (typeof suspended !== "boolean") {
    return { status: 400, body: { error: "Invalid suspended flag.", code: "invalid_input" } };
  }
  if (targetUserId === auth.actorId && suspended) {
    return {
      status: 403,
      body: {
        error: "Administrators cannot suspend themselves.",
        code: "self_suspend",
      },
    };
  }

  const trimmedReason = typeof reason === "string" ? reason.trim() : "";
  if (suspended && trimmedReason.length < 5) {
    return {
      status: 400,
      body: {
        error: "Suspension reason must be at least 5 characters.",
        code: "reason_required",
      },
    };
  }

  const { error } = await supabase.rpc("admin_set_user_suspension", {
    p_user_id: targetUserId,
    p_suspended: suspended,
    p_reason: trimmedReason || undefined,
  });

  if (error) {
    const mapped = mapSupabaseAdminError(error, "Failed to update user suspension.");
    return {
      status: mapped.httpStatus,
      body: { success: false, error: mapped.message, statusCode: mapped.httpStatus },
    };
  }

  return {
    status: 200,
    body: {
      success: true,
      statusCode: 200,
    },
  };
}

// ============================================================================
// 3. Moderation & Resources Handlers
// ============================================================================

export function getSupabaseModerationAvailableActions(
  item: Pick<ModerationQueueItem, "contentType" | "status">
): ModerationAction[] {
  const { contentType, status } = item;
  if (contentType === "resource") {
    switch (status) {
      case "pending":
        return ["approve", "reject", "archive"];
      case "approved":
        return ["reject", "archive"];
      case "rejected":
        return ["approve", "archive"];
      case "archived":
        return ["approve", "reject"];
      default:
        return [];
    }
  }
  if (contentType === "topic") {
    switch (status) {
      case "published":
        return ["hide", "delete", "pin", "unpin", "lock", "unlock"];
      case "hidden":
        return ["unhide", "delete"];
      default:
        return [];
    }
  }
  if (contentType === "post") {
    switch (status) {
      case "published":
        return ["hide", "delete"];
      case "hidden":
        return ["unhide", "delete"];
      default:
        return [];
    }
  }
  return [];
}

function computePriority(reportCount: number, status: string): ModerationPriority {
  if (reportCount >= 3) return "critical";
  if (reportCount >= 1) return "high";
  if (status === "pending") return "medium";
  return "low";
}

export async function handleListModerationQueue(
  supabase: AdminSupabaseClient,
  filter?: ModerationQueueFilter,
  pagination?: PaginationParams
): Promise<HandlerResponse<PaginatedResult<ModerationQueueItem>>> {
  const auth = await authorizeAdminRequest(supabase, "moderator");
  if (!auth.ok) return auth.response;

  const includeResearch =
    !filter?.contentType ||
    filter.contentType === "all" ||
    filter.contentType === "research";

  const researchPromise = includeResearch
    ? (supabase as unknown as {
        from: (table: string) => {
          select: (cols: string) => {
            order: (
              col: string,
              opts: { ascending: boolean }
            ) => Promise<{
              data: Array<{
                id: string;
                slug: string;
                author_id: string | null;
                category_id: string;
                title_pt: string;
                summary_pt: string;
                body_pt: string;
                domain: string;
                severity: string;
                tlp: string;
                status: string;
                cves: string[];
                attack_techniques: string[];
                rejection_reason: string | null;
                reviewed_by: string | null;
                reviewed_at: string | null;
                published_at: string | null;
                created_at: string;
              }> | null;
              error: { code?: string; message?: string } | null;
            }>;
          };
        };
      })
        .from("research_submissions")
        .select(
          "id, slug, author_id, category_id, title_pt, summary_pt, body_pt, domain, severity, tlp, status, cves, attack_techniques, rejection_reason, reviewed_by, reviewed_at, published_at, created_at"
        )
        .order("created_at", { ascending: false })
    : Promise.resolve({ data: [], error: null });

  const [resourcesRes, topicsRes, postsRes, researchRes, categoriesRes, openReportsRes] =
    await Promise.all([
      filter?.contentType && filter.contentType !== "all" && filter.contentType !== "resource"
        ? Promise.resolve({ data: [], error: null })
        : supabase
            .from("resources")
            .select(
              "id, slug, name, description, category_id, type, url, language, difficulty, author_name, submitted_by, status, rejection_reason, reviewed_by, reviewed_at, published_at, created_at"
            )
            .order("created_at", { ascending: false }),
      filter?.contentType && filter.contentType !== "all" && filter.contentType !== "topic"
        ? Promise.resolve({ data: [], error: null })
        : supabase
            .from("topics")
            .select(
              "id, author_id, category_id, title, body, status, is_pinned, is_locked, created_at, updated_at"
            )
            .order("created_at", { ascending: false }),
      filter?.contentType && filter.contentType !== "all" && filter.contentType !== "post"
        ? Promise.resolve({ data: [], error: null })
        : supabase
            .from("posts")
            .select("id, topic_id, author_id, body, status, created_at, updated_at")
            .order("created_at", { ascending: false }),
      researchPromise,
      supabase.from("categories").select("id, slug, name_pt, name_en"),
      supabase
        .from("reports")
        .select("resource_id, topic_id, post_id, reason, status")
        .in("status", ["open", "reviewing"]),
    ]);

  const researchError =
    researchRes.error && researchRes.error.code !== "42P01" ? researchRes.error : null;

  const firstError =
    resourcesRes.error ??
    topicsRes.error ??
    postsRes.error ??
    researchError ??
    categoriesRes.error ??
    openReportsRes.error;
  if (firstError) {
    const mapped = mapSupabaseAdminError(firstError, "Failed to load moderation queue.");
    return { status: mapped.httpStatus, body: { error: mapped.message, code: mapped.code } };
  }

  const resources = resourcesRes.data ?? [];
  const topics = topicsRes.data ?? [];
  const posts = postsRes.data ?? [];
  const researchRows = researchRes.data ?? [];
  const categories = categoriesRes.data ?? [];
  const openReports = openReportsRes.data ?? [];

  const categoryMap = new Map<string, string>();
  for (const cat of categories) {
    categoryMap.set(cat.id, cat.slug || cat.name_pt || cat.name_en);
  }

  const profileIds: string[] = [];
  for (const r of resources) {
    if (r.submitted_by) profileIds.push(r.submitted_by);
    if (r.reviewed_by) profileIds.push(r.reviewed_by);
  }
  for (const t of topics) {
    if (t.author_id) profileIds.push(t.author_id);
  }
  for (const p of posts) {
    if (p.author_id) profileIds.push(p.author_id);
  }
  for (const rs of researchRows) {
    if (rs.author_id) profileIds.push(rs.author_id);
    if (rs.reviewed_by) profileIds.push(rs.reviewed_by);
  }
  const profilesMap = await loadProfilesMap(supabase, profileIds);

  const reportCountByTarget = new Map<string, { count: number; reason?: string }>();
  for (const rep of openReports) {
    const key = rep.resource_id
      ? `resource:${rep.resource_id}`
      : rep.topic_id
        ? `topic:${rep.topic_id}`
        : rep.post_id
          ? `post:${rep.post_id}`
          : null;
    if (!key) continue;
    const prev = reportCountByTarget.get(key) ?? { count: 0 };
    reportCountByTarget.set(key, {
      count: prev.count + 1,
      reason: prev.reason ?? rep.reason,
    });
  }

  const items: ModerationQueueItem[] = [];

  for (const r of resources) {
    const rep = reportCountByTarget.get(`resource:${r.id}`);
    const reportCount = rep?.count ?? 0;
    const submitter = r.submitted_by ? profilesMap.get(r.submitted_by) : undefined;
    const reviewer = r.reviewed_by ? profilesMap.get(r.reviewed_by) : undefined;
    items.push({
      id: r.id,
      contentType: "resource",
      title: r.name,
      category: categoryMap.get(r.category_id) ?? r.category_id,
      authorUsername: submitter?.username ?? r.author_name ?? "unknown",
      authorRole: submitter?.role ?? "member",
      submittedAt: r.created_at,
      status: r.status,
      priority: computePriority(reportCount, r.status),
      flagReason: rep?.reason,
      reportCount,
      rejectionReason: r.rejection_reason ?? undefined,
      reviewedBy: reviewer?.username,
      reviewedAt: r.reviewed_at ?? undefined,
      url: r.url,
      summary: r.description,
      metadata: {
        type: r.type,
        language: r.language,
        difficulty: r.difficulty,
        slug: r.slug,
      },
    });
  }

  for (const t of topics) {
    const rep = reportCountByTarget.get(`topic:${t.id}`);
    const reportCount = rep?.count ?? 0;
    const author = t.author_id ? profilesMap.get(t.author_id) : undefined;
    items.push({
      id: t.id,
      contentType: "topic",
      title: t.title,
      category: categoryMap.get(t.category_id) ?? t.category_id,
      authorUsername: author?.username ?? "unknown",
      authorRole: author?.role ?? "member",
      submittedAt: t.created_at,
      status: t.status,
      priority: computePriority(reportCount, t.status),
      flagReason: rep?.reason,
      reportCount,
      summary: t.body.slice(0, 220),
      fullBody: t.body,
      metadata: {
        isPinned: t.is_pinned,
        isLocked: t.is_locked,
      },
    });
  }

  for (const p of posts) {
    const rep = reportCountByTarget.get(`post:${p.id}`);
    const reportCount = rep?.count ?? 0;
    const author = p.author_id ? profilesMap.get(p.author_id) : undefined;
    items.push({
      id: p.id,
      contentType: "post",
      title: `Post #${p.id.slice(0, 8)}`,
      category: "forum",
      authorUsername: author?.username ?? "unknown",
      authorRole: author?.role ?? "member",
      submittedAt: p.created_at,
      status: p.status,
      priority: computePriority(reportCount, p.status),
      flagReason: rep?.reason,
      reportCount,
      summary: p.body.slice(0, 220),
      fullBody: p.body,
      metadata: {
        topicId: p.topic_id,
      },
    });
  }

  for (const rs of researchRows) {
    const rep = reportCountByTarget.get(`research:${rs.id}`);
    const reportCount = rep?.count ?? 0;
    const author = rs.author_id ? profilesMap.get(rs.author_id) : undefined;
    items.push({
      id: rs.id,
      contentType: "research",
      title: rs.title_pt,
      category: categoryMap.get(rs.category_id) ?? rs.domain,
      authorUsername: author?.username ?? "unknown",
      authorRole: author?.role ?? "member",
      submittedAt: rs.created_at,
      status: rs.status as ModerationQueueItem["status"],
      priority: computePriority(reportCount, rs.status),
      flagReason: rep?.reason,
      reportCount,
      summary: rs.summary_pt,
      fullBody: rs.body_pt,
      reviewedBy: rs.reviewed_by ? profilesMap.get(rs.reviewed_by)?.username : undefined,
      reviewedAt: rs.reviewed_at ?? undefined,
      rejectionReason: rs.rejection_reason ?? undefined,
      metadata: {
        slug: rs.slug,
        domain: rs.domain,
        severity: rs.severity,
        tlp: rs.tlp,
        cves: rs.cves,
        attackTechniques: rs.attack_techniques,
      },
    });
  }

  // Apply filters
  let filtered = items;
  if (filter?.contentType && filter.contentType !== "all") {
    filtered = filtered.filter((i) => i.contentType === filter.contentType);
  }
  if (filter?.status && filter.status !== "all") {
    filtered = filtered.filter((i) => i.status === filter.status);
  }
  if (filter?.priority && filter.priority !== "all") {
    filtered = filtered.filter((i) => i.priority === filter.priority);
  }
  if (filter?.category && filter.category !== "all") {
    filtered = filtered.filter((i) => i.category === filter.category);
  }
  if (filter?.author?.trim()) {
    const a = filter.author.trim().toLowerCase();
    filtered = filtered.filter((i) => i.authorUsername.toLowerCase().includes(a));
  }
  if (filter?.hasReports === "yes") {
    filtered = filtered.filter((i) => (i.reportCount ?? 0) > 0);
  } else if (filter?.hasReports === "no") {
    filtered = filtered.filter((i) => (i.reportCount ?? 0) === 0);
  }
  const cutoff = getPeriodCutoffIso(filter?.period);
  if (cutoff) {
    filtered = filtered.filter((i) => i.submittedAt >= cutoff);
  }
  if (filter?.query?.trim()) {
    const q = filter.query.trim().toLowerCase();
    filtered = filtered.filter(
      (i) =>
        i.title.toLowerCase().includes(q) ||
        i.summary.toLowerCase().includes(q) ||
        i.authorUsername.toLowerCase().includes(q) ||
        i.id.toLowerCase().includes(q)
    );
  }

  filtered.sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));

  return {
    status: 200,
    body: paginateItems(filtered, pagination),
  };
}

export async function handleExecuteModerationAction(
  supabase: AdminSupabaseClient,
  payload: {
    id?: unknown;
    contentType?: unknown;
    action?: unknown;
    reason?: unknown;
    contentPolicy?: unknown;
  }
): Promise<HandlerResponse<AdminActionResult>> {
  const auth = await authorizeAdminRequest(supabase, "moderator");
  if (!auth.ok) return auth.response;

  const { id, contentType, action, reason } = payload;
  if (!isValidUuid(id)) {
    return { status: 400, body: { error: "Invalid target content ID.", code: "invalid_input" } };
  }

  const trimmedReason = typeof reason === "string" ? reason.trim() : "";

  if (contentType === "research") {
    let decision: "approved" | "rejected" | "archived" | null = null;
    if (action === "approve") decision = "approved";
    else if (action === "reject") decision = "rejected";
    else if (action === "archive") decision = "archived";

    if (!decision) {
      return {
        status: 400,
        body: {
          error: `Action '${String(action)}' is not supported for research by moderate_research RPC.`,
          code: "unsupported_operation",
        },
      };
    }

    if (decision === "rejected" && trimmedReason.length < 5) {
      return {
        status: 400,
        body: {
          error: "A rejection reason of at least 5 characters is required.",
          code: "reason_required",
        },
      };
    }

    const { error } = await (supabase as unknown as {
      rpc: (
        fn: string,
        args: Record<string, unknown>
      ) => Promise<{ error: { code?: string; message?: string } | null }>;
    }).rpc("moderate_research", {
      p_research_id: id,
      p_decision: decision,
      p_reason: trimmedReason || null,
    });

    if (error) {
      const mapped = mapSupabaseAdminError(error, "Failed to moderate research.");
      return {
        status: mapped.httpStatus,
        body: { success: false, error: mapped.message, statusCode: mapped.httpStatus },
      };
    }

    return {
      status: 200,
      body: {
        success: true,
        statusCode: 200,
      },
    };
  }

  if (contentType === "resource") {
    const rawContentPolicy = payload.contentPolicy;
    const validContentPolicy =
      rawContentPolicy === "reduced" || rawContentPolicy === "standard"
        ? rawContentPolicy
        : undefined;

    if (action === "set_content_policy") {
      if (!validContentPolicy) {
        return {
          status: 400,
          body: {
            error: "contentPolicy must be 'standard' or 'reduced'.",
            code: "validation_error",
          },
        };
      }
      const { error: policyErr } = await (supabase as unknown as {
        rpc: (
          fn: string,
          args: Record<string, unknown>
        ) => Promise<{ error: { code?: string; message?: string } | null }>;
      }).rpc("set_resource_content_policy", {
        p_resource_id: id,
        p_content_policy: validContentPolicy,
        p_reason: trimmedReason || null,
      });
      if (policyErr) {
        const mapped = mapSupabaseAdminError(
          policyErr,
          "Failed to update resource content policy."
        );
        return {
          status: mapped.httpStatus,
          body: {
            success: false,
            error: mapped.message,
            statusCode: mapped.httpStatus,
          },
        };
      }
      return { status: 200, body: { success: true, statusCode: 200 } };
    }

    let decision: ResourceStatus | null = null;
    if (action === "approve") decision = "approved";
    else if (action === "reject") decision = "rejected";
    else if (action === "archive") decision = "archived";

    if (!decision) {
      return {
        status: 400,
        body: {
          error: `Action '${String(action)}' is not supported for resources by the backend RPC.`,
          code: "unsupported_operation",
        },
      };
    }

    if (decision === "rejected" && trimmedReason.length < 5) {
      return {
        status: 400,
        body: {
          error: "A rejection reason of at least 5 characters is required.",
          code: "reason_required",
        },
      };
    }

    const { error } = await supabase.rpc("moderate_resource", {
      p_resource_id: id,
      p_decision: decision,
      p_reason: trimmedReason || undefined,
      ...(validContentPolicy ? { p_content_policy: validContentPolicy } : {}),
    });

    if (error) {
      const mapped = mapSupabaseAdminError(error, "Failed to moderate resource.");
      return {
        status: mapped.httpStatus,
        body: { success: false, error: mapped.message, statusCode: mapped.httpStatus },
      };
    }

    return {
      status: 200,
      body: { success: true, statusCode: 200 },
    };
  }

  if (contentType === "topic") {
    const allowed = new Set(["hide", "unhide", "delete", "pin", "unpin", "lock", "unlock"]);
    if (typeof action !== "string" || !allowed.has(action)) {
      return {
        status: 400,
        body: {
          error: `Action '${String(action)}' is not supported for topics.`,
          code: "unsupported_operation",
        },
      };
    }
    if ((action === "hide" || action === "delete") && trimmedReason.length < 5) {
      return {
        status: 400,
        body: {
          error: "A justification of at least 5 characters is required.",
          code: "reason_required",
        },
      };
    }

    const { error } = await supabase.rpc("moderate_topic", {
      p_topic_id: id,
      p_action: action,
      p_reason: trimmedReason || undefined,
    });

    if (error) {
      const mapped = mapSupabaseAdminError(error, "Failed to moderate topic.");
      return {
        status: mapped.httpStatus,
        body: { success: false, error: mapped.message, statusCode: mapped.httpStatus },
      };
    }

    return {
      status: 200,
      body: { success: true, statusCode: 200 },
    };
  }

  if (contentType === "post") {
    const allowed = new Set(["hide", "unhide", "delete"]);
    if (typeof action !== "string" || !allowed.has(action)) {
      return {
        status: 400,
        body: {
          error: `Action '${String(action)}' is not supported for posts.`,
          code: "unsupported_operation",
        },
      };
    }
    if ((action === "hide" || action === "delete") && trimmedReason.length < 5) {
      return {
        status: 400,
        body: {
          error: "A justification of at least 5 characters is required.",
          code: "reason_required",
        },
      };
    }

    const { error } = await supabase.rpc("moderate_post", {
      p_post_id: id,
      p_action: action,
      p_reason: trimmedReason || undefined,
    });

    if (error) {
      const mapped = mapSupabaseAdminError(error, "Failed to moderate post.");
      return {
        status: mapped.httpStatus,
        body: { success: false, error: mapped.message, statusCode: mapped.httpStatus },
      };
    }

    return {
      status: 200,
      body: { success: true, statusCode: 200 },
    };
  }

  return {
    status: 400,
    body: { error: "Invalid contentType.", code: "invalid_input" },
  };
}

export async function handleListAdminResources(
  supabase: AdminSupabaseClient,
  filter?: { status?: ResourceStatus | "all"; query?: string },
  pagination?: PaginationParams
): Promise<HandlerResponse<PaginatedResult<AdminResource>>> {
  const auth = await authorizeAdminRequest(supabase, "moderator");
  if (!auth.ok) return auth.response;

  let query = supabase
    .from("resources")
    .select(
      "id, slug, name, description, category_id, type, url, language, difficulty, author_name, submitted_by, status, rejection_reason, reviewed_by, reviewed_at, published_at, created_at"
    )
    .order("created_at", { ascending: false });

  if (filter?.status && filter.status !== "all") {
    query = query.eq("status", filter.status);
  }

  const { data, error } = await query;
  if (error) {
    const mapped = mapSupabaseAdminError(error, "Failed to list resources.");
    return { status: mapped.httpStatus, body: { error: mapped.message, code: mapped.code } };
  }

  const rows = data ?? [];
  const profileIds = rows
    .flatMap((r) => [r.submitted_by, r.reviewed_by])
    .filter((id): id is string => Boolean(id));
  const profilesMap = await loadProfilesMap(supabase, profileIds);

  let mapped: AdminResource[] = rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    name: r.name,
    description: r.description,
    category: r.category_id,
    type: r.type,
    url: r.url,
    language: r.language,
    difficulty: r.difficulty ?? "intermediate",
    authorName: r.author_name ?? undefined,
    submittedBy: r.submitted_by
      ? profilesMap.get(r.submitted_by)?.username ?? r.submitted_by
      : undefined,
    status: r.status,
    rejectionReason: r.rejection_reason ?? undefined,
    reviewedBy: r.reviewed_by
      ? profilesMap.get(r.reviewed_by)?.username ?? r.reviewed_by
      : undefined,
    reviewedAt: r.reviewed_at ?? undefined,
    publishedAt: r.published_at ?? undefined,
    createdAt: r.created_at,
  }));

  if (filter?.query?.trim()) {
    const q = filter.query.trim().toLowerCase();
    mapped = mapped.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        r.slug.toLowerCase().includes(q)
    );
  }

  return {
    status: 200,
    body: paginateItems(mapped, pagination),
  };
}

// ============================================================================
// 4. Reports Handlers
// ============================================================================

export async function handleListAdminReports(
  supabase: AdminSupabaseClient,
  filter?: {
    status?: ReportStatus | "all";
    reason?: ReportReason | "all";
    targetType?: ReportTargetType | "all";
  },
  pagination?: PaginationParams
): Promise<HandlerResponse<PaginatedResult<AdminReport>>> {
  const auth = await authorizeAdminRequest(supabase, "moderator");
  if (!auth.ok) return auth.response;

  let query = supabase
    .from("reports")
    .select(
      "id, reporter_id, topic_id, post_id, resource_id, profile_id, reason, details, status, handled_by, resolution_note, handled_at, created_at"
    )
    .order("created_at", { ascending: false });

  if (filter?.status && filter.status !== "all") {
    query = query.eq("status", filter.status);
  }
  if (filter?.reason && filter.reason !== "all") {
    query = query.eq("reason", filter.reason);
  }

  const { data, error } = await query;
  if (error) {
    const mapped = mapSupabaseAdminError(error, "Failed to list reports.");
    return { status: mapped.httpStatus, body: { error: mapped.message, code: mapped.code } };
  }

  const rows = data ?? [];
  const handlerIds = rows
    .map((r) => r.handled_by)
    .filter((id): id is string => Boolean(id));
  const profilesMap = await loadProfilesMap(supabase, handlerIds);

  let mappedReports: AdminReport[] = rows.map((row) => {
    const targetType: ReportTargetType = row.topic_id
      ? "topic"
      : row.post_id
        ? "post"
        : row.resource_id
          ? "resource"
          : "profile";
    const targetId =
      row.topic_id ?? row.post_id ?? row.resource_id ?? row.profile_id ?? "";
    const handler = row.handled_by ? profilesMap.get(row.handled_by) : undefined;

    return {
      id: row.id,
      // Privacy protection: never expose reporter identity in admin UI
      reporterId: "protected",
      reporterUsername: "protected",
      targetType,
      targetId,
      targetTitle: `${targetType.toUpperCase()} #${targetId.slice(0, 8)}`,
      reason: row.reason,
      details: row.details ?? null,
      status: row.status,
      handledBy: handler?.username ?? row.handled_by ?? null,
      resolutionNote: row.resolution_note ?? null,
      handledAt: row.handled_at ?? null,
      createdAt: row.created_at,
    };
  });

  if (filter?.targetType && filter.targetType !== "all") {
    mappedReports = mappedReports.filter(
      (r) => r.targetType === filter.targetType
    );
  }

  return {
    status: 200,
    body: paginateItems(mappedReports, pagination),
  };
}

export async function handleResolveAdminReport(
  supabase: AdminSupabaseClient,
  payload: { reportId?: unknown; status?: unknown; note?: unknown }
): Promise<HandlerResponse<AdminActionResult>> {
  const auth = await authorizeAdminRequest(supabase, "moderator");
  if (!auth.ok) return auth.response;

  const { reportId, status, note } = payload;
  if (!isValidUuid(reportId)) {
    return { status: 400, body: { error: "Invalid report ID.", code: "invalid_input" } };
  }
  if (status !== "reviewing" && status !== "resolved" && status !== "dismissed") {
    return {
      status: 400,
      body: {
        error: "Report status must be 'reviewing', 'resolved', or 'dismissed'.",
        code: "invalid_input",
      },
    };
  }

  const trimmedNote = typeof note === "string" ? note.trim() : "";

  const { error } = await supabase.rpc("resolve_report", {
    p_report_id: reportId,
    p_status: status,
    p_note: trimmedNote || undefined,
  });

  if (error) {
    const mapped = mapSupabaseAdminError(error, "Failed to resolve report.");
    return {
      status: mapped.httpStatus,
      body: { success: false, error: mapped.message, statusCode: mapped.httpStatus },
    };
  }

  return {
    status: 200,
    body: { success: true, statusCode: 200 },
  };
}

// ============================================================================
// 5. Audit Handlers (Admin-Only, Read-Only)
// ============================================================================

async function fetchAndFilterAuditEntries(
  supabase: AdminSupabaseClient,
  filter?: AdminAuditFilters
): Promise<
  | { ok: true; entries: AdminAuditEntry[] }
  | { ok: false; response: HandlerResponse<never> }
> {
  let query = supabase
    .from("audit_logs")
    .select("id, actor_id, action, entity_type, entity_id, metadata, created_at")
    .order("created_at", { ascending: filter?.sortOrder === "asc" })
    .limit(500);

  if (filter?.entityType && filter.entityType !== "all") {
    query = query.eq("entity_type", filter.entityType);
  }
  if (filter?.entityId) {
    query = query.eq("entity_id", filter.entityId);
  }
  if (filter?.action && filter.action !== "all") {
    query = query.eq("action", filter.action);
  }

  const cutoff =
    filter?.period === "custom" ? filter.startDate : getPeriodCutoffIso(filter?.period);
  if (cutoff) {
    query = query.gte("created_at", cutoff);
  }
  if (filter?.period === "custom" && filter.endDate) {
    query = query.lte("created_at", filter.endDate);
  }

  const { data, error } = await query;
  if (error) {
    const mapped = mapSupabaseAdminError(error, "Failed to load audit logs.");
    return {
      ok: false,
      response: { status: mapped.httpStatus, body: { error: mapped.message, code: mapped.code } },
    };
  }

  const rows = data ?? [];
  const actorIds = rows
    .map((r) => r.actor_id)
    .filter((id): id is string => Boolean(id));
  const profilesMap = await loadProfilesMap(supabase, actorIds);

  let entries: AdminAuditEntry[] = rows.map((row) => {
    const actor = row.actor_id ? profilesMap.get(row.actor_id) : undefined;
    const rawMeta =
      row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
        ? (row.metadata as Record<string, unknown>)
        : undefined;
    return {
      id: row.id,
      actorId: row.actor_id,
      actorUsername: actor?.username ?? (row.actor_id ? row.actor_id.slice(0, 8) : "system"),
      action: row.action,
      entityType: row.entity_type as AdminAuditEntry["entityType"],
      entityId: row.entity_id ?? "",
      metadata: sanitizeAuditMetadata(rawMeta) ?? {},
      createdAt: row.created_at,
    };
  });

  if (filter?.actorUsername?.trim()) {
    const actorFilter = filter.actorUsername.trim().toLowerCase();
    entries = entries.filter((e) =>
      e.actorUsername.toLowerCase().includes(actorFilter)
    );
  }
  if (filter?.severity && filter.severity !== "all") {
    entries = entries.filter((e) => classifyAuditSeverity(e) === filter.severity);
  }
  if (filter?.query?.trim()) {
    const q = filter.query.trim().toLowerCase();
    entries = entries.filter(
      (e) =>
        e.action.toLowerCase().includes(q) ||
        e.actorUsername.toLowerCase().includes(q) ||
        e.entityType.toLowerCase().includes(q) ||
        e.entityId.toLowerCase().includes(q) ||
        JSON.stringify(e.metadata ?? {}).toLowerCase().includes(q)
    );
  }

  return { ok: true, entries };
}

export async function handleListAdminAudit(
  supabase: AdminSupabaseClient,
  filter?: AdminAuditFilters,
  pagination?: PaginationParams
): Promise<HandlerResponse<PaginatedResult<AdminAuditEntry>>> {
  const auth = await authorizeAdminRequest(supabase, "admin");
  if (!auth.ok) return auth.response;

  const res = await fetchAndFilterAuditEntries(supabase, filter);
  if (!res.ok) return res.response;

  return {
    status: 200,
    body: paginateItems(res.entries, pagination),
  };
}

export async function handleExportAdminAudit(
  supabase: AdminSupabaseClient,
  filter?: AdminAuditFilters
): Promise<HandlerResponse<AdminAuditEntry[]>> {
  const auth = await authorizeAdminRequest(supabase, "admin");
  if (!auth.ok) return auth.response;

  const res = await fetchAndFilterAuditEntries(supabase, filter);
  if (!res.ok) return res.response;

  return {
    status: 200,
    body: res.entries,
  };
}

export async function handleGetAdminAuditById(
  supabase: AdminSupabaseClient,
  entryId: number
): Promise<HandlerResponse<AdminAuditEntry | null>> {
  const auth = await authorizeAdminRequest(supabase, "admin");
  if (!auth.ok) return auth.response;

  if (!Number.isFinite(entryId) || entryId <= 0) {
    return { status: 400, body: { error: "Invalid audit entry ID.", code: "invalid_input" } };
  }

  const { data, error } = await supabase
    .from("audit_logs")
    .select("id, actor_id, action, entity_type, entity_id, metadata, created_at")
    .eq("id", entryId)
    .maybeSingle();

  if (error) {
    const mapped = mapSupabaseAdminError(error, "Failed to fetch audit entry.");
    return { status: mapped.httpStatus, body: { error: mapped.message, code: mapped.code } };
  }

  if (!data) {
    return { status: 200, body: null };
  }

  const profilesMap = data.actor_id
    ? await loadProfilesMap(supabase, [data.actor_id])
    : new Map();
  const actor = data.actor_id ? profilesMap.get(data.actor_id) : undefined;
  const rawMeta =
    data.metadata && typeof data.metadata === "object" && !Array.isArray(data.metadata)
      ? (data.metadata as Record<string, unknown>)
      : undefined;

  return {
    status: 200,
    body: {
      id: data.id,
      actorId: data.actor_id,
      actorUsername: actor?.username ?? (data.actor_id ? data.actor_id.slice(0, 8) : "system"),
      action: data.action,
      entityType: data.entity_type as AdminAuditEntry["entityType"],
      entityId: data.entity_id ?? "",
      metadata: sanitizeAuditMetadata(rawMeta) ?? {},
      createdAt: data.created_at,
    },
  };
}

export async function handleGetAdminAuditSummary(
  supabase: AdminSupabaseClient
): Promise<HandlerResponse<AdminAuditSummary>> {
  const auth = await authorizeAdminRequest(supabase, "admin");
  if (!auth.ok) return auth.response;

  const { data, error } = await supabase
    .from("audit_logs")
    .select("id, actor_id, action, entity_type, entity_id, metadata, created_at")
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) {
    const mapped = mapSupabaseAdminError(error, "Failed to load audit summary.");
    return { status: mapped.httpStatus, body: { error: mapped.message, code: mapped.code } };
  }

  const rows = data ?? [];
  const entries: AdminAuditEntry[] = rows.map((row) => ({
    id: row.id,
    actorId: row.actor_id,
    actorUsername: row.actor_id ?? "system",
    action: row.action,
    entityType: row.entity_type as AdminAuditEntry["entityType"],
    entityId: row.entity_id ?? "",
    metadata:
      row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
        ? (row.metadata as Record<string, unknown>)
        : {},
    createdAt: row.created_at,
  }));

  const now = Date.now();
  const recentCutoff = now - 7 * 24 * 60 * 60 * 1000;

  return {
    status: 200,
    body: {
      totalEvents: entries.length,
      criticalEvents: entries.filter((e) => classifyAuditSeverity(e) === "critical").length,
      adminChanges: entries.filter(
        (e) =>
          e.action === "user.role_changed" ||
          e.action === "user.suspended" ||
          e.action === "user.unsuspended"
      ).length,
      accessDeniedEvents: entries.filter(
        (e) => classifyAuditSeverity(e) === "access_denied"
      ).length,
      recentEvents: entries.filter(
        (e) => new Date(e.createdAt).getTime() >= recentCutoff
      ).length,
    },
  };
}
