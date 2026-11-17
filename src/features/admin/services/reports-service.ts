import type { AuthUserProfile } from "@/features/auth/validation";
import type {
  AdminActionResult,
  AdminAuditEntry,
  AdminReport,
  IAdminReportsService,
  PaginatedResult,
  PaginationParams,
  ReportReason,
  ReportStatus,
  ReportTargetType,
} from "../types";
import { IS_SIMULATED_ADMIN_DATA } from "../data/simulated-admin-data";
import { hasModeratorAccess, paginateItems } from "./shared";

export interface SimulatedReportsState {
  reports: AdminReport[];
  appendAudit: (entry: Omit<AdminAuditEntry, "id" | "createdAt">) => void;
}

function sanitizeReportForModeration(report: AdminReport): AdminReport {
  return {
    ...report,
    // Never expose private reporter identity in moderation/admin list views
    reporterId: null,
    reporterUsername: "protected_reporter",
    history: report.history ? report.history.map((h) => ({ ...h })) : [],
  };
}

export class SimulatedAdminReportsService implements IAdminReportsService {
  private readonly state: SimulatedReportsState;

  constructor(state: SimulatedReportsState) {
    this.state = state;
  }

  async listReports(
    filter?: {
      status?: ReportStatus | "all";
      reason?: ReportReason | "all";
      targetType?: ReportTargetType | "all";
    },
    pagination?: PaginationParams
  ): Promise<PaginatedResult<AdminReport>> {
    let result = this.state.reports.map(sanitizeReportForModeration);

    if (filter?.status && filter.status !== "all") {
      result = result.filter((r) => r.status === filter.status);
    }
    if (filter?.reason && filter.reason !== "all") {
      result = result.filter((r) => r.reason === filter.reason);
    }
    if (filter?.targetType && filter.targetType !== "all") {
      result = result.filter((r) => r.targetType === filter.targetType);
    }

    return paginateItems(result, pagination, IS_SIMULATED_ADMIN_DATA);
  }

  async resolveReport(
    actor: AuthUserProfile,
    reportId: string,
    status: ReportStatus,
    note?: string
  ): Promise<AdminActionResult> {
    if (!hasModeratorAccess(actor)) {
      return {
        success: false,
        statusCode: 403,
        error: "forbidden: moderator or admin access required (42501)",
      };
    }

    const idx = this.state.reports.findIndex((r) => r.id === reportId);
    if (idx === -1) {
      return { success: false, statusCode: 404, error: "report not found" };
    }

    const current = this.state.reports[idx];
    if (current.status === status) {
      return {
        success: false,
        statusCode: 409,
        error: `conflict (409): report is already in status '${status}'`,
      };
    }

    const trimmedNote = note?.trim() ?? "";
    if (trimmedNote.length < 5) {
      return {
        success: false,
        statusCode: 400,
        error:
          "invalid_parameter (22023): resolution note must be at least 5 characters",
      };
    }

    const nowIso = new Date().toISOString();
    const previousStatus = current.status;
    const historyEntry = {
      status,
      actorUsername: actor.username,
      note: trimmedNote,
      timestamp: nowIso,
    };

    this.state.reports[idx] = {
      ...current,
      status,
      handledBy: actor.id,
      handledByUsername: actor.username,
      handledAt:
        status === "resolved" || status === "dismissed" ? nowIso : null,
      resolutionNote: trimmedNote,
      history: [...(current.history ?? []), historyEntry],
    };

    this.state.appendAudit({
      actorId: actor.id,
      actorUsername: actor.username,
      action: `report.${status}`,
      entityType: "report",
      entityId: reportId,
      metadata: {
        from: previousStatus,
        to: status,
        targetType: current.targetType,
        targetId: current.targetId,
        note: trimmedNote,
        isSimulatedDemoData: true,
      },
    });

    return { success: true, statusCode: 200 };
  }
}
