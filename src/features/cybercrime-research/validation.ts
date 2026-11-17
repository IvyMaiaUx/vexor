import type {
  ResearchConfidenceLevel,
  ResearchDomain,
  ResearchFilters,
  ResearchSeverity,
  ResearchSourceReference,
  ResearchSubmissionCreateInput,
  ResearchSubmissionUpdateInput,
  ResearchTlp,
} from "./types";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CVE_REGEX = /^CVE-[0-9]{4}-[0-9]{4,7}$/;
const ATTACK_TECHNIQUE_REGEX = /^T[0-9]{4}(\.[0-9]{3})?$/;
const HTTPS_URL_REGEX = /^https:\/\/[^\s]+$/i;

const UNSAFE_HTML_REGEX =
  /<\s*\/?\s*(script|iframe|object|embed|svg|style|link|meta|form|input)\b|javascript:|vbscript:|data:text\/html|on[a-z]+\s*=/i;

export const ALLOWED_DOMAINS = new Set<ResearchDomain>([
  "malware",
  "ransomware",
  "apt",
  "darkweb",
  "fraud",
  "botnets",
  "identity",
  "legal",
]);

export const ALLOWED_SEVERITIES = new Set<ResearchSeverity>([
  "critical",
  "high",
  "medium",
  "info",
]);

export const ALLOWED_TLPS = new Set<ResearchTlp>([
  "CLEAR",
  "GREEN",
  "AMBER",
  "AMBER+",
  "RED",
]);

export const ALLOWED_CONFIDENCE_LEVELS = new Set<ResearchConfidenceLevel>([
  "low",
  "medium",
  "high",
]);

/**
 * Campos protegidos que jamais podem ser aceitos via payload de criação/edição.
 */
export const FORBIDDEN_PROTECTED_FIELDS = new Set<string>([
  "id",
  "slug",
  "author_id",
  "authorId",
  "author_username",
  "authorUsername",
  "status",
  "rejection_reason",
  "rejectionReason",
  "reviewed_by",
  "reviewedBy",
  "reviewed_at",
  "reviewedAt",
  "published_at",
  "publishedAt",
  "created_at",
  "createdAt",
  "updated_at",
  "updatedAt",
]);

export const MAX_PAGE_SIZE = 50;
export const DEFAULT_PAGE_SIZE = 12;

export function isValidUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_REGEX.test(value.trim());
}

export function containsUnsafeHtmlOrScript(value: string): boolean {
  return UNSAFE_HTML_REGEX.test(value);
}

export function findForbiddenProtectedFields(raw: Record<string, unknown>): string[] {
  return Object.keys(raw).filter((k) => FORBIDDEN_PROTECTED_FIELDS.has(k));
}

export type ValidationOutcome<T> =
  | { ok: true; value: T }
  | { ok: false; error: string; code: string };

function validateTextField(
  raw: unknown,
  label: string,
  minLen: number,
  maxLen: number,
  required: boolean
): ValidationOutcome<string | null> {
  if (raw === undefined || raw === null || (typeof raw === "string" && raw.trim() === "")) {
    if (required) {
      return { ok: false, error: `${label} is required.`, code: "validation_error" };
    }
    return { ok: true, value: null };
  }
  if (typeof raw !== "string") {
    return { ok: false, error: `${label} must be a string.`, code: "validation_error" };
  }
  const trimmed = raw.trim();
  if (trimmed.length < minLen || trimmed.length > maxLen) {
    return {
      ok: false,
      error: `${label} must be between ${minLen} and ${maxLen} characters.`,
      code: "validation_error",
    };
  }
  if (containsUnsafeHtmlOrScript(trimmed)) {
    return {
      ok: false,
      error: `${label} contains disallowed HTML or script content.`,
      code: "unsafe_content",
    };
  }
  return { ok: true, value: trimmed };
}

