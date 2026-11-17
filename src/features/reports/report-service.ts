import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database.types";

export type ReportReason = Database["public"]["Enums"]["report_reason"];
export type ReportStatus = Database["public"]["Enums"]["report_status"];
export type ReportTargetType = "topic" | "post" | "resource" | "profile" | "research";

export interface ReportSupabaseError {
  message?: string;
  code?: string;
  status?: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ReportSupabaseClientLike = any;

export const VALID_REPORT_REASONS: readonly ReportReason[] = [
  "spam",
  "malicious_content",
  "personal_data",
  "harassment",
  "unauthorized_attack",
  "copyright",
  "other",
] as const;

export const REPORT_OWN_SELECT_COLUMNS =
  "id, topic_id, post_id, resource_id, profile_id, reason, details, status, created_at";

const FORBIDDEN_REPORT_INSERT_KEYS = [
  "id",
  "reporter_id",
  "status",
  "handled_by",
  "handled_at",
  "resolution_note",
  "created_at",
] as const;

export interface PublicReportReceipt {
  id: string;
  targetType: ReportTargetType;
  targetId: string;
  reason: ReportReason;
  status: ReportStatus;
  createdAt: string;
}

export interface OwnReportItem extends PublicReportReceipt {
  details: string | null;
}

export type ReportMutationErrorCode =
  | "unauthenticated"
  | "rls_denied"
  | "duplicate"
  | "not_found"
  | "validation_error"
  | "connection_error"
  | "mutation_failed";

export type ReportSubmitResult =
  | {
      status: "success";
      report: PublicReportReceipt;
    }
  | {
      status: "error";
      errorCode: ReportMutationErrorCode;
      message: string;
    };

export interface OwnReportsQueryResult {
  status: "success" | "unauthenticated" | "error";
  items: OwnReportItem[];
  errorMessage?: string;
}

function getClient(
  override?: ReportSupabaseClientLike
): ReportSupabaseClientLike {
  return override ?? createClient();
}

function isValidUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value
  );
}

function isRlsOrPermissionError(error: ReportSupabaseError): boolean {
  const code = (error.code ?? "").toLowerCase();
  const msg = (error.message ?? "").toLowerCase();
  return (
    code === "42501" ||
    code === "pgrst301" ||
    error.status === 401 ||
    error.status === 403 ||
    msg.includes("row-level security") ||
    msg.includes("permission denied")
  );
}

function resolveTargetFromRow(row: {
  topic_id?: string | null;
  post_id?: string | null;
  resource_id?: string | null;
  profile_id?: string | null;
  research_id?: string | null;
}): { targetType: ReportTargetType; targetId: string } {
  if (row.topic_id) return { targetType: "topic", targetId: row.topic_id };
  if (row.post_id) return { targetType: "post", targetId: row.post_id };
  if (row.resource_id)
    return { targetType: "resource", targetId: row.resource_id };
  if (row.research_id)
    return { targetType: "research", targetId: row.research_id };
  return { targetType: "profile", targetId: row.profile_id ?? "" };
}

