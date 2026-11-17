import type {
  ResearchFilters,
  ResearchPagination,
  ResearchSubmission,
  ResearchSubmissionDetail,
  ResearchSubmissionSummary,
} from "../types";

export const MOCK_CATEGORY_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
export const MOCK_PUBLIC_RESEARCH_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
export const MOCK_PRIVATE_PENDING_ID = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
export const MOCK_OTHER_AUTHOR_ID = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";

const TEST_MOCK_SUBMISSIONS: readonly ResearchSubmission[] = [
  {
    id: MOCK_PUBLIC_RESEARCH_ID,
    slug: "ransomware-double-extortion-telemetry-bbbbbbbb",
    authorId: MOCK_OTHER_AUTHOR_ID,
    authorUsername: "threat_analyst",
    categoryId: MOCK_CATEGORY_ID,
    titlePt: "Telemetria Defensiva contra Dupla Extorsão em Ransomware",
    titleEn: "Defensive Telemetry Against Ransomware Double Extortion",
    summaryPt:
      "Análise técnica de indicadores de exfiltração e movimentação lateral em campanhas de dupla extorsão.",
    summaryEn:
      "Technical analysis of exfiltration indicators and lateral movement in double-extortion campaigns.",
    bodyPt:
      "Estudo aprofundado dos sinais de pré-criptografia, abuso de ferramentas administrativas nativas e estratégias de detecção precoce.",
    bodyEn:
      "In-depth study of pre-encryption signals, living-off-the-land tool abuse, and early detection strategies.",
    domain: "ransomware",
    severity: "high",
    tlp: "GREEN",
    status: "approved",
    cves: ["CVE-2024-3094"],
    attackTechniques: ["T1059", "T1048"],
    sourceReferences: [
      {
        title: "MITRE ATT&CK T1048",
        url: "https://attack.mitre.org/techniques/T1048/",
        isExternal: true,
      },
    ],
    confidenceLevel: "high",
    methodology: "Análise de telemetria em sandbox isolada e correlação de logs.",
    readTimeMinutes: 12,
    rejectionReason: null,
    reviewedBy: null,
    reviewedAt: "2026-11-10T12:00:00Z",
    publishedAt: "2026-11-10T12:00:00Z",
    createdAt: "2026-11-09T10:00:00Z",
    updatedAt: "2026-11-10T12:00:00Z",
    isTestMockData: true,
  },
  {
    id: MOCK_PRIVATE_PENDING_ID,
    slug: "private-pending-draft-cccccccc",
    authorId: MOCK_OTHER_AUTHOR_ID,
    authorUsername: "threat_analyst",
    categoryId: MOCK_CATEGORY_ID,
    titlePt: "Rascunho Pendente Confidencial de Outro Autor",
    titleEn: "Confidential Pending Draft From Another Author",
    summaryPt:
      "Submissão pendente de revisão que não pode ser acessada por outros membros.",
    summaryEn:
      "Pending submission under review that must remain private to the author and moderators.",
    bodyPt:
      "Conteúdo ainda em triagem pela moderação técnica do portal VEXOR.",
    bodyEn: "Content still undergoing technical moderation review.",
    domain: "apt",
    severity: "critical",
    tlp: "AMBER+",
    status: "pending",
    cves: [],
    attackTechniques: ["T1027"],
    sourceReferences: [],
    confidenceLevel: "medium",
    methodology: null,
    readTimeMinutes: 8,
    rejectionReason: null,
    reviewedBy: null,
    reviewedAt: null,
    publishedAt: null,
    createdAt: "2026-11-14T10:00:00Z",
    updatedAt: "2026-11-14T10:00:00Z",
    isTestMockData: true,
  },
];

