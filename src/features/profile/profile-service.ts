import type { SupportedLocale } from "@/config/site";
import {
  type AuthUserProfile,
  type ProfileUpdateInput,
  validateProfileUpdate,
} from "@/features/auth/validation";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database.types";

export type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
export type ProfileUpdateRow = Database["public"]["Tables"]["profiles"]["Update"];
export type PublicProfileRow =
  Database["public"]["Views"]["public_profiles"]["Row"];

export const PROFILE_SELECT_COLUMNS =
  "id, username, display_name, avatar_url, bio, interests, github_url, linkedin_url, preferred_locale, role, is_suspended, created_at";

export const PUBLIC_PROFILE_SELECT_COLUMNS =
  "id, username, display_name, avatar_url, bio, interests, github_url, linkedin_url, preferred_locale, created_at";

const FORBIDDEN_UPDATE_FIELDS = [
  "id",
  "role",
  "is_suspended",
  "isSuspended",
  "created_at",
  "createdAt",
  "updated_at",
  "updatedAt",
] as const;

export interface ProfileSupabaseError {
  message?: string;
  code?: string;
  status?: number;
}

export interface ProfileSupabaseClientLike {
  auth: {
    getUser: () => Promise<{
      data: { user: { id: string; email?: string | null } | null };
      error: ProfileSupabaseError | null;
    }>;
  };
  from: (table: "profiles" | "public_profiles") => {
    select: (columns: string) => {
      eq: (column: string, value: string) => {
        maybeSingle: () => Promise<{
          data: ProfileRow | PublicProfileRow | null;
          error: ProfileSupabaseError | null;
        }>;
      };
    };
    update: (values: ProfileUpdateRow) => {
      eq: (column: "id", value: string) => {
        select: (columns: string) => {
          maybeSingle: () => Promise<{
            data: ProfileRow | null;
            error: ProfileSupabaseError | null;
          }>;
        };
      };
    };
  };
}

export type ProfileReadResult =
  | {
      status: "authenticated";
      profile: AuthUserProfile;
    }
  | {
      status: "suspended";
      profile: AuthUserProfile;
    }
  | {
      status: "unauthenticated";
      profile: null;
    }
  | {
      status: "profile_missing";
      profile: null;
      userId: string;
    }
  | {
      status: "connection_error";
      profile: null;
    };

export type PublicProfileReadResult =
  | {
      status: "found";
      profile: AuthUserProfile;
    }
  | {
      status: "not_found";
      profile: null;
    }
  | {
      status: "connection_error";
      profile: null;
    };

export type ProfileUpdateErrorCode =
  | "validation_error"
  | "forbidden_field"
  | "unauthenticated"
  | "identity_mismatch"
  | "username_taken"
  | "rls_denied"
  | "connection_error"
  | "update_failed";

export type ProfileUpdateResult =
  | {
      status: "update_success";
      profile: AuthUserProfile;
    }
  | {
      status: "update_error";
      errorCode: ProfileUpdateErrorCode;
      fieldErrors?: Partial<Record<keyof ProfileUpdateInput, string>>;
    };

function isAuthMissingOrExpiredError(error: ProfileSupabaseError): boolean {
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
    message.includes("expired") ||
    message.includes("invalid claim")
  );
}

function isNetworkOrUnavailableError(error: ProfileSupabaseError): boolean {
  const status = error.status;
  const message = (error.message ?? "").toLowerCase();
  if (typeof status === "number" && status >= 500) {
    return true;
  }
  return (
    message.includes("fetch") ||
    message.includes("network") ||
    message.includes("timeout") ||
    message.includes("econnrefused") ||
    message.includes("unavailable")
  );
}

