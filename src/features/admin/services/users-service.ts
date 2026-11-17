import type { AuthUserProfile } from "@/features/auth/validation";
import type {
  AdminActionResult,
  AdminAuditEntry,
  AdminUser,
  AdminUserFilters,
  AdminUsersSummary,
  DbUserRole,
  IAdminUsersService,
  PaginatedResult,
  PaginationParams,
} from "../types";
import { IS_SIMULATED_ADMIN_DATA } from "../data/simulated-admin-data";
import { hasAdminAccess, paginateItems } from "./shared";

export interface SimulatedUsersState {
  users: AdminUser[];
  appendAudit: (entry: Omit<AdminAuditEntry, "id" | "createdAt">) => void;
}

export class SimulatedAdminUsersService implements IAdminUsersService {
  private readonly state: SimulatedUsersState;

  constructor(state: SimulatedUsersState) {
    this.state = state;
  }

  async listUsers(
    filters?: AdminUserFilters,
    pagination?: PaginationParams
  ): Promise<PaginatedResult<AdminUser>> {
    let result = [...this.state.users];

    if (filters?.role && filters.role !== "all") {
      result = result.filter((u) => u.role === filters.role);
    }

    if (filters?.status && filters.status !== "all") {
      result = result.filter((u) => u.status === filters.status);
    }

    if (filters?.suspendedOnly) {
      result = result.filter((u) => u.isSuspended);
    }

    if (filters?.period && filters.period !== "all") {
      const daysMap: Record<"7d" | "30d" | "90d", number> = {
        "7d": 7,
        "30d": 30,
        "90d": 90,
      };
      const days = daysMap[filters.period];
      const latestMs = this.state.users.reduce(
        (max, u) => Math.max(max, new Date(u.createdAt).getTime()),
        0
      );
      const cutoffMs = latestMs - days * 24 * 60 * 60 * 1000;
      result = result.filter((u) => new Date(u.createdAt).getTime() >= cutoffMs);
    }

    if (filters?.query?.trim()) {
      const q = filters.query.trim().toLowerCase();
      result = result.filter(
        (u) =>
          u.username.toLowerCase().includes(q) ||
          u.displayName.toLowerCase().includes(q) ||
          u.id.toLowerCase().includes(q)
      );
    }

    return paginateItems(result, pagination, IS_SIMULATED_ADMIN_DATA);
  }

  async getUserById(userId: string): Promise<AdminUser | null> {
    return this.state.users.find((u) => u.id === userId) ?? null;
  }

  async getUsersSummary(): Promise<AdminUsersSummary> {
    const users = this.state.users;
    const suspendedUsers = users.filter((u) => u.isSuspended).length;
    return {
      totalUsers: users.length,
      activeUsers: users.length - suspendedUsers,
      suspendedUsers,
      adminUsers: users.filter((u) => u.role === "admin").length,
      activeAdminUsers: users.filter((u) => u.role === "admin" && !u.isSuspended).length,
      moderatorUsers: users.filter((u) => u.role === "moderator").length,
      isSimulatedDemoData: IS_SIMULATED_ADMIN_DATA,
    };
  }

  async updateUserRole(
    actor: AuthUserProfile,
    targetUserId: string,
    newRole: DbUserRole
  ): Promise<AdminActionResult> {
    if (!hasAdminAccess(actor)) {
      return { success: false, error: "42501: forbidden: admin access required" };
    }

    if (newRole !== "member" && newRole !== "moderator" && newRole !== "admin") {
      return { success: false, error: "22023: invalid target role" };
    }

    if (actor.id === targetUserId && newRole !== "admin") {
      return { success: false, error: "42501: admins cannot demote themselves" };
    }

    const idx = this.state.users.findIndex((u) => u.id === targetUserId);
    if (idx === -1) {
      return { success: false, error: "P0002: user not found" };
    }

    const target = this.state.users[idx];
    if (target.role === newRole) {
      return { success: false, error: "22023: target already has this role" };
    }

    const activeAdminsCount = this.state.users.filter(
      (u) => u.role === "admin" && !u.isSuspended
    ).length;
    if (
      target.role === "admin" &&
      !target.isSuspended &&
      newRole !== "admin" &&
      activeAdminsCount <= 1
    ) {
      return {
        success: false,
        error: "42501: cannot demote the last active administrator",
      };
    }

    const previousRole = target.role;
    this.state.users[idx] = { ...target, role: newRole };

    this.state.appendAudit({
      actorId: actor.id,
      actorUsername: actor.username,
      action: "user.role_changed",
      entityType: "profile",
      entityId: targetUserId,
      metadata: {
        from: previousRole,
        to: newRole,
        targetUsername: target.username,
        isSimulatedDemoData: true,
      },
    });

    return { success: true };
  }

  async updateUserSuspension(
    actor: AuthUserProfile,
    targetUserId: string,
    suspended: boolean,
    reason?: string
  ): Promise<AdminActionResult> {
    if (!hasAdminAccess(actor)) {
      return { success: false, error: "42501: forbidden: admin access required" };
    }

    if (actor.id === targetUserId && suspended) {
      return { success: false, error: "42501: admins cannot suspend themselves" };
    }

    const idx = this.state.users.findIndex((u) => u.id === targetUserId);
    if (idx === -1) {
      return { success: false, error: "P0002: user not found" };
    }

    const target = this.state.users[idx];
    if (suspended && target.isSuspended) {
      return { success: false, error: "22023: user is already suspended" };
    }
    if (!suspended && !target.isSuspended) {
      return { success: false, error: "22023: user is already active" };
    }

    const trimmedReason = reason?.trim() ?? "";
    if (suspended && trimmedReason.length < 5) {
      return {
        success: false,
        error: "22023: suspension reason must be at least 5 characters",
      };
    }

    const activeAdminsCount = this.state.users.filter(
      (u) => u.role === "admin" && !u.isSuspended
    ).length;
    if (
      suspended &&
      target.role === "admin" &&
      !target.isSuspended &&
      activeAdminsCount <= 1
    ) {
      return {
        success: false,
        error: "42501: cannot suspend the last active administrator",
      };
    }

    this.state.users[idx] = {
      ...target,
      isSuspended: suspended,
      status: suspended ? "suspended" : "active",
    };

    this.state.appendAudit({
      actorId: actor.id,
      actorUsername: actor.username,
      action: suspended ? "user.suspended" : "user.unsuspended",
      entityType: "profile",
      entityId: targetUserId,
      metadata: {
        ...(suspended ? { reason: trimmedReason } : {}),
        targetUsername: target.username,
        isSimulatedDemoData: true,
      },
    });

    return { success: true };
  }
}