export async function submitContentReport(
  input: {
    targetType: ReportTargetType;
    targetId: string;
    reason: ReportReason;
    details?: string;
    [extra: string]: unknown;
  },
  options: { client?: ReportSupabaseClientLike } = {}
): Promise<ReportSubmitResult> {
  const forbidden = FORBIDDEN_REPORT_INSERT_KEYS.filter((key) =>
    Object.prototype.hasOwnProperty.call(input, key)
  );
  if (forbidden.length > 0) {
    return {
      status: "error",
      errorCode: "validation_error",
      message: `Forbidden report fields supplied: ${forbidden.join(", ")}`,
    };
  }

  if (!["topic", "post", "resource", "profile", "research"].includes(input.targetType)) {
    return {
      status: "error",
      errorCode: "validation_error",
      message: "Invalid report target type.",
    };
  }

  const targetId = (input.targetId ?? "").trim();
  if (!isValidUuid(targetId)) {
    return {
      status: "error",
      errorCode: "validation_error",
      message: "Invalid report target ID.",
    };
  }

  if (!VALID_REPORT_REASONS.includes(input.reason)) {
    return {
      status: "error",
      errorCode: "validation_error",
      message: "Invalid report reason.",
    };
  }

  const trimmedDetails =
    typeof input.details === "string" ? input.details.trim() : "";
  if (trimmedDetails.length > 1000) {
    return {
      status: "error",
      errorCode: "validation_error",
      message: "Report details must be at most 1000 characters.",
    };
  }

  try {
    const supabase = getClient(options.client);
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user?.id) {
      return {
        status: "error",
        errorCode: "unauthenticated",
        message: "Authentication required to submit a report.",
      };
    }

    // Only granted columns: (topic_id, post_id, resource_id, profile_id, research_id, reason, details)
    // Exactly 1 target column non-null to satisfy reports_one_target constraint
    const payload: Record<string, string | null> = {
      topic_id: input.targetType === "topic" ? targetId : null,
      post_id: input.targetType === "post" ? targetId : null,
      resource_id: input.targetType === "resource" ? targetId : null,
      profile_id: input.targetType === "profile" ? targetId : null,
      reason: input.reason,
      details: trimmedDetails.length > 0 ? trimmedDetails : null,
    };
    if (input.targetType === "research") {
      payload.research_id = targetId;
    }

    const { data, error } = await supabase
      .from("reports")
      .insert(payload)
      .select(REPORT_OWN_SELECT_COLUMNS)
      .single();

    if (error || !data) {
      if (error?.code === "23505") {
        return {
          status: "error",
          errorCode: "duplicate",
          message:
            "You already have an open report for this item.",
        };
      }
      if (error?.code === "23503") {
        return {
          status: "error",
          errorCode: "not_found",
          message: "Reported target was not found.",
        };
      }
      if (error?.code === "23514") {
        return {
          status: "error",
          errorCode: "validation_error",
          message: error.message ?? "Report constraint validation failed.",
        };
      }
      if (error && isRlsOrPermissionError(error)) {
        return {
          status: "error",
          errorCode: "rls_denied",
          message:
            error.message ??
            "Permission denied to submit report (account may be suspended).",
        };
      }
      return {
        status: "error",
        errorCode: "mutation_failed",
        message: error?.message ?? "Failed to submit report.",
      };
    }

    const target = resolveTargetFromRow(data);
    return {
      status: "success",
      report: {
        id: data.id,
        targetType: target.targetType,
        targetId: target.targetId,
        reason: data.reason,
        status: data.status,
        createdAt: data.created_at,
      },
    };
  } catch (err) {
    return {
      status: "error",
      errorCode: "connection_error",
      message: err instanceof Error ? err.message : "Failed to submit report.",
    };
  }
}

export async function fetchOwnReports(
  options: {
    requestedUserId?: string;
    client?: ReportSupabaseClientLike;
  } = {}
): Promise<OwnReportsQueryResult> {
  try {
    const supabase = getClient(options.client);
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user?.id) {
      return { status: "unauthenticated", items: [] };
    }

    if (
      options.requestedUserId &&
      options.requestedUserId !== user.id
    ) {
      return {
        status: "error",
        items: [],
        errorMessage: "Cannot access reports of another user.",
      };
    }

    const { data, error } = await supabase
      .from("reports")
      .select(REPORT_OWN_SELECT_COLUMNS)
      .eq("reporter_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      return {
        status: "error",
        items: [],
        errorMessage: error.message ?? "Failed to load your reports.",
      };
    }

    const rows = Array.isArray(data) ? data : [];
    const items: OwnReportItem[] = rows.map((row) => {
      const target = resolveTargetFromRow(row);
      return {
        id: row.id,
        targetType: target.targetType,
        targetId: target.targetId,
        reason: row.reason,
        details: row.details ?? null,
        status: row.status,
        createdAt: row.created_at,
      };
    });

    return { status: "success", items };
  } catch (err) {
    return {
      status: "error",
      items: [],
      errorMessage:
        err instanceof Error ? err.message : "Failed to load your reports.",
    };
  }
}