export function mapProfileRowToAuthUserProfile(
  row: Pick<
    ProfileRow,
    | "id"
    | "username"
    | "display_name"
    | "avatar_url"
    | "bio"
    | "interests"
    | "github_url"
    | "linkedin_url"
    | "preferred_locale"
    | "role"
    | "is_suspended"
    | "created_at"
  >,
  email: string | null = null
): AuthUserProfile {
  const preferredLanguage: SupportedLocale =
    row.preferred_locale === "pt-BR" ? "pt-BR" : "en";

  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name ?? row.username,
    email: email ?? "",
    preferredLanguage,
    role: row.role,
    isSuspended: Boolean(row.is_suspended),
    createdAt: row.created_at,
    avatarUrl: row.avatar_url ?? undefined,
    bio: row.bio ?? undefined,
    interests: Array.isArray(row.interests) ? row.interests : [],
    githubUrl: row.github_url ?? undefined,
    linkedinUrl: row.linkedin_url ?? undefined,
  };
}

export function mapPublicProfileRowToAuthUserProfile(
  row: PublicProfileRow
): AuthUserProfile | null {
  if (!row.id || !row.username) {
    return null;
  }
  const preferredLanguage: SupportedLocale =
    row.preferred_locale === "pt-BR" ? "pt-BR" : "en";

  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name ?? row.username,
    email: "",
    preferredLanguage,
    role: "member",
    isSuspended: false,
    createdAt: row.created_at ?? "",
    avatarUrl: row.avatar_url ?? undefined,
    bio: row.bio ?? undefined,
    interests: Array.isArray(row.interests) ? row.interests : [],
    githubUrl: row.github_url ?? undefined,
    linkedinUrl: row.linkedin_url ?? undefined,
  };
}

/**
 * Reads the authenticated user's own `public.profiles` row.
 * Never creates a missing profile manually and never trusts client IDs.
 */
export async function readOwnProfile(options?: {
  client?: ProfileSupabaseClientLike;
}): Promise<ProfileReadResult> {
  try {
    const supabase =
      options?.client ??
      (createClient() as unknown as ProfileSupabaseClientLike);

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError) {
      if (isAuthMissingOrExpiredError(userError)) {
        return { status: "unauthenticated", profile: null };
      }
      return { status: "connection_error", profile: null };
    }

    if (!userData.user) {
      return { status: "unauthenticated", profile: null };
    }

    const { data, error } = await supabase
      .from("profiles")
      .select(PROFILE_SELECT_COLUMNS)
      .eq("id", userData.user.id)
      .maybeSingle();

    if (error) {
      if (isNetworkOrUnavailableError(error)) {
        return { status: "connection_error", profile: null };
      }
      return { status: "connection_error", profile: null };
    }

    if (!data) {
      return {
        status: "profile_missing",
        profile: null,
        userId: userData.user.id,
      };
    }

    const row = data as ProfileRow;
    if (row.id !== userData.user.id) {
      return {
        status: "profile_missing",
        profile: null,
        userId: userData.user.id,
      };
    }

    const mapped = mapProfileRowToAuthUserProfile(
      row,
      userData.user.email ?? null
    );
    if (mapped.isSuspended) {
      return { status: "suspended", profile: mapped };
    }

    return { status: "authenticated", profile: mapped };
  } catch {
    return { status: "connection_error", profile: null };
  }
}

/**
 * Reads a public profile exclusively via the `public.public_profiles` view
 * (omitting `role` and `is_suspended`).
 */
export async function readPublicProfileByUsername(
  username: string,
  options?: { client?: ProfileSupabaseClientLike }
): Promise<PublicProfileReadResult> {
  const normalized = username.trim().toLowerCase().replace(/^@/, "");
  if (!normalized) {
    return { status: "not_found", profile: null };
  }

  try {
    const supabase =
      options?.client ??
      (createClient() as unknown as ProfileSupabaseClientLike);

    const { data, error } = await supabase
      .from("public_profiles")
      .select(PUBLIC_PROFILE_SELECT_COLUMNS)
      .eq("username", normalized)
      .maybeSingle();

    if (error) {
      return { status: "connection_error", profile: null };
    }

    if (!data) {
      return { status: "not_found", profile: null };
    }

    const mapped = mapPublicProfileRowToAuthUserProfile(
      data as PublicProfileRow
    );
    if (!mapped) {
      return { status: "not_found", profile: null };
    }

    return { status: "found", profile: mapped };
  } catch {
    return { status: "connection_error", profile: null };
  }
}

