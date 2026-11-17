"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  AUTH_MODE_STORAGE_KEY,
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
  writeSyncMeta,
} from "./session-sync";
import type { AuthUserProfile } from "./validation";

const USERS_STORAGE_KEY = "cybersec_registered_users";

export const DEMO_PROFILES: AuthUserProfile[] = [
  {
    id: "00000000-0000-0000-0000-000000000001",
    username: "sec_analyst_br",
    displayName: "Lucas Mendes",
    email: "analista@cybersec.community",
    preferredLanguage: "pt-BR",
    role: "member",
    isSuspended: false,
    createdAt: "2026-10-10",
    avatarUrl:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=256&h=256&fit=crop&crop=faces",
    bio: "Analista de SOC N2 focado em detecção de ameaças, Threat Hunting com Sysmon e automação defensiva no ecossistema Windows.",
    interests: ["Threat Hunting", "SIEM", "Sysmon", "Blue Team", "DFIR"],
    githubUrl: "https://github.com/lucasmendes-sec",
    linkedinUrl: "https://linkedin.com/in/lucasmendes-sec",
  },
  {
    id: "00000000-0000-0000-0000-000000000002",
    username: "cve_hunter",
    displayName: "Alexandre Silva",
    email: "alex@cybersec.community",
    preferredLanguage: "pt-BR",
    role: "member",
    specialty: "Security Researcher",
    isSuspended: false,
    createdAt: "2026-09-15",
    avatarUrl:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=256&h=256&fit=crop&crop=faces",
    bio: "Pesquisador de vulnerabilidades ofensivas e defensivas. Foco em engenharia reversa de firmware, AppSec e mitigação de vulnerabilidades lógicas em APIs.",
    interests: ["AppSec", "API Security", "Binary Exploitation", "Cloud Security"],
    githubUrl: "https://github.com/alex-cvehunter",
    linkedinUrl: "https://linkedin.com/in/alex-cvehunter",
  },
  {
    id: "00000000-0000-0000-0000-000000000003",
    username: "mod_sentinel",
    displayName: "Elena Rostova (Sentinel)",
    email: "mod@cybersec.community",
    preferredLanguage: "en",
    role: "moderator",
    isSuspended: false,
    createdAt: "2026-10-01",
    avatarUrl:
      "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=256&h=256&fit=crop&crop=faces",
    bio: "Senior Incident Responder & Vexor Moderator. Specializing in Volatility 3, memory dump triage, and threat intelligence orchestration.",
    interests: ["DFIR", "Memory Forensics", "Reverse Engineering", "Threat Intel"],
    githubUrl: "https://github.com/sentinel-dfir",
    linkedinUrl: "https://linkedin.com/in/sentinel-dfir",
  },
  {
    id: "00000000-0000-0000-0000-000000000004",
    username: "root_admin",
    displayName: "Vexor Administrator",
    email: "admin@cybersec.community",
    preferredLanguage: "pt-BR",
    role: "admin",
    isSuspended: false,
    createdAt: "2026-09-01",
    avatarUrl:
      "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=256&h=256&fit=crop&crop=faces",
    bio: "Administrador do ecossistema Vexor. Supervisão de governança, permissões de moderadores e conformidade de segurança.",
    interests: ["Security Governance", "Infrastructure", "RLS", "Audit", "Incident Response"],
    githubUrl: "https://github.com/vexor-admin",
  },
  {
    id: "00000000-0000-0000-0000-000000000005",
    username: "suspended_user",
    displayName: "Conta Suspensa (Teste RLS)",
    email: "suspended@cybersec.community",
    preferredLanguage: "pt-BR",
    role: "member",
    isSuspended: true,
    createdAt: "2026-10-25",
    bio: "Conta em moderação temporária por violação das diretrizes de publicação.",
    interests: ["Penetration Testing"],
  },
];

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
  allProfiles: AuthUserProfile[];
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
  signInWithProfile: (profile: AuthUserProfile) => void;
  setAuthenticatedSession: (profile: AuthUserProfile | null) => void;
  signInWithIdentifier: (identifier: string, password: string) => AuthUserProfile | null;
  registerUser: (newProfile: AuthUserProfile) => void;
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

  const usersRaw = useSyncExternalStore(
    subscribeAuthStore,
    () => window.localStorage.getItem(USERS_STORAGE_KEY) ?? "[]",
    () => "[]"
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

  const registeredUsers: AuthUserProfile[] = useMemo(() => {
    try {
      const parsed = JSON.parse(usersRaw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }, [usersRaw]);

  const allProfiles: AuthUserProfile[] = useMemo(() => {
    return [...registeredUsers, ...DEMO_PROFILES];
  }, [registeredUsers]);

  const signInWithProfile = useCallback((profile: AuthUserProfile) => {
    if (typeof window === "undefined") {
      return;
    }
    window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(profile));
    window.localStorage.setItem(AUTH_MODE_STORAGE_KEY, "demo");
    window.localStorage.setItem("cybersec_locale", profile.preferredLanguage);
    writeSyncMeta(window.localStorage, {
      ...DEFAULT_AUTH_SYNC_META,
      authMode: "demo",
    });
    notifyAuthListeners();
  }, []);

  const signInWithIdentifier = useCallback(
    (identifier: string, password: string): AuthUserProfile | null => {
      if (!identifier.trim() || password.length < 4) {
        return null;
      }
      const normalized = identifier.trim().toLowerCase().replace(/^@/, "");
      const found = allProfiles.find(
        (u) =>
          u.username.toLowerCase() === normalized ||
          u.email.toLowerCase() === normalized
      );
      if (!found) {
        return null;
      }
      signInWithProfile(found);
      return found;
    },
    [allProfiles, signInWithProfile]
  );

  const registerUser = useCallback(
    (newProfile: AuthUserProfile) => {
      if (typeof window === "undefined") {
        return;
      }
      const nextUsers = [newProfile, ...registeredUsers];
      window.localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(nextUsers));
      window.localStorage.setItem(
        SESSION_STORAGE_KEY,
        JSON.stringify(newProfile)
      );
      window.localStorage.setItem(
        "cybersec_locale",
        newProfile.preferredLanguage
      );
      notifyAuthListeners();
    },
    [registeredUsers]
  );

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

      // In Supabase mode, only update the in-session UI cache; DB persistence happens via profile-service.
      if (syncMeta.authMode !== "supabase") {
        // 1. Update registered/demo users list
        const userIdx = registeredUsers.findIndex((u) => u.id === userId);
        let updatedList = [...registeredUsers];
        if (userIdx !== -1) {
          updatedList[userIdx] = { ...updatedList[userIdx], ...safeUpdates };
        } else {
          // If it was a demo profile being edited, add it to registeredUsers overlay
          const demoUser = DEMO_PROFILES.find((u) => u.id === userId);
          if (demoUser) {
            updatedList = [{ ...demoUser, ...safeUpdates }, ...updatedList];
          }
        }
        window.localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(updatedList));
      }

      // 2. If the currently signed in user matches, update session UI cache
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
    [registeredUsers, syncMeta.authMode, user]
  );

  const getProfileByUsername = useCallback(
    (username: string): AuthUserProfile | null => {
      const normalized = username.trim().toLowerCase().replace(/^@/, "");
      return (
        allProfiles.find(
          (u) => u.username.toLowerCase() === normalized
        ) ?? null
      );
    },
    [allProfiles]
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
    allProfiles,
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
    signInWithProfile,
    setAuthenticatedSession,
    signInWithIdentifier,
    registerUser,
    updateProfile,
    getProfileByUsername,
    signOut,
  };

  return selector ? selector(state) : state;
}
