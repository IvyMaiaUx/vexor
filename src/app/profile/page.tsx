"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { useAuthStore } from "@/features/auth/use-auth-store";
import { useCatalogStore } from "@/features/catalog/use-catalog-store";
import { useForumStore } from "@/features/forum/use-forum-store";
import { calculateProfileStats, computeProfileBadges } from "@/features/profile/badges";
import { ProfileEditModal } from "@/features/profile/profile-edit-modal";
import { ProfileHeader } from "@/features/profile/profile-header";
import { ProfileTabs } from "@/features/profile/profile-tabs";
import type { ProfileViewData } from "@/features/profile/types";
import { getDictionary } from "@/lib/i18n/dictionaries";

export default function MyProfilePage() {
  const { user, isLoading, syncError, refreshSession } = useAuthStore();
  const { locale, setLocale, allResources } = useCatalogStore();
  const { topics, posts } = useForumStore();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const dict = useMemo(() => getDictionary(locale), [locale]);
  const isPt = locale === "pt-BR";

  const profileData: ProfileViewData | null = useMemo(() => {
    if (!user) return null;

    const { stats, userTopics, userPosts, userContributions } =
      calculateProfileStats(user, topics, posts, allResources);

    const badges = computeProfileBadges(user, stats);

    return {
      profile: user,
      isCurrentUser: true,
      stats,
      badges,
      topics: userTopics,
      replies: userPosts,
      contributions: userContributions,
    };
  }, [user, topics, posts, allResources]);

  const renderStatePanel = () => {
    if (isLoading && !user) {
      return (
        <div
          role="status"
          className="rounded-3xl border border-slate-800 bg-[#0d1322]/80 p-8 text-center sm:p-12"
        >
          <p className="font-mono text-sm text-cyan-300">
            {isPt ? "Carregando perfil..." : "Loading profile..."}
          </p>
        </div>
      );
    }

    if (syncError === "profile_missing") {
      return (
        <div
          role="alert"
          className="rounded-3xl border border-rose-500/30 bg-rose-500/10 p-8 text-center sm:p-12"
        >
          <h1 className="text-xl font-bold text-rose-200 sm:text-2xl">
            {isPt
              ? "Perfil não encontrado no banco de dados"
              : "Profile record missing"}
          </h1>
          <p className="mx-auto mt-2 max-w-md text-sm text-rose-200/80">
            {isPt
              ? "Sua conta está autenticada, mas o registro em public.profiles ainda não foi localizado. Tente sincronizar novamente."
              : "Your account is authenticated, but your public.profiles record was not found. Please retry syncing."}
          </p>
          <div className="mt-6 flex justify-center">
            <button
              type="button"
              onClick={() => void refreshSession()}
              className="rounded-xl bg-rose-500 px-5 py-2.5 text-xs font-bold text-slate-950 transition-colors hover:bg-rose-400"
            >
              {isPt ? "Tentar novamente" : "Retry"}
            </button>
          </div>
        </div>
      );
    }

    if (syncError === "connection_error" && !user) {
      return (
        <div
          role="alert"
          className="rounded-3xl border border-amber-500/30 bg-amber-500/10 p-8 text-center sm:p-12"
        >
          <h1 className="text-xl font-bold text-amber-200 sm:text-2xl">
            {isPt
              ? "Falha de conexão ao carregar perfil"
              : "Connection error loading profile"}
          </h1>
          <p className="mx-auto mt-2 max-w-md text-sm text-amber-200/80">
            {isPt
              ? "Não foi possível validar sua sessão com o servidor. Nenhum dado simulado foi exibido."
              : "Could not validate your session with the server. No simulated data was shown."}
          </p>
          <div className="mt-6 flex justify-center">
            <button
              type="button"
              onClick={() => void refreshSession()}
              className="rounded-xl bg-amber-500 px-5 py-2.5 text-xs font-bold text-slate-950 transition-colors hover:bg-amber-400"
            >
              {isPt ? "Tentar novamente" : "Retry"}
            </button>
          </div>
        </div>
      );
    }

    return (
      /* Unauthenticated Gate */
      <div className="rounded-3xl border border-amber-500/30 bg-amber-500/10 p-8 text-center sm:p-12">
        <span className="text-4xl" aria-hidden="true">
          🔒
        </span>
        <h1 className="mt-4 text-xl font-bold text-amber-200 sm:text-2xl">
          {dict.profilePage.authRequiredTitle}
        </h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-amber-300/80">
          {dict.profilePage.authRequiredDesc}
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link
            href="/login?next=/profile"
            className="rounded-xl bg-amber-500 px-5 py-2.5 text-xs font-bold text-slate-950 transition-colors hover:bg-amber-400"
          >
            {dict.profilePage.loginCta}
          </Link>
          <Link
            href="/register?next=/profile"
            className="rounded-xl border border-slate-700 bg-[#0d1322] px-5 py-2.5 text-xs font-semibold text-slate-300 transition-colors hover:border-slate-600 hover:text-slate-100"
          >
            {dict.profilePage.registerCta}
          </Link>
        </div>
      </div>
    );
  };

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
            <span aria-current="page" className="text-cyan-300">
              {dict.profilePage.title}
            </span>
          </nav>

          {!user || !profileData ? (
            renderStatePanel()
          ) : (
            <div className="space-y-8">
              {user.isSuspended && (
                <div
                  role="alert"
                  className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 font-mono text-xs text-rose-200"
                >
                  {isPt
                    ? "Conta suspensa: edição de perfil e ações de membro estão bloqueadas pelas políticas de segurança."
                    : "Account suspended: profile editing and member actions are blocked by security policies."}
                </div>
              )}

              {/* Profile Header Card */}
              <ProfileHeader
                profile={profileData.profile}
                stats={profileData.stats}
                isCurrentUser={true}
                locale={locale}
                dict={dict}
                onOpenEdit={() => setIsEditModalOpen(true)}
              />

              {/* Profile Tabs & Content */}
              <ProfileTabs
                data={profileData}
                locale={locale}
                dict={dict}
              />

              {/* Edit Profile Modal */}
              {!user.isSuspended && (
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
