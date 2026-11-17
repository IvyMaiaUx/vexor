import type {
  AdminDashboardStats,
  AdminReport,
  AdminResource,
  AdminUser,
  IAdminDashboardService,
  ModerationQueueItem,
} from "../types";
import { IS_SIMULATED_ADMIN_DATA } from "../data/simulated-admin-data";

export interface SimulatedDashboardState {
  getUsers: () => readonly AdminUser[];
  getResources: () => readonly AdminResource[];
  getQueue: () => readonly ModerationQueueItem[];
  getReports: () => readonly AdminReport[];
  getAuditCount: () => number;
}

export class SimulatedAdminDashboardService implements IAdminDashboardService {
  private readonly state: SimulatedDashboardState;

  constructor(state: SimulatedDashboardState) {
    this.state = state;
  }

  async getDashboardStats(): Promise<AdminDashboardStats> {
    const users = this.state.getUsers();
    const resources = this.state.getResources();
    const queue = this.state.getQueue();
    const reports = this.state.getReports();

    const suspendedUsers = users.filter((u) => u.isSuspended).length;
    const publishedResources = resources.filter(
      (r) => r.status === "approved"
    ).length;
    const totalTopics = queue.filter((q) => q.contentType === "topic").length;
    const totalPosts = queue.filter((q) => q.contentType === "post").length;
    const pendingModerationItems = queue.filter(
      (q) => q.status === "pending" || q.status === "revision_requested"
    ).length;

    return {
      totalUsers: users.length,
      activeUsers: users.length - suspendedUsers,
      suspendedUsers,
      publishedResources,
      pendingResources: resources.filter((r) => r.status === "pending").length,
      rejectedResources: resources.filter((r) => r.status === "rejected").length,
      totalTopics,
      totalPosts,
      totalPublications: publishedResources + totalTopics + totalPosts,
      pendingModerationItems,
      pendingResearch: queue.filter(
        (q) => q.contentType === "research" && q.status === "pending"
      ).length,
      openReports: reports.filter(
        (r) => r.status === "open" || r.status === "reviewing"
      ).length,
      recentAuditActionsCount: this.state.getAuditCount(),
      isSimulatedDemoData: IS_SIMULATED_ADMIN_DATA,
    };
  }
}
