"use client";

import { useAuthStore } from "@/features/auth/use-auth-store";
import type { Dictionary } from "@/lib/i18n/dictionaries";

interface SignOutErrorBannerProps {
  dict: Dictionary;
}

/**
 * Displays a non-intrusive visual alert whenever server/client sign-out
 * could not be confirmed, offering a safe retry action without exposing internal errors.
 */
export function SignOutErrorBanner({ dict }: SignOutErrorBannerProps) {
  const signOutError = useAuthStore((s) => s.signOutError);
  const isSigningOut = useAuthStore((s) => s.isSigningOut);
  const signOut = useAuthStore((s) => s.signOut);

  if (!signOutError) {
    return null;
  }

  return (
    <div
      role="alert"
      className="border-b border-rose-500/30 bg-rose-950/60 px-4 py-2.5 text-xs text-rose-200"
    >
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2">
        <span>{dict.auth.errors.logoutFailed}</span>
        <button
          type="button"
          disabled={isSigningOut}
          onClick={() => void signOut()}
          className="rounded-lg border border-rose-400/40 bg-rose-500/20 px-3 py-1 font-medium text-rose-100 transition-colors hover:bg-rose-500/30 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {dict.auth.retrySignOut}
        </button>
      </div>
    </div>
  );
}
