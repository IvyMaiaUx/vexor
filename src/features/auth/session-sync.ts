import type { SupportedLocale } from "@/config/site";
import type { ServerSessionPayload } from "./login-service";
import type { AuthUserProfile } from "./validation";

export const SESSION_STORAGE_KEY = "cybersec_auth_session";
export const AUTH_MODE_STORAGE_KEY = "cybersec_auth_mode";
export const AUTH_SYNC_META_KEY = "cybersec_auth_sync_meta";
export const AUTH_STORE_EVENT = "cybersec-store-change";

export type AuthMode = "supabase" | "demo" | null;
export type AuthSyncError = "connection_error" | "profile_missing" | null;

export interface AuthSyncMeta {
  authMode: AuthMode;
  isLoading: boolean;
  sessionExpired: boolean;
  syncError: AuthSyncError;
  isSigningOut: boolean;
  signOutError: boolean;
}

export const DEFAULT_AUTH_SYNC_META: AuthSyncMeta = {
  authMode: null,
  isLoading: false,
  sessionExpired: false,
  syncError: null,
  isSigningOut: false,
  signOutError: false,
};

export interface StorageAdapter {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
}

export interface ServerSessionApiResponse extends ServerSessionPayload {
  status?:
    | "authenticated"
    | "unauthenticated"
    | "profile_missing"
    | "connection_error";
  authorization?: {
    isAuthenticated: boolean;
    hasProfile: boolean;
    isSuspended: boolean;
    role: string | null;
    isActiveMember: boolean;
    isModerator: boolean;
    isAdmin: boolean;
  };
}

export function mapServerPayloadToProfile(
  payload: ServerSessionApiResponse
): AuthUserProfile | null {
  if (!payload.authenticated || !payload.user || !payload.profile) {
    return null;
  }
  if (payload.profile.id !== payload.user.id) {
    return null;
  }

  const locale: SupportedLocale =
    payload.profile.preferred_locale === "pt-BR" ? "pt-BR" : "en";

  return {
    id: payload.profile.id,
    username: payload.profile.username,
    displayName: payload.profile.display_name ?? payload.profile.username,
    email: payload.user.email ?? "",
    preferredLanguage: locale,
    role: payload.profile.role,
    isSuspended: Boolean(payload.profile.is_suspended),
    createdAt: payload.profile.created_at,
    avatarUrl: payload.profile.avatar_url ?? undefined,
    bio: payload.profile.bio ?? undefined,
    interests: Array.isArray(payload.profile.interests)
      ? payload.profile.interests
      : [],
    githubUrl: payload.profile.github_url ?? undefined,
    linkedinUrl: payload.profile.linkedin_url ?? undefined,
  };
}

export function readSyncMeta(storage: StorageAdapter): AuthSyncMeta {
  try {
    const raw = storage.getItem(AUTH_SYNC_META_KEY);
    if (!raw) {
      return DEFAULT_AUTH_SYNC_META;
    }
    const parsed = JSON.parse(raw) as Partial<AuthSyncMeta>;
    return {
      authMode:
        parsed.authMode === "supabase" || parsed.authMode === "demo"
          ? parsed.authMode
          : null,
      isLoading: Boolean(parsed.isLoading),
      sessionExpired: Boolean(parsed.sessionExpired),
      syncError:
        parsed.syncError === "connection_error" ||
        parsed.syncError === "profile_missing"
          ? parsed.syncError
          : null,
      isSigningOut: Boolean(parsed.isSigningOut),
      signOutError: Boolean(parsed.signOutError),
    };
  } catch {
    return DEFAULT_AUTH_SYNC_META;
  }
}

export function writeSyncMeta(
  storage: StorageAdapter,
  meta: AuthSyncMeta
): void {
  storage.setItem(AUTH_SYNC_META_KEY, JSON.stringify(meta));
}

/**
 * Updates the cached client session in storage for Supabase mode while preserving
 * any unresolved `signOutError` / `isSigningOut` state until a sign-out succeeds.
 */
