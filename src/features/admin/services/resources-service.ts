import type { AuthUserProfile } from "@/features/auth/validation";
import type {
  AdminActionResult,
  AdminAuditEntry,
  AdminResource,
  IAdminResourcesService,
  PaginatedResult,
  PaginationParams,
  ResourceStatus,
} from "../types";
import { IS_SIMULATED_ADMIN_DATA } from "../data/simulated-admin-data";
import { hasModeratorAccess, paginateItems } from "./shared";

export interface SimulatedResourcesState {
  resources: AdminResource[];
  appendAudit: (entry: Omit<AdminAuditEntry, "id" | "createdAt">) => void;
}

export class SimulatedAdminResourcesService implements IAdminResourcesService {
  private readonly state: SimulatedResourcesState;

  constructor(state: SimulatedResourcesState) {
    this.state = state;
  }

  async listResources(
    filter?: { status?: ResourceStatus | "all"; query?: string },
    pagination?: PaginationParams
  ): Promise<PaginatedResult<AdminResource>> {
    let result = [...this.state.resources];

    if (filter?.status && filter.status !== "all") {
      result = result.filter((r) => r.status === filter.status);
    }

    if (filter?.query?.trim()) {
      const q = filter.query.trim().toLowerCase();
      result = result.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.slug.toLowerCase().includes(q) ||
          r.description.toLowerCase().includes(q)
      );
    }

    return paginateItems(result, pagination, IS_SIMULATED_ADMIN_DATA);
  }

  async moderateResource(
    actor: AuthUserProfile,
    resourceId: string,
    decision: ResourceStatus,
    reason?: string
  ): Promise<AdminActionResult> {
    if (!hasModeratorAccess(actor)) {
      return {
        success: false,
        error: "forbidden: moderator or admin access required (42501)",
      };
    }

    const trimmedReason = reason?.trim() ?? "";
    if (decision === "rejected" && trimmedReason.length < 3) {
      return {
        success: false,
        error: "rejection reason is required",
      };
    }

    const idx = this.state.resources.findIndex(
      (r) => r.id === resourceId || r.slug === resourceId
    );
    if (idx === -1) {
      return { success: false, error: "resource not found" };
    }

    const now = new Date().toISOString();
    this.state.resources[idx] = {
      ...this.state.resources[idx],
      status: decision,
      rejectionReason:
        decision === "rejected"
          ? trimmedReason
          : this.state.resources[idx].rejectionReason,
      reviewedBy: actor.username,
      reviewedAt: now,
      publishedAt:
        decision === "approved"
          ? this.state.resources[idx].publishedAt ?? now
          : this.state.resources[idx].publishedAt,
    };

    this.state.appendAudit({
      actorId: actor.id,
      actorUsername: actor.username,
      action: `resource.${decision}`,
      entityType: "resource",
      entityId: resourceId,
      metadata: {
        reason: trimmedReason || null,
        isSimulatedDemoData: true,
      },
    });

    return { success: true };
  }
}
