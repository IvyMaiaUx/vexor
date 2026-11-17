import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import type {
  ResearchConfidenceLevel,
  ResearchDomain,
  ResearchFilters,
  ResearchPagination,
  ResearchSeverity,
  ResearchSourceReference,
  ResearchStatus,
  ResearchSubmissionCreateInput,
  ResearchSubmissionDetail,
  ResearchSubmissionSummary,
  ResearchSubmissionUpdateInput,
  ResearchTlp,
} from "../types";

export type ResearchSupabaseClient = SupabaseClient<Database>;

/**
 * Local database row contracts matching `supabase/migrations/20261116114600_research_submissions.sql`.
 * Kept separate from `src/types/database.types.ts` until the migration is applied to remote Supabase.
 */
export interface ResearchSubmissionRow {
  id: string;
  slug: string;
  author_id: string | null;
  category_id: string;
  title_pt: string;
  title_en: string | null;
  summary_pt: string;
  summary_en: string | null;
  body_pt: string;
  body_en: string | null;
  domain: ResearchDomain;
  severity: ResearchSeverity;
  tlp: ResearchTlp;
  status: ResearchStatus;
  cves: string[];
  attack_techniques: string[];
  source_references: ResearchSourceReference[];
  confidence_level: ResearchConfidenceLevel | null;
  methodology: string | null;
  read_time_minutes: number;
  rejection_reason: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ResearchRecipientRow {
  research_id: string;
  user_id: string;
  granted_by: string | null;
  justification: string | null;
  created_at: string;
  updated_by: string | null;
  updated_at: string | null;
}

export interface ResearchRecipientView {
  researchId: string;
  userId: string;
  username: string;
  displayName: string | null;
  grantedBy: string | null;
  justification: string | null;
  createdAt: string;
  updatedBy: string | null;
  updatedAt: string | null;
}

export interface ResearchCategoryOption {
  id: string;
  slug: string;
  namePt: string;
  nameEn: string;
  scope: string;
}

export interface ResearchPgMappedError {
  httpStatus: number;
  code: string;
  message: string;
}

interface PgErrorLike {
  code?: string;
  message?: string;
  status?: number;
}

/**
 * Maps PostgreSQL / PostgREST errors to safe HTTP status codes without leaking internal details.
 */
export function mapResearchPgError(
  error: unknown,
  fallbackMessage = "Unable to complete research operation."
): ResearchPgMappedError {
  const err = (error ?? {}) as PgErrorLike;
  const code = String(err.code ?? "").toUpperCase();
  const msg = String(err.message ?? "").toLowerCase();

  if (code === "55P03" || msg.includes("lock_not_available") || msg.includes("could not obtain lock")) {
    return {
      httpStatus: 409,
      code: "lock_conflict",
      message: "Concurrent modification in progress. Please retry in a moment.",
    };
  }
  if (code === "23505" || msg.includes("duplicate key")) {
    return {
      httpStatus: 409,
      code: "duplicate_conflict",
      message: "A conflicting record already exists.",
    };
  }
  if (code === "P0002" || msg.includes("research not found") || msg.includes("profile not found")) {
    return {
      httpStatus: 404,
      code: "not_found",
      message: "Research submission not found.",
    };
  }
  if (code === "42501" || code === "PGRST301" || err.status === 403 || msg.includes("forbidden")) {
    return {
      httpStatus: 403,
      code: "forbidden",
      message: "You do not have permission to perform this operation.",
    };
  }
  if (code === "22023") {
    if (
      msg.includes("transition") ||
      msg.includes("already in status") ||
      msg.includes("archived") ||
      msg.includes("only rejected") ||
      msg.includes("approved research") ||
      msg.includes("clear or green") ||
      msg.includes("justification")
    ) {
      return {
        httpStatus: 422,
        code: "invalid_state_transition",
        message: "The requested operation is not valid for the current research state or TLP.",
      };
    }
    return {
      httpStatus: 400,
      code: "validation_error",
      message: "Invalid research parameters.",
    };
  }
  if (code === "23514" || code === "23503" || code === "23502" || code === "22P02") {
    return {
      httpStatus: 400,
      code: "validation_error",
      message: "Invalid research payload or reference.",
    };
  }

  return {
    httpStatus: 500,
    code: "internal_error",
    message: fallbackMessage,
  };
}

export class ResearchRepositoryError extends Error {
  readonly httpStatus: number;
  readonly code: string;

