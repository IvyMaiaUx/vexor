import type {
  AdminActionResult,
  AdminAuditEntry,
  AdminAuditFilters,
  AdminAuditSummary,
  AdminDashboardStats,
  AdminReport,
  AdminResource,
  AdminUser,
  AdminUserFilters,
  AdminUsersSummary,
  IAdminDataProvider,
  ModerationAction,
  ModerationContentType,
  ModerationQueueFilter,
  ModerationQueueItem,
  PaginatedResult,
  PaginationParams,
  ReportReason,
  ReportStatus,
  ReportTargetType,
  ResourceStatus,
} from "../types";
import { getModerationAvailableActions } from "../utils/moderation-actions";

function buildSearchParams(
  params: Record<string, string | number | boolean | undefined | null>
): string {
  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      sp.set(key, String(value));
    }
  }
  const qs = sp.toString();
  return qs ? `?${qs}` : "";
}

async function fetchAdminJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    credentials: "same-origin",
  });

  const data = (await res.json().catch(() => null)) as
    | (T & { error?: string; message?: string })
    | null;

  if (!res.ok) {
    const errMsg =
      data?.error ?? data?.message ?? `Administrative request failed (${res.status}).`;
    throw new Error(errMsg);
  }

  if (data === null) {
    throw new Error("Empty response from administrative endpoint.");
  }

  return data;
}

async function mutateAdminAction(
  url: string,
  method: "POST" | "PATCH",
  body: Record<string, unknown>
): Promise<AdminActionResult> {
  try {
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify(body),
    });

    const data = (await res.json().catch(() => null)) as
      | (AdminActionResult & { error?: string; message?: string })
      | null;

    if (!res.ok) {
      return {
        success: false,
        error:
          data?.error ??
          data?.message ??
          `Administrative operation failed (${res.status}).`,
      };
    }

    return {
      success: data?.success ?? true,
      error: data?.error,
      statusCode: data?.statusCode ?? res.status,
    };
  } catch (err) {
    return {
      success: false,
      error:
        err instanceof Error
          ? err.message
          : "Network error during administrative operation.",
    };
  }
}