function validateCves(raw: unknown): ValidationOutcome<string[]> {
  if (raw === undefined || raw === null) return { ok: true, value: [] };
  if (!Array.isArray(raw)) {
    return { ok: false, error: "cves must be an array.", code: "validation_error" };
  }
  if (raw.length > 20) {
    return { ok: false, error: "At most 20 CVEs are allowed.", code: "payload_limit" };
  }
  const cleaned: string[] = [];
  for (const item of raw) {
    if (typeof item !== "string") {
      return { ok: false, error: "Each CVE must be a string.", code: "validation_error" };
    }
    const upper = item.trim().toUpperCase();
    if (!CVE_REGEX.test(upper)) {
      return { ok: false, error: `Invalid CVE format: ${item}`, code: "validation_error" };
    }
    if (!cleaned.includes(upper)) cleaned.push(upper);
  }
  return { ok: true, value: cleaned };
}

function validateAttackTechniques(raw: unknown): ValidationOutcome<string[]> {
  if (raw === undefined || raw === null) return { ok: true, value: [] };
  if (!Array.isArray(raw)) {
    return { ok: false, error: "attackTechniques must be an array.", code: "validation_error" };
  }
  if (raw.length > 30) {
    return { ok: false, error: "At most 30 MITRE ATT&CK techniques are allowed.", code: "payload_limit" };
  }
  const cleaned: string[] = [];
  for (const item of raw) {
    if (typeof item !== "string") {
      return { ok: false, error: "Each ATT&CK technique must be a string.", code: "validation_error" };
    }
    const upper = item.trim().toUpperCase();
    if (!ATTACK_TECHNIQUE_REGEX.test(upper)) {
      return {
        ok: false,
        error: `Invalid MITRE ATT&CK technique ID: ${item}`,
        code: "validation_error",
      };
    }
    if (!cleaned.includes(upper)) cleaned.push(upper);
  }
  return { ok: true, value: cleaned };
}

function validateSourceReferences(raw: unknown): ValidationOutcome<ResearchSourceReference[]> {
  if (raw === undefined || raw === null) return { ok: true, value: [] };
  if (!Array.isArray(raw)) {
    return { ok: false, error: "sourceReferences must be an array.", code: "validation_error" };
  }
  if (raw.length > 20) {
    return { ok: false, error: "At most 20 references are allowed.", code: "payload_limit" };
  }
  const cleaned: ResearchSourceReference[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      return { ok: false, error: "Each reference must be an object.", code: "validation_error" };
    }
    const rec = item as Record<string, unknown>;
    const titleRes = validateTextField(rec.title, "Reference title", 1, 200, true);
    if (!titleRes.ok || !titleRes.value) {
      return {
        ok: false,
        error: titleRes.ok ? "Invalid reference title." : titleRes.error,
        code: titleRes.ok ? "validation_error" : titleRes.code,
      };
    }
    let url: string | undefined;
    if (rec.url !== undefined && rec.url !== null && rec.url !== "") {
      if (typeof rec.url !== "string") {
        return { ok: false, error: "Reference url must be a string.", code: "validation_error" };
      }
      const trimmedUrl = rec.url.trim();
      if (trimmedUrl.length > 500 || !HTTPS_URL_REGEX.test(trimmedUrl)) {
        return {
          ok: false,
          error: "Reference url must be a valid https:// URL (max 500 chars).",
          code: "validation_error",
        };
      }
      url = trimmedUrl;
    }
    cleaned.push({
      title: titleRes.value,
      url,
      isExternal: typeof rec.isExternal === "boolean" ? rec.isExternal : Boolean(url),
    });
  }
  return { ok: true, value: cleaned };
}