export function applyAuthenticatedSessionToStorage(
  storage: StorageAdapter,
  profile: AuthUserProfile | null
): AuthSyncMeta {
  const prevMeta = readSyncMeta(storage);
  if (!profile) {
    storage.removeItem(SESSION_STORAGE_KEY);
    storage.removeItem(AUTH_MODE_STORAGE_KEY);
    const nextMeta: AuthSyncMeta = {
      ...DEFAULT_AUTH_SYNC_META,
      isSigningOut: prevMeta.isSigningOut,
      signOutError: prevMeta.signOutError,
    };
    writeSyncMeta(storage, nextMeta);
    return nextMeta;
  }

  storage.setItem(SESSION_STORAGE_KEY, JSON.stringify(profile));
  storage.setItem(AUTH_MODE_STORAGE_KEY, "supabase");
  storage.setItem("cybersec_locale", profile.preferredLanguage);
  const nextMeta: AuthSyncMeta = {
    ...DEFAULT_AUTH_SYNC_META,
    authMode: "supabase",
    isSigningOut: prevMeta.isSigningOut,
    signOutError: prevMeta.signOutError,
  };
  writeSyncMeta(storage, nextMeta);
  return nextMeta;
}

let inFlightSync: Promise<AuthSyncMeta> | null = null;
let syncEpoch = 0;
let inFlightSignOut: Promise<{ ok: boolean; networkError: boolean }> | null = null;

export function bumpSyncEpoch(): number {
  syncEpoch += 1;
  return syncEpoch;
}

export function resetSyncCoordinatorForTests(): void {
  inFlightSync = null;
  inFlightSignOut = null;
  syncEpoch = 0;
}

/**
 * Synchronizes the client-side UI store with `GET /api/auth/session`.
 * Uses single-flight deduplication and an epoch counter to prevent race conditions,
 * duplicate requests, and stale responses overwriting a newer logout.
 * Never falls back to `DEMO_PROFILES` on failure and never clears session on connection error.
 */
