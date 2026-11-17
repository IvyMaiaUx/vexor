import type {
  AdminAuditEntry,
  AdminAuditFilters,
  AdminAuditSummary,
  IAdminAuditService,
  PaginatedResult,
  PaginationParams,
} from "../types";
import { IS_SIMULATED_ADMIN_DATA } from "../data/simulated-admin-data";
import {
  classifyAuditSeverity,
  safeStringifyAuditMetadata,
  sanitizeAuditMetadata,
} from "../utils/audit-export";
import { paginateItems } from "./shared";

export interface SimulatedAuditState {
  getAuditLogs: () => readonly AdminAuditEntry[];
}

function cloneSafeEntry(entry: AdminAuditEntry): AdminAuditEntry {
  return {
    ...entry,
    metadata: sanitizeAuditMetadata(entry.metadata),
  };
}

export class SimulatedAdminAuditService implements IAdminAuditService {
  private readonly state: SimulatedAuditState;

  constructor(state: SimulatedAuditState) {
    this.state = state;
  }

  private applyFilters(filter?: AdminAuditFilters): AdminAuditEntry[] {
    const rawLogs = this.state.getAuditLogs();
    let result = rawLogs.map(cloneSafeEntry);

    if (filter?.entityType && filter.entityType !== "all") {
      result = result.filter((a) => a.entityType === filter.entityType);
    }

    if (filter?.entityId) {
      result = result.filter((a) => a.entityId === filter.entityId);
    }

    if (filter?.action && filter.action !== "all") {
      result = result.filter((a) => a.action === filter.action);
    }

    if (filter?.actorUsername?.trim()) {
      const actor = filter.actorUsername.trim().toLowerCase();
      result = result.filter((a) =>
        a.actorUsername.toLowerCase().includes(actor)
      );
    }

    if (filter?.severity && filter.severity !== "all") {
      result = result.filter(
        (a) => classifyAuditSeverity(a) === filter.severity
      );
    }

    if (filter?.period && filter.period !== "all" && filter.period !== "custom") {
      const daysMap: Record<"today" | "7d" | "30d" | "90d", number> = {
        today: 1,
        "7d": 7,
        "30d": 30,
        "90d": 90,
      };
      const days = daysMap[filter.period];
      const latestMs = rawLogs.reduce(
        (max, item) => Math.max(max, new Date(item.createdAt).getTime()),
        0
      );
      const refMs = Math.max(Date.now(), latestMs);
      const cutoffMs = refMs - days * 24 * 60 * 60 * 1000;
      result = result.filter((a) => new Date(a.createdAt).getTime() >= cutoffMs);
    }

    if (filter?.startDate) {
      const startMs = new Date(filter.startDate).getTime();
      if (!Number.isNaN(startMs)) {
        result = result.filter((a) => new Date(a.createdAt).getTime() >= startMs);
      }
    }

    if (filter?.endDate) {
      const endMs = new Date(filter.endDate).getTime();
      if (!Number.isNaN(endMs)) {
        result = result.filter((a) => new Date(a.createdAt).getTime() <= endMs);
      }
    }

    if (filter?.query?.trim()) {
      const q = filter.query.trim().toLowerCase();
      result = result.filter(
        (a) =>
          String(a.id).includes(q) ||
          a.actorUsername.toLowerCase().includes(q) ||
          a.action.toLowerCase().includes(q) ||
          a.entityType.toLowerCase().includes(q) ||
          a.entityId.toLowerCase().includes(q) ||
          safeStringifyAuditMetadata(a.metadata).toLowerCase().includes(q)
      );
    }

    const sortDir = filter?.sortOrder === "asc" ? 1 : -1;
    result.sort(
      (a, b) =>
        (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) *
        sortDir
    );

    return result;
  }

  async listAuditEntries(
    filter?: AdminAuditFilters,
    pagination?: PaginationParams
  ): Promise<PaginatedResult<AdminAuditEntry>> {
    const filtered = this.applyFilters(filter);
    return paginateItems(filtered, pagination, IS_SIMULATED_ADMIN_DATA);
  }

  async getAuditEntryById(entryId: number): Promise<AdminAuditEntry | null> {
    const found = this.state.getAuditLogs().find((a) => a.id === entryId);
    return found ? cloneSafeEntry(found) : null;
  }

  async getAuditSummary(): Promise<AdminAuditSummary> {
    const logs = this.state.getAuditLogs();
    const latestMs = logs.reduce(
      (max, item) => Math.max(max, new Date(item.createdAt).getTime()),
      0
    );
    const recentCutoff = Math.max(Date.now(), latestMs) - 24 * 60 * 60 * 1000;

    return {
      totalEvents: logs.length,
      criticalEvents: logs.filter(
        (a) => classifyAuditSeverity(a) === "critical"
      ).length,
      adminChanges: logs.filter(
        (a) =>
          a.action.startsWith("user.") ||
          a.action.startsWith("system.") ||
          a.action.startsWith("resource.")
      ).length,
      accessDeniedEvents: logs.filter(
        (a) => classifyAuditSeverity(a) === "access_denied"
      ).length,
      recentEvents: logs.filter(
        (a) => new Date(a.createdAt).getTime() >= recentCutoff
      ).length,
      isSimulatedDemoData: IS_SIMULATED_ADMIN_DATA,
    };
  }

  async exportFilteredEntries(
    filter?: AdminAuditFilters
  ): Promise<AdminAuditEntry[]> {
    return this.applyFilters(filter);
  }
}
