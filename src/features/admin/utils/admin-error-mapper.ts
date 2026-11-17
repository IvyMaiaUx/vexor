export type AdminErrorCode =
  | "unauthenticated"
  | "forbidden"
  | "self_demote"
  | "self_suspend"
  | "last_admin"
  | "reason_required"
  | "state_conflict"
  | "not_found"
  | "invalid_input"
  | "unsupported_operation"
  | "network_error"
  | "unknown";

export interface MappedAdminError {
  httpStatus: number;
  code: AdminErrorCode;
  message: string;
}

interface SupabaseLikeError {
  code?: string;
  message?: string;
  details?: string | null;
  hint?: string | null;
  status?: number;
}

/**
 * Maps Supabase / PostgREST / RPC errors from administrative operations
 * into structured, safe error responses without exposing stack traces
 * or internal database structure.
 */
export function mapSupabaseAdminError(
  error: unknown,
  fallbackMessage = "Administrative operation failed."
): MappedAdminError {
  if (!error) {
    return {
      httpStatus: 500,
      code: "unknown",
      message: fallbackMessage,
    };
  }

  const errObj: SupabaseLikeError =
    typeof error === "string"
      ? { message: error }
      : typeof error === "object"
        ? (error as SupabaseLikeError)
        : { message: String(error) };

  const rawCode = (errObj.code ?? "").toUpperCase();
  const rawMessage = errObj.message ?? "";
  const lower = rawMessage.toLowerCase();

  if (lower.includes("demote themselves") || lower.includes("self-demote")) {
    return {
      httpStatus: 403,
      code: "self_demote",
      message: "Administrators cannot demote themselves.",
    };
  }

  if (lower.includes("suspend themselves") || lower.includes("self-suspend")) {
    return {
      httpStatus: 403,
      code: "self_suspend",
      message: "Administrators cannot suspend themselves.",
    };
  }

  if (lower.includes("last active administrator")) {
    return {
      httpStatus: 409,
      code: "last_admin",
      message: "Cannot modify the last active administrator.",
    };
  }

  if (rawCode === "55P03" || lower.includes("lock_not_available") || lower.includes("could not obtain lock")) {
    return {
      httpStatus: 409,
      code: "state_conflict",
      message: "Concurrent modification in progress. Please retry in a moment.",
    };
  }

  if (
    rawCode === "42501" ||
    lower.includes("forbidden") ||
    lower.includes("insufficient_privilege") ||
    lower.includes("only administrators") ||
    lower.includes("only moderators") ||
    lower.includes("row-level security")
  ) {
    return {
      httpStatus: 403,
      code: "forbidden",
      message: "Forbidden (42501): insufficient privileges for this operation.",
    };
  }

  if (
    lower.includes("at least 5 characters") ||
    lower.includes("reason is required") ||
    lower.includes("justificativa")
  ) {
    return {
      httpStatus: 400,
      code: "reason_required",
      message: "A justification of at least 5 characters is required.",
    };
  }

  if (
    lower.includes("already suspended") ||
    lower.includes("already active") ||
    rawCode === "23505"
  ) {
    return {
      httpStatus: 409,
      code: "state_conflict",
      message: rawMessage || "Conflict with current record state.",
    };
  }

  if (rawCode === "P0002" || lower.includes("not found")) {
    return {
      httpStatus: 404,
      code: "not_found",
      message: "Target record not found (P0002).",
    };
  }

  if (
    rawCode === "22023" ||
    rawCode === "22P02" ||
    lower.includes("cannot be reset to open") ||
    lower.includes("invalid") ||
    lower.includes("unsupported")
  ) {
    return {
      httpStatus: 400,
      code: "invalid_input",
      message: rawMessage || "Invalid parameters for administrative operation.",
    };
  }

  if (
    lower.includes("fetch failed") ||
    lower.includes("network") ||
    lower.includes("timeout")
  ) {
    return {
      httpStatus: 503,
      code: "network_error",
      message: "Unable to reach backend service. Please try again.",
    };
  }

  return {
    httpStatus: errObj.status && errObj.status >= 400 ? errObj.status : 500,
    code: "unknown",
    message: fallbackMessage,
  };
}
