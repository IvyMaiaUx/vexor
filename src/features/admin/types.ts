/**
 * VEXOR — Administrative & Moderation Domain Types
 *
 * Strictly aligned with PostgreSQL 18.6 schema (supabase/migrations/):
 * - public.user_role ('member', 'moderator', 'admin')
 * - public.resource_status ('pending', 'approved', 'rejected', 'archived')
 * - public.content_status ('published', 'hidden', 'deleted')
 * - public.report_status ('open', 'reviewing', 'resolved', 'dismissed')
 * - public.report_reason ('spam', 'malicious_content', 'personal_data', 'harassment', 'unauthorized_attack', 'copyright', 'other')
 *
 * NOTE on Cybercrime Research:
 * The current database schema does not have a dedicated `cybercrime_research` table.
 * Research submissions are maintained in an isolated simulated layer in this phase,
 * ready to be mapped to a dedicated table or public.resources (category: 'cybercrime')
 * during backend integration.
 */

import type { FeaturedResourceItem } from "@/config/site";
import type { AuthUserProfile } from "@/features/auth/validation";
import type { ForumPost, ForumTopic } from "@/features/forum/types";

export type DbUserRole = "member" | "moderator" | "admin";
export type ResourceStatus = "pending" | "approved" | "rejected" | "archived";
export type ContentStatus = "published" | "hidden" | "deleted";
export type ReportStatus = "open" | "reviewing" | "resolved" | "dismissed";
export type ReportReason =
  | "spam"
  | "malicious_content"
  | "personal_data"
  | "harassment"
  | "unauthorized_attack"
  | "copyright"
  | "other";

export type ReportTargetType = "topic" | "post" | "resource" | "profile";

export interface ReportHistoryEntry {
  status: ReportStatus;
  actorUsername: string;
  note?: string;
  timestamp: string;
}

export interface Report {
  id: string;
  reporterId: string | null;
  reporterUsername: string;
  targetType: ReportTargetType;
  targetId: string;
  targetTitle?: string;
  targetSnippet?: string;
  topicId?: string;
  postId?: string;
  resourceId?: string;
  profileId?: string;
  reason: ReportReason;
  details: string | null;
  status: ReportStatus;
  handledBy: string | null;
  handledByUsername?: string;
  handledAt: string | null;
  resolutionNote: string | null;
  createdAt: string;
  history?: ReportHistoryEntry[];
}

export interface AuditLog {
  id: number;
  actorId: string | null;
  actorUsername: string;
  action: string;
  entityType: "profile" | "resource" | "topic" | "post" | "report" | "research" | "system";
  entityId: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  incomplete?: boolean;
}

export interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  suspendedUsers: number;
  publishedResources: number;
  pendingResources: number;
  rejectedResources: number;
  totalTopics: number;
  totalPosts: number;
  pendingResearch: number;
  openReports: number;
  recentAuditActionsCount: number;
}

export interface ResearchSubmission {
  id: string;
  title_pt: string;
  title_en: string;
  summary_pt: string;
  summary_en: string;
  domain: "malware" | "ransomware" | "apt" | "darkweb" | "fraud";
  severity: "critical" | "high" | "medium" | "info";
  tlp: "CLEAR" | "GREEN" | "AMBER";
  author: string;
  authorRole: DbUserRole;
  authorSpecialty?: string;
  submittedAt: string;
  status: "pending" | "approved" | "rejected" | "revision_requested";
  rejectionReason?: string;
  moderatorNotes?: string;
  cves?: string[];
  attackTechniques: string[];
  readTimeMinutes: number;
}

export interface AdminActionResult {
  success: boolean;
  error?: string;
  statusCode?: number;
}

/**
 * Interface contract for administrative operations.
 * Separates UI logic completely from the data source, allowing
 * seamless replacement with `@supabase/ssr` / PostgreSQL RPCs in the future.
 */
export type ModerationContentType = "resource" | "topic" | "post" | "research";
export type ModerationPriority = "low" | "medium" | "high" | "critical";

export interface ModerationHistoryEntry {
  id: string;
  action: ModerationAction;
  actorUsername: string;
  fromStatus: string;
  toStatus: string;
  reason?: string;
  timestamp: string;
}

export interface UnifiedModerationItem {
  id: string;
  contentType: ModerationContentType;
  title: string;
  authorUsername: string;
  authorRole: DbUserRole;
  authorDisplayName?: string;
  category: string;
  submittedAt: string;
  updatedAt?: string;
  status:
    | "pending"
    | "approved"
    | "rejected"
    | "revision_requested"
    | "escalated"
    | "archived"
    | "published"
    | "hidden"
    | "deleted";
  priority?: ModerationPriority;
  flagReason?: string;
  reportCount?: number;
  rejectionReason?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  url?: string;
  summary: string;
  fullBody?: string;
  tags?: string[];
  incomplete?: boolean;
  moderationHistory?: ModerationHistoryEntry[];
  metadata?: Record<string, unknown>;
}

