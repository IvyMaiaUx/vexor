/**
 * VEXOR — Admin Service Implementation (Simulated Layer)
 *
 * This service implements `IAdminService`, providing a clean, typed boundary
 * between business logic and the user interface. It simulates the exact behavior
 * of PostgreSQL 18.6 RPCs and constraints:
 * - `admin_set_user_role` (admin only, self-demote blocked)
 * - `admin_set_user_suspension` (admin only, self-suspension blocked, reason required)
 * - `moderate_resource` (moderator/admin, rejection_reason required on reject)
 * - `moderate_topic` (moderator/admin, reason required on hide/delete)
 * - `moderate_post` (moderator/admin, reason required on hide/delete)
 * - `resolve_report` (moderator/admin, resolution note recorded)
 * - `audit_logs` (immutable append-only log)
 *
 * When integrating with Supabase, this class can be swapped with a SupabaseAdminService
 * that calls the RPCs directly on PostgreSQL via `@supabase/ssr`.
 */

import type { FeaturedResourceItem } from "@/config/site";
import { FEATURED_RESOURCES } from "@/config/site";
import type { AuthUserProfile } from "@/features/auth/validation";
import { DEMO_PROFILES } from "@/features/auth/use-auth-store";
import type { ForumPost, ForumTopic } from "@/features/forum/types";
import { INITIAL_POSTS, INITIAL_TOPICS } from "@/features/forum/seed-topics";
import type {
  AdminActionResult,
  AdminStats,
  AuditLog,
  DbUserRole,
  IAdminService,
  ModerationContentType,
  Report,
  ReportReason,
  ReportStatus,
  ReportTargetType,
  ResearchSubmission,
  ResourceStatus,
  UnifiedModerationItem,
} from "../types";
import { sanitizeAuditMetadata } from "../utils/audit-export";

const ADMIN_REPORTS_STORAGE_KEY = "vexor_admin_reports";
const ADMIN_AUDIT_STORAGE_KEY = "vexor_admin_audit_logs";
const ADMIN_RESEARCH_STORAGE_KEY = "vexor_admin_research_queue";
const ADMIN_RESOURCES_STORAGE_KEY = "cybersec_catalog_all_resources";
const ADMIN_TOPICS_STORAGE_KEY = "vexor_forum_topics";
const ADMIN_POSTS_STORAGE_KEY = "vexor_forum_posts";
const ADMIN_USERS_STORAGE_KEY = "cybersec_registered_users";

function getAdminStorage(): Storage | undefined {
  if (typeof window !== "undefined" && window.localStorage) {
    return window.localStorage;
  }
  if (typeof globalThis !== "undefined" && (globalThis as unknown as { localStorage?: Storage }).localStorage) {
    return (globalThis as unknown as { localStorage: Storage }).localStorage;
  }
  return undefined;
}

// Initial Seed Reports (mirroring public.reports with 1 target per report)
const INITIAL_REPORTS: Report[] = [
  {
    id: "rep-0001",
    reporterId: "00000000-0000-0000-0000-000000000001",
    reporterUsername: "sec_analyst_br",
    targetType: "topic",
    targetId: "topic-002",
    topicId: "topic-002",
    targetTitle: "Bypass de EDR usando Syscalls Diretas e Hell's Gate em C++",
    targetSnippet: "Discussão técnica sobre técnicas ofensivas de injeção em NTDLL.",
    reason: "unauthorized_attack",
    details: "O tópico contém exemplos de código que podem ser utilizados para bypass ofensivo sem ênfase na detecção defensiva.",
    status: "open",
    handledBy: null,
    handledAt: null,
    resolutionNote: null,
    createdAt: "2026-11-08T11:20:00Z",
  },
  {
    id: "rep-0002",
    reporterId: "00000000-0000-0000-0000-000000000002",
    reporterUsername: "cve_hunter",
    targetType: "resource",
    targetId: "unverified-pentest-tool",
    resourceId: "unverified-pentest-tool",
    targetTitle: "Automated Recon Framework (v0.1)",
    targetSnippet: "Ferramenta enviada com link quebrado e sem documentação clara.",
    reason: "malicious_content",
    details: "Repositório suspeito hospedado em link de terceiro que pode conter malware embutido.",
    status: "reviewing",
    handledBy: "00000000-0000-0000-0000-000000000003",
    handledByUsername: "mod_sentinel",
    handledAt: null,
    resolutionNote: "Em análise pelo time de engenharia reversa para verificação de hash SHA256.",
    createdAt: "2026-11-09T14:45:00Z",
  },
  {
    id: "rep-0003",
    reporterId: "00000000-0000-0000-0000-000000000001",
    reporterUsername: "sec_analyst_br",
    targetType: "post",
    targetId: "post-003",
    postId: "post-003",
    targetTitle: "Resposta no tópico de Volatility 3",
    targetSnippet: "Comentário promocional com links para serviços comerciais externos.",
    reason: "spam",
    details: "Usuário divulgando serviço comercial pago sem autorização da comunidade.",
    status: "resolved",
    handledBy: "00000000-0000-0000-0000-000000000003",
    handledByUsername: "mod_sentinel",
    handledAt: "2026-11-10T16:00:00Z",
    resolutionNote: "Conteúdo ocultado e usuário advertido por conduta comercial não solicitada.",
    createdAt: "2026-11-07T09:15:00Z",
  },
  {
    id: "rep-0004",
    reporterId: "00000000-0000-0000-0000-000000000003",
    reporterUsername: "mod_sentinel",
    targetType: "profile",
    targetId: "00000000-0000-0000-0000-000000000005",
    profileId: "00000000-0000-0000-0000-000000000005",
    targetTitle: "@suspended_user",
    targetSnippet: "Perfil com bio contendo links de spam e conduta agressiva.",
    reason: "harassment",
    details: "Envio de mensagens abusivas para outros membros e postagem de links maliciosos.",
    status: "resolved",
    handledBy: "00000000-0000-0000-0000-000000000004",
    handledByUsername: "root_admin",
    handledAt: "2026-11-08T18:30:00Z",
    resolutionNote: "Conta suspensa preventivamente por 30 dias pela administração.",
    createdAt: "2026-11-08T17:00:00Z",
  },
];

