/**
 * VEXOR — Cybercrime Research Domain Types
 *
 * Types for educational, investigative, and technical threat research.
 * Strictly defensive and documented under the community's ethical charter.
 */

import type { DbUserRole } from "@/features/admin/types";

export type ResearchSeverity = "critical" | "high" | "medium" | "info";
export type ResearchTlp = "CLEAR" | "GREEN" | "AMBER" | "AMBER+" | "RED";
export type ResearchStatus = "pending" | "approved" | "rejected" | "archived";
export type ResearchDomain =
  | "malware"
  | "ransomware"
  | "apt"
  | "darkweb"
  | "fraud"
  | "botnets"
  | "identity"
  | "legal";
export type ResearchConfidenceLevel = "low" | "medium" | "high";

export interface ResearchCategory {
  id: string;
  slug: string;
  name_pt: string;
  name_en: string;
  description_pt: string;
  description_en: string;
  icon: string;
  itemCount: number;
  pillar: "investigation" | "underground" | "both";
}

export interface ResearchPillar {
  id: "investigation" | "underground";
  title_pt: string;
  title_en: string;
  subtitle_pt: string;
  subtitle_en: string;
  description_pt: string;
  description_en: string;
  topics_pt: string[];
  topics_en: string[];
  icon: string;
}

export interface ResearchArticleReference {
  title: string;
  url?: string;
  isExternal?: boolean;
}

export interface ResearchArticle {
  id: string;
  slug: string;
  title_pt: string;
  title_en: string;
  summary_pt: string;
  summary_en: string;
  body_pt: string;
  body_en: string;
  categories: string[]; // List of category slugs
  domain: "malware" | "ransomware" | "apt" | "darkweb" | "fraud" | "botnets" | "identity" | "legal";
  severity: ResearchSeverity;
  tlp: ResearchTlp;
  author: string;
  authorRole: DbUserRole;
  authorSpecialty?: string;
  publishedAt: string;
  status: ResearchStatus | "published";
  cves?: string[];
  attackTechniques: string[];
  readTimeMinutes: number;
  references: ResearchArticleReference[];
  isDemonstrative?: boolean;
}

export interface CaseStudyTimelineEntry {
  phase: string;
  date: string;
  description_pt: string;
  description_en: string;
}

export interface CaseStudyIoc {
  type: "sha256" | "domain" | "ip" | "c2" | "email" | "registry";
  value: string;
  notes?: string;
}

export interface CaseStudyTtp {
  id: string;
  name: string;
  tactic: string;
}

export interface CaseStudy {
  id: string;
  slug: string;
  title_pt: string;
  title_en: string;
  summary_pt: string;
  summary_en: string;
  threatActor: string;
  targetSector_pt: string;
  targetSector_en: string;
  date: string;
  categories: string[];
  severity: ResearchSeverity;
  context_pt: string;
  context_en: string;
  timeline: CaseStudyTimelineEntry[];
  initialVector_pt: string;
  initialVector_en: string;
  lateralMovement_pt: string;
  lateralMovement_en: string;
  impact_pt: string;
  impact_en: string;
  iocs: CaseStudyIoc[];
  ttps: CaseStudyTtp[];
  mitigations_pt: string[];
  mitigations_en: string[];
  references: ResearchArticleReference[];
  isDemonstrative?: boolean;
}

export interface TechnicalDiscussion {
  id: string;
  title_pt: string;
  title_en: string;
  body_pt: string;
  body_en: string;
  author: string;
  authorRole: DbUserRole;
  authorSpecialty?: string;
  category: string;
  repliesCount: number;
  voteCount: number;
  lastActivityAt: string;
  tags: string[];
  linkedCves?: string[];
}

export interface AnalysisLabTool {
  name: string;
  purpose: string;
  isSandboxedOnly: boolean;
}

export interface AnalysisLabGuide {
  id: string;
  slug: string;
  title_pt: string;
  title_en: string;
  level: "beginner" | "intermediate" | "advanced";
  category: string;
  summary_pt: string;
  summary_en: string;
  methodology_pt: string;
  methodology_en: string;
  opsecRules_pt: string[];
  opsecRules_en: string[];
  tools: AnalysisLabTool[];
  safetyWarning_pt: string;
  safetyWarning_en: string;
}

// ============================================================================
// Etapa 9.7 (Fase 2A) — Contratos de Submissão e Persistência Real
// ============================================================================

export interface ResearchSourceReference {
  title: string;
  url?: string;
  isExternal?: boolean;
}

/**
 * Representação completa de uma submissão de pesquisa alinhada à modelagem
 * revisada (revision-1). Campos protegidos são controlados exclusivamente
 * pelo servidor / PostgreSQL.
 */
export interface ResearchSubmission {
  id: string;
  slug: string;
  authorId: string | null;
  authorUsername: string;
  categoryId: string;
  titlePt: string;
  titleEn: string | null;
  summaryPt: string;
  summaryEn: string | null;
  bodyPt: string;
  bodyEn: string | null;
  domain: ResearchDomain;
  severity: ResearchSeverity;
  tlp: ResearchTlp;
  status: ResearchStatus;
  cves: string[];
  attackTechniques: string[];
  sourceReferences: ResearchSourceReference[];
  confidenceLevel: ResearchConfidenceLevel | null;
  methodology: string | null;
  readTimeMinutes: number;
  rejectionReason: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  isTestMockData?: boolean;
}

/**
 * Projeção segura para listagens públicas (entre membros ativos).
 * Omite campos de moderação interna e o corpo completo.
 */
export interface ResearchSubmissionSummary {
  id: string;
  slug: string;
  authorId: string | null;
  authorUsername: string;
  categoryId: string;
  titlePt: string;
  titleEn: string | null;
  summaryPt: string;
  summaryEn: string | null;
  domain: ResearchDomain;
  severity: ResearchSeverity;
  tlp: ResearchTlp;
  status: ResearchStatus;
  cves: string[];
  attackTechniques: string[];
  confidenceLevel: ResearchConfidenceLevel | null;
  readTimeMinutes: number;
  publishedAt: string | null;
  createdAt: string;
  isTestMockData?: boolean;
}

export interface ResearchSubmissionDetail extends ResearchSubmission {
  canEdit: boolean;
  canResubmit: boolean;
}

/**
 * Campos editáveis pelo autor na criação.
 * Exclui explicitamente id, slug, authorId, status, reviewedBy, reviewedAt,
 * publishedAt, rejectionReason, createdAt e updatedAt.
 */
export interface ResearchSubmissionCreateInput {
  categoryId: string;
  titlePt: string;
  titleEn?: string | null;
  summaryPt: string;
  summaryEn?: string | null;
  bodyPt: string;
  bodyEn?: string | null;
  domain: ResearchDomain;
  severity: ResearchSeverity;
  tlp: ResearchTlp;
  cves?: string[];
  attackTechniques?: string[];
  sourceReferences?: ResearchSourceReference[];
  confidenceLevel?: ResearchConfidenceLevel | null;
  methodology?: string | null;
  readTimeMinutes?: number;
}

export type ResearchSubmissionUpdateInput = Partial<ResearchSubmissionCreateInput>;

export interface ResearchFilters {
  query?: string;
  domain?: ResearchDomain | "all";
  severity?: ResearchSeverity | "all";
  tlp?: ResearchTlp | "all";
  categoryId?: string;
  scope?: "published" | "mine";
  sortBy?: "newest" | "oldest" | "title" | "readTime";
}

export interface ResearchPagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface ResearchServiceResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
  statusCode: number;
}