export interface IAdminService {
  // Queries
  getStats(): Promise<AdminStats>;
  getUsers(filter?: {
    query?: string;
    role?: DbUserRole | "all";
    suspendedOnly?: boolean;
  }): Promise<AuthUserProfile[]>;
  getPendingResources(): Promise<FeaturedResourceItem[]>;
  getAllResourcesForModeration(): Promise<FeaturedResourceItem[]>;
  getForumTopicsForModeration(): Promise<ForumTopic[]>;
  getForumPostsForModeration(topicId?: string): Promise<ForumPost[]>;
  getResearchSubmissions(): Promise<ResearchSubmission[]>;
  getReports(filter?: {
    status?: ReportStatus | "all";
    reason?: ReportReason | "all";
    targetType?: ReportTargetType | "all";
  }): Promise<Report[]>;
  getAuditLogs(filter?: {
    entityType?: string;
    action?: string;
    actorUsername?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
  }): Promise<AuditLog[]>;
  recordSecurityEvent?(
    actor: { id: string | null; username: string },
    action: string,
    entityType: AuditLog["entityType"],
    entityId: string,
    metadata?: Record<string, unknown>
  ): Promise<void>;

  // Operations mirroring PostgreSQL RPCs
  setUserRole(
    actor: AuthUserProfile,
    targetUserId: string,
    newRole: DbUserRole
  ): Promise<AdminActionResult>;
  setUserSuspension(
    actor: AuthUserProfile,
    targetUserId: string,
    suspended: boolean,
    reason?: string
  ): Promise<AdminActionResult>;
  moderateResource(
    actor: AuthUserProfile,
    resourceId: string,
    decision: ResourceStatus,
    reason?: string
  ): Promise<AdminActionResult>;
  resubmitResource?(
    user: AuthUserProfile,
    resourceId: string
  ): Promise<AdminActionResult>;
  getUnifiedModerationQueue?(filter?: {
    contentType?: ModerationContentType | "all";
    status?: string;
    category?: string;
    author?: string;
    query?: string;
  }): Promise<UnifiedModerationItem[]>;
  moderateTopic(
    actor: AuthUserProfile,
    topicId: string,
    action: "hide" | "unhide" | "delete" | "pin" | "unpin" | "lock" | "unlock",
    reason?: string
  ): Promise<AdminActionResult>;
  moderatePost(
    actor: AuthUserProfile,
    postId: string,
    action: "hide" | "unhide" | "delete",
    reason?: string
  ): Promise<AdminActionResult>;
  resolveReport(
    actor: AuthUserProfile,
    reportId: string,
    status: ReportStatus,
    note?: string
  ): Promise<AdminActionResult>;
  moderateResearch(
    actor: AuthUserProfile,
    researchId: string,
    decision: "approved" | "rejected" | "revision_requested",
    notes?: string
  ): Promise<AdminActionResult>;
}

// ============================================================================
// Etapa 1 — Standardized Administrative Data Models & Modular Contracts
// ============================================================================

export type AdminUserStatus = "active" | "suspended";

/**
 * Administrative view model of a community user aligned with `public.profiles`.
 * Private authentication fields (e.g. email) are never exposed by default.
 * Role hierarchy strictly follows `public.user_role`: 'member' | 'moderator' | 'admin'.
 */
export interface AdminUser {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  bio?: string;
  interests: string[];
  githubUrl?: string;
  linkedinUrl?: string;
  preferredLanguage: "pt-BR" | "en";
  role: DbUserRole;
  status: AdminUserStatus;
  isSuspended: boolean;
  createdAt: string;
  lastActivityAt?: string;
  isSimulatedDemoData?: boolean;
}

export interface AdminUserFilters {
  query?: string;
  role?: DbUserRole | "all";
  status?: AdminUserStatus | "all";
  suspendedOnly?: boolean;
  period?: "all" | "7d" | "30d" | "90d";
}

export interface AdminUsersSummary {
  totalUsers: number;
  activeUsers: number;
  suspendedUsers: number;
  adminUsers: number;
  activeAdminUsers: number;
  moderatorUsers: number;
  isSimulatedDemoData: boolean;
}

export interface AdminDashboardStats extends AdminStats {
  /** Total published/community content items (resources + topics + posts). */
  totalPublications: number;
  /** Count of moderation queue items currently awaiting review. */
  pendingModerationItems: number;
  /** Explicit flag indicating whether counts come from simulated demo data. */
  isSimulatedDemoData: boolean;
}

export type ModerationQueueItem = UnifiedModerationItem;