// Initial Audit Logs (mirroring public.audit_logs: append-only)
const INITIAL_AUDIT_LOGS: AuditLog[] = [
  {
    id: 1,
    actorId: "00000000-0000-0000-0000-000000000004",
    actorUsername: "root_admin",
    action: "user.suspended",
    entityType: "profile",
    entityId: "00000000-0000-0000-0000-000000000005",
    metadata: { reason: "Violação recorrente das diretrizes anti-spam e assédio.", targetUsername: "suspended_user" },
    createdAt: "2026-11-08T18:30:00Z",
  },
  {
    id: 2,
    actorId: "00000000-0000-0000-0000-000000000003",
    actorUsername: "mod_sentinel",
    action: "resource.rejected",
    entityType: "resource",
    entityId: "unverified-pentest-tool",
    metadata: {
      name: "Unverified Pentest Tool",
      reason: "O repositório oficial informado retornou erro 404 e não continha documentação defensiva clara.",
    },
    createdAt: "2026-11-09T15:00:00Z",
  },
  {
    id: 3,
    actorId: "00000000-0000-0000-0000-000000000003",
    actorUsername: "mod_sentinel",
    action: "topic.pin",
    entityType: "topic",
    entityId: "topic-001",
    metadata: { title: "Guia Oficial de Triagem de Incidentes", reason: "Fixação do guia essencial de triagem de incidentes." },
    createdAt: "2026-11-10T08:30:00Z",
  },
  {
    id: 4,
    actorId: "00000000-0000-0000-0000-000000000004",
    actorUsername: "root_admin",
    action: "user.role_changed",
    entityType: "profile",
    entityId: "00000000-0000-0000-0000-000000000003",
    metadata: { from: "member", to: "moderator", targetUsername: "mod_sentinel" },
    createdAt: "2026-11-01T12:00:00Z",
  },
  {
    id: 5,
    actorId: "00000000-0000-0000-0000-000000000004",
    actorUsername: "root_admin",
    action: "resource.approved",
    entityType: "resource",
    entityId: "wireshark",
    metadata: { name: "Wireshark Network Analyzer", category: "network" },
    createdAt: "2026-11-05T09:15:00Z",
  },
  {
    id: 6,
    actorId: "00000000-0000-0000-0000-000000000003",
    actorUsername: "mod_sentinel",
    action: "report.resolved",
    entityType: "report",
    entityId: "rep-001",
    metadata: { targetType: "post", targetId: "post-103", note: "Conteúdo malicioso removido e usuário advertido." },
    createdAt: "2026-11-11T14:20:00Z",
  },
  {
    id: 7,
    actorId: "00000000-0000-0000-0000-000000000004",
    actorUsername: "root_admin",
    action: "research.approved",
    entityType: "research",
    entityId: "cr-sub-001",
    metadata: { title: "Análise da Campanha de Ransomware VoidLocker", domain: "ransomware", severity: "critical" },
    createdAt: "2026-11-04T11:00:00Z",
  },
  {
    id: 8,
    actorId: "00000000-0000-0000-0000-000000000001",
    actorUsername: "sec_analyst_br",
    action: "auth.access_denied",
    entityType: "system",
    entityId: "sys-gate-01",
    metadata: { attemptedRoute: "/admin/users", reason: "Membro sem privilégio administrativo tentando acessar governança RBAC." },
    createdAt: "2026-11-11T20:45:00Z",
  },
  {
    id: 9,
    actorId: "00000000-0000-0000-0000-000000000004",
    actorUsername: "root_admin",
    action: "system.config_updated",
    entityType: "system",
    entityId: "sys-cfg-01",
    metadata: { setting: "rate_limit_per_minute", oldValue: 60, newValue: 120 },
    createdAt: "2026-11-02T16:00:00Z",
  },
  {
    id: 10,
    actorId: null,
    actorUsername: "system_cron",
    action: "maintenance.cleanup",
    entityType: "system",
    entityId: "cron-job-orphan-cache",
    metadata: {},
    createdAt: "2026-10-30T03:00:00Z",
    incomplete: true,
  },
];

