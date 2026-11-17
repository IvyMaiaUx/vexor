"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  AUTH_STORE_EVENT,
  AUTH_SYNC_META_KEY,
  applyAuthenticatedSessionToStorage,
  type AuthMode,
  type AuthSyncError,
  type AuthSyncMeta,
  DEFAULT_AUTH_SYNC_META,
  performConsistentSignOut,
  type ServerSessionApiResponse,
  SESSION_STORAGE_KEY,
  syncClientSessionFromServer,
} from "./session-sync";
import type { AuthUserProfile } from "./validation";

function notifyAuthListeners() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(AUTH_STORE_EVENT));
  }
}

function subscribeAuthStore(callback: () => void) {
  if (typeof window === "undefined") {
    return () => {};
  }
  const handler = () => callback();
  window.addEventListener("storage", handler);
  window.addEventListener(AUTH_STORE_EVENT, handler);
  return () => {
    window.removeEventListener("storage", handler);
    window.removeEventListener(AUTH_STORE_EVENT, handler);
  };
}

export interface AuthStoreState {
  user: AuthUserProfile | null;
  isLoading: boolean;
  sessionExpired: boolean;
  syncError: AuthSyncError;
  isSigningOut: boolean;
  signOutError: boolean;
  authMode: AuthMode;
  isActiveMember: boolean;
  isModerator: boolean;
  isAdmin: boolean;
  refreshSession: () => Promise<AuthSyncMeta>;
  setAuthenticatedSession: (profile: AuthUserProfile | null) => void;
  updateProfile: (
    userId: string,
    updates: Partial<Omit<AuthUserProfile, "id" | "role" | "isSuspended">>
  ) => void;
  getProfileByUsername: (username: string) => AuthUserProfile | null;
  signOut: () => void;
}

export function useAuthStore(): AuthStoreState;
export function useAuthStore<T>(selector: (state: AuthStoreState) => T): T;
export function useAuthStore<T>(selector?: (state: AuthStoreState) => T): AuthStoreState | T {
  const sessionRaw = useSyncExternalStore(
    subscribeAuthStore,
    () => window.localStorage.getItem(SESSION_STORAGE_KEY) ?? "null",
    () => "null"
  );

  const syncMetaRaw = useSyncExternalStore(
    subscribeAuthStore,
    () => window.localStorage.getItem(AUTH_SYNC_META_KEY) ?? "null",
    () => "null"
  );

  const syncMeta: AuthSyncMeta = useMemo(() => {
    try {
      const parsed = JSON.parse(syncMetaRaw) as Partial<AuthSyncMeta> | null;
      if (!parsed || typeof parsed !== "object") {
        return DEFAULT_AUTH_SYNC_META;
      }
      return {
        authMode: parsed.authMode === "supabase" ? "supabase" : null,
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
  }, [syncMetaRaw]);

  const user: AuthUserProfile | null = useMemo(() => {
    try {
      const parsed = JSON.parse(sessionRaw);
      if (parsed && typeof parsed === "object" && typeof parsed.username === "string") {
        return parsed as AuthUserProfile;
      }
      return null;
    } catch {
      return null;
    }
  }, [sessionRaw]);

  const updateProfile = useCallback(
    (
      userId: string,
      updates: Partial<Omit<AuthUserProfile, "id" | "role" | "isSuspended">>
    ) => {
      if (typeof window === "undefined") {
        return;
      }

      // Never allow client-side profile updates to mutate identity, role, or suspension.
      const {
        id: _ignoredId,
        role: _ignoredRole,
        isSuspended: _ignoredSuspended,
        ...safeUpdates
      } = updates as Partial<AuthUserProfile>;
      void _ignoredId;
      void _ignoredRole;
      void _ignoredSuspended;

      // Update the in-session UI cache only; DB persistence happens via profile-service.
      if (user && user.id === userId) {
        const nextSession = { ...user, ...safeUpdates };
        window.localStorage.setItem(
          SESSION_STORAGE_KEY,
          JSON.stringify(nextSession)
        );
        if (safeUpdates.preferredLanguage) {
          window.localStorage.setItem(
            "cybersec_locale",
            safeUpdates.preferredLanguage
          );
        }
      }

      notifyAuthListeners();
    },
    [user]
  );

  const getProfileByUsername = useCallback(
    (username: string): AuthUserProfile | null => {
      const normalized = username.trim().toLowerCase().replace(/^@/, "");
      if (user && user.username.toLowerCase() === normalized) {
        return user;
      }
      return null;
    },
    [user]
  );

  const refreshSession = useCallback(async (): Promise<AuthSyncMeta> => {
    if (typeof window === "undefined") {
      return DEFAULT_AUTH_SYNC_META;
    }
    return await syncClientSessionFromServer({
      storage: window.localStorage,
      onNotify: notifyAuthListeners,
      fetchSession: async () => {
        const res = await fetch("/api/auth/session", {
          method: "GET",
          credentials: "same-origin",
          cache: "no-store",
        });
        let data: ServerSessionApiResponse | null = null;
        try {
          data = (await res.json()) as ServerSessionApiResponse;
        } catch {
          data = null;
        }
        return { ok: res.ok, status: res.status, data };
      },
    });
  }, []);

  const setAuthenticatedSession = useCallback(
    (profile: AuthUserProfile | null) => {
      if (typeof window === "undefined") {
        return;
      }
      applyAuthenticatedSessionToStorage(window.localStorage, profile);
      notifyAuthListeners();
    },
    []
  );

  const signOut = useCallback(() => {
    if (typeof window === "undefined") {
      return;
    }
    void performConsistentSignOut({
      storage: window.localStorage,
      onNotify: notifyAuthListeners,
      serverLogout: async () => {
        const res = await fetch("/api/auth/logout", {
          method: "POST",
          credentials: "same-origin",
          cache: "no-store",
        });
        return { ok: res.ok };
      },
      clientSignOut: async () => {
        await createClient().auth.signOut();
      },
    });
  }, []);

  /**
   * Mirrors PostgreSQL `public.is_active_member()`:
   * requires an authenticated session where `isSuspended === false`.
   */
  const isActiveMember = Boolean(user && !user.isSuspended);
  const isModerator = Boolean(
    user && !user.isSuspended && (user.role === "moderator" || user.role === "admin")
  );
  /**
   * Mirrors PostgreSQL `public.is_admin()`:
   * `coalesce(public.current_user_role() = 'admin', false)`
   */
  const isAdmin = Boolean(user && !user.isSuspended && user.role === "admin");

  const state: AuthStoreState = {
    user,
    isLoading: syncMeta.isLoading,
    sessionExpired: syncMeta.sessionExpired,
    syncError: syncMeta.syncError,
    isSigningOut: syncMeta.isSigningOut,
    signOutError: syncMeta.signOutError,
    authMode: syncMeta.authMode,
    isActiveMember,
    isModerator,
    isAdmin,
    refreshSession,
    setAuthenticatedSession,
    updateProfile,
    getProfileByUsername,
    signOut,
  };

  return selector ? selector(state) : state;
}