/**
 * Updates only user-writable columns of `public.profiles` for the currently
 * authenticated user, respecting PostgreSQL column-level grants and RLS.
 * Rejects any attempt to supply `id`, `role`, `is_suspended`, or audit timestamps.
 */
export async function updateOwnProfile(
  input: ProfileUpdateInput,
  options: {
    locale: SupportedLocale;
    expectedUserId?: string;
    client?: ProfileSupabaseClientLike;
  }
): Promise<ProfileUpdateResult> {
  const rawInput = input as unknown as Record<string, unknown>;
  for (const forbidden of FORBIDDEN_UPDATE_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(rawInput, forbidden)) {
      return {
        status: "update_error",
        errorCode: "forbidden_field",
      };
    }
  }

  const validation = validateProfileUpdate(input, options.locale);
  if (!validation.valid) {
    return {
      status: "update_error",
      errorCode: "validation_error",
      fieldErrors: validation.errors,
    };
  }

  const sanitizedUpdate: ProfileUpdateRow = {
    display_name: input.displayName.trim() || null,
    bio: input.bio.trim() || null,
    interests: input.interests.map((tag) => tag.trim()).filter(Boolean).slice(0, 10),
    avatar_url: input.avatarUrl.trim() || null,
    github_url: input.githubUrl.trim() || null,
    linkedin_url: input.linkedinUrl.trim() || null,
    preferred_locale: input.preferredLanguage === "pt-BR" ? "pt-BR" : "en",
  };

  if (typeof input.username === "string") {
    sanitizedUpdate.username = input.username.trim().toLowerCase();
  }

  try {
    const supabase =
      options.client ??
      (createClient() as unknown as ProfileSupabaseClientLike);

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError) {
      if (isAuthMissingOrExpiredError(userError)) {
        return { status: "update_error", errorCode: "unauthenticated" };
      }
      return { status: "update_error", errorCode: "connection_error" };
    }

    if (!userData.user) {
      return { status: "update_error", errorCode: "unauthenticated" };
    }

    if (options.expectedUserId && options.expectedUserId !== userData.user.id) {
      return { status: "update_error", errorCode: "identity_mismatch" };
    }

    const { data, error } = await supabase
      .from("profiles")
      .update(sanitizedUpdate)
      .eq("id", userData.user.id)
      .select(PROFILE_SELECT_COLUMNS)
      .maybeSingle();

    if (error) {
      const code = (error.code ?? "").toLowerCase();
      const msg = (error.message ?? "").toLowerCase();

      if (code === "23505" || msg.includes("duplicate key")) {
        return { status: "update_error", errorCode: "username_taken" };
      }

      if (
        code === "42501" ||
        code === "pgrst301" ||
        error.status === 401 ||
        error.status === 403 ||
        msg.includes("row-level security") ||
        msg.includes("permission denied")
      ) {
        return { status: "update_error", errorCode: "rls_denied" };
      }

      if (code === "23514" || code === "22001") {
        return { status: "update_error", errorCode: "validation_error" };
      }

      if (isNetworkOrUnavailableError(error)) {
        return { status: "update_error", errorCode: "connection_error" };
      }

      return { status: "update_error", errorCode: "update_failed" };
    }

    if (!data) {
      // RLS `with check` / `using` blocked the row update (e.g. suspended or non-owner).
      return { status: "update_error", errorCode: "rls_denied" };
    }

    if (data.id !== userData.user.id) {
      return { status: "update_error", errorCode: "identity_mismatch" };
    }

    return {
      status: "update_success",
      profile: mapProfileRowToAuthUserProfile(data, userData.user.email ?? null),
    };
  } catch {
    return { status: "update_error", errorCode: "connection_error" };
  }
}