// Initial Research Submissions (simulated layer for Cybercrime Research)
const INITIAL_RESEARCH_SUBMISSIONS: ResearchSubmission[] = [
  {
    id: "cr-sub-001",
    title_pt: "Análise da Campanha de Ransomware VoidLocker e Cadeia de Infecção",
    title_en: "VoidLocker Ransomware Campaign & Infection Chain Analysis",
    summary_pt:
      "Desmontagem técnica do payload do VoidLocker, técnicas de evasão de EDR via unhooking de NTDLL e táticas de persistência em ambientes Active Directory.",
    summary_en:
      "Technical disassembly of VoidLocker payload, EDR evasion via NTDLL unhooking, and persistence tactics in Active Directory environments.",
    domain: "ransomware",
    severity: "critical",
    tlp: "CLEAR",
    author: "c0rtex",
    authorRole: "member",
    authorSpecialty: "Security Researcher",
    submittedAt: "2026-11-04T10:00:00Z",
    status: "approved",
    cves: ["CVE-2026-1932", "CVE-2026-2184"],
    attackTechniques: ["T1059.001", "T1055.012", "T1486"],
    readTimeMinutes: 12,
  },
  {
    id: "cr-sub-002",
    title_pt: "Rastreamento do Operador APT-412: Campanhas de Espionagem em Infraestruturas Críticas",
    title_en: "Tracking Threat Actor APT-412: Espionage Operations in Critical Infrastructure",
    summary_pt:
      "Mapeamento de indicadores de comprometimento (IoCs) e infraestrutura de comando e controle (C2) operando sobre túneis DNS e WebSocket criptografados.",
    summary_en:
      "Mapping indicators of compromise (IoCs) and C2 infrastructure operating over encrypted DNS and WebSocket tunnels.",
    domain: "apt",
    severity: "high",
    tlp: "CLEAR",
    author: "sarah_sec",
    authorRole: "moderator",
    submittedAt: "2026-10-28T14:00:00Z",
    status: "approved",
    cves: ["CVE-2025-4911"],
    attackTechniques: ["T1071.004", "T1566.002", "T1132"],
    readTimeMinutes: 18,
  },
  {
    id: "cr-sub-003",
    title_pt: "Dissecando Rotinas de Injeção em Processos de Infostealers Escritos em Rust",
    title_en: "Dissecting Process Injection Routines in Rust-based Infostealers",
    summary_pt:
      "Análise aprofundada de um novo infostealer compilado em Rust que utiliza chamadas de sistema diretas para despejar credenciais do LSASS sem gerar alertas de EDR.",
    summary_en:
      "In-depth analysis of a novel Rust-compiled infostealer utilizing direct syscalls to dump LSASS credentials while bypassing traditional EDR hooks.",
    domain: "malware",
    severity: "high",
    tlp: "AMBER",
    author: "nexus_hunter",
    authorRole: "member",
    submittedAt: "2026-11-10T19:30:00Z",
    status: "pending",
    cves: ["CVE-2026-0044"],
    attackTechniques: ["T1003.001", "T1055"],
    readTimeMinutes: 15,
  },
  {
    id: "cr-sub-004",
    title_pt: "Fraudes Automatizadas em Gateways de Pagamento via Credential Stuffing",
    title_en: "Automated Payment Gateway Fraud Operations via Credential Stuffing",
    summary_pt:
      "Estudo de caso e análise de tráfego de redes zumbi utilizadas para testes em massa de cartões clonados em plataformas de e-commerce da América Latina.",
    summary_en:
      "Case study and network telemetry analysis of botnet infrastructure used for carding and credential stuffing against Latin American e-commerce platforms.",
    domain: "fraud",
    severity: "medium",
    tlp: "CLEAR",
    author: "sec_analyst_br",
    authorRole: "member",
    submittedAt: "2026-11-11T09:00:00Z",
    status: "revision_requested",
    rejectionReason:
      "Solicitada complementação dos IoCs de rede (endereços IP dos nós de saída) e mascaramento de dados de cartão de crédito de teste.",
    moderatorNotes: "Excelente pesquisa, mas precisa de redação de dados sensíveis antes de publicar.",
    attackTechniques: ["T1110.004", "T1078"],
    readTimeMinutes: 11,
  },
];

const INITIAL_MODERATION_RESOURCES: FeaturedResourceItem[] = [
  {
    slug: "sigma-windows-triage",
    name: "Sigma Windows Event Log Triage Tool",
    description_pt:
      "Script em Python para triagem rápida de logs de segurança em servidores Active Directory.",
    description_en:
      "Python script for rapid security log triage on Active Directory domain controllers.",
    categorySlug: "dfir",
    type: "script",
    url: "https://github.com/SigmaHQ/sigma",
    language: "en",
    difficulty: "advanced",
    authorName: "@cve_hunter",
    publishedAt: "2026-11-02T14:30:00Z",
    status: "pending",
  },
  {
    slug: "suspicious-network-probe",
    name: "Automated Remote Probe Script",
    description_pt:
      "Script que executa automação remota e coleta de telemetria diretamente via host IP.",
    description_en:
      "Script running remote telemetry probing directly through an IP host.",
    categorySlug: "tools",
    type: "script",
    url: "http://192.168.1.100:8080/probe.sh",
    language: "en",
    difficulty: "intermediate",
    authorName: "@sec_analyst_br",
    publishedAt: "2026-11-11T16:00:00Z",
    status: "pending",
  },
  {
    slug: "unverified-pentest-tool",
    name: "Automated Recon Framework (v0.1)",
    description_pt:
      "Framework de automação de reconhecimento para enumeração de subdomínios.",
    description_en:
      "Automated reconnaissance framework for subdomain enumeration.",
    categorySlug: "tools",
    type: "tool",
    url: "https://github.com/broken-link-sample/recon",
    language: "en",
    difficulty: "beginner",
    authorName: "@cve_hunter",
    publishedAt: "2026-10-22T08:00:00Z",
    status: "rejected",
    rejectionReason:
      "O repositório oficial informado retornou erro 404 e não continha documentação defensiva clara.",
  },
  ...FEATURED_RESOURCES,
];

const INITIAL_MODERATION_TOPICS: ForumTopic[] = [
  {
    id: "topic-pending-1",
    categorySlug: "blue-team",
    authorUsername: "cve_hunter",
    authorRole: "member",
    authorDisplayName: "Alexandre Silva",
    title_pt: "Discussão: Técnicas de Evasão de AMSI em C# com Patch em Memória",
    title_en: "Discussion: AMSI Memory Patching & Evasion Techniques in C#",
    body_pt:
      "Gostaria de abrir uma discussão técnica sobre os métodos modernos de unhooking e bypass de AMSI para fins de validação defensiva em ambiente de laboratório...",
    body_en:
      "Opening a technical discussion on modern AMSI unhooking and in-memory patching for defensive validation...",
    tags: ["amsi", "evasion", "csharp", "memory"],
    isPinned: false,
    isLocked: false,
    acceptedPostId: null,
    voteCount: 1,
    createdAt: "2026-11-11T18:00:00Z",
    lastActivityAt: "2026-11-11T18:00:00Z",
    status: "pending",
  },
  ...INITIAL_TOPICS,
];

const INITIAL_MODERATION_POSTS: ForumPost[] = [
  {
    id: "post-pending-1",
    topicId: "topic-1",
    authorUsername: "sec_analyst_br",
    authorRole: "member",
    authorDisplayName: "Lucas Mendes",
    body: "Aqui está o script em PowerShell para coleta automática de telemetria do Sysmon e envio para syslog central.",
    voteCount: 0,
    isAcceptedSolution: false,
    createdAt: "2026-11-11T19:30:00Z",
    status: "pending",
  },
  ...INITIAL_POSTS,
];

export class AdminService implements IAdminService {
  private reports: Report[] = [];
  private auditLogs: AuditLog[] = [];
  private researchQueue: ResearchSubmission[] = [];
  private initialized = false;

  constructor() {
    this.ensureInitialized();
  }

