import { getSafeRedirectPath } from "@/lib/security/redirect";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";

export type UserRole = Database["public"]["Enums"]["user_role"];

export interface AuthenticatedUser {
  id: string;
  email: string | null;
}

export interface AuthenticatedProfile {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  interests: string[];
  github_url: string | null;
  linkedin_url: string | null;
  preferred_locale: string;
  role: UserRole;
  is_suspended: boolean;
  created_at: string;
}

export interface AuthenticatedSessionContext {
  user: AuthenticatedUser;
  profile: AuthenticatedProfile | null;
}

export type ServerSessionResolution =
  | {
      status: "authenticated";
      user: AuthenticatedUser;
      profile: AuthenticatedProfile;
    }
  | {
      status: "unauthenticated";
      user: null;
      profile: null;
    }
  | {
      status: "profile_missing";
      user: AuthenticatedUser;
      profile: null;
    }
  | {
      status: "connection_error";
      user: null;
      profile: null;
    };

export type AuthorizationLevel =
  | "authenticated"
  | "active_member"
  | "moderator"
  | "admin";

export interface SessionAuthorization {
  isAuthenticated: boolean;
  hasProfile: boolean;
  isSuspended: boolean;
  role: UserRole | null;
  isActiveMember: boolean;
  isModerator: boolean;
  isAdmin: boolean;
}

export interface AuthorizationCheckResult {
  allowed: boolean;
  httpStatus: 200 | 401 | 403 | 503;
  reason:
    | "authorized"
    | "unauthenticated"
    | "profile_missing"
    | "account_suspended"
    | "insufficient_role"
    | "connection_error";
  authorization: SessionAuthorization;
}

export interface ServerAuthClientLike {
  auth: {
    getUser: () => Promise<{
      data: { user: { id: string; email?: string | null } | null };
      error: { message?: string; status?: number; code?: string } | null;
    }>;
  };
  from: (table: "profiles") => {
    select: (columns: string) => {
      eq: (column: "id", value: string) => {
        maybeSingle: () => Promise<{
          data: AuthenticatedProfile | null;
          error: { message?: string; code?: string } | null;
        }>;
      };
    };
  };
}

function isAuthMissingOrExpiredError(error: {
  message?: string;
  status?: number;
  code?: string;
}): boolean {
  const status = error.status;
  const code = (error.code ?? "").toLowerCase();
  const message = (error.message ?? "").toLowerCase();

  if (status === 400 || status === 401 || status === 403) {
    return true;
  }

  return (
    code === "session_not_found" ||
    code === "session_expired" ||
    code === "bad_jwt" ||
    message.includes("auth session missing") ||
    message.includes("jwt") ||
    message.includes("token") ||
    message.includes("expired") ||
    message.includes("invalid claim")
  );
}

/**
 * Resolves and validates the current session and `public.profiles` record
 * using a per-request Supabase client. Never creates profiles manually and
 * never trusts client-supplied profile fields.
 */
export async function resolveServerSessionWithClient(
  supabase: ServerAuthClientLike
): Promise<ServerSessionResolution> {
  try {
    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError) {
      if (isAuthMissingOrExpiredError(userError)) {
        return { status: "unauthenticated", user: null, profile: null };
      }
      return { status: "connection_error", user: null, profile: null };
    }

    if (!userData.user) {
      return { status: "unauthenticated", user: null, profile: null };
    }

    const user: AuthenticatedUser = {
      id: userData.user.id,
      email: userData.user.email ?? null,
    };

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select(
        "id, username, display_name, avatar_url, bio, interests, github_url, linkedin_url, preferred_locale, role, is_suspended, created_at"
      )
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      return { status: "connection_error", user: null, profile: null };
    }

    // Strict ownership check: profile ID must match the authenticated auth.users ID.
    if (!profile || profile.id !== user.id) {
      return { status: "profile_missing", user, profile: null };
    }

    return { status: "authenticated", user, profile };
  } catch {
    return { status: "connection_error", user: null, profile: null };
  }
}

/**
 * Evaluates server-trusted authorization flags mirroring PostgreSQL helpers:
 * `public.current_user_role()`, `public.is_active_member()`,
 * `public.is_moderator()`, and `public.is_admin()`.
 */
