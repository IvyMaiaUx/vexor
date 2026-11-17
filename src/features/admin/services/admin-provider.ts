import {
  IS_SIMULATED_ADMIN_DATA,
  SIMULATED_ADMIN_USERS,
  SIMULATED_AUDIT_LOGS,
  SIMULATED_MODERATION_QUEUE,
  SIMULATED_REPORTS,
  SIMULATED_RESOURCES,
} from "../data/simulated-admin-data";
import type {
  AdminAuditEntry,
  AdminReport,
  AdminResource,
  AdminUser,
  IAdminDataProvider,
  ModerationQueueItem,
} from "../types";
import { createSupabaseAdminProvider } from "../data/supabase-admin-provider";
import { sanitizeAuditMetadata } from "../utils/audit-export";
import { SimulatedAdminAuditService } from "./audit-service";
import { SimulatedAdminDashboardService } from "./dashboard-service";
import { SimulatedAdminModerationService } from "./moderation-service";
import { SimulatedAdminReportsService } from "./reports-service";
import { SimulatedAdminResourcesService } from "./resources-service";
import { SimulatedAdminUsersService } from "./users-service";

/**
 * Creates an isolated in-memory simulated `IAdminDataProvider`.
 * No `localStorage` is used. Future stages can replace this factory with a
 * `createSupabaseAdminProvider()` implementing the exact same `IAdminDataProvider` contract.
 */
export function createSimulatedAdminProvider(): IAdminDataProvider {
  const users: AdminUser[] = SIMULATED_ADMIN_USERS.map((u) => ({
    ...u,
    interests: [...u.interests],
  }));
  const reports: AdminReport[] = SIMULATED_REPORTS.map((r) => ({
    ...r,
    history: r.history ? r.history.map((h) => ({ ...h })) : [],
  }));
  const resources: AdminResource[] = SIMULATED_RESOURCES.map((r) => ({ ...r }));
  const queue: ModerationQueueItem[] = SIMULATED_MODERATION_QUEUE.map((q) => ({
    ...q,
    tags: q.tags ? [...q.tags] : undefined,
    moderationHistory: q.moderationHistory
      ? q.moderationHistory.map((h) => ({ ...h }))
      : [],
    metadata: q.metadata ? { ...q.metadata } : undefined,
  }));
  const auditLogs: AdminAuditEntry[] = SIMULATED_AUDIT_LOGS.map((a) => ({
    ...a,
    metadata: { ...a.metadata },
  }));

  const appendAudit = (entry: Omit<AdminAuditEntry, "id" | "createdAt">) => {
    const nextId =
      auditLogs.reduce((max, item) => Math.max(max, item.id), 0) + 1;
    auditLogs.unshift({
      ...entry,
      id: nextId,
      metadata: sanitizeAuditMetadata(entry.metadata),
      createdAt: new Date().toISOString(),
    });
  };

  return {
    isSimulated: IS_SIMULATED_ADMIN_DATA,
    dashboard: new SimulatedAdminDashboardService({
      getUsers: () => users,
      getResources: () => resources,
      getQueue: () => queue,
      getReports: () => reports,
      getAuditCount: () => auditLogs.length,
    }),
    users: new SimulatedAdminUsersService({ users, appendAudit }),
    moderation: new SimulatedAdminModerationService({ queue, appendAudit }),
    reports: new SimulatedAdminReportsService({ reports, appendAudit }),
    resources: new SimulatedAdminResourcesService({ resources, appendAudit }),
    audit: new SimulatedAdminAuditService({ getAuditLogs: () => auditLogs }),
  };
}

export { createSupabaseAdminProvider };

export const adminDataProvider: IAdminDataProvider =
  createSupabaseAdminProvider();
