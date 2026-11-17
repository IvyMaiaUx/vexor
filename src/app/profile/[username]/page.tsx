"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import type { AuthUserProfile } from "@/features/auth/validation";
import { useAuthStore } from "@/features/auth/use-auth-store";
import { useCatalogStore } from "@/features/catalog/use-catalog-store";
import { useForumStore } from "@/features/forum/use-forum-store";
import { calculateProfileStats, computeProfileBadges } from "@/features/profile/badges";
import { ProfileEditModal } from "@/features/profile/profile-edit-modal";
import { ProfileHeader } from "@/features/profile/profile-header";
import { readPublicProfileByUsername } from "@/features/profile/profile-service";
import { ProfileTabs } from "@/features/profile/profile-tabs";
import type { ProfileViewData } from "@/features/profile/types";
import { getDictionary } from "@/lib/i18n/dictionaries";

export default function PublicProfilePage() {
  const params = useParams<{ username: string }>();
  const rawUsername = typeof params?.username === "string" ? params.username : "";
  const username = decodeURIComponent(rawUsername).replace(/^@/, "");

  const { user, authMode, getProfileByUsername } = useAuthStore();
  const { locale, setLocale, allResources } = useCatalogStore();
  const { topics, posts } = useForumStore();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [remoteLookup, setRemoteLookup] = useState<{
    username: string;
    status: "found" | "not_found" | "connection_error";
    profile: AuthUserProfile | null;
  } | null>(null);

  const dict = useMemo(() => getDictionary(locale), [locale]);
  const isPt = locale === "pt-BR";

  const isOwnUsername = Boolean(
    user && user.username.toLowerCase() === username.toLowerCase()
  );
  const demoFallbackProfile = useMemo(() => {
    if (authMode !== "demo") return null;
    return getProfileByUsername(username);
  }, [authMode, getProfileByUsername, username]);

  const shouldFetchRemote = Boolean(
    username && !isOwnUsername && !demoFallbackProfile
  );

  useEffect(() => {
    if (!shouldFetchRemote) {
      return;
    }

    let active = true;
    void readPublicProfileByUsername(username).then((result) => {
      if (!active) return;
      if (result.status === "found") {
        setRemoteLookup({
          username,
          status: "found",
          profile: result.profile,
        });
      } else if (result.status === "connection_error") {
        setRemoteLookup({
          username,
          status: "connection_error",
          profile: null,
        });
      } else {
        setRemoteLookup({
          username,
          status: "not_found",
          profile: null,
        });
      }
    });

    return () => {
      active = false;
    };
  }, [shouldFetchRemote, username]);

  const currentRemote =
    remoteLookup?.username === username ? remoteLookup : null;
  const remoteStatus =
    shouldFetchRemote && !currentRemote
      ? "loading"
      : (currentRemote?.status ?? "idle");

  const targetProfile = isOwnUsername
    ? user
    : demoFallbackProfile ?? currentRemote?.profile ?? null;

  const isCurrentUser = Boolean(
    user && targetProfile && user.id === targetProfile.id
  );

  const profileData: ProfileViewData | null = useMemo(() => {
    if (!targetProfile) return null;

    const { stats, userTopics, userPosts, userContributions } =
      calculateProfileStats(targetProfile, topics, posts, allResources);

    const badges = computeProfileBadges(targetProfile, stats);

    return {
      profile: targetProfile,
      isCurrentUser,
      stats,
      badges,
      topics: userTopics,
      replies: userPosts,
      contributions: userContributions,
    };
  }, [targetProfile, isCurrentUser, topics, posts, allResources]);

  return (
    <div className="flex min-h-screen flex-col bg-[#070b14] text-slate-100 antialiased selection:bg-cyan-500/30 selection:text-cyan-200">
      <Header locale={locale} onLocaleChange={setLocale} dict={dict} />

      <main className="flex-1 py-8 sm:py-12">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          {/* Breadcrumb Navigation */}
          <nav
            aria-label="Breadcrumb"
            className="mb-6 flex items-center gap-2 font-mono text-xs text-slate-400"
          >
            <Link
              href="/"
              className="transition-colors hover:text-cyan-400 focus:outline-none focus-visible:text-cyan-400"
            >
              {dict.nav.home}
            </Link>
            <span aria-hidden="true" className="text-slate-600">
              /
            </span>
            <Link
              href="/forum"
              className="transition-colors hover:text-cyan-400 focus:outline-none focus-visible:text-cyan-400"
            >
              {dict.nav.forum}
            </Link>
            <span aria-hidden="true" className="text-slate-600">
              /
            </span>
            <span aria-current="page" className="text-cyan-300">
              @{username}
            </span>
          </nav>

          {remoteStatus === "loading" && !targetProfile ? (
            <div
              role="status"
              className="rounded-3xl border border-slate-800 bg-[#0d1322]/80 p-8 text-center sm:p-12"
            >
              <p className="font-mono text-sm text-cyan-300">
                {isPt ? "Carregando perfil..." : "Loading profile..."}
              </p>
            </div>
          ) : remoteStatus === "connection_error" && !targetProfile ? (
            <div
              role="alert"
              className="rounded-3xl border border-amber-500/30 bg-amber-500/10 p-8 text-center sm:p-12"
            >
              <h1 className="text-xl font-bold text-amber-200 sm:text-2xl">
                {isPt ? "Erro de conexão" : "Connection error"}
              </h1>
              <p className="mx-auto mt-2 max-w-md text-sm text-amber-200/80">
                {isPt
                  ? "Não foi possível consultar o perfil no Supabase."
                  : "Could not load the profile from Supabase."}
              </p>
            </div>
          ) : !targetProfile || !profileData ? (
            /* Not Found State */
            <div className="rounded-3xl border border-slate-800 bg-[#0d1322]/80 p-8 text-center sm:p-12">
              <span className="text-4xl" aria-hidden="true">
                🔍
              </span>
              <h1 className="mt-4 text-xl font-bold text-slate-200 sm:text-2xl">
                {dict.profilePage.notFoundTitle}
              </h1>
              <p className="mx-auto mt-2 max-w-md text-sm text-slate-400">
                {dict.profilePage.notFoundDesc}
              </p>
              <div className="mt-6 flex justify-center gap-3">
                <Link
                  href="/forum"
                  className="rounded-xl bg-cyan-500 px-5 py-2.5 text-xs font-semibold text-slate-950 transition-colors hover:bg-cyan-400"
                >
                  Voltar ao Fórum
                </Link>
                <Link
                  href="/"
                  className="rounded-xl border border-slate-700 bg-[#070b14] px-5 py-2.5 text-xs font-semibold text-slate-300 transition-colors hover:border-slate-600 hover:text-slate-100"
                >
                  {dict.profilePage.backHome}
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Profile Header */}
              <ProfileHeader
                profile={profileData.profile}
                stats={profileData.stats}
                isCurrentUser={isCurrentUser}
                locale={locale}
                dict={dict}
                onOpenEdit={() => setIsEditModalOpen(true)}
              />

              {/* Profile Tabs */}
              <ProfileTabs
                data={profileData}
                locale={locale}
                dict={dict}
              />

              {/* Edit Modal (if viewing own profile) */}
              {isCurrentUser && (
                <ProfileEditModal
                  profile={profileData.profile}
                  locale={locale}
                  dict={dict}
                  isOpen={isEditModalOpen}
                  onClose={() => setIsEditModalOpen(false)}
                />
              )}
            </div>
          )}
        </div>
      </main>

      <Footer locale={locale} dict={dict} />
    </div>
  );
}
