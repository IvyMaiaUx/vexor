import type { SupportedLocale } from "@/config/site";
import { getSafeRedirectPath } from "@/lib/security/redirect";
import { createClient } from "@/lib/supabase/client";

export interface SupabaseSignUpParams {
  email: string;
  password: string;
  options?: {
    emailRedirectTo?: string;
    data?: Record<string, string>;
  };
}

export interface SupabaseAuthSignUpClient {
  signUp: (params: SupabaseSignUpParams) => Promise<{
    data: {
      user: { id: string; identities?: unknown[] | null } | null;
      session: unknown | null;
    };
    error: { message?: string; status?: number; code?: string } | null;
  }>;
}

export interface RegisterSupabaseInput {
  email: string;
  username: string;
  displayName: string;
  password: string;
  preferredLanguage: SupportedLocale;
  nextPath?: string | null;
  origin?: string;
  authClient?: SupabaseAuthSignUpClient;
}

export type RegisterSupabaseResult =
  | {
      status: "confirmation_required";
      safeRedirectPath: string;
    }
  | {
      status: "authenticated";
      safeRedirectPath: string;
    }
  | {
      status: "error";
      errorCode:
        | "weak_password"
        | "rate_limited"
        | "network_error"
        | "signup_failed";
    };

/**
 * Registers a user with Supabase Auth (`signUp()`).
 * Profile creation is delegated exclusively to the PostgreSQL `handle_new_user()` trigger.
 * Role is never sent from the client.
 */
export async function registerWithSupabase(
  input: RegisterSupabaseInput
): Promise<RegisterSupabaseResult> {
  const safeNext = getSafeRedirectPath(input.nextPath, "/catalog");
  const normalizedEmail = input.email.trim().toLowerCase();
  const normalizedUsername = input.username.trim().toLowerCase();
  const normalizedDisplayName = input.displayName.trim().slice(0, 60);

  const origin =
    input.origin ??
    (typeof window !== "undefined" ? window.location.origin : "");
  const emailRedirectTo = origin
    ? `${origin}/auth/callback?next=${encodeURIComponent(safeNext)}`
    : undefined;

  const authClient: SupabaseAuthSignUpClient =
    input.authClient ?? createClient().auth;

  try {
    const { data, error } = await authClient.signUp({
      email: normalizedEmail,
      password: input.password,
      options: {
        emailRedirectTo,
        data: {
          username: normalizedUsername,
          display_name: normalizedDisplayName,
          preferred_locale: input.preferredLanguage,
        },
      },
    });

    if (error) {
      const msg = (error.message ?? "").toLowerCase();
      const code = (error.code ?? "").toLowerCase();

      // Anti-enumeration: if Supabase reports an already-registered email,
      // present the same confirmation-pending UX without disclosing account existence.
      if (
        code === "user_already_exists" ||
        msg.includes("already registered") ||
        msg.includes("already exists")
      ) {
        return {
          status: "confirmation_required",
          safeRedirectPath: safeNext,
        };
      }

      if (error.status === 429 || code.includes("rate_limit")) {
        return { status: "error", errorCode: "rate_limited" };
      }

      if (
        code === "weak_password" ||
        msg.includes("password")
      ) {
        return { status: "error", errorCode: "weak_password" };
      }

      return { status: "error", errorCode: "signup_failed" };
    }

    // Supabase obfuscates existing confirmed accounts by returning user with empty identities and null session.
    const hasEmptyIdentities =
      Array.isArray(data.user?.identities) &&
      data.user.identities.length === 0;

    if (hasEmptyIdentities || !data.session) {
      return {
        status: "confirmation_required",
        safeRedirectPath: safeNext,
      };
    }

    return {
      status: "authenticated",
      safeRedirectPath: safeNext,
    };
  } catch {
    return { status: "error", errorCode: "network_error" };
  }
}