export function validateResearchCreateInput(
  rawBody: unknown
): ValidationOutcome<ResearchSubmissionCreateInput> {
  if (!rawBody || typeof rawBody !== "object" || Array.isArray(rawBody)) {
    return { ok: false, error: "Payload must be a JSON object.", code: "validation_error" };
  }
  const raw = rawBody as Record<string, unknown>;

  const forbidden = findForbiddenProtectedFields(raw);
  if (forbidden.length > 0) {
    return {
      ok: false,
      error: `Protected fields cannot be set by client: ${forbidden.join(", ")}`,
      code: "mass_assignment_blocked",
    };
  }

  if (!isValidUuid(raw.categoryId)) {
    return { ok: false, error: "categoryId must be a valid UUID.", code: "validation_error" };
  }

  const titlePt = validateTextField(raw.titlePt, "titlePt", 5, 180, true);
  if (!titlePt.ok || !titlePt.value) return titlePt as ValidationOutcome<never>;

  const titleEn = validateTextField(raw.titleEn, "titleEn", 5, 180, false);
  if (!titleEn.ok) return titleEn as ValidationOutcome<never>;

  const summaryPt = validateTextField(raw.summaryPt, "summaryPt", 20, 1000, true);
  if (!summaryPt.ok || !summaryPt.value) return summaryPt as ValidationOutcome<never>;

  const summaryEn = validateTextField(raw.summaryEn, "summaryEn", 20, 1000, false);
  if (!summaryEn.ok) return summaryEn as ValidationOutcome<never>;

  const bodyPt = validateTextField(raw.bodyPt, "bodyPt", 20, 50000, true);
  if (!bodyPt.ok || !bodyPt.value) return bodyPt as ValidationOutcome<never>;

  const bodyEn = validateTextField(raw.bodyEn, "bodyEn", 20, 50000, false);
  if (!bodyEn.ok) return bodyEn as ValidationOutcome<never>;

  if (typeof raw.domain !== "string" || !ALLOWED_DOMAINS.has(raw.domain as ResearchDomain)) {
    return { ok: false, error: "Invalid research domain.", code: "validation_error" };
  }
  if (
    typeof raw.severity !== "string" ||
    !ALLOWED_SEVERITIES.has(raw.severity as ResearchSeverity)
  ) {
    return { ok: false, error: "Invalid research severity.", code: "validation_error" };
  }
  if (typeof raw.tlp !== "string" || !ALLOWED_TLPS.has(raw.tlp as ResearchTlp)) {
    return { ok: false, error: "Invalid TLP 2.0 classification.", code: "validation_error" };
  }

  let confidenceLevel: ResearchConfidenceLevel | null = null;
  if (raw.confidenceLevel !== undefined && raw.confidenceLevel !== null) {
    if (
      typeof raw.confidenceLevel !== "string" ||
      !ALLOWED_CONFIDENCE_LEVELS.has(raw.confidenceLevel as ResearchConfidenceLevel)
    ) {
      return { ok: false, error: "Invalid confidenceLevel.", code: "validation_error" };
    }
    confidenceLevel = raw.confidenceLevel as ResearchConfidenceLevel;
  }

  const methodology = validateTextField(raw.methodology, "methodology", 10, 2000, false);
  if (!methodology.ok) return methodology as ValidationOutcome<never>;

  let readTimeMinutes = 10;
  if (raw.readTimeMinutes !== undefined && raw.readTimeMinutes !== null) {
    const parsed = Number(raw.readTimeMinutes);
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > 180) {
      return {
        ok: false,
        error: "readTimeMinutes must be an integer between 1 and 180.",
        code: "validation_error",
      };
    }
    readTimeMinutes = parsed;
  }

  const cves = validateCves(raw.cves);
  if (!cves.ok) return cves as ValidationOutcome<never>;

  const attackTechniques = validateAttackTechniques(raw.attackTechniques);
  if (!attackTechniques.ok) return attackTechniques as ValidationOutcome<never>;

  const sourceReferences = validateSourceReferences(raw.sourceReferences);
  if (!sourceReferences.ok) return sourceReferences as ValidationOutcome<never>;

  return {
    ok: true,
    value: {
      categoryId: raw.categoryId.trim(),
      titlePt: titlePt.value,
      titleEn: titleEn.value,
      summaryPt: summaryPt.value,
      summaryEn: summaryEn.value,
      bodyPt: bodyPt.value,
      bodyEn: bodyEn.value,
      domain: raw.domain as ResearchDomain,
      severity: raw.severity as ResearchSeverity,
      tlp: raw.tlp as ResearchTlp,
      cves: cves.value,
      attackTechniques: attackTechniques.value,
      sourceReferences: sourceReferences.value,
      confidenceLevel,
      methodology: methodology.value,
      readTimeMinutes,
    },
  };
}