  private ensureInitialized() {
    if (this.initialized) return;

    const storage = getAdminStorage();
    if (storage) {
      try {
        const storedReports = storage.getItem(ADMIN_REPORTS_STORAGE_KEY);
        this.reports = storedReports ? JSON.parse(storedReports) : [...INITIAL_REPORTS];

        const storedAudit = storage.getItem(ADMIN_AUDIT_STORAGE_KEY);
        this.auditLogs = storedAudit ? JSON.parse(storedAudit) : [...INITIAL_AUDIT_LOGS];

        const storedResearch = storage.getItem(ADMIN_RESEARCH_STORAGE_KEY);
        this.researchQueue = storedResearch
          ? JSON.parse(storedResearch)
          : [...INITIAL_RESEARCH_SUBMISSIONS];
      } catch {
        this.reports = [...INITIAL_REPORTS];
        this.auditLogs = [...INITIAL_AUDIT_LOGS];
        this.researchQueue = [...INITIAL_RESEARCH_SUBMISSIONS];
      }
    } else {
      this.reports = [...INITIAL_REPORTS];
      this.auditLogs = [...INITIAL_AUDIT_LOGS];
      this.researchQueue = [...INITIAL_RESEARCH_SUBMISSIONS];
    }

    this.initialized = true;
  }

  private persist() {
    const storage = getAdminStorage();
    if (storage) {
      try {
        storage.setItem(ADMIN_REPORTS_STORAGE_KEY, JSON.stringify(this.reports));
        storage.setItem(ADMIN_AUDIT_STORAGE_KEY, JSON.stringify(this.auditLogs));
        storage.setItem(ADMIN_RESEARCH_STORAGE_KEY, JSON.stringify(this.researchQueue));
      } catch {
        // Storage quota protection
      }
    }
  }

  /**
   * Internal helper mirroring PostgreSQL `public.write_audit_log`
   */
  private logAudit(
    actor: AuthUserProfile,
    action: string,
    entityType: AuditLog["entityType"],
    entityId: string,
    metadata: Record<string, unknown> = {}
  ) {
    const sanitized = sanitizeAuditMetadata(metadata);
    const newId = this.auditLogs.length > 0 ? Math.max(...this.auditLogs.map((l) => l.id)) + 1 : 1;
    const newLog: AuditLog = {
      id: newId,
      actorId: actor.id,
      actorUsername: actor.username,
      action,
      entityType,
      entityId,
      metadata: sanitized,
      createdAt: new Date().toISOString(),
      incomplete: !actor.username || !action,
    };
    this.auditLogs.unshift(newLog);
    this.persist();
  }

  /**
   * Public security audit logging for administrative denials,
   * authentication gates, and system operations.
   */
  async recordSecurityEvent(
    actor: { id: string | null; username: string },
    action: string,
    entityType: AuditLog["entityType"],
    entityId: string,
    metadata: Record<string, unknown> = {}
  ): Promise<void> {
    this.ensureInitialized();
    const sanitized = sanitizeAuditMetadata(metadata);
    const newId = this.auditLogs.length > 0 ? Math.max(...this.auditLogs.map((l) => l.id)) + 1 : 1;
    const newLog: AuditLog = {
      id: newId,
      actorId: actor.id,
      actorUsername: actor.username,
      action,
      entityType,
      entityId,
      metadata: sanitized,
      createdAt: new Date().toISOString(),
      incomplete: !actor.username || !action,
    };
    this.auditLogs.unshift(newLog);
    this.persist();
  }

  // ---------------------------------------------------------------------------
  // Queries
  // ---------------------------------------------------------------------------

  async getStats(): Promise<AdminStats> {
    this.ensureInitialized();
    const users = await this.getUsers();
    const allResources = await this.getAllResourcesForModeration();
    const topics = await this.getForumTopicsForModeration();
    const posts = await this.getForumPostsForModeration();

    return {
      totalUsers: users.length,
      activeUsers: users.filter((u) => !u.isSuspended).length,
      suspendedUsers: users.filter((u) => u.isSuspended).length,
      publishedResources: allResources.filter((r) => r.status === "approved" || !r.status).length,
      pendingResources: allResources.filter((r) => r.status === "pending").length,
      rejectedResources: allResources.filter((r) => r.status === "rejected").length,
      totalTopics: topics.length,
      totalPosts: posts.length,
      pendingResearch: this.researchQueue.filter((r) => r.status === "pending").length,
      openReports: this.reports.filter((r) => r.status === "open" || r.status === "reviewing")
        .length,
      recentAuditActionsCount: this.auditLogs.length,
    };
  }

  async getUsers(filter?: {
    query?: string;
    role?: DbUserRole | "all";
    suspendedOnly?: boolean;
  }): Promise<AuthUserProfile[]> {
    this.ensureInitialized();
    let users = [...DEMO_PROFILES];

    if (typeof window !== "undefined") {
      try {
        const custom = window.localStorage.getItem(ADMIN_USERS_STORAGE_KEY);
        if (custom) {
          const parsed = JSON.parse(custom);
          if (Array.isArray(parsed)) {
            // Merge custom registered users
            parsed.forEach((u) => {
              if (!users.some((exist) => exist.id === u.id)) {
                users.push(u);
              }
            });
          }
        }
      } catch {
        // Fallback
      }
    }

    if (filter?.query) {
      const q = filter.query.trim().toLowerCase();
      users = users.filter(
        (u) =>
          u.username.toLowerCase().includes(q) ||
          u.displayName.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q)
      );
    }

    if (filter?.role && filter.role !== "all") {
      users = users.filter((u) => u.role === filter.role);
    }

    if (filter?.suspendedOnly) {
      users = users.filter((u) => u.isSuspended);
    }