  constructor(mapped: ResearchPgMappedError) {
    super(mapped.message);
    this.httpStatus = mapped.httpStatus;
    this.code = mapped.code;
  }
}

export interface ResearchRepository {
  list(params: {
    actorId: string;
    filters: ResearchFilters;
    page: number;
    pageSize: number;
  }): Promise<{
    items: ResearchSubmissionSummary[];
    pagination: ResearchPagination;
  }>;
  getById(id: string, actorId?: string): Promise<{
    item: ResearchSubmissionDetail;
    recipients: ResearchRecipientView[];
  } | null>;
  create(input: ResearchSubmissionCreateInput): Promise<{
    id: string;
    slug: string;
    status: ResearchStatus;
    createdAt: string;
  }>;
  updatePending(id: string, input: ResearchSubmissionUpdateInput): Promise<void>;
  resubmit(id: string, input: ResearchSubmissionCreateInput): Promise<void>;
  grantRecipient(researchId: string, userId: string, justification?: string | null): Promise<void>;
  revokeRecipient(researchId: string, userId: string): Promise<void>;
  listCategories(): Promise<ResearchCategoryOption[]>;
}

const SUBMISSION_COLUMNS =
  "id, slug, author_id, category_id, title_pt, title_en, summary_pt, summary_en, body_pt, body_en, domain, severity, tlp, status, cves, attack_techniques, source_references, confidence_level, methodology, read_time_minutes, rejection_reason, reviewed_by, reviewed_at, published_at, created_at, updated_at";

function mapRowToSummary(
  row: ResearchSubmissionRow,
  authorMap: Map<string, string>
): ResearchSubmissionSummary {
  return {
    id: row.id,
    slug: row.slug,
    authorId: row.author_id,
    authorUsername: row.author_id ? authorMap.get(row.author_id) ?? "member" : "deleted_user",
    categoryId: row.category_id,
    titlePt: row.title_pt,
    titleEn: row.title_en,
    summaryPt: row.summary_pt,
    summaryEn: row.summary_en,
    domain: row.domain,
    severity: row.severity,
    tlp: row.tlp,
    status: row.status,
    cves: Array.isArray(row.cves) ? row.cves : [],
    attackTechniques: Array.isArray(row.attack_techniques) ? row.attack_techniques : [],
    confidenceLevel: row.confidence_level,
    readTimeMinutes: row.read_time_minutes,
    publishedAt: row.published_at,
    createdAt: row.created_at,
  };
}

function mapRowToDetail(
  row: ResearchSubmissionRow,
  authorMap: Map<string, string>,
  actorId?: string
): ResearchSubmissionDetail {
  return {
    ...mapRowToSummary(row, authorMap),
    bodyPt: row.body_pt,
    bodyEn: row.body_en,
    sourceReferences: Array.isArray(row.source_references) ? row.source_references : [],
    methodology: row.methodology,
    rejectionReason: row.rejection_reason,
    reviewedBy: row.reviewed_by,
    reviewedAt: row.reviewed_at,
    updatedAt: row.updated_at,
    canEdit: Boolean(actorId && row.author_id === actorId && row.status === "pending"),
    canResubmit: Boolean(actorId && row.author_id === actorId && row.status === "rejected"),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DynamicSupabase = any;

async function loadPublicUsernames(
  client: DynamicSupabase,
  userIds: Array<string | null | undefined>
): Promise<Map<string, { username: string; displayName: string | null }>> {
  const uniqueIds = Array.from(new Set(userIds.filter((x): x is string => Boolean(x))));
  const map = new Map<string, { username: string; displayName: string | null }>();
  if (uniqueIds.length === 0) return map;

  const { data } = await client
    .from("public_profiles")
    .select("id, username, display_name")
    .in("id", uniqueIds);

  for (const p of (data ?? []) as Array<{
    id: string;
    username: string;
    display_name: string | null;
  }>) {
    map.set(p.id, { username: p.username, displayName: p.display_name });
  }
  return map;
}

export function createSupabaseResearchRepository(
  supabase: ResearchSupabaseClient
): ResearchRepository {
  const db = supabase as DynamicSupabase;

  return {
    async list({ actorId, filters, page, pageSize }) {
      let query = db.from("research_submissions").select(SUBMISSION_COLUMNS);

      if (filters.scope === "mine") {
        query = query.eq("author_id", actorId);
      } else if (filters.scope === "published") {
        query = query.eq("status", "approved");
      }

      if (filters.domain && filters.domain !== "all") {
        query = query.eq("domain", filters.domain);
      }
      if (filters.severity && filters.severity !== "all") {
        query = query.eq("severity", filters.severity);
      }
      if (filters.tlp && filters.tlp !== "all") {
        query = query.eq("tlp", filters.tlp);
      }
      if (filters.categoryId) {
        query = query.eq("category_id", filters.categoryId);
      }

      if (filters.sortBy === "oldest") {
        query = query.order("created_at", { ascending: true });
      } else if (filters.sortBy === "title") {
        query = query.order("title_pt", { ascending: true });
      } else if (filters.sortBy === "readTime") {
        query = query.order("read_time_minutes", { ascending: true });
      } else {
        query = query.order("created_at", { ascending: false });
      }

      const { data, error } = await query;
      if (error) {
        throw new ResearchRepositoryError(
          mapResearchPgError(error, "Unable to list research submissions.")
        );
      }

      let rows = (data ?? []) as ResearchSubmissionRow[];

      const userProfiles = await loadPublicUsernames(
        db,
        rows.map((r) => r.author_id)
      );
      const authorMap = new Map<string, string>();
      userProfiles.forEach((v, k) => authorMap.set(k, v.username));

      if (filters.query) {
        const q = filters.query.toLowerCase();
        rows = rows.filter((row) => {
          const author = row.author_id ? authorMap.get(row.author_id) ?? "" : "";
          return (
            row.title_pt.toLowerCase().includes(q) ||
            (row.title_en ?? "").toLowerCase().includes(q) ||
            row.summary_pt.toLowerCase().includes(q) ||
            (row.summary_en ?? "").toLowerCase().includes(q) ||
            author.toLowerCase().includes(q) ||
            row.cves.some((c) => c.toLowerCase().includes(q)) ||
            row.attack_techniques.some((t) => t.toLowerCase().includes(q))
          );
        });
      }

      const total = rows.length;
      const totalPages = Math.max(1, Math.ceil(total / pageSize));
      const safePage = Math.min(Math.max(1, page), totalPages);
      const offset = (safePage - 1) * pageSize;
      const items = rows.slice(offset, offset + pageSize).map((r) => mapRowToSummary(r, authorMap));

      return {
        items,
        pagination: {
          page: safePage,
          pageSize,
          total,
          totalPages,
        },
      };
    },

    async getById(id: string, actorId?: string) {
      const { data, error } = await db
        .from("research_submissions")
        .select(SUBMISSION_COLUMNS)
        .eq("id", id)
        .maybeSingle();

      if (error) {
        throw new ResearchRepositoryError(
          mapResearchPgError(error, "Unable to load research submission.")
        );
      }

      const row = data as ResearchSubmissionRow | null;
      if (!row) return null;

      // RLS enforces who can read research_recipients (recipient, author, or moderator/admin)
      const { data: recData, error: recError } = await db
        .from("research_recipients")
        .select("research_id, user_id, granted_by, justification, created_at, updated_by, updated_at")
        .eq("research_id", id)
        .order("created_at", { ascending: true });

      if (recError) {
        throw new ResearchRepositoryError(
          mapResearchPgError(recError, "Unable to load research recipients.")
        );
      }

      const recRows = (recData ?? []) as ResearchRecipientRow[];
      const profileMap = await loadPublicUsernames(db, [
        row.author_id,
        ...recRows.map((r) => r.user_id),
      ]);
      const authorMap = new Map<string, string>();
      profileMap.forEach((v, k) => authorMap.set(k, v.username));

      const recipients: ResearchRecipientView[] = recRows.map((rec) => {
        const prof = profileMap.get(rec.user_id);
        return {
          researchId: rec.research_id,
          userId: rec.user_id,
          username: prof?.username ?? "member",
          displayName: prof?.displayName ?? null,
          grantedBy: rec.granted_by,
          justification: rec.justification,
          createdAt: rec.created_at,
          updatedBy: rec.updated_by,
          updatedAt: rec.updated_at,
        };
      });

      return {
        item: mapRowToDetail(row, authorMap, actorId),
        recipients,
      };
    },

    async create(input: ResearchSubmissionCreateInput) {
      // Write strictly the 16 client-writable columns (RLS + trigger enforce author_id & status)
      const insertPayload = {
        category_id: input.categoryId,
        title_pt: input.titlePt,
        title_en: input.titleEn ?? null,
        summary_pt: input.summaryPt,
        summary_en: input.summaryEn ?? null,
        body_pt: input.bodyPt,
        body_en: input.bodyEn ?? null,
        domain: input.domain,
        severity: input.severity,
        tlp: input.tlp,
        cves: input.cves ?? [],
        attack_techniques: input.attackTechniques ?? [],
        source_references: input.sourceReferences ?? [],
        confidence_level: input.confidenceLevel ?? null,
        methodology: input.methodology ?? null,
        read_time_minutes: input.readTimeMinutes ?? 10,
      };

      const { data, error } = await db
        .from("research_submissions")
        .insert(insertPayload)
        .select("id, slug, status, created_at")
        .single();

      if (error || !data) {
        throw new ResearchRepositoryError(
          mapResearchPgError(error, "Unable to create research submission.")
        );
      }

      return {
        id: data.id as string,
        slug: data.slug as string,
        status: data.status as ResearchStatus,
        createdAt: data.created_at as string,
      };
    },

    async updatePending(id: string, input: ResearchSubmissionUpdateInput) {
      const updatePayload: Record<string, unknown> = {};
      if (input.categoryId !== undefined) updatePayload.category_id = input.categoryId;
      if (input.titlePt !== undefined) updatePayload.title_pt = input.titlePt;
      if (input.titleEn !== undefined) updatePayload.title_en = input.titleEn;
      if (input.summaryPt !== undefined) updatePayload.summary_pt = input.summaryPt;
      if (input.summaryEn !== undefined) updatePayload.summary_en = input.summaryEn;
      if (input.bodyPt !== undefined) updatePayload.body_pt = input.bodyPt;
      if (input.bodyEn !== undefined) updatePayload.body_en = input.bodyEn;
      if (input.domain !== undefined) updatePayload.domain = input.domain;
      if (input.severity !== undefined) updatePayload.severity = input.severity;
      if (input.tlp !== undefined) updatePayload.tlp = input.tlp;
      if (input.cves !== undefined) updatePayload.cves = input.cves;
      if (input.attackTechniques !== undefined) {
        updatePayload.attack_techniques = input.attackTechniques;
      }
      if (input.sourceReferences !== undefined) {
        updatePayload.source_references = input.sourceReferences;
      }
      if (input.confidenceLevel !== undefined) {
        updatePayload.confidence_level = input.confidenceLevel;
      }
      if (input.methodology !== undefined) updatePayload.methodology = input.methodology;
      if (input.readTimeMinutes !== undefined) {
        updatePayload.read_time_minutes = input.readTimeMinutes;
      }

      const { data, error } = await db
        .from("research_submissions")
        .update(updatePayload)
        .eq("id", id)
        .eq("status", "pending")
        .select("id");

      if (error) {
        throw new ResearchRepositoryError(
          mapResearchPgError(error, "Unable to update pending research submission.")
        );
      }

      if (!data || data.length === 0) {
        throw new ResearchRepositoryError({
          httpStatus: 404,
          code: "not_found",
          message: "Pending research submission not found or not editable.",
        });
      }
    },

    async resubmit(id: string, input: ResearchSubmissionCreateInput) {
      const { error } = await db.rpc("resubmit_research", {
        p_research_id: id,
        p_category_id: input.categoryId,
        p_title_pt: input.titlePt,
        p_summary_pt: input.summaryPt,
        p_body_pt: input.bodyPt,
        p_domain: input.domain,
        p_severity: input.severity,
        p_tlp: input.tlp,
        p_title_en: input.titleEn ?? null,
        p_summary_en: input.summaryEn ?? null,
        p_body_en: input.bodyEn ?? null,
        p_cves: input.cves ?? [],
        p_attack_techniques: input.attackTechniques ?? [],
        p_source_references: input.sourceReferences ?? [],
        p_confidence_level: input.confidenceLevel ?? null,
        p_methodology: input.methodology ?? null,
        p_read_time_minutes: input.readTimeMinutes ?? 10,
      });

      if (error) {
        throw new ResearchRepositoryError(
          mapResearchPgError(error, "Unable to resubmit research.")
        );
      }
    },

    async grantRecipient(researchId: string, userId: string, justification?: string | null) {
      const { error } = await db.rpc("grant_research_recipient", {
        p_research_id: researchId,
        p_user_id: userId,
        p_justification: justification ?? null,
      });

      if (error) {
        throw new ResearchRepositoryError(
          mapResearchPgError(error, "Unable to grant recipient access.")
        );
      }
    },

    async revokeRecipient(researchId: string, userId: string) {
      const { error } = await db.rpc("revoke_research_recipient", {
        p_research_id: researchId,
        p_user_id: userId,
      });

      if (error) {
        throw new ResearchRepositoryError(
          mapResearchPgError(error, "Unable to revoke recipient access.")
        );
      }
    },

    async listCategories() {
      const { data, error } = await db
        .from("categories")
        .select("id, slug, name_pt, name_en, scope")
        .eq("is_active", true)
        .in("scope", ["research", "both"])
        .order("sort_order", { ascending: true });

      if (error) {
        throw new ResearchRepositoryError(
          mapResearchPgError(error, "Unable to load research categories.")
        );
      }

      return ((data ?? []) as Array<{
        id: string;
        slug: string;
        name_pt: string;
        name_en: string;
        scope: string;
      }>).map((c) => ({
        id: c.id,
        slug: c.slug,
        namePt: c.name_pt,
        nameEn: c.name_en,
        scope: c.scope,
      }));
    },
  };
}
