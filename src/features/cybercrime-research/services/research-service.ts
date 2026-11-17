/**
 * VEXOR — Cybercrime Research Service (Fase 2A)
 *
 * Serviço centralizado e assíncrono para consumo dos Route Handlers `/api/research/**`.
 * Conteúdos editoriais curados (categorias, pilares, estudos de caso, debates e guias)
 * permanecem explicitamente separados de submissões de pesquisa.
 * Sem persistência local em navegador e sem fallback silencioso.
 */

import type {
  AnalysisLabGuide,
  CaseStudy,
  ResearchArticle,
  ResearchCategory,
  ResearchDomain,
  ResearchFilters,
  ResearchPagination,
  ResearchPillar,
  ResearchServiceResult,
  ResearchSeverity,
  ResearchStatus,
  ResearchSubmissionCreateInput,
  ResearchSubmissionDetail,
  ResearchSubmissionSummary,
  ResearchSubmissionUpdateInput,
  ResearchTlp,
  TechnicalDiscussion,
} from "../types";
import { RESEARCH_CATEGORIES } from "../data/categories";
import { RESEARCH_PILLARS } from "../data/pillars";
import {
  ANALYSIS_LAB_GUIDES,
  CASE_STUDIES,
  RESEARCH_ARTICLES,
  TECHNICAL_DISCUSSIONS,
} from "../data/research-data";
import type { AuthUserProfile } from "@/features/auth/validation";
import type { ResearchSubmission as AdminLegacyResearchSubmission } from "@/features/admin/types";

export interface SubmitResearchParams {
  categoryId: string;
  title_pt: string;
  title_en?: string;
  summary_pt: string;
  summary_en?: string;
  body_pt?: string;
  body_en?: string;
  domain: ResearchDomain;
  severity: ResearchSeverity;
  tlp: ResearchTlp;
  cves?: string[];
  attackTechniques: string[];
  readTimeMinutes?: number;
}

function buildResearchQueryString(
  filters?: ResearchFilters,
  page = 1,
  pageSize = 12
): string {
  const sp = new URLSearchParams();
  sp.set("page", String(page));
  sp.set("pageSize", String(pageSize));
  if (filters?.query) sp.set("query", filters.query);
  if (filters?.domain && filters.domain !== "all") sp.set("domain", filters.domain);
  if (filters?.severity && filters.severity !== "all") sp.set("severity", filters.severity);
  if (filters?.tlp && filters.tlp !== "all") sp.set("tlp", filters.tlp);
  if (filters?.categoryId) sp.set("categoryId", filters.categoryId);
  if (filters?.scope) sp.set("scope", filters.scope);
  if (filters?.sortBy) sp.set("sortBy", filters.sortBy);
  return sp.toString();
}

async function requestResearchApi<T>(
  url: string,
  init?: RequestInit
): Promise<ResearchServiceResult<T>> {
  try {
    const res = await fetch(url, {
      ...init,
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
    });

    const payload = (await res.json().catch(() => null)) as
      | (T & { error?: string; code?: string })
      | null;

    if (!res.ok || payload === null) {
      return {
        success: false,
        error: payload?.error ?? `Research request failed (${res.status}).`,
        code: payload?.code ?? "request_failed",
        statusCode: res.status,
      };
    }

    return {
      success: true,
      data: payload,
      statusCode: res.status,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Network error communicating with research API.",
      code: "network_error",
      statusCode: 503,
    };
  }
}

export class ResearchService {
  // --------------------------------------------------------------------------
  // Conteúdo editorial curado estático (separado da persistência real)
  // --------------------------------------------------------------------------

  getCategories(): ResearchCategory[] {
    return [...RESEARCH_CATEGORIES];
  }

  getCategoryBySlug(slug: string): ResearchCategory | undefined {
    return RESEARCH_CATEGORIES.find((c) => c.slug === slug);
  }

  getPillars(): ResearchPillar[] {
    return [...RESEARCH_PILLARS];
  }

  getAllArticles(): ResearchArticle[] {
    return [...RESEARCH_ARTICLES];
  }

  getAllCaseStudies(): CaseStudy[] {
    return [...CASE_STUDIES];
  }

  getCaseStudyBySlug(slug: string): CaseStudy | undefined {
    return CASE_STUDIES.find((cs) => cs.slug === slug);
  }

  getAllDiscussions(): TechnicalDiscussion[] {
    return [...TECHNICAL_DISCUSSIONS];
  }

  getAllLabGuides(): AnalysisLabGuide[] {
    return [...ANALYSIS_LAB_GUIDES];
  }

  getLabGuideBySlug(slug: string): AnalysisLabGuide | undefined {
    return ANALYSIS_LAB_GUIDES.find((l) => l.slug === slug);
  }

