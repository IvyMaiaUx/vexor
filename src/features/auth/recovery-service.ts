import { getSafeRedirectPath } from "@/lib/security/redirect";
import { createClient } from "@/lib/supabase/client";
import { EMAIL_REGEX } from "./validation";

export const MIN_PASSWORD_LENGTH = 8;

export interface AMREntryLike {
  method?: string;
  timestamp?: number;
}

export interface RecoveryJwtClaims {
  sub?: string;
  exp?: number;
  amr?: Array<AMREntryLike | string>;
}

export interface SupabaseAuthRecoveryClient {
  resetPasswordForEmail: (
    email: string,
    options?: { redirectTo?: string }
  ) => Promise<{
    data: unknown;
    error: { message?: string; status?: number; code?: string } | null;
  }>;
  getUser: () => Promise<{
    data: { user: { id: string; email?: string | null } | null };
    error: { message?: string; status?: number; code?: string } | null;
  }>;
  getClaims: () => Promise<{
    data: { claims: RecoveryJwtClaims } | null;
    error: { message?: string; status?: number; code?: string } | null;
  }>;
  verifyOtp?: (params: {
    email: string;
    token: string;
    type: "recovery";
  }) => Promise<{
    data: {
      user: { id: string; email?: string | null } | null;
      session: unknown;
    };
    error: { message?: string; status?: number; code?: string } | null;
  }>;
  updateUser: (attributes: { password: string }) => Promise<{
    data: { user: { id: string; email?: string | null } | null };
    error: { message?: string; status?: number; code?: string } | null;
  }>;
}

export interface RequestPasswordRecoveryInput {
  email: string;
  nextPath?: string | null;
  origin?: string;
  authClient?: Pick<SupabaseAuthRecoveryClient, "resetPasswordForEmail">;
}

export type RequestPasswordRecoveryResult =
  | {
      status: "dispatched";
      redirectTo?: string;
    }
  | {
      status: "error";
      errorCode: "invalid_email" | "rate_limited" | "network_error";
    };

export type RecoverySessionStatus = "valid" | "invalid" | "network_error";

export interface UpdatePasswordInput {
  newPassword: string;
  confirmPassword: string;
  authClient?: Pick<
    SupabaseAuthRecoveryClient,
    "getUser" | "getClaims" | "updateUser"
  >;
}

export type UpdatePasswordResult =
  | {
      status: "updated";
    }
  | {
      status: "error";
      errorCode:
        | "password_too_short"
        | "password_mismatch"
        | "session_invalid"
        | "weak_password"
        | "same_password"
        | "rate_limited"
        | "network_error"
        | "update_failed";
    };

function isNetworkOrUnavailableError(error: {
  message?: string;
  status?: number;
  code?: string;
}): boolean {
  const status = error.status;
  const msg = (error.message ?? "").toLowerCase();
  if (typeof status === "number" && status >= 500) {
    return true;
  }
  return (
    msg.includes("fetch") ||
    msg.includes("network") ||
    msg.includes("timeout") ||
    msg.includes("econnrefused") ||
    msg.includes("unavailable")
  );
}

/**
 * Strictly validates a JWT `exp` claim (Unix epoch seconds) in fail-closed mode.
 * Rejects missing, non-numeric, stringified, decimal, zero, negative, NaN,
 * infinite, or expired/current-instant timestamps without implicit coercion.
 */
export function isValidFutureExpClaim(
  exp: unknown,
  nowMs: number = Date.now()
): boolean {
  if (typeof exp !== "number" || !Number.isFinite(exp)) {
    return false;
  }
  if (!Number.isInteger(exp) || exp <= 0) {
    return false;
  }
  if (!Number.isFinite(nowMs)) {
    return false;
  }
  const expMs = exp * 1000;
  if (!Number.isFinite(expMs)) {
    return false;
  }
  return expMs > nowMs;
}

/**
 * Checks whether the verified JWT `amr` claim explicitly contains the `recovery`
 * authentication method, supporting both RFC-8176 (`string[]`) and Supabase
 * detailed `AMREntry[]` formats. Never performs substring matching.
 */
export function hasRecoveryAmrClaim(
  claims: RecoveryJwtClaims | null | undefined
): boolean {
  if (!claims || !Array.isArray(claims.amr) || claims.amr.length === 0) {
    return false;
  }

  return claims.amr.some((entry) => {
    if (typeof entry === "string") {
      return entry === "recovery";
    }
    if (entry && typeof entry === "object" && typeof entry.method === "string") {
      return entry.method === "recovery";
    }
    return false;
  });
}

/**
 * Dispatches a Supabase Auth password recovery email using PKCE callback routing.
 * Never reveals whether an account exists for the supplied email address.
 */