export async function syncClientSessionFromServer(options: {
  storage: StorageAdapter;
  fetchSession: () => Promise<{ ok: boolean; status: number; data: ServerSessionApiResponse | null }>;
  onNotify?: () => void;
}): Promise<AuthSyncMeta> {
  if (inFlightSync) {
    return await inFlightSync;
  }

  const { storage, fetchSession, onNotify } = options;
  const startEpoch = syncEpoch;
  const prevMeta = readSyncMeta(storage);

  const run = (async (): Promise<AuthSyncMeta> => {
    writeSyncMeta(storage, {
      ...prevMeta,
      isLoading: true,
      syncError: null,
      signOutError: prevMeta.signOutError,
    });
    onNotify?.();

    try {
      const response = await fetchSession();

      // Abort applying stale response if a logout or newer invalidation occurred while in flight.
      if (syncEpoch !== startEpoch) {
        return readSyncMeta(storage);
      }

      if (!response.ok || !response.data || response.data.status === "connection_error") {
        // Connection/service unavailability MUST NOT log out the user or grant new access.
        const nextMeta: AuthSyncMeta = {
          ...DEFAULT_AUTH_SYNC_META,
          authMode: prevMeta.authMode,
          syncError: "connection_error",
          signOutError: prevMeta.signOutError,
        };
        writeSyncMeta(storage, nextMeta);
        onNotify?.();
        return nextMeta;
      }

      const payload = response.data;

      if (payload.status === "profile_missing" || (payload.authenticated && !payload.profile)) {
        storage.removeItem(SESSION_STORAGE_KEY);
        storage.removeItem(AUTH_MODE_STORAGE_KEY);
        const nextMeta: AuthSyncMeta = {
          ...DEFAULT_AUTH_SYNC_META,
          syncError: "profile_missing",
          signOutError: prevMeta.signOutError,
        };
        writeSyncMeta(storage, nextMeta);
        onNotify?.();
        return nextMeta;
      }

      const mappedProfile = mapServerPayloadToProfile(payload);
      if (mappedProfile) {
        storage.setItem(SESSION_STORAGE_KEY, JSON.stringify(mappedProfile));
        storage.setItem(AUTH_MODE_STORAGE_KEY, "supabase");
        storage.setItem("cybersec_locale", mappedProfile.preferredLanguage);
        const nextMeta: AuthSyncMeta = {
          ...DEFAULT_AUTH_SYNC_META,
          authMode: "supabase",
          signOutError: prevMeta.signOutError,
        };
        writeSyncMeta(storage, nextMeta);
        onNotify?.();
        return nextMeta;
      }

      // Server reports unauthenticated.
      // Preserve explicit offline demo mode ONLY if the user explicitly chose demo mode.
      if (prevMeta.authMode === "demo") {
        const nextMeta: AuthSyncMeta = {
          ...DEFAULT_AUTH_SYNC_META,
          authMode: "demo",
          signOutError: prevMeta.signOutError,
        };
        writeSyncMeta(storage, nextMeta);
        onNotify?.();
        return nextMeta;
      }

      const wasSupabaseSession = prevMeta.authMode === "supabase";
      storage.removeItem(SESSION_STORAGE_KEY);
      storage.removeItem(AUTH_MODE_STORAGE_KEY);
      const nextMeta: AuthSyncMeta = {
        ...DEFAULT_AUTH_SYNC_META,
        sessionExpired: wasSupabaseSession,
        signOutError: prevMeta.signOutError,
      };
      writeSyncMeta(storage, nextMeta);
      onNotify?.();
      return nextMeta;
    } catch {
      if (syncEpoch !== startEpoch) {
        return readSyncMeta(storage);
      }
      const nextMeta: AuthSyncMeta = {
        ...DEFAULT_AUTH_SYNC_META,
        authMode: prevMeta.authMode,
        syncError: "connection_error",
        signOutError: prevMeta.signOutError,
      };
      writeSyncMeta(storage, nextMeta);
      onNotify?.();
      return nextMeta;
    } finally {
      inFlightSync = null;
    }
  })();

  inFlightSync = run;
  return await run;
}

/**
 * Executes a single-flight, race-safe logout that clears client UI state,
 * invalidates any in-flight session sync via `bumpSyncEpoch()`, calls server logout,
 * and handles network failures safely without throwing or duplicating `signOut()`.
 */
export async function performConsistentSignOut(options: {
  storage: StorageAdapter;
  onNotify?: () => void;
  serverLogout: () => Promise<{ ok: boolean }>;
  clientSignOut: () => Promise<void>;
}): Promise<{ ok: boolean; networkError: boolean }> {
  if (inFlightSignOut) {
    return await inFlightSignOut;
  }

  const { storage, onNotify, serverLogout, clientSignOut } = options;

  const run = (async (): Promise<{ ok: boolean; networkError: boolean }> => {
    const prevMeta = readSyncMeta(storage);
    bumpSyncEpoch();
    storage.removeItem(SESSION_STORAGE_KEY);
    storage.removeItem(AUTH_MODE_STORAGE_KEY);
    writeSyncMeta(storage, {
      ...DEFAULT_AUTH_SYNC_META,
      isSigningOut: true,
      signOutError: prevMeta.signOutError,
    });
    onNotify?.();

    let networkError = false;
    try {
      const serverRes = await serverLogout();
      if (!serverRes.ok) {
        networkError = true;
      }
    } catch {
      networkError = true;
    }

    try {
      await clientSignOut();
    } catch {
      networkError = true;
    }

    writeSyncMeta(storage, {
      ...DEFAULT_AUTH_SYNC_META,
      isSigningOut: false,
      signOutError: networkError,
    });
    onNotify?.();
    inFlightSignOut = null;
    return { ok: !networkError, networkError };
  })();

  inFlightSignOut = run;
  return await run;
}
