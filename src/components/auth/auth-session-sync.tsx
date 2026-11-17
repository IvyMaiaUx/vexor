"use client";

import { useEffect, useRef } from "react";
import { useAuthStore } from "@/features/auth/use-auth-store";
import { createClient } from "@/lib/supabase/client";

const FOCUS_REVALIDATE_COOLDOWN_MS = 1000;

/**
 * Keeps the client UI auth store synchronized with the server-validated
 * Supabase SSR session (`GET /api/auth/session`) across reloads, new tabs,
 * focus changes, and Supabase auth events, with cooldown & single-flight
 * protection against duplicate calls and request loops.
 */
export function AuthSessionSync() {
  const refreshSession = useAuthStore((s) => s.refreshSession);
  const lastSyncAtRef = useRef<number>(0);

  useEffect(() => {
    let active = true;

    const triggerSync = (force = false) => {
      if (!active) {
        return;
      }
      const now = Date.now();
      if (!force && now - lastSyncAtRef.current < FOCUS_REVALIDATE_COOLDOWN_MS) {
        return;
      }
      lastSyncAtRef.current = now;
      void refreshSession();
    };

    triggerSync(true);

    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === "visible") {
        triggerSync(false);
      }
    };

    window.addEventListener("focus", handleVisibilityOrFocus);
    document.addEventListener("visibilitychange", handleVisibilityOrFocus);

    let unsubscribe: (() => void) | undefined;
    try {
      const supabase = createClient();
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((event) => {
        if (
          event === "SIGNED_IN" ||
          event === "SIGNED_OUT" ||
          event === "TOKEN_REFRESHED" ||
          event === "USER_UPDATED"
        ) {
          triggerSync(true);
        }
      });
      unsubscribe = () => subscription.unsubscribe();
    } catch {
      // Ignore if public env vars are absent in isolated test contexts
    }

    return () => {
      active = false;
      window.removeEventListener("focus", handleVisibilityOrFocus);
      document.removeEventListener("visibilitychange", handleVisibilityOrFocus);
      unsubscribe?.();
    };
  }, [refreshSession]);

  return null;
}