export function evaluateSessionAuthorization(
  resolution: ServerSessionResolution,
  requiredLevel: AuthorizationLevel = "authenticated"
): AuthorizationCheckResult {
  const deniedEmpty: SessionAuthorization = {
    isAuthenticated: false,
    hasProfile: false,
    isSuspended: false,
    role: null,
    isActiveMember: false,
    isModerator: false,
    isAdmin: false,
  };

  if (resolution.status === "connection_error") {
    return {
      allowed: false,
      httpStatus: 503,
      reason: "connection_error",
      authorization: deniedEmpty,
    };
  }

  if (resolution.status === "unauthenticated") {
    return {
      allowed: false,
      httpStatus: 401,
      reason: "unauthenticated",
      authorization: deniedEmpty,
    };
  }

  if (
    resolution.status === "profile_missing" ||
    resolution.profile.id !== resolution.user.id
  ) {
    return {
      allowed: false,
      httpStatus: 403,
      reason: "profile_missing",
      authorization: {
        ...deniedEmpty,
        isAuthenticated: true,
      },
    };
  }

  const { profile } = resolution;
  const isSuspended = Boolean(profile.is_suspended);
  const role = profile.role;
  const isActiveMember = !isSuspended;
  const isModerator =
    !isSuspended && (role === "moderator" || role === "admin");
  const isAdmin = !isSuspended && role === "admin";

  const authorization: SessionAuthorization = {
    isAuthenticated: true,
    hasProfile: true,
    isSuspended,
    role,
    isActiveMember,
    isModerator,
    isAdmin,
  };

  if (isSuspended && requiredLevel !== "authenticated") {
    return {
      allowed: false,
      httpStatus: 403,
      reason: "account_suspended",
      authorization,
    };
  }

  if (requiredLevel === "moderator" && !isModerator) {
    return {
      allowed: false,
      httpStatus: 403,
      reason: "insufficient_role",
      authorization,
    };
  }

  if (requiredLevel === "admin" && !isAdmin) {
    return {
      allowed: false,
      httpStatus: 403,
      reason: "insufficient_role",
      authorization,
    };
  }

  return {
    allowed: true,
    httpStatus: 200,
    reason: "authorized",
    authorization,
  };
}

/**
 * Resolves the current per-request server session and profile from Supabase SSR.
 */
export async function resolveServerSession(): Promise<ServerSessionResolution> {
  try {
    const supabase = await createClient();
    return await resolveServerSessionWithClient(
      supabase as unknown as ServerAuthClientLike
    );
  } catch {
    return { status: "connection_error", user: null, profile: null };
  }
}

/**
 * Authorizes an API route handler or server operation strictly on the server.
 */
export async function requireServerAuthorization(
  requiredLevel: AuthorizationLevel = "active_member",
  supabaseClient?: ServerAuthClientLike
): Promise<{
  resolution: ServerSessionResolution;
  check: AuthorizationCheckResult;
}> {
  const resolution = supabaseClient
    ? await resolveServerSessionWithClient(supabaseClient)
    : await resolveServerSession();
  const check = evaluateSessionAuthorization(resolution, requiredLevel);
  return { resolution, check };
}

export type ProxyRouteDecision =
  | { action: "allow" }
  | { action: "redirect"; target: string; reason: AuthorizationCheckResult["reason"] };

/**
 * Evaluates server-side access control for protected routes (e.g., `/admin/*`
 * and `/cybercrime-research/*`) inside `src/proxy.ts` using only server-verified
 * session and profile data. Public routes remain accessible.
 */
export function evaluateProtectedRouteAccess(
  pathname: string,
  resolution: ServerSessionResolution
): ProxyRouteDecision {
  const isAdminArea = pathname === "/admin" || pathname.startsWith("/admin/");
  const isResearchArea =
    pathname === "/cybercrime-research" ||
    pathname.startsWith("/cybercrime-research/");

  if (!isAdminArea && !isResearchArea) {
    return { action: "allow" };
  }

  let requiredLevel: AuthorizationLevel = "active_member";
  if (isAdminArea) {
    const requiresStrictAdmin =
      pathname === "/admin/users" ||
      pathname.startsWith("/admin/users/") ||
      pathname === "/admin/audit" ||
      pathname.startsWith("/admin/audit/");
    requiredLevel = requiresStrictAdmin ? "admin" : "moderator";
  }

  const check = evaluateSessionAuthorization(resolution, requiredLevel);

  if (check.allowed) {
    return { action: "allow" };
  }

  if (check.reason === "unauthenticated") {
    const defaultNext = isAdminArea ? "/admin" : "/cybercrime-research";
    const safeNext = getSafeRedirectPath(pathname, defaultNext);
    return {
      action: "redirect",
      target: `/login?next=${encodeURIComponent(safeNext)}`,
      reason: check.reason,
    };
  }

  return {
    action: "redirect",
    target: "/catalog",
    reason: check.reason,
  };
}

/**
 * Validates the current user's identity on the server using `supabase.auth.getUser()`.
 * Never trusts client-provided session state or localStorage.
 */
export async function getAuthenticatedUser(): Promise<AuthenticatedUser | null> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getUser();

    if (error || !data.user) {
      return null;
    }

    return {
      id: data.user.id,
      email: data.user.email ?? null,
    };
  } catch {
    return null;
  }
}

/**
 * Loads the validated server-side user and their `public.profiles` record.
 * Avoids querying `public.profiles` when the request is unauthenticated.
 */
export async function getAuthenticatedSessionContext(): Promise<AuthenticatedSessionContext | null> {
  const resolution = await resolveServerSession();
  if (resolution.status === "authenticated") {
    return { user: resolution.user, profile: resolution.profile };
  }
  if (resolution.status === "profile_missing") {
    return { user: resolution.user, profile: null };
  }
  return null;
}
