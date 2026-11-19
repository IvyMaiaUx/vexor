import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database.types";

export type NotificationType =
  | Database["public"]["Enums"]["notification_type"]
  | "research_approved"
  | "research_rejected";
export type NotificationRow = Omit<
  Database["public"]["Tables"]["notifications"]["Row"],
  "type"
> & {
  type: NotificationType;
  research_id?: string | null;
};

export interface NotificationSupabaseError {
  message?: string;
  code?: string;
  status?: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type NotificationSupabaseClientLike = any;

export const NOTIFICATION_SELECT_COLUMNS =
  "id, user_id, type, actor_id, topic_id, post_id, resource_id, conversation_id, message_id, warning_id, read_at, created_at";

const FORBIDDEN_NOTIFICATION_UPDATE_KEYS = [
  "id",
  "user_id",
  "type",
  "actor_id",
  "topic_id",
  "post_id",
  "resource_id",
  "created_at",
] as const;

export interface NotificationItem {
  id: string;
  userId: string;
  type: NotificationType;
  actorId: string | null;
  actorUsername: string;
  actorDisplayName?: string;
  topicId: string | null;
  postId: string | null;
  resourceId: string | null;
  targetHref: string;
  readAt: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface NotificationsQueryResult {
  status: "success" | "unauthenticated" | "error";
  items: NotificationItem[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  errorMessage?: string;
}

export interface NotificationUnreadCountResult {
  status: "success" | "unauthenticated" | "error";
  unreadCount: number;
  errorMessage?: string;
}

export type NotificationMutationErrorCode =
  | "unauthenticated"
  | "rls_denied"
  | "not_found"
  | "validation_error"
  | "connection_error"
  | "mutation_failed";

export type NotificationMutationResult =
  | {
      status: "success";
      updatedId?: string;
    }
  | {
      status: "error";
      errorCode: NotificationMutationErrorCode;
      message: string;
    };

function getClient(
  override?: NotificationSupabaseClientLike
): NotificationSupabaseClientLike {
  return override ?? createClient();
}

function isValidUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value
  );
}

function isRlsOrPermissionError(error: NotificationSupabaseError): boolean {
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

/**
 * Builds a strictly internal VEXOR path for a notification.
 * Never constructs or allows external URLs.
 */
export function buildNotificationTargetHref(
  row: Pick<
    NotificationRow,
    "type" | "topic_id" | "post_id" | "resource_id" | "research_id" | "conversation_id"
  >,
  resourceSlugById: Map<string, string>
): string {
  if (row.research_id && isValidUuid(row.research_id)) {
    return `/cybercrime-research/library?research=${row.research_id}`;
  }
  if (row.type === "research_approved" || row.type === "research_rejected") {
    return "/cybercrime-research/library";
  }
  if (
    row.type === "direct_message" &&
    row.conversation_id &&
    isValidUuid(row.conversation_id)
  ) {
    return `/messages/${row.conversation_id}`;
  }
  if (row.type === "direct_message") {
    return "/messages";
  }
  if (row.topic_id && isValidUuid(row.topic_id)) {
    if (row.post_id && isValidUuid(row.post_id)) {
      return `/forum/${row.topic_id}#post-${row.post_id}`;
    }
    return `/forum/${row.topic_id}`;
  }
  if (row.resource_id && isValidUuid(row.resource_id)) {
    const slug = resourceSlugById.get(row.resource_id);
    if (slug && /^[a-z0-9-]+$/i.test(slug)) {
      return `/catalog/${slug}`;
    }
    return "/catalog";
  }
  return "/profile";
}

export async function fetchUserNotifications(
  options: {
    page?: number;
    pageSize?: number;
    requestedUserId?: string;
    client?: NotificationSupabaseClientLike;
  } = {}
): Promise<NotificationsQueryResult> {
  const page = Math.max(1, options.page ?? 1);
  const pageSize = Math.max(1, Math.min(50, options.pageSize ?? 10));

  try {
    const supabase = getClient(options.client);
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user?.id) {
      return {
        status: "unauthenticated",
        items: [],
        totalCount: 0,
        page: 1,
        pageSize,
        totalPages: 1,
      };
    }

    // Never allow querying another user's notifications
    if (
      options.requestedUserId &&
      options.requestedUserId !== user.id
    ) {
      return {
        status: "error",
        items: [],
        totalCount: 0,
        page,
        pageSize,
        totalPages: 1,
        errorMessage: "Cannot access notifications of another user.",
      };
    }

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, count, error } = await supabase
      .from("notifications")
      .select(NOTIFICATION_SELECT_COLUMNS, { count: "exact" })
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) {
      return {
        status: "error",
        items: [],
        totalCount: 0,
        page,
        pageSize,
        totalPages: 1,
        errorMessage: error.message ?? "Failed to fetch notifications.",
      };
    }

    const rows = Array.isArray(data) ? (data as NotificationRow[]) : [];
    const totalCount = typeof count === "number" ? count : rows.length;
    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

    const actorIds = Array.from(
      new Set(
        rows
          .map((r) => r.actor_id)
          .filter((id): id is string => typeof id === "string" && id.length > 0)
      )
    );
    const resourceIds = Array.from(
      new Set(
        rows
          .map((r) => r.resource_id)
          .filter((id): id is string => typeof id === "string" && id.length > 0)
      )
    );

    const actorById = new Map<
      string,
      { username: string; displayName?: string }
    >();
    const resourceSlugById = new Map<string, string>();