export async function requestPasswordRecovery(
  input: RequestPasswordRecoveryInput
): Promise<RequestPasswordRecoveryResult> {
  const normalizedEmail = input.email.trim().toLowerCase();
  if (!normalizedEmail || !EMAIL_REGEX.test(normalizedEmail)) {
    return { status: "error", errorCode: "invalid_email" };
  }

  const safeNext = getSafeRedirectPath(
    input.nextPath ?? "/auth/reset-password",
    "/auth/reset-password"
  );
  const targetResetPath = safeNext.startsWith("/auth/reset-password")
    ? safeNext
    : "/auth/reset-password";

  const origin =
    input.origin ??
    (typeof window !== "undefined" ? window.location.origin : "");
  const redirectTo = origin
    ? `${origin}/auth/callback?type=recovery&next=${encodeURIComponent(
        targetResetPath
      )}`
    : undefined;

  const authClient = input.authClient ?? createClient().auth;

  try {
    const { error } = await authClient.resetPasswordForEmail(normalizedEmail, {
      redirectTo,
    });

    if (error) {
      const code = (error.code ?? "").toLowerCase();
      if (error.status === 429 || code.includes("rate_limit")) {
        return { status: "error", errorCode: "rate_limited" };
      }
      if (isNetworkOrUnavailableError(error)) {
        return { status: "error", errorCode: "network_error" };
      }
      // Anti-enumeration: treat account/user lookup errors identically to success.
      return { status: "dispatched", redirectTo };
    }

    return { status: "dispatched", redirectTo };
  } catch {
    return { status: "error", errorCode: "network_error" };
  }
}

/**
 * Validates that an active Supabase session exists AND was authenticated via
 * the password recovery flow (`getUser()` + verified `getClaims()` with `amr: recovery`).
 * Standard password/OAuth sessions are strictly rejected.
 */
export async function validateRecoverySession(
  authClient?: Pick<SupabaseAuthRecoveryClient, "getUser" | "getClaims">,
  options?: { nowMs?: number }
): Promise<RecoverySessionStatus> {
  try {
    const client = authClient ?? createClient().auth;
    const { data: userData, error: userError } = await client.getUser();

    if (userError) {
      if (isNetworkOrUnavailableError(userError)) {
        return "network_error";
      }
      return "invalid";
    }

    if (!userData.user) {
      return "invalid";
    }

    const { data: claimsData, error: claimsError } = await client.getClaims();

    if (claimsError) {
      if (isNetworkOrUnavailableError(claimsError)) {
        return "network_error";
      }
      return "invalid";
    }

    const claims = claimsData?.claims;
    if (!claims || typeof claims !== "object") {
      return "invalid";
    }

    if (
      typeof claims.sub !== "string" ||
      !claims.sub ||
      claims.sub !== userData.user.id
    ) {
      return "invalid";
    }

    const nowMs = options?.nowMs ?? Date.now();
    if (!isValidFutureExpClaim(claims.exp, nowMs)) {
      return "invalid";
    }

    if (!hasRecoveryAmrClaim(claims)) {
      return "invalid";
    }

    return "valid";
  } catch {
    return "network_error";
  }
}

/**
 * Updates the authenticated user's password via `supabase.auth.updateUser()`
 * only after verifying both identity (`getUser()`) and recovery AMR claim (`getClaims()`).
 * Never persists passwords/tokens or exposes credentials in errors.
 */
export async function updatePasswordWithSupabase(
  input: UpdatePasswordInput
): Promise<UpdatePasswordResult> {
  if (!input.newPassword || input.newPassword.length < MIN_PASSWORD_LENGTH) {
    return { status: "error", errorCode: "password_too_short" };
  }

  if (input.newPassword !== input.confirmPassword) {
    return { status: "error", errorCode: "password_mismatch" };
  }

  try {
    const authClient = input.authClient ?? createClient().auth;
    const sessionStatus = await validateRecoverySession(authClient);

    if (sessionStatus === "network_error") {
      return { status: "error", errorCode: "network_error" };
    }

    if (sessionStatus === "invalid") {
      return { status: "error", errorCode: "session_invalid" };
    }

    const { error } = await authClient.updateUser({
      password: input.newPassword,
    });

    if (error) {
      const code = (error.code ?? "").toLowerCase();
      const msg = (error.message ?? "").toLowerCase();

      if (error.status === 429 || code.includes("rate_limit")) {
        return { status: "error", errorCode: "rate_limited" };
      }

      if (isNetworkOrUnavailableError(error)) {
        return { status: "error", errorCode: "network_error" };
      }

      if (
        error.status === 401 ||
        error.status === 403 ||
        code === "session_not_found" ||
        code === "session_expired" ||
        code === "bad_jwt" ||
        msg.includes("session") ||
        msg.includes("expired") ||
        msg.includes("jwt") ||
        msg.includes("token")
      ) {
        return { status: "error", errorCode: "session_invalid" };
      }

      if (code === "same_password" || msg.includes("different from the old")) {
        return { status: "error", errorCode: "same_password" };
      }

      if (code === "weak_password" || msg.includes("password")) {
        return { status: "error", errorCode: "weak_password" };
      }

      return { status: "error", errorCode: "update_failed" };
    }

    return { status: "updated" };
  } catch {
    return { status: "error", errorCode: "network_error" };
  }
}

