import type { SupportedLocale } from "@/config/site";
import { getSafeRedirectPath } from "@/lib/security/redirect";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database.types";
import { type AuthUserProfile, EMAIL_REGEX } from "./validation";

export interface SupabasePasswordSignInParams {
  email: string;
  password: string;
}

export interface SupabaseAuthSignInClient {
  signInWithPassword: (params: SupabasePasswordSignInParams) => Promise<{
    data: {
      user: { id: string; email?: string | null } | null;
      session: unknown | null;
    };
    error: { message?: string; status?: number; code?: string } | null;
  }>;
  signOut?: () => Promise<{ error: unknown }>;
}

export interface ServerProfileRecord {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  interests: string[];
  github_url: string | null;
  linkedin_url: string | null;
  preferred_locale: string;
  role: Database["public"]["Enums"]["user_role"];
  is_suspended: boolean;
  created_at: string;
}

export interface ServerSessionPayload {
  authenticated: boolean;
  user: { id: string; email: string | null } | null;
  profile: ServerProfileRecord | null;
}

export interface LoginSupabaseInput {
  email: string;
  password: string;
  nextPath?: string | null;
  authClient?: SupabaseAuthSignInClient;
  fetchSessionContext?: () => Promise<ServerSessionPayload>;
}

export type LoginSupabaseResult =
  | {
      status: "authenticated";
      safeRedirectPath: string;
      profile: AuthUserProfile;
    }
  | {
      status: "suspended";
      profile: AuthUserProfile;
    }
  | {
      status: "error";
      errorCode:
        | "invalid_email"
        | "password_too_short"
        | "invalid_credentials"
        | "rate_limited"
        | "network_error"
        | "profile_missing";
    };

function mapServerProfileToAuthUser(
  user: { id: string; email: string | null },
  profile: ServerProfileRecord
): AuthUserProfile {
  const locale: SupportedLocale =
    profile.preferred_locale === "pt-BR" ? "pt-BR" : "en";

  return {
    id: profile.id,
    username: profile.username,
    displayName: profile.display_name ?? profile.username,
    email: user.email ?? "",
    preferredLanguage: locale,
    role: profile.role,
    isSuspended: profile.is_suspended,
    createdAt: profile.created_at,
    avatarUrl: profile.avatar_url ?? undefined,
    bio: profile.bio ?? undefined,
    interests: Array.isArray(profile.interests) ? profile.interests : [],
    githubUrl: profile.github_url ?? undefined,
    linkedinUrl: profile.linkedin_url ?? undefined,
  };
}

async function defaultFetchSessionContext(): Promise<ServerSessionPayload> {
  const res = await fetch("/api/auth/session", {
    method: "GET",
    credentials: "same-origin",
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Session verification failed with status ${res.status}`);
  }
  return (await res.json()) as ServerSessionPayload;
}

/**
 * Authenticates a user with Supabase Auth (`signInWithPassword()`), then verifies
 * identity and `public.profiles` (`role`, `is_suspended`) exclusively from the server.
 */
export async function loginWithSupabase(
  input: LoginSupabaseInput
): Promise<LoginSupabaseResult> {
  const normalizedEmail = input.email.trim().toLowerCase();
  if (!normalizedEmail || !EMAIL_REGEX.test(normalizedEmail)) {
    return { status: "error", errorCode: "invalid_email" };
  }

  if (input.password.length < 8) {
    return { status: "error", errorCode: "password_too_short" };
  }

  const safeRedirectPath = getSafeRedirectPath(input.nextPath, "/catalog");
  const authClient: SupabaseAuthSignInClient =
    input.authClient ?? createClient().auth;
  const fetchSessionContext =
    input.fetchSessionContext ?? defaultFetchSessionContext;

  try {
    const { data, error } = await authClient.signInWithPassword({
      email: normalizedEmail,
      password: input.password,
    });

    if (error) {
      const code = (error.code ?? "").toLowerCase();
      if (error.status === 429 || code.includes("rate_limit")) {
        return { status: "error", errorCode: "rate_limited" };
      }
      // Never disclose whether an email exists or is unconfirmed.
      return { status: "error", errorCode: "invalid_credentials" };
    }

    if (!data.user || !data.session) {
      return { status: "error", errorCode: "invalid_credentials" };
    }

    const serverSession = await fetchSessionContext();
    if (!serverSession.authenticated || !serverSession.user) {
      return { status: "error", errorCode: "invalid_credentials" };
    }

    if (!serverSession.profile) {
      return { status: "error", errorCode: "profile_missing" };
    }

    const mappedProfile = mapServerProfileToAuthUser(
      serverSession.user,
      serverSession.profile
    );

    if (serverSession.profile.is_suspended) {
      return {
        status: "suspended",
        profile: mappedProfile,
      };
    }

    return {
      status: "authenticated",
      safeRedirectPath,
      profile: mappedProfile,
    };
  } catch {
    return { status: "error", errorCode: "network_error" };
  }
}