    await Promise.all([
      actorIds.length > 0
        ? supabase
            .from("public_profiles")
            .select("id, username, display_name")
            .in("id", actorIds)
            .then(
              (res: {
                data?: Array<{
                  id?: string;
                  username?: string;
                  display_name?: string | null;
                }>;
              }) => {
                if (Array.isArray(res?.data)) {
                  for (const p of res.data) {
                    if (p?.id && p?.username) {
                      actorById.set(p.id, {
                        username: p.username,
                        displayName: p.display_name ?? undefined,
                      });
                    }
                  }
                }
              }
            )
        : Promise.resolve(),
      resourceIds.length > 0
        ? supabase
            .from("resources")
            .select("id, slug")
            .in("id", resourceIds)
            .then(
              (res: {
                data?: Array<{ id?: string; slug?: string | null }>;
              }) => {
                if (Array.isArray(res?.data)) {
                  for (const r of res.data) {
                    if (r?.id && r?.slug) {
                      resourceSlugById.set(r.id, r.slug);
                    }
                  }
                }
              }
            )
        : Promise.resolve(),
    ]);

    const items: NotificationItem[] = rows.map((row) => {
      const actor = row.actor_id ? actorById.get(row.actor_id) : undefined;
      return {
        id: row.id,
        userId: row.user_id,
        type: row.type,
        actorId: row.actor_id,
        actorUsername: actor?.username ?? "sistema",
        actorDisplayName: actor?.displayName,
        topicId: row.topic_id,
        postId: row.post_id,
        resourceId: row.resource_id,
        targetHref: buildNotificationTargetHref(row, resourceSlugById),
        readAt: row.read_at,
        isRead: Boolean(row.read_at),
        createdAt: row.created_at,
      };
    });

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
        err instanceof Error ? err.message : "Failed to fetch notifications.",
    };
  }
}

export async function fetchUnreadNotificationCount(
  options: { client?: NotificationSupabaseClientLike } = {}
): Promise<NotificationUnreadCountResult> {
  try {
    const supabase = getClient(options.client);
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user?.id) {
      return { status: "unauthenticated", unreadCount: 0 };
    }

    const { count, error } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .is("read_at", null);

    if (error) {
      return {
        status: "error",
        unreadCount: 0,
        errorMessage: error.message ?? "Failed to count unread notifications.",
      };
    }

    return {
      status: "success",
      unreadCount: typeof count === "number" ? count : 0,
    };
  } catch (err) {
    return {
      status: "error",
      unreadCount: 0,
      errorMessage:
        err instanceof Error
          ? err.message
          : "Failed to count unread notifications.",
    };
  }
}

export async function markNotificationAsRead(
  notificationId: string,
  options: {
    client?: NotificationSupabaseClientLike;
    extraFields?: Record<string, unknown>;
  } = {}
): Promise<NotificationMutationResult> {
  if (!isValidUuid(notificationId)) {
    return {
      status: "error",
      errorCode: "validation_error",
      message: "Invalid notification ID.",
    };
  }

  if (options.extraFields) {
    const forbidden = FORBIDDEN_NOTIFICATION_UPDATE_KEYS.filter((k) =>
      Object.prototype.hasOwnProperty.call(options.extraFields, k)
    );
    if (forbidden.length > 0) {
      return {
        status: "error",
        errorCode: "validation_error",
        message: `Forbidden notification fields: ${forbidden.join(", ")}`,
      };
    }
  }

  try {
    const supabase = getClient(options.client);
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user?.id) {
      return {
        status: "error",
        errorCode: "unauthenticated",
        message: "Authentication required.",
      };
    }

    // Only granted column for authenticated update: read_at
    const { data, error } = await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", notificationId)
      .eq("user_id", user.id)
      .select(NOTIFICATION_SELECT_COLUMNS)
      .maybeSingle();

    if (error) {
      if (isRlsOrPermissionError(error)) {
        return {
          status: "error",
          errorCode: "rls_denied",
          message:
            error.message ?? "Permission denied to update notification.",
        };
      }
      return {
        status: "error",
        errorCode: "mutation_failed",
        message: error.message ?? "Failed to mark notification as read.",
      };
    }

    if (!data) {
      return {
        status: "error",
        errorCode: "not_found",
        message: "Notification not found or belongs to another user.",
      };
    }

    return {
      status: "success",
      updatedId: data.id,
    };
  } catch (err) {
    return {
      status: "error",
      errorCode: "connection_error",
      message:
        err instanceof Error
          ? err.message
          : "Failed to mark notification as read.",
    };
  }
}

export async function markAllNotificationsAsRead(
  options: { client?: NotificationSupabaseClientLike } = {}
): Promise<NotificationMutationResult> {
  try {
    const supabase = getClient(options.client);
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user?.id) {
      return {
        status: "error",
        errorCode: "unauthenticated",
        message: "Authentication required.",
      };
    }

    const { error } = await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .is("read_at", null);

    if (error) {
      if (isRlsOrPermissionError(error)) {
        return {
          status: "error",
          errorCode: "rls_denied",
          message:
            error.message ?? "Permission denied to update notifications.",
        };
      }
      return {
        status: "error",
        errorCode: "mutation_failed",
        message: error.message ?? "Failed to mark all notifications as read.",
      };
    }

    return { status: "success" };
  } catch (err) {
    return {
      status: "error",
      errorCode: "connection_error",
      message:
        err instanceof Error
          ? err.message
          : "Failed to mark all notifications as read.",
    };
  }
}