    return users;
  }

  async getPendingResources(): Promise<FeaturedResourceItem[]> {
    const all = await this.getAllResourcesForModeration();
    return all.filter((r) => r.status === "pending");
  }

  async getAllResourcesForModeration(): Promise<FeaturedResourceItem[]> {
    this.ensureInitialized();
    if (typeof window !== "undefined") {
      try {
        const stored = window.localStorage.getItem(ADMIN_RESOURCES_STORAGE_KEY);
        if (stored) {
          return JSON.parse(stored);
        }
      } catch {
        // Fallback
      }
    }
    return [...INITIAL_MODERATION_RESOURCES];
  }

  async getForumTopicsForModeration(): Promise<ForumTopic[]> {
    this.ensureInitialized();
    if (typeof window !== "undefined") {
      try {
        const stored = window.localStorage.getItem(ADMIN_TOPICS_STORAGE_KEY);
        if (stored) {
          return JSON.parse(stored);
        }
      } catch {
        // Fallback
      }
    }
    return [...INITIAL_MODERATION_TOPICS];
  }

  async getForumPostsForModeration(topicId?: string): Promise<ForumPost[]> {
    this.ensureInitialized();
    let posts = [...INITIAL_MODERATION_POSTS];
    if (typeof window !== "undefined") {
      try {
        const stored = window.localStorage.getItem(ADMIN_POSTS_STORAGE_KEY);
        if (stored) {
          posts = JSON.parse(stored);
        }
      } catch {
        // Fallback
      }
    }
    if (topicId) {
      return posts.filter((p) => p.topicId === topicId);
    }
    return posts;
  }

  async getResearchSubmissions(): Promise<ResearchSubmission[]> {
    this.ensureInitialized();
    const storage = getAdminStorage();
    if (storage) {
      try {
        const stored = storage.getItem(ADMIN_RESEARCH_STORAGE_KEY);
        if (stored) {
          this.researchQueue = JSON.parse(stored);
        }
      } catch {
        // Fallback to in-memory array on parse error
      }
    }
    return [...this.researchQueue];
  }

  async getReports(filter?: {
    status?: ReportStatus | "all";
    reason?: ReportReason | "all";
    targetType?: ReportTargetType | "all";
  }): Promise<Report[]> {
    this.ensureInitialized();
    let result = [...this.reports];

    if (filter?.status && filter.status !== "all") {
      result = result.filter((r) => r.status === filter.status);
    }

    if (filter?.reason && filter.reason !== "all") {
      result = result.filter((r) => r.reason === filter.reason);
    }

    if (filter?.targetType && filter.targetType !== "all") {
      result = result.filter((r) => r.targetType === filter.targetType);
    }

    return result.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async getAuditLogs(filter?: {
    entityType?: string;
    action?: string;
    actorUsername?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
  }): Promise<AuditLog[]> {
    this.ensureInitialized();
    let logs = [...this.auditLogs];

    if (filter?.entityType && filter.entityType !== "all") {
      logs = logs.filter((l) => l.entityType === filter.entityType);
    }

    if (filter?.action && filter.action !== "all") {
      logs = logs.filter((l) => l.action === filter.action);
    }

    if (filter?.actorUsername) {
      const q = filter.actorUsername.trim().toLowerCase();
      logs = logs.filter((l) => l.actorUsername.toLowerCase().includes(q));
    }

    if (filter?.startDate) {
      const start = new Date(filter.startDate).getTime();
      logs = logs.filter((l) => new Date(l.createdAt).getTime() >= start);
    }

    if (filter?.endDate) {
      const end = new Date(filter.endDate).getTime();
      logs = logs.filter((l) => new Date(l.createdAt).getTime() <= end);
    }

    if (filter?.limit && filter.limit > 0) {
      logs = logs.slice(0, filter.limit);
    }

    return logs
      .sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
      .map((log) =>
        Object.freeze({
          ...log,
          metadata: Object.freeze({ ...log.metadata }),
        })
      );
  }

  // ---------------------------------------------------------------------------
  // Administrative Operations (Strictly checking roles like PostgreSQL RPCs)
  // ---------------------------------------------------------------------------

  /**
   * Mirrors PostgreSQL `public.admin_set_user_role`:
   * - Requires `is_admin()`
   * - Admins cannot demote themselves
   */
  async setUserRole(
    actor: AuthUserProfile,
    targetUserId: string,
    newRole: DbUserRole
  ): Promise<AdminActionResult> {
    if (actor.isSuspended || actor.role !== "admin") {
      return { success: false, error: "42501: Acesso negado. Apenas administradores podem alterar papéis." };
    }

    if (actor.id === targetUserId && newRole !== "admin") {
      return { success: false, error: "42501: Administradores não podem rebaixar a si mesmos." };
    }

    const users = await this.getUsers();
    const target = users.find((u) => u.id === targetUserId);
    if (!target) {
      return { success: false, error: "P0002: Usuário não encontrado." };
    }

    const activeAdmins = users.filter((u) => u.role === "admin" && !u.isSuspended);
    if (target.role === "admin" && newRole !== "admin" && activeAdmins.length <= 1) {
      return {
        success: false,
        error: "42501: Operação bloqueada. Não é permitido rebaixar o único administrador ativo do sistema.",
      };
    }

    const oldRole = target.role;
    target.role = newRole;

    // Persist user role in storage if client
    if (typeof window !== "undefined") {
      try {
        const stored = window.localStorage.getItem(ADMIN_USERS_STORAGE_KEY);
        const parsed: AuthUserProfile[] = stored ? JSON.parse(stored) : [];
        const idx = parsed.findIndex((u) => u.id === targetUserId);
        if (idx >= 0) {
          parsed[idx].role = newRole;
          window.localStorage.setItem(ADMIN_USERS_STORAGE_KEY, JSON.stringify(parsed));
        }
      } catch {
        // Fallback
      }
    }

    this.logAudit(actor, "user.role_changed", "profile", targetUserId, {
      from: oldRole,
      to: newRole,
      targetUsername: target.username,
    });

    return { success: true };
  }

  /**
   * Mirrors PostgreSQL `public.admin_set_user_suspension`:
   * - Requires `is_admin()`
   * - Admins cannot suspend themselves
   * - Reason required when suspending
   */
  async setUserSuspension(
    actor: AuthUserProfile,
    targetUserId: string,
    suspended: boolean,
    reason?: string
  ): Promise<AdminActionResult> {
    if (actor.isSuspended || actor.role !== "admin") {
      return { success: false, error: "42501: Acesso negado. Apenas administradores podem suspender usuários." };
    }

    if (actor.id === targetUserId) {
      return { success: false, error: "42501: Administradores não podem suspender sua própria conta." };
    }

    if (suspended && (!reason || reason.trim().length < 5)) {
      return { success: false, error: "22023: Uma justificativa com pelo menos 5 caracteres é obrigatória para suspender um usuário." };
    }

    const users = await this.getUsers();
    const target = users.find((u) => u.id === targetUserId);
    if (!target) {
      return { success: false, error: "P0002: Usuário não encontrado." };
    }

    const activeAdmins = users.filter((u) => u.role === "admin" && !u.isSuspended);
    if (target.role === "admin" && suspended && activeAdmins.length <= 1) {
      return {
        success: false,
        error: "42501: Operação bloqueada. Não é permitido suspender o único administrador ativo do sistema.",
      };
    }

    target.isSuspended = suspended;

    if (typeof window !== "undefined") {
      try {
        const stored = window.localStorage.getItem(ADMIN_USERS_STORAGE_KEY);
        const parsed: AuthUserProfile[] = stored ? JSON.parse(stored) : [];
        const idx = parsed.findIndex((u) => u.id === targetUserId);
        if (idx >= 0) {
          parsed[idx].isSuspended = suspended;
          window.localStorage.setItem(ADMIN_USERS_STORAGE_KEY, JSON.stringify(parsed));
        } else {
          parsed.push({ ...target, isSuspended: suspended });
          window.localStorage.setItem(ADMIN_USERS_STORAGE_KEY, JSON.stringify(parsed));
        }
      } catch {
        // Fallback
      }
    }

    this.logAudit(
      actor,
      suspended ? "user.suspended" : "user.unsuspended",
      "profile",
      targetUserId,
      { reason: reason?.trim() ?? null, targetUsername: target.username }
    );

    return { success: true };
  }

  /**
   * Mirrors PostgreSQL `public.moderate_resource`:
   * - Requires `is_moderator()` (moderator or admin)
   * - Rejection requires reason (`resources_reject_reason` constraint)
   * - Prevents duplicate decisions
   */
  async moderateResource(
    actor: AuthUserProfile,
    resourceId: string,
    decision: ResourceStatus,
    reason?: string
  ): Promise<AdminActionResult> {
    if (actor.isSuspended || (actor.role !== "moderator" && actor.role !== "admin")) {
      return { success: false, error: "42501: Acesso negado. Requer papel de moderador ou administrador." };
    }

    if (!["approved", "rejected", "archived"].includes(decision)) {
      return { success: false, error: "22023: Decisão de moderação inválida." };
    }

    if (decision === "rejected" && (!reason || reason.trim().length < 5)) {
      return {
        success: false,
        error: "22023: É obrigatório informar uma justificativa clara para rejeitar um recurso (constraint resources_reject_reason).",
      };
    }

    const resources = await this.getAllResourcesForModeration();
    const target = resources.find((r) => r.slug === resourceId);
    if (!target) {
      return { success: false, error: "P0002: Recurso não encontrado no catálogo." };
    }

    // Abuse / Duplicate prevention
    if (target.status === decision && decision === "approved") {
      return { success: false, error: "409: Este recurso já foi aprovado anteriormente." };
    }
    if (target.status === decision && decision === "rejected") {
      return { success: false, error: "409: Este recurso já se encontra rejeitado." };
    }

    target.status = decision;
    if (decision === "rejected") {
      target.rejectionReason = reason?.trim();
    } else {
      target.rejectionReason = undefined;
    }

    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(ADMIN_RESOURCES_STORAGE_KEY, JSON.stringify(resources));

        // Sync with My Contributions storage
        const subKey = "cybersec_submitted_resources";
        const subRaw = window.localStorage.getItem(subKey);
        if (subRaw) {
          const parsed: FeaturedResourceItem[] = JSON.parse(subRaw);
          const idx = parsed.findIndex((p) => p.slug === resourceId);
          if (idx >= 0) {
            parsed[idx].status = decision;
            parsed[idx].rejectionReason = decision === "rejected" ? reason?.trim() : undefined;
            window.localStorage.setItem(subKey, JSON.stringify(parsed));
          }
        }
      } catch {
        // Fallback
      }
    }

    const auditAction =
      decision === "approved"
        ? "moderation.resource_approved"
        : decision === "rejected"
        ? "moderation.resource_rejected"
        : "resource.archived";

    this.logAudit(actor, auditAction, "resource", resourceId, {
      name: target.name,
      reason: reason?.trim() ?? null,
      decision,
    });

    return { success: true };
  }

  /**
   * Mirrors PostgreSQL `public.resubmit_resource`:
   * - Allows user to resubmit a previously rejected resource
   * - Returns status to 'pending' and clears rejection_reason
   */
  async resubmitResource(
    user: AuthUserProfile,
    resourceId: string
  ): Promise<AdminActionResult> {
    if (user.isSuspended) {
      return { success: false, error: "42501: Contas suspensas não possuem permissão para reenviar recursos." };
    }

    const resources = await this.getAllResourcesForModeration();
    const target = resources.find((r) => r.slug === resourceId);
    if (!target) {
      return { success: false, error: "P0002: Recurso não encontrado." };
    }

    if (target.status !== "rejected") {
      return { success: false, error: "22023: Apenas recursos previamente rejeitados podem ser reenviados para moderação." };
    }

    target.status = "pending";
    target.rejectionReason = undefined;

    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(ADMIN_RESOURCES_STORAGE_KEY, JSON.stringify(resources));

        const subKey = "cybersec_submitted_resources";
        const subRaw = window.localStorage.getItem(subKey);
        if (subRaw) {
          const parsed: FeaturedResourceItem[] = JSON.parse(subRaw);
          const idx = parsed.findIndex((p) => p.slug === resourceId);
          if (idx >= 0) {
            parsed[idx].status = "pending";
            parsed[idx].rejectionReason = undefined;
            window.localStorage.setItem(subKey, JSON.stringify(parsed));
          }
        }
      } catch {
        // Fallback
      }
    }

    this.logAudit(user, "moderation.resource_resubmitted", "resource", resourceId, {
      name: target.name,
    });

    return { success: true };
  }

  /**
   * Mirrors PostgreSQL `public.moderate_topic`:
   * - Requires `is_moderator()` (moderator or admin)
   * - Actions: hide, unhide, delete, pin, unpin, lock, unlock, approve, reject
   * - Reason required on hide/delete/reject
   */
  async moderateTopic(
    actor: AuthUserProfile,
    topicId: string,
    action: "hide" | "unhide" | "delete" | "pin" | "unpin" | "lock" | "unlock" | "approve" | "reject",
    reason?: string
  ): Promise<AdminActionResult> {
    if (actor.isSuspended || (actor.role !== "moderator" && actor.role !== "admin")) {
      return { success: false, error: "42501: Acesso negado. Requer papel de moderador ou administrador." };
    }

    if (["hide", "delete", "reject"].includes(action) && (!reason || reason.trim().length < 5)) {
      return { success: false, error: "22023: Uma justificativa com pelo menos 5 caracteres é obrigatória para ocultar ou rejeitar um tópico." };
    }

    const topics = await this.getForumTopicsForModeration();
    const topic = topics.find((t) => t.id === topicId);
    if (!topic) {
      return { success: false, error: "P0002: Tópico não encontrado no fórum." };
    }

    if (action === "approve") {
      if (topic.status === "published") {
        return { success: false, error: "409: Este tópico já se encontra aprovado/publicado." };
      }
      topic.status = "published";
    } else if (action === "reject" || action === "hide") {
      topic.status = "hidden";
    } else if (action === "unhide") {
      topic.status = "published";
    } else if (action === "delete") {
      topic.status = "deleted";
    } else if (action === "pin") {
      topic.isPinned = true;
    } else if (action === "unpin") {
      topic.isPinned = false;
    } else if (action === "lock") {
      topic.isLocked = true;
    } else if (action === "unlock") {
      topic.isLocked = false;
    }

    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(ADMIN_TOPICS_STORAGE_KEY, JSON.stringify(topics));
      } catch {
        // Fallback
      }
    }

    const auditAction =
      action === "approve"
        ? "moderation.topic_approved"
        : action === "reject"
        ? "moderation.topic_rejected"
        : `topic.${action}`;

    this.logAudit(actor, auditAction, "topic", topicId, {
      title: topic.title_pt,
      reason: reason?.trim() ?? null,
    });

    return { success: true };
  }

  /**
   * Mirrors PostgreSQL `public.moderate_post`:
   * - Requires `is_moderator()` (moderator or admin)
   * - Actions: hide, unhide, delete, approve, reject
   */
  async moderatePost(
    actor: AuthUserProfile,
    postId: string,
    action: "hide" | "unhide" | "delete" | "approve" | "reject",
    reason?: string
  ): Promise<AdminActionResult> {
    if (actor.isSuspended || (actor.role !== "moderator" && actor.role !== "admin")) {
      return { success: false, error: "42501: Acesso negado. Requer papel de moderador ou administrador." };
    }

    if (["hide", "delete", "reject"].includes(action) && (!reason || reason.trim().length < 5)) {
      return { success: false, error: "22023: Uma justificativa com pelo menos 5 caracteres é obrigatória para ocultar ou rejeitar uma resposta." };
    }

    const posts = await this.getForumPostsForModeration();
    const post = posts.find((p) => p.id === postId);
    if (!post) {
      return { success: false, error: "P0002: Resposta não encontrada." };
    }

    if (action === "approve") {
      if (post.status === "published") {
        return { success: false, error: "409: Esta resposta já se encontra aprovada/publicada." };
      }
      post.status = "published";
    } else if (action === "reject" || action === "hide") {
      post.status = "hidden";
    } else if (action === "unhide") {
      post.status = "published";
    } else if (action === "delete") {
      post.status = "deleted";
    }

    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(ADMIN_POSTS_STORAGE_KEY, JSON.stringify(posts));
      } catch {
        // Fallback
      }
    }

    const auditAction =
      action === "approve"
        ? "moderation.post_approved"
        : action === "reject"
        ? "moderation.post_rejected"
        : `post.${action}`;

    this.logAudit(actor, auditAction, "post", postId, {
      topicId: post.topicId,
      author: post.authorUsername,
      reason: reason?.trim() ?? null,
    });

    return { success: true };
  }

  /**
   * Mirrors PostgreSQL `public.resolve_report`:
   * - Requires `is_moderator()` (moderator or admin)
   * - Records handledBy, handledAt, resolutionNote
   */
  async resolveReport(
    actor: AuthUserProfile,
    reportId: string,
    status: ReportStatus,
    note?: string
  ): Promise<AdminActionResult> {
    if (actor.isSuspended || (actor.role !== "moderator" && actor.role !== "admin")) {
      return { success: false, error: "42501: Acesso negado. Requer papel de moderador ou administrador." };
    }

    if (status === "open") {
      return { success: false, error: "22023: Não é possível resolver uma denúncia mantendo o status em aberto." };
    }

    this.ensureInitialized();
    const report = this.reports.find((r) => r.id === reportId);
    if (!report) {
      return { success: false, error: "P0002: Denúncia não encontrada." };
    }

    report.status = status;
    report.handledBy = actor.id;
    report.handledByUsername = actor.username;
    report.handledAt = ["resolved", "dismissed"].includes(status)
      ? new Date().toISOString()
      : null;
    report.resolutionNote = note?.trim() ? note.trim().slice(0, 1000) : null;

    this.persist();

    this.logAudit(actor, `report.${status}`, "report", reportId, {
      targetType: report.targetType,
      targetId: report.targetId,
      note: note?.trim() ?? null,
    });

    return { success: true };
  }

  /**
   * Moderates Cybercrime Research submissions (isolated layer)
   */
  async moderateResearch(
    actor: AuthUserProfile,
    researchId: string,
    decision: "approved" | "rejected" | "revision_requested",
    notes?: string
  ): Promise<AdminActionResult> {
    if (actor.isSuspended || (actor.role !== "moderator" && actor.role !== "admin")) {
      return { success: false, error: "42501: Acesso negado. Requer papel de moderador ou administrador." };
    }

    if (decision === "rejected" && (!notes || notes.trim().length < 5)) {
      return { success: false, error: "22023: Justificativa obrigatória para rejeitar uma análise técnica." };
    }

    this.ensureInitialized();
    const storage = getAdminStorage();
    if (storage) {
      try {
        const stored = storage.getItem(ADMIN_RESEARCH_STORAGE_KEY);
        if (stored) {
          this.researchQueue = JSON.parse(stored);
        }
      } catch {
        // Fallback
      }
    }
    const item = this.researchQueue.find((r) => r.id === researchId);
    if (!item) {
      return { success: false, error: "P0002: Submissão de pesquisa não encontrada." };
    }

    // Abuse / Duplicate prevention
    if (item.status === decision && decision === "approved") {
      return { success: false, error: "409: Esta pesquisa já se encontra aprovada." };
    }
    if (item.status === decision && decision === "rejected") {
      return { success: false, error: "409: Esta pesquisa já se encontra rejeitada." };
    }

    item.status = decision;
    if (decision === "rejected" || decision === "revision_requested") {
      item.rejectionReason = notes?.trim();
      item.moderatorNotes = notes?.trim();
    } else {
      item.rejectionReason = undefined;
      item.moderatorNotes = notes?.trim();
    }

    this.persist();

    const auditAction =
      decision === "approved"
        ? "moderation.research_approved"
        : decision === "rejected"
        ? "moderation.research_rejected"
        : "moderation.research_revision_requested";

    this.logAudit(actor, auditAction, "research", researchId, {
      title: item.title_pt,
      domain: item.domain,
      notes: notes?.trim() ?? null,
    });

    return { success: true };
  }

  /**
   * Returns a unified moderation queue combining:
   * - Catalog resources (pending, rejected, approved)
   * - Forum topics (pending, published, hidden)
   * - Forum posts (pending, published, hidden)
   * - Cybercrime Research submissions (pending, revision_requested, approved, rejected)
   */
  async getUnifiedModerationQueue(filter?: {
    contentType?: ModerationContentType | "all";
    status?: string;
    category?: string;
    author?: string;
    query?: string;
  }): Promise<UnifiedModerationItem[]> {
    this.ensureInitialized();
    const [resources, topics, posts, research] = await Promise.all([
      this.getAllResourcesForModeration(),
      this.getForumTopicsForModeration(),
      this.getForumPostsForModeration(),
      this.getResearchSubmissions(),
    ]);

    const unified: UnifiedModerationItem[] = [];

    // 1. Resources
    for (const r of resources) {
      unified.push({
        id: r.slug,
        contentType: "resource",
        title: r.name,
        authorUsername: (r.authorName || "comunidade").replace(/^@/, ""),
        authorRole: "member",
        category: r.categorySlug,
        submittedAt: r.publishedAt || "2026-11-01T00:00:00Z",
        status: r.status || "pending",
        rejectionReason: r.rejectionReason,
        url: r.url,
        summary: r.description_pt || r.description_en || "",
        fullBody: r.description_pt || r.description_en,
        incomplete: !r.url || !r.description_pt || r.description_pt.length < 20,
        metadata: { difficulty: r.difficulty, type: r.type, language: r.language },
      });
    }

    // 2. Forum Topics
    for (const t of topics) {
      unified.push({
        id: t.id,
        contentType: "topic",
        title: t.title_pt,
        authorUsername: t.authorUsername,
        authorRole: t.authorRole,
        authorDisplayName: t.authorDisplayName,
        category: t.categorySlug,
        submittedAt: t.createdAt,
        status: t.status || (t.isLocked ? "hidden" : "published"),
        summary: t.body_pt.slice(0, 180),
        fullBody: t.body_pt,
        tags: t.tags,
        incomplete: !t.title_pt || !t.body_pt || t.body_pt.length < 15,
        metadata: { voteCount: t.voteCount, isPinned: t.isPinned, isLocked: t.isLocked },
      });
    }

    // 3. Forum Posts
    for (const p of posts) {
      unified.push({
        id: p.id,
        contentType: "post",
        title: `Resposta no tópico #${p.topicId}`,
        authorUsername: p.authorUsername,
        authorRole: p.authorRole,
        authorDisplayName: p.authorDisplayName,
        category: "forum",
        submittedAt: p.createdAt,
        status: p.status || "published",
        summary: p.body.slice(0, 180),
        fullBody: p.body,
        incomplete: !p.body || p.body.length < 10,
        metadata: { topicId: p.topicId, voteCount: p.voteCount },
      });
    }

    // 4. Cybercrime Research
    for (const rs of research) {
      unified.push({
        id: rs.id,
        contentType: "research",
        title: rs.title_pt,
        authorUsername: rs.author,
        authorRole: rs.authorRole,
        category: rs.domain,
        submittedAt: rs.submittedAt,
        status: rs.status,
        rejectionReason: rs.rejectionReason,
        summary: rs.summary_pt,
        fullBody: `${rs.summary_pt}\n\nSeveridade: ${rs.severity.toUpperCase()} | TLP: ${rs.tlp}\nCVEs: ${rs.cves?.join(", ") || "Nenhum"}\nTécnicas MITRE: ${rs.attackTechniques?.join(", ") || "Nenhuma"}`,
        incomplete: !rs.title_pt || !rs.summary_pt || rs.summary_pt.length < 30,
        metadata: { severity: rs.severity, tlp: rs.tlp, cves: rs.cves, attackTechniques: rs.attackTechniques },
      });
    }

    // Filter
    let result = unified;

    if (filter?.contentType && filter.contentType !== "all") {
      result = result.filter((item) => item.contentType === filter.contentType);
    }

    if (filter?.status && filter.status !== "all") {
      result = result.filter((item) => item.status === filter.status);
    }

    if (filter?.category && filter.category !== "all") {
      result = result.filter((item) => item.category === filter.category);
    }

    if (filter?.author) {
      const q = filter.author.trim().toLowerCase();
      result = result.filter((item) => item.authorUsername.toLowerCase().includes(q));
    }

    if (filter?.query) {
      const q = filter.query.trim().toLowerCase();
      result = result.filter(
        (item) =>
          item.title.toLowerCase().includes(q) ||
          item.authorUsername.toLowerCase().includes(q) ||
          item.summary.toLowerCase().includes(q) ||
          item.id.toLowerCase().includes(q)
      );
    }

    return result.sort(
      (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
    );
  }
}

// Singleton export
export const adminService = new AdminService();