export type ModerationAction =
  | "approve"
  | "reject"
  | "archive"
  | "hide"
  | "unhide"
  | "restore"
  | "escalate"
  | "delete"
  | "pin"
  | "unpin"
  | "lock"
  | "unlock"
  | "request_revision";

export interface ModerationQueueFilter {
  contentType?: ModerationContentType | "all";
  status?: string;
  priority?: ModerationPriority | "all";
  category?: string;
  author?: string;
  hasReports?: "all" | "yes" | "no";
  period?: "all" | "24h" | "7d" | "30d";
  query?: string;
}

export type AdminReport = Report;

export interface AdminResource {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: string;
  type: FeaturedResourceItem["type"];
  url: string;
  language: string;
  difficulty: FeaturedResourceItem["difficulty"];
  authorName?: string;
  submittedBy?: string;
  status: ResourceStatus;
  rejectionReason?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  publishedAt?: string;
  createdAt?: string;
  isSimulatedDemoData?: boolean;
}

export type AdminAuditEntry = AuditLog;

export interface PaginationParams {
  page?: number;
  pageSize?: number;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  isSimulatedDemoData?: boolean;
}

export interface IAdminDashboardService {
  getDashboardStats(): Promise<AdminDashboardStats>;
}

export interface IAdminUsersService {
  listUsers(
    filters?: AdminUserFilters,
    pagination?: PaginationParams
  ): Promise<PaginatedResult<AdminUser>>;
  getUserById(userId: string): Promise<AdminUser | null>;
  getUsersSummary(): Promise<AdminUsersSummary>;
  updateUserRole(
    actor: AuthUserProfile,
    targetUserId: string,
    newRole: DbUserRole
  ): Promise<AdminActionResult>;
  updateUserSuspension(
    actor: AuthUserProfile,
    targetUserId: string,
    suspended: boolean,
    reason?: string
  ): Promise<AdminActionResult>;
}

export interface IAdminModerationService {
  listQueue(
    filter?: ModerationQueueFilter,
    pagination?: PaginationParams
  ): Promise<PaginatedResult<ModerationQueueItem>>;
  getItemById?(
    id: string,
    contentType: ModerationContentType
  ): Promise<ModerationQueueItem | null>;
  getAvailableActions?(item: ModerationQueueItem): ModerationAction[];
  executeAction(
    actor: AuthUserProfile,
    item: { id: string; contentType: ModerationContentType },
    action: ModerationAction,
    reason?: string
  ): Promise<AdminActionResult>;
}

export interface IAdminReportsService {
  listReports(
    filter?: {
      status?: ReportStatus | "all";
      reason?: ReportReason | "all";
      targetType?: ReportTargetType | "all";
    },
    pagination?: PaginationParams
  ): Promise<PaginatedResult<AdminReport>>;
  resolveReport(
    actor: AuthUserProfile,
    reportId: string,
    status: ReportStatus,
    note?: string
  ): Promise<AdminActionResult>;
}

export interface IAdminResourcesService {
  listResources(
    filter?: { status?: ResourceStatus | "all"; query?: string },
    pagination?: PaginationParams
  ): Promise<PaginatedResult<AdminResource>>;
  moderateResource(
    actor: AuthUserProfile,
    resourceId: string,
    decision: ResourceStatus,
    reason?: string
  ): Promise<AdminActionResult>;
}

export type AuditSeverity = "info" | "warning" | "critical" | "access_denied";
export type AuditPeriodFilter = "all" | "today" | "7d" | "30d" | "90d" | "custom";

export interface AdminAuditFilters {
  query?: string;
  entityType?: string;
  entityId?: string;
  action?: string;
  actorUsername?: string;
  severity?: AuditSeverity | "all";
  period?: AuditPeriodFilter;
  startDate?: string;
  endDate?: string;
  sortOrder?: "desc" | "asc";
}

export interface AdminAuditSummary {
  totalEvents: number;
  criticalEvents: number;
  adminChanges: number;
  accessDeniedEvents: number;
  recentEvents: number;
  isSimulatedDemoData: boolean;
}

export interface IAdminAuditService {
  listAuditEntries(
    filter?: AdminAuditFilters,
    pagination?: PaginationParams
  ): Promise<PaginatedResult<AdminAuditEntry>>;
  getAuditEntryById(entryId: number): Promise<AdminAuditEntry | null>;
  getAuditSummary(): Promise<AdminAuditSummary>;
  exportFilteredEntries(filter?: AdminAuditFilters): Promise<AdminAuditEntry[]>;
}

export interface IAdminDataProvider {
  readonly isSimulated: boolean;
  readonly dashboard: IAdminDashboardService;
  readonly users: IAdminUsersService;
  readonly moderation: IAdminModerationService;
  readonly reports: IAdminReportsService;
  readonly resources: IAdminResourcesService;
  readonly audit: IAdminAuditService;
}
