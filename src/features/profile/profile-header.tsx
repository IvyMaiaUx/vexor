"use client";

import Image from "next/image";
import { useState } from "react";
import type { SupportedLocale } from "@/config/site";
import type { AuthUserProfile } from "@/features/auth/validation";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { ProfileStats } from "./types";

interface ProfileHeaderProps {
  profile: AuthUserProfile;
  stats: ProfileStats;
  isCurrentUser: boolean;
  locale: SupportedLocale;
  dict: Dictionary;
  onOpenEdit: () => void;
}

export function ProfileHeader({
  profile,
  stats,
  isCurrentUser,
  dict,
  onOpenEdit,
}: ProfileHeaderProps) {
  const [failedAvatarUrl, setFailedAvatarUrl] = useState<string | null>(null);
  const imgError = Boolean(
    profile.avatarUrl && failedAvatarUrl === profile.avatarUrl
  );

  const initials = (profile.displayName || profile.username)
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  const roleStyles = {
    admin: "border-purple-500/40 bg-purple-500/15 text-purple-300",
    moderator: "border-indigo-500/40 bg-indigo-500/15 text-indigo-300",
    member: "border-emerald-500/40 bg-emerald-500/15 text-emerald-300",
  }[profile.role] ?? "border-slate-700 bg-slate-800 text-slate-300";

  const roleLabels = {
    admin: "ADMIN",
    moderator: "MODERATOR",
    member: "MEMBER",
  }[profile.role] ?? "MEMBER";

  return (
    <div className="relative overflow-hidden rounded-3xl border border-slate-800/90 bg-[#0d1322]/90 p-6 sm:p-8">
      {/* Decorative cyber grid accent */}
      <div
        className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-cyan-500/10 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl"
        aria-hidden="true"
      />

      <div className="relative z-10 flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          {/* Avatar / Fallback */}
          <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl border-2 border-cyan-500/30 bg-[#070b14] shadow-[0_0_25px_rgba(6,182,212,0.2)]">
            {profile.avatarUrl && !imgError ? (
              <Image
                key={profile.avatarUrl}
                src={profile.avatarUrl}
                alt={profile.displayName || profile.username}
                width={96}
                height={96}
                unoptimized
                onError={() => setFailedAvatarUrl(profile.avatarUrl ?? null)}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-cyan-900/60 to-indigo-950 font-mono text-2xl font-bold text-cyan-300">
                {initials || "VX"}
              </div>
            )}
            {profile.isSuspended && (
              <div className="absolute inset-0 flex items-center justify-center bg-rose-950/80 font-mono text-[10px] font-bold uppercase text-rose-300">
                SUSPENDED
              </div>
            )}
          </div>

          {/* User Identity */}
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-slate-100 sm:text-3xl">
                {profile.displayName || profile.username}
              </h1>
              <span
                className={`rounded-md border px-2 py-0.5 font-mono text-[11px] font-semibold uppercase tracking-wider ${roleStyles}`}
              >
                {roleLabels}
              </span>
              {profile.specialty && (
                <span className="rounded-md border border-cyan-500/40 bg-cyan-500/10 px-2 py-0.5 font-mono text-[11px] font-semibold text-cyan-300">
                  🔬 {profile.specialty}
                </span>
              )}
            </div>

            <p className="font-mono text-sm text-cyan-400">
              @{profile.username}
            </p>

            <p className="font-mono text-xs text-slate-400">
              {dict.profilePage.joinedDate(profile.createdAt.slice(0, 10))}
            </p>
          </div>
        </div>

        {/* Action & Reputation Pill */}
        <div className="flex flex-col items-start gap-3 sm:items-end">
          <div className="inline-flex items-center gap-2 rounded-2xl border border-cyan-500/30 bg-[#070b14]/90 px-4 py-2 shadow-[0_0_20px_rgba(6,182,212,0.15)]">
            <span className="text-lg" aria-hidden="true">
              ⭐
            </span>
            <div className="text-left sm:text-right">
              <span className="block font-mono text-xs font-semibold text-slate-400">
                {dict.profilePage.reputationLabel}
              </span>
              <span className="font-mono text-xl font-bold text-cyan-300">
                {stats.reputation}{" "}
                <span className="text-xs font-normal text-slate-400">pts</span>
              </span>
            </div>
          </div>

          {isCurrentUser && !profile.isSuspended && (
            <button
              type="button"
              onClick={onOpenEdit}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-[#070b14] px-4 py-2 text-xs font-semibold text-slate-200 transition-colors hover:border-cyan-500 hover:text-cyan-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
            >
              <span>✎</span>
              {dict.profilePage.editProfileButton}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
