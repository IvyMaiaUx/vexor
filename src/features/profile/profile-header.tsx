"use client";

import Image from "next/image";
import Link from "next/link";
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
  locale,
  dict,
  onOpenEdit,
}: ProfileHeaderProps) {
  const isPt = locale === "pt-BR";
  const [failedAvatarUrl, setFailedAvatarUrl] = useState<string | null>(null);
  // TODO(backend): persistir follow de usuário quando existir tabela de follows
  const [following, setFollowing] = useState(false);

  const imgError = Boolean(
    profile.avatarUrl && failedAvatarUrl === profile.avatarUrl
  );

  const initial = (profile.displayName || profile.username || "V")
    .slice(0, 1)
    .toUpperCase();

  const roleStyles =
    {
      admin: "border-indigo-500/40 bg-indigo-500/15 text-indigo-300",
      moderator: "border-indigo-500/40 bg-indigo-500/15 text-indigo-300",
      member: "border-emerald-500/40 bg-emerald-500/15 text-emerald-300",
    }[profile.role] ?? "border-slate-700 bg-slate-800 text-slate-300";

  const roleLabels =
    {
      admin: "ADMIN",
      moderator: "MOD",
      member: "MEMBER",
    }[profile.role] ?? "MEMBER";

  // TODO(backend): carregar contadores reais de seguidores e seguindo da tabela follows
  const followersCount = 0;
  const followingCount = 0;

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-800/90 bg-[#0d1322]/95">
      {/* Cover Banner */}
      <div
        className="relative h-20 border-b border-cyan-500/30 bg-gradient-to-r from-cyan-950/70 via-[#0a2233] to-indigo-950/60 bg-cyber-grid sm:h-28"
        aria-hidden="true"
      />

      <div className="px-4 pb-5 sm:px-8 sm:pb-7">
        {/* Avatar + Action Buttons Row */}
        <div className="-mt-9 flex items-end justify-between gap-3 sm:-mt-11">
          <div className="relative h-[76px] w-[76px] shrink-0 rounded-full border-2 border-cyan-400 bg-[#070b14] p-1 shadow-[0_0_24px_rgba(34,211,238,0.2)] sm:h-24 sm:w-24">
            <div className="relative h-full w-full overflow-hidden rounded-full bg-cyan-500/15">
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
                <div className="flex h-full w-full items-center justify-center font-mono text-2xl font-bold text-cyan-300">
                  {initial}
                </div>
              )}
              {profile.isSuspended && (
                <div className="absolute inset-0 flex items-center justify-center bg-rose-950/80 font-mono text-[10px] font-bold uppercase text-rose-300">
                  SUSPENDED
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            {isCurrentUser && !profile.isSuspended ? (
              <>
                <button
                  type="button"
                  onClick={onOpenEdit}
                  className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-slate-700 bg-[#070b14] px-4 text-sm font-medium text-slate-100 transition-colors hover:border-cyan-500/50 hover:text-cyan-300"
                >
                  {dict.profilePage.editProfileButton}
                </button>
                <Link
                  href="/messages"
                  aria-label={isPt ? "Mensagens" : "Messages"}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-700 bg-[#070b14] text-slate-200 transition-colors hover:border-cyan-500/50 hover:text-cyan-300"
                >
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-[18px] w-[18px]"
                  >
                    <rect x="3" y="5" width="18" height="14" rx="2" />
                    <path d="M3 7l9 6 9-6" />
                  </svg>
                </Link>
              </>
            ) : !isCurrentUser ? (
              <button
                type="button"
                onClick={() => setFollowing((prev) => !prev)}
                aria-pressed={following}
                className={`inline-flex min-h-[44px] items-center justify-center rounded-xl px-4 text-sm font-semibold transition-colors ${
                  following
                    ? "border border-cyan-500/50 bg-cyan-500/15 text-cyan-300"
                    : "bg-cyan-500 text-slate-950 hover:bg-cyan-400"
                }`}
              >
                {following
                  ? isPt
                    ? "Seguindo"
                    : "Following"
                  : isPt
                    ? "Seguir"
                    : "Follow"}
              </button>
            ) : null}
          </div>
        </div>

        {/* Identity: @username + role badge + display name */}
        <div className="mt-3">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-mono text-lg font-semibold text-emerald-400 sm:text-xl">
              @{profile.username}
            </h1>
            <span
              className={`inline-flex h-[22px] items-center rounded-md border px-2 font-mono text-[11px] font-semibold uppercase tracking-wider ${roleStyles}`}
            >
              {roleLabels}
            </span>
            {profile.specialty && (
              <span className="inline-flex h-[22px] items-center rounded-md border border-cyan-500/40 bg-cyan-500/10 px-2 font-mono text-[11px] font-semibold text-cyan-300">
                {profile.specialty}
              </span>
            )}
          </div>

          {profile.displayName && profile.displayName !== profile.username && (
            <p className="mt-0.5 text-sm font-medium text-slate-200">
              {profile.displayName}
            </p>
          )}

          {profile.bio && (
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">
              {profile.bio}
            </p>
          )}
        </div>

        {/* Counters Row */}
        <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
          <span>
            <strong className="font-semibold text-slate-100">
              {stats.topicsCount}
            </strong>{" "}
            <span className="text-slate-400">posts</span>
          </span>
          <span>
            <strong className="font-semibold text-slate-100">
              {followersCount}
            </strong>{" "}
            <span className="text-slate-400">
              {isPt ? "seguidores" : "followers"}
            </span>
          </span>
          <span>
            <strong className="font-semibold text-slate-100">
              {followingCount}
            </strong>{" "}
            <span className="text-slate-400">
              {isPt ? "seguindo" : "following"}
            </span>
          </span>
          <span className="hidden text-xs text-slate-500 sm:inline">
            · {stats.reputation} pts
          </span>
        </div>
      </div>
    </div>
  );
}