export function validateResearchUpdateInput(
  rawBody: unknown
): ValidationOutcome<ResearchSubmissionUpdateInput> {
  if (!rawBody || typeof rawBody !== "object" || Array.isArray(rawBody)) {
    return { ok: false, error: "Payload must be a JSON object.", code: "validation_error" };
  }
  const raw = rawBody as Record<string, unknown>;

  const forbidden = findForbiddenProtectedFields(raw);
  if (forbidden.length > 0) {
    return {
      ok: false,
      error: `Protected fields cannot be updated by client: ${forbidden.join(", ")}`,
      code: "mass_assignment_blocked",
    };
  }

  const out: ResearchSubmissionUpdateInput = {};

  if ("categoryId" in raw) {
    if (!isValidUuid(raw.categoryId)) {
      return { ok: false, error: "categoryId must be a valid UUID.", code: "validation_error" };
    }
    out.categoryId = raw.categoryId.trim();
  }
  if ("titlePt" in raw) {
    const r = validateTextField(raw.titlePt, "titlePt", 5, 180, true);
    if (!r.ok || !r.value) return r as ValidationOutcome<never>;
    out.titlePt = r.value;
  }
  if ("titleEn" in raw) {
    const r = validateTextField(raw.titleEn, "titleEn", 5, 180, false);
    if (!r.ok) return r as ValidationOutcome<never>;
    out.titleEn = r.value;
  }
  if ("summaryPt" in raw) {
    const r = validateTextField(raw.summaryPt, "summaryPt", 20, 1000, true);
    if (!r.ok || !r.value) return r as ValidationOutcome<never>;
    out.summaryPt = r.value;
  }
  if ("summaryEn" in raw) {
    const r = validateTextField(raw.summaryEn, "summaryEn", 20, 1000, false);
    if (!r.ok) return r as ValidationOutcome<never>;
    out.summaryEn = r.value;
  }
  if ("bodyPt" in raw) {
    const r = validateTextField(raw.bodyPt, "bodyPt", 20, 50000, true);
    if (!r.ok || !r.value) return r as ValidationOutcome<never>;
    out.bodyPt = r.value;
  }
  if ("bodyEn" in raw) {
    const r = validateTextField(raw.bodyEn, "bodyEn", 20, 50000, false);
    if (!r.ok) return r as ValidationOutcome<never>;
    out.bodyEn = r.value;
  }
  if ("domain" in raw) {
    if (typeof raw.domain !== "string" || !ALLOWED_DOMAINS.has(raw.domain as ResearchDomain)) {
      return { ok: false, error: "Invalid research domain.", code: "validation_error" };
    }
    out.domain = raw.domain as ResearchDomain;
  }
  if ("severity" in raw) {
    if (
      typeof raw.severity !== "string" ||
      !ALLOWED_SEVERITIES.has(raw.severity as ResearchSeverity)
    ) {
      return { ok: false, error: "Invalid research severity.", code: "validation_error" };
    }
    out.severity = raw.severity as ResearchSeverity;
  }
  if ("tlp" in raw) {
    if (typeof raw.tlp !== "string" || !ALLOWED_TLPS.has(raw.tlp as ResearchTlp)) {
      return { ok: false, error: "Invalid TLP 2.0 classification.", code: "validation_error" };
    }
    out.tlp = raw.tlp as ResearchTlp;
  }
  if ("confidenceLevel" in raw) {
    if (raw.confidenceLevel === null) {
      out.confidenceLevel = null;
    } else if (
      typeof raw.confidenceLevel === "string" &&
      ALLOWED_CONFIDENCE_LEVELS.has(raw.confidenceLevel as ResearchConfidenceLevel)
    ) {
      out.confidenceLevel = raw.confidenceLevel as ResearchConfidenceLevel;
    } else {
      return { ok: false, error: "Invalid confidenceLevel.", code: "validation_error" };
    }
  }
  if ("methodology" in raw) {
    const r = validateTextField(raw.methodology, "methodology", 10, 2000, false);
    if (!r.ok) return r as ValidationOutcome<never>;
    out.methodology = r.value;
  }
  if ("readTimeMinutes" in raw) {
    const parsed = Number(raw.readTimeMinutes);
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > 180) {
      return {
        ok: false,
        error: "readTimeMinutes must be an integer between 1 and 180.",
        code: "validation_error",
      };
    }
    out.readTimeMinutes = parsed;
  }
  if ("cves" in raw) {
    const r = validateCves(raw.cves);
    if (!r.ok) return r as ValidationOutcome<never>;
    out.cves = r.value;
  }
  if ("attackTechniques" in raw) {
    const r = validateAttackTechniques(raw.attackTechniques);
    if (!r.ok) return r as ValidationOutcome<never>;
    out.attackTechniques = r.value;
  }
  if ("sourceReferences" in raw) {
    const r = validateSourceReferences(raw.sourceReferences);
    if (!r.ok) return r as ValidationOutcome<never>;
    out.sourceReferences = r.value;
  }

  if (Object.keys(out).length === 0) {
    return {
      ok: false,
      error: "At least one editable field must be provided.",
      code: "validation_error",
    };
  }

  return { ok: true, value: out };
}