export function createSupabaseAdminProvider(): IAdminDataProvider {
  return {
    dashboard: {
      async getDashboardStats(): Promise<AdminDashboardStats> {
        return fetchAdminJson<AdminDashboardStats>("/api/admin/dashboard");
      },
    },

    users: {
      async listUsers(
        filters?: AdminUserFilters,
        pagination?: PaginationParams
      ): Promise<PaginatedResult<AdminUser>> {
        const qs = buildSearchParams({
          query: filters?.query,
          role: filters?.role,
          status: filters?.status,
          suspendedOnly: filters?.suspendedOnly,
          period: filters?.period,
          page: pagination?.page,
          pageSize: pagination?.pageSize,
        });
        return fetchAdminJson<PaginatedResult<AdminUser>>(`/api/admin/users${qs}`);
      },

      async getUserById(userId: string): Promise<AdminUser | null> {
        const qs = buildSearchParams({ userId });
        return fetchAdminJson<AdminUser | null>(`/api/admin/users${qs}`);
      },

      async getUsersSummary(): Promise<AdminUsersSummary> {
        return fetchAdminJson<AdminUsersSummary>("/api/admin/users?mode=summary");
      },

      async updateUserRole(
        _actor,
        targetUserId,
        newRole
      ): Promise<AdminActionResult> {
        return mutateAdminAction("/api/admin/users", "PATCH", {
          operation: "set_role",
          targetUserId,
          newRole,
        });
      },

      async updateUserSuspension(
        _actor,
        targetUserId,
        suspended,
        reason
      ): Promise<AdminActionResult> {
        return mutateAdminAction("/api/admin/users", "PATCH", {
          operation: "set_suspension",
          targetUserId,
          suspended,
          reason,
        });
      },
    },

    moderation: {
      async listQueue(
        filter?: ModerationQueueFilter,
        pagination?: PaginationParams
      ): Promise<PaginatedResult<ModerationQueueItem>> {
        const qs = buildSearchParams({
          contentType: filter?.contentType,
          status: filter?.status,
          priority: filter?.priority,
          category: filter?.category,
          author: filter?.author,
          hasReports: filter?.hasReports,
          period: filter?.period,
          query: filter?.query,
          page: pagination?.page,
          pageSize: pagination?.pageSize,
        });
        return fetchAdminJson<PaginatedResult<ModerationQueueItem>>(
          `/api/admin/moderation${qs}`
        );
      },

      async getItemById(
        id: string,
        contentType: ModerationContentType
      ): Promise<ModerationQueueItem | null> {
        const res = await fetchAdminJson<PaginatedResult<ModerationQueueItem>>(
          `/api/admin/moderation${buildSearchParams({ contentType, page: 1, pageSize: 100 })}`
        );
        return res.items.find((i) => i.id === id) ?? null;
      },

      getAvailableActions(item: ModerationQueueItem): ModerationAction[] {
        return getModerationAvailableActions(item);
      },

      async executeAction(
        _actor,
        item: { id: string; contentType: ModerationContentType },
        action: ModerationAction,
        reason?: string
      ): Promise<AdminActionResult> {
        return mutateAdminAction("/api/admin/moderation", "POST", {
          id: item.id,
          contentType: item.contentType,
          action,
          reason,
        });
      },
    },

    reports: {
      async listReports(
        filter?: {
          status?: ReportStatus | "all";
          reason?: ReportReason | "all";
          targetType?: ReportTargetType | "all";
        },
        pagination?: PaginationParams
      ): Promise<PaginatedResult<AdminReport>> {
        const qs = buildSearchParams({
          status: filter?.status,
          reason: filter?.reason,
          targetType: filter?.targetType,
          page: pagination?.page,
          pageSize: pagination?.pageSize,
        });
        return fetchAdminJson<PaginatedResult<AdminReport>>(
          `/api/admin/reports${qs}`
        );
      },

      async resolveReport(
        _actor,
        reportId: string,
        status: ReportStatus,
        note?: string
      ): Promise<AdminActionResult> {
        return mutateAdminAction("/api/admin/reports", "POST", {
          reportId,
          status,
          note,
        });
      },
    },

    resources: {
      async listResources(
        filter?: { status?: ResourceStatus | "all"; query?: string },
        pagination?: PaginationParams
      ): Promise<PaginatedResult<AdminResource>> {
        const qs = buildSearchParams({
          status: filter?.status,
          query: filter?.query,
          page: pagination?.page,
          pageSize: pagination?.pageSize,
        });
        return fetchAdminJson<PaginatedResult<AdminResource>>(
          `/api/admin/resources${qs}`
        );
      },

      async moderateResource(
        _actor,
        resourceId: string,
        decision: ResourceStatus,
        reason?: string
      ): Promise<AdminActionResult> {
        return mutateAdminAction("/api/admin/resources", "POST", {
          resourceId,
          decision,
          reason,
        });
      },
    },

    audit: {
      async listAuditEntries(
        filter?: AdminAuditFilters,
        pagination?: PaginationParams
      ): Promise<PaginatedResult<AdminAuditEntry>> {
        const qs = buildSearchParams({
          query: filter?.query,
          entityType: filter?.entityType,
          entityId: filter?.entityId,
          action: filter?.action,
          actorUsername: filter?.actorUsername,
          severity: filter?.severity,
          period: filter?.period,
          startDate: filter?.startDate,
          endDate: filter?.endDate,
          sortOrder: filter?.sortOrder,
          page: pagination?.page,
          pageSize: pagination?.pageSize,
        });
        return fetchAdminJson<PaginatedResult<AdminAuditEntry>>(
          `/api/admin/audit${qs}`
        );
      },

      async getAuditEntryById(entryId: number): Promise<AdminAuditEntry | null> {
        const qs = buildSearchParams({ entryId });
        return fetchAdminJson<AdminAuditEntry | null>(`/api/admin/audit${qs}`);
      },

      async getAuditSummary(): Promise<AdminAuditSummary> {
        return fetchAdminJson<AdminAuditSummary>("/api/admin/audit?mode=summary");
      },

      async exportFilteredEntries(
        filter?: AdminAuditFilters
      ): Promise<AdminAuditEntry[]> {
        const qs = buildSearchParams({
          mode: "export",
          query: filter?.query,
          entityType: filter?.entityType,
          entityId: filter?.entityId,
          action: filter?.action,
          actorUsername: filter?.actorUsername,
          severity: filter?.severity,
          period: filter?.period,
          startDate: filter?.startDate,
          endDate: filter?.endDate,
          sortOrder: filter?.sortOrder,
        });
        return fetchAdminJson<AdminAuditEntry[]>(`/api/admin/audit${qs}`);
      },
    },
  };
}