  // --------------------------------------------------------------------------
  // Camada assíncrona centralizada (Route Handlers /api/research/**)
  // --------------------------------------------------------------------------

  async listSubmissions(
    filters?: ResearchFilters,
    page = 1,
    pageSize = 12
  ): Promise<
    ResearchServiceResult<{
      items: ResearchSubmissionSummary[];
      pagination: ResearchPagination;
    }>
  > {
    const qs = buildResearchQueryString(filters, page, pageSize);
    return requestResearchApi(`/api/research?${qs}`, { method: "GET" });
  }

  async getSubmissionDetail(
    id: string
  ): Promise<
    ResearchServiceResult<{
      item: ResearchSubmissionDetail;
      recipients: Array<{
        researchId: string;
        userId: string;
        username: string;
        displayName: string | null;
        grantedBy: string | null;
        justification: string | null;
        createdAt: string;
      }>;
    }>
  > {
    return requestResearchApi(`/api/research/${encodeURIComponent(id)}`, {
      method: "GET",
    });
  }

  async listResearchCategories(): Promise<
    ResearchServiceResult<{
      items: Array<{ id: string; slug: string; namePt: string; nameEn: string; scope: string }>;
    }>
  > {
    return requestResearchApi("/api/research/categories", { method: "GET" });
  }

  async createSubmission(
    input: ResearchSubmissionCreateInput
  ): Promise<
    ResearchServiceResult<{
      id: string;
      slug: string;
      status: ResearchStatus;
      createdAt: string;
    }>
  > {
    return requestResearchApi("/api/research", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  async updatePendingSubmission(
    id: string,
    input: ResearchSubmissionUpdateInput
  ): Promise<ResearchServiceResult<{ success: true }>> {
    return requestResearchApi(`/api/research/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    });
  }

  async resubmitRejectedSubmission(
    id: string,
    input: ResearchSubmissionCreateInput
  ): Promise<ResearchServiceResult<{ success: true }>> {
    return requestResearchApi(`/api/research/${encodeURIComponent(id)}/resubmit`, {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  async grantRecipient(
    researchId: string,
    userId: string,
    justification?: string | null
  ): Promise<ResearchServiceResult<{ success: true }>> {
    return requestResearchApi(`/api/research/${encodeURIComponent(researchId)}/recipients`, {
      method: "POST",
      body: JSON.stringify({ userId, justification: justification ?? null }),
    });
  }

  async revokeRecipient(
    researchId: string,
    userId: string
  ): Promise<ResearchServiceResult<{ success: true }>> {
    return requestResearchApi(
      `/api/research/${encodeURIComponent(researchId)}/recipients/${encodeURIComponent(userId)}`,
      { method: "DELETE" }
    );
  }

  // --------------------------------------------------------------------------
  // Compatibilidade tipada com UI existente (sem persistência em navegador)
  // --------------------------------------------------------------------------

  async submitResearch(
    params: SubmitResearchParams,
    user: AuthUserProfile | null
  ): Promise<{ success: boolean; id?: string; error?: string }> {
    if (!user) {
      return { success: false, error: "401: Autenticação necessária para submeter pesquisas." };
    }
    if (user.isSuspended) {
      return {
        success: false,
        error: "42501: Contas suspensas não possuem permissão para submeter pesquisas.",
      };
    }

    const res = await this.createSubmission({
      categoryId: params.categoryId,
      titlePt: params.title_pt,
      titleEn: params.title_en ?? null,
      summaryPt: params.summary_pt,
      summaryEn: params.summary_en ?? null,
      bodyPt: params.body_pt ?? params.summary_pt,
      bodyEn: params.body_en ?? params.summary_en ?? null,
      domain: params.domain,
      severity: params.severity,
      tlp: params.tlp,
      cves: params.cves ?? [],
      attackTechniques: params.attackTechniques ?? [],
      readTimeMinutes: params.readTimeMinutes ?? 10,
    });

    return {
      success: res.success,
      id: res.success ? res.data?.id : undefined,
      error: res.error,
    };
  }

  async resubmitResearch(
    researchId: string,
    input: ResearchSubmissionCreateInput,
    user: AuthUserProfile | null
  ): Promise<{ success: boolean; error?: string }> {
    if (!user) {
      return { success: false, error: "401: Autenticação necessária." };
    }
    if (user.isSuspended) {
      return { success: false, error: "42501: Contas suspensas não podem reenviar pesquisas." };
    }

    const res = await this.resubmitRejectedSubmission(researchId, input);
    return {
      success: res.success,
      error: res.error,
    };
  }

  getUserSubmissions(_username: string): AdminLegacyResearchSubmission[] {
    void _username;
    return [];
  }
}

export const researchService = new ResearchService();