export function parseResearchListQuery(searchParams: URLSearchParams): {
  filters: ResearchFilters;
  page: number;
  pageSize: number;
} {
  const domainParam = searchParams.get("domain");
  const severityParam = searchParams.get("severity");
  const tlpParam = searchParams.get("tlp");
  const categoryIdParam = searchParams.get("categoryId");
  const scopeParam = searchParams.get("scope");
  const sortParam = searchParams.get("sortBy");
  const queryParam = searchParams.get("query");

  const rawPage = Number(searchParams.get("page") ?? "1");
  const rawPageSize = Number(searchParams.get("pageSize") ?? String(DEFAULT_PAGE_SIZE));

  const page = Number.isFinite(rawPage) && rawPage >= 1 ? Math.floor(rawPage) : 1;
  const pageSize =
    Number.isFinite(rawPageSize) && rawPageSize >= 1
      ? Math.min(Math.floor(rawPageSize), MAX_PAGE_SIZE)
      : DEFAULT_PAGE_SIZE;

  const filters: ResearchFilters = {
    query: queryParam ? queryParam.trim().slice(0, 120) : undefined,
    domain:
      domainParam && ALLOWED_DOMAINS.has(domainParam as ResearchDomain)
        ? (domainParam as ResearchDomain)
        : "all",
    severity:
      severityParam && ALLOWED_SEVERITIES.has(severityParam as ResearchSeverity)
        ? (severityParam as ResearchSeverity)
        : "all",
    tlp:
      tlpParam && ALLOWED_TLPS.has(tlpParam as ResearchTlp)
        ? (tlpParam as ResearchTlp)
        : "all",
    categoryId: categoryIdParam && isValidUuid(categoryIdParam) ? categoryIdParam : undefined,
    scope: scopeParam === "mine" ? "mine" : "published",
    sortBy:
      sortParam === "oldest" || sortParam === "title" || sortParam === "readTime"
        ? sortParam
        : "newest",
  };

  return { filters, page, pageSize };
}
