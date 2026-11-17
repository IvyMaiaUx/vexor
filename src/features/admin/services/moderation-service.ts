import type { AuthUserProfile } from "@/features/auth/validation";
import type {
  AdminActionResult,
  AdminAuditEntry,
  IAdminModerationService,
  ModerationAction,
  ModerationContentType,
  ModerationQueueFilter,
  ModerationQueueItem,
  PaginatedResult,
  PaginationParams,
} from "../types";
import { IS_SIMULATED_ADMIN_DATA } from "../data/simulated-admin-data";
import { hasModeratorAccess, paginateItems } from "./shared";

export interface SimulatedModerationState {
  queue: ModerationQueueItem[];
  appendAudit: (entry: Omit<AdminAuditEntry, "id" | "createdAt">) => void;
}

const ACTIONS_REQUIRING_REASON = new Set<ModerationAction>([
  "reject",
  "hide",
  "delete",
  "request_revision",
  "escalate",
]);

function resolveNextStatus(
  contentType: ModerationContentType,
  action: ModerationAction
): ModerationQueueItem["status"] {
  switch (action) {
    case "approve":
      return contentType === "topic" || contentType === "post"
        ? "published"
        : "approved";
    case "reject":
      return "rejected";
    case "archive":
      return "archived";
    case "hide":
      return "hidden";
    case "unhide":
    case "restore":
      return contentType === "topic" || contentType === "post"
        ? "published"
        : "pending";
    case "delete":
      return "deleted";
    case "request_revision":
      return "revision_requested";
    case "escalate":
      return "escalated";
    case "pin":
    case "unpin":
    case "lock":
    case "unlock":
      return "published";
  }
}

export function getModerationAvailableActions(
  item: Pick<ModerationQueueItem, "contentType" | "status">
): ModerationAction[] {
  const { contentType, status } = item;

  if (contentType === "resource") {
    switch (status) {
      case "pending":
        return ["approve", "reject", "hide", "request_revision", "escalate"];
      case "approved":
        return ["hide", "reject", "archive"];
      case "rejected":
      case "revision_requested":
        return ["approve", "restore", "archive"];
      case "escalated":
        return ["approve", "reject", "request_revision"];
      case "hidden":
      case "archived":
        return ["restore"];
      default:
        return [];
    }
  }

  if (contentType === "research") {
    switch (status) {
      case "pending":
        return ["approve", "reject", "request_revision", "escalate"];
      case "approved":
        return ["hide", "request_revision", "archive"];
      case "rejected":
      case "revision_requested":
        return ["approve", "restore"];
      case "escalated":
        return ["approve", "reject", "request_revision"];
      case "hidden":
      case "archived":
        return ["restore"];
      default:
        return [];
    }
  }

  // topic and post (content_status: published | hidden | deleted + pending/rejected/escalated in demo queue)
  switch (status) {
    case "pending":
      return ["approve", "reject", "hide", "escalate"];
    case "published":
    case "approved":
      return ["hide", "reject", "escalate"];
    case "hidden":
    case "rejected":
      return ["restore", "delete"];
    case "escalated":
      return ["approve", "hide", "reject"];
    case "deleted":
      return [];
    default:
      return [];
  }
}

function cloneQueueItem(item: ModerationQueueItem): ModerationQueueItem {
  return {
    ...item,
    tags: item.tags ? [...item.tags] : undefined,
    moderationHistory: item.moderationHistory
      ? item.moderationHistory.map((h) => ({ ...h }))
      : [],
    metadata: item.metadata ? { ...item.metadata } : undefined,
  };
}

export class SimulatedAdminModerationService implements IAdminModerationService {
  private readonly state: SimulatedModerationState;

  constructor(state: SimulatedModerationState) {
    this.state = state;
  }

  getAvailableActions(item: ModerationQueueItem): ModerationAction[] {
    return getModerationAvailableActions(item);
  }

  async getItemById(
    id: string,
    contentType: ModerationContentType
  ): Promise<ModerationQueueItem | null> {
    const found = this.state.queue.find(
      (q) => q.id === id && q.contentType === contentType
    );
    return found ? cloneQueueItem(found) : null;
  }