export interface VerifyRecoveryOtpInput {
  email: string;
  token: string;
  authClient?: Pick<
    SupabaseAuthRecoveryClient,
    "verifyOtp" | "getUser" | "getClaims"
  >;
}

export type VerifyRecoveryOtpResult =
  | {
      status: "verified";
    }
  | {
      status: "error";
      errorCode:
        | "invalid_email"
        | "invalid_code"
        | "code_expired"
        | "rate_limited"
        | "network_error";
    };

/**
 * Verifies a 6-to-8 digit email OTP recovery token via `supabase.auth.verifyOtp()`.
 * Accepts the session returned directly by `verifyOtp({ type: "recovery" })`
 * (whose JWT `amr` claim may be `recovery` or `otp` depending on GoTrue version).
 */
export async function verifyRecoveryOtp(
  input: VerifyRecoveryOtpInput
): Promise<VerifyRecoveryOtpResult> {
  const normalizedEmail = input.email.trim().toLowerCase();
  if (!normalizedEmail || !EMAIL_REGEX.test(normalizedEmail)) {
    return { status: "error", errorCode: "invalid_email" };
  }

  const normalizedToken = input.token.trim().replace(/\s+/g, "");
  if (!/^\d{6,8}$/.test(normalizedToken)) {
    return { status: "error", errorCode: "invalid_code" };
  }

  const authClient = input.authClient ?? createClient().auth;
  if (typeof authClient.verifyOtp !== "function") {
    return { status: "error", errorCode: "network_error" };
  }

  try {
    const { data, error } = await authClient.verifyOtp({
      email: normalizedEmail,
      token: normalizedToken,
      type: "recovery",
    });

    if (error) {
      const code = (error.code ?? "").toLowerCase();
      const msg = (error.message ?? "").toLowerCase();

      if (error.status === 429 || code.includes("rate_limit")) {
        return { status: "error", errorCode: "rate_limited" };
      }

      if (isNetworkOrUnavailableError(error)) {
        return { status: "error", errorCode: "network_error" };
      }

      if (code === "otp_expired" || msg.includes("expired")) {
        return { status: "error", errorCode: "code_expired" };
      }

      return { status: "error", errorCode: "invalid_code" };
    }

    if (!data?.user) {
      const { data: userData, error: userError } = await authClient.getUser();
      if (userError && isNetworkOrUnavailableError(userError)) {
        return { status: "error", errorCode: "network_error" };
      }
      if (!userData.user) {
        return { status: "error", errorCode: "invalid_code" };
      }
    }

    return { status: "verified" };
  } catch {
    return { status: "error", errorCode: "network_error" };
  }
}

/**
 * Updates the password right after `verifyRecoveryOtp()` has established a
 * verified recovery session in the browser (supporting `amr: recovery` or `otp`).
 */
export async function updatePasswordAfterOtpVerification(input: {
  newPassword: string;
  confirmPassword: string;
  authClient?: Pick<SupabaseAuthRecoveryClient, "getUser" | "updateUser">;
}): Promise<UpdatePasswordResult> {
  if (!input.newPassword || input.newPassword.length < MIN_PASSWORD_LENGTH) {
    return { status: "error", errorCode: "password_too_short" };
  }

  if (input.newPassword !== input.confirmPassword) {
    return { status: "error", errorCode: "password_mismatch" };
  }

  try {
    const authClient = input.authClient ?? createClient().auth;
    const { data: userData, error: userError } = await authClient.getUser();

    if (userError) {
      if (isNetworkOrUnavailableError(userError)) {
        return { status: "error", errorCode: "network_error" };
      }
      return { status: "error", errorCode: "session_invalid" };
    }

    if (!userData.user) {
      return { status: "error", errorCode: "session_invalid" };
    }

    const { error } = await authClient.updateUser({
      password: input.newPassword,
    });

    if (error) {
      const code = (error.code ?? "").toLowerCase();
      const msg = (error.message ?? "").toLowerCase();

      if (error.status === 429 || code.includes("rate_limit")) {
        return { status: "error", errorCode: "rate_limited" };
      }
      if (isNetworkOrUnavailableError(error)) {
        return { status: "error", errorCode: "network_error" };
      }
      if (
        error.status === 401 ||
        error.status === 403 ||
        code === "session_not_found" ||
        code === "session_expired" ||
        code === "bad_jwt"
      ) {
        return { status: "error", errorCode: "session_invalid" };
      }
      if (code === "same_password" || msg.includes("different from the old")) {
        return { status: "error", errorCode: "same_password" };
      }
      if (code === "weak_password" || msg.includes("password")) {
        return { status: "error", errorCode: "weak_password" };
      }
      return { status: "error", errorCode: "update_failed" };
    }

    return { status: "updated" };
  } catch {
    return { status: "error", errorCode: "network_error" };
  }
}