function toSummary(item: ResearchSubmission): ResearchSubmissionSummary {
  return {
    id: item.id,
    slug: item.slug,
    authorId: item.authorId,
    authorUsername: item.authorUsername,
    categoryId: item.categoryId,
    titlePt: item.titlePt,
    titleEn: item.titleEn,
    summaryPt: item.summaryPt,
    summaryEn: item.summaryEn,
    domain: item.domain,
    severity: item.severity,
    tlp: item.tlp,
    status: item.status,
    cves: [...item.cves],
    attackTechniques: [...item.attackTechniques],
    confidenceLevel: item.confidenceLevel,
    readTimeMinutes: item.readTimeMinutes,
    publishedAt: item.publishedAt,
    createdAt: item.createdAt,
    isTestMockData: true,
  };
}

export interface ResearchTestMockAdapter {
  readonly isTestMockAdapter: true;
  list(params: {
    actorId: string;
    isModerator: boolean;
    filters: ResearchFilters;
    page: number;
    pageSize: number;
  }): Promise<{ items: ResearchSubmissionSummary[]; pagination: ResearchPagination }>;
  getById(params: {
    id: string;
    actorId: string;
    isModerator: boolean;
  }): Promise<ResearchSubmissionDetail | null>;
}

/**
 * Adapter em memória exclusivo da Fase 2A (sem persistência em navegador e sem banco).
 * Será substituído pelo adapter Supabase na Fase 2B/2C após aprovação do schema.
 */
export function createResearchTestMockAdapter(
  seed: readonly ResearchSubmission[] = TEST_MOCK_SUBMISSIONS
): ResearchTestMockAdapter {
  return {
    isTestMockAdapter: true,

    async list({ actorId, isModerator, filters, page, pageSize }) {
      let visible = seed.filter((item) => {
        if (filters.scope === "mine") {
          return item.authorId === actorId;
        }
        if (isModerator) {
          return item.status === "approved" || item.authorId === actorId;
        }
        return item.status === "approved";
      });

      if (filters.domain && filters.domain !== "all") {
        visible = visible.filter((i) => i.domain === filters.domain);
      }
      if (filters.severity && filters.severity !== "all") {
        visible = visible.filter((i) => i.severity === filters.severity);
      }
      if (filters.tlp && filters.tlp !== "all") {
        visible = visible.filter((i) => i.tlp === filters.tlp);
      }
      if (filters.categoryId) {
        visible = visible.filter((i) => i.categoryId === filters.categoryId);
      }
      if (filters.query) {
        const q = filters.query.toLowerCase();
        visible = visible.filter(
          (i) =>
            i.titlePt.toLowerCase().includes(q) ||
            (i.titleEn ?? "").toLowerCase().includes(q) ||
            i.summaryPt.toLowerCase().includes(q) ||
            i.cves.some((c) => c.toLowerCase().includes(q)) ||
            i.attackTechniques.some((t) => t.toLowerCase().includes(q))
        );
      }

      const sorted = [...visible].sort((a, b) => {
        if (filters.sortBy === "oldest") {
          return a.createdAt.localeCompare(b.createdAt);
        }
        if (filters.sortBy === "title") {
          return a.titlePt.localeCompare(b.titlePt);
        }
        if (filters.sortBy === "readTime") {
          return b.readTimeMinutes - a.readTimeMinutes;
        }
        return b.createdAt.localeCompare(a.createdAt);
      });

      const total = sorted.length;
      const totalPages = Math.max(1, Math.ceil(total / pageSize));
      const safePage = Math.min(Math.max(1, page), totalPages);
      const start = (safePage - 1) * pageSize;

      return {
        items: sorted.slice(start, start + pageSize).map(toSummary),
        pagination: {
          page: safePage,
          pageSize,
          total,
          totalPages,
        },
      };
    },

    async getById({ id, actorId, isModerator }) {
      const found = seed.find((i) => i.id === id);
      if (!found) return null;

      const canRead =
        found.status === "approved" ||
        found.authorId === actorId ||
        isModerator;

      if (!canRead) return null;

      return {
        ...found,
        canEdit: found.authorId === actorId && found.status === "pending",
        canResubmit: found.authorId === actorId && found.status === "rejected",
      };
    },
  };
}