  async listQueue(
    filter?: ModerationQueueFilter,
    pagination?: PaginationParams
  ): Promise<PaginatedResult<ModerationQueueItem>> {
    let result = this.state.queue.map(cloneQueueItem);

    if (filter?.contentType && filter.contentType !== "all") {
      result = result.filter((i) => i.contentType === filter.contentType);
    }
    if (filter?.status && filter.status !== "all") {
      result = result.filter((i) => i.status === filter.status);
    }
    if (filter?.priority && filter.priority !== "all") {
      result = result.filter((i) => i.priority === filter.priority);
    }
    if (filter?.category && filter.category !== "all") {
      result = result.filter((i) => i.category === filter.category);
    }
    if (filter?.author?.trim()) {
      const a = filter.author.trim().toLowerCase();
      result = result.filter((i) =>
        i.authorUsername.toLowerCase().includes(a)
      );
    }
    if (filter?.hasReports === "yes") {
      result = result.filter((i) => (i.reportCount ?? 0) > 0);
    } else if (filter?.hasReports === "no") {
      result = result.filter((i) => (i.reportCount ?? 0) === 0);
    }
    if (filter?.period && filter.period !== "all") {
      const now = Date.now();
      const maxAgeMs =
        filter.period === "24h"
          ? 24 * 60 * 60 * 1000
          : filter.period === "7d"
            ? 7 * 24 * 60 * 60 * 1000
            : 30 * 24 * 60 * 60 * 1000;
      result = result.filter((i) => {
        const ts = new Date(i.updatedAt || i.submittedAt).getTime();
        return !Number.isNaN(ts) && now - ts <= maxAgeMs;
      });
    }
    if (filter?.query?.trim()) {
      const q = filter.query.trim().toLowerCase();
      result = result.filter(
        (i) =>
          i.title.toLowerCase().includes(q) ||
          i.summary.toLowerCase().includes(q) ||
          i.authorUsername.toLowerCase().includes(q) ||
          i.category.toLowerCase().includes(q) ||
          i.id.toLowerCase().includes(q) ||
          (i.flagReason?.toLowerCase().includes(q) ?? false)
      );
    }

    return paginateItems(result, pagination, IS_SIMULATED_ADMIN_DATA);
  }

  async executeAction(
    actor: AuthUserProfile,
    item: { id: string; contentType: ModerationContentType },
    action: ModerationAction,
    reason?: string
  ): Promise<AdminActionResult> {
    if (!hasModeratorAccess(actor)) {
      return {
        success: false,
        statusCode: 403,
        error: "forbidden: moderator or admin access required (42501)",
      };
    }

    const idx = this.state.queue.findIndex(
      (q) => q.id === item.id && q.contentType === item.contentType
    );
    if (idx === -1) {
      return {
        success: false,
        statusCode: 404,
        error: "moderation item not found",
      };
    }

    const current = this.state.queue[idx];
    const nextStatus = resolveNextStatus(current.contentType, action);
    const available = getModerationAvailableActions(current);

    if (current.status === nextStatus || !available.includes(action)) {
      return {
        success: false,
        statusCode: 409,
        error: `conflict (409): action '${action}' is incompatible with current status '${current.status}'`,
      };
    }

    const trimmedReason = reason?.trim() ?? "";
    if (ACTIONS_REQUIRING_REASON.has(action) && trimmedReason.length < 5) {
      return {
        success: false,
        statusCode: 400,
        error:
          "invalid_parameter (22023): reason must be at least 5 characters for this moderation action",
      };
    }

    const nowIso = new Date().toISOString();
    const previousStatus = current.status;
    const historyEntry = {
      id: `hist-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      action,
      actorUsername: actor.username,
      fromStatus: previousStatus,
      toStatus: nextStatus,
      reason: trimmedReason || undefined,
      timestamp: nowIso,
    };

    this.state.queue[idx] = {
      ...current,
      status: nextStatus,
      updatedAt: nowIso,
      reviewedBy: actor.username,
      reviewedAt: nowIso,
      rejectionReason:
        action === "approve" || action === "restore" || action === "unhide"
          ? undefined
          : trimmedReason || current.rejectionReason,
      moderationHistory: [historyEntry, ...(current.moderationHistory ?? [])],
    };

    this.state.appendAudit({
      actorId: actor.id,
      actorUsername: actor.username,
      action: `${item.contentType}.${action}`,
      entityType: item.contentType,
      entityId: item.id,
      metadata: {
        from: previousStatus,
        to: nextStatus,
        title: current.title,
        reason: trimmedReason || null,
        isSimulatedDemoData: true,
      },
    });

    return { success: true, statusCode: 200 };
  }
}
