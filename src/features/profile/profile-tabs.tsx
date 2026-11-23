"use client";

import Link from "next/link";
import { useState } from "react";
import type { SupportedLocale } from "@/config/site";
import { useAuthStore } from "@/features/auth/use-auth-store";
import { useCatalogStore } from "@/features/catalog/use-catalog-store";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type {
  ProfileTab,
  ProfileViewData,
} from "./types";

type ExtendedProfileTab = ProfileTab | "saved";

interface ProfileTabsProps {
  data: ProfileViewData;
  locale: SupportedLocale;
  dict: Dictionary;
}

export function ProfileTabs({ data, locale, dict }: ProfileTabsProps) {
  const [activeTab, setActiveTab] = useState<ExtendedProfileTab>("topics");
  const { signOut } = useAuthStore();
  const { bookmarkedSlugs, allResources } = useCatalogStore();
  const { profile, isCurrentUser, stats, badges, topics, replies, contributions } =
    data;

  const isPt = locale === "pt-BR";
  const savedResources = allResources.filter((r) =>
    bookmarkedSlugs.includes(r.slug)
  );

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="no-scrollbar flex overflow-x-auto border-b border-slate-800 pb-px">
        <nav className="flex w-full min-w-max gap-1" aria-label="Profile Tabs">
          <button
            type="button"
            onClick={() => setActiveTab("topics")}
            className={`flex min-h-[44px] flex-1 items-center justify-center gap-1.5 whitespace-nowrap border-b-2 px-4 text-sm font-medium transition-colors sm:flex-initial ${
              activeTab === "topics"
                ? "border-cyan-400 font-semibold text-cyan-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <span>Posts</span>
            <span className="rounded-full bg-slate-800 px-2 py-0.5 font-mono text-[10px] text-slate-300">
              {topics.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("contributions")}
            className={`flex min-h-[44px] flex-1 items-center justify-center gap-1.5 whitespace-nowrap border-b-2 px-4 text-sm font-medium transition-colors sm:flex-initial ${
              activeTab === "contributions"
                ? "border-cyan-400 font-semibold text-cyan-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <span>{isPt ? "Recursos" : "Resources"}</span>
            <span className="rounded-full bg-slate-800 px-2 py-0.5 font-mono text-[10px] text-slate-300">
              {contributions.length}
            </span>
          </button>

          {isCurrentUser && (
            <button
              type="button"
              onClick={() => setActiveTab("saved")}
              className={`flex min-h-[44px] flex-1 items-center justify-center gap-1.5 whitespace-nowrap border-b-2 px-4 text-sm font-medium transition-colors sm:flex-initial ${
                activeTab === "saved"
                  ? "border-cyan-400 font-semibold text-cyan-400"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              <span>{isPt ? "Salvos" : "Saved"}</span>
              <span className="rounded-full bg-slate-800 px-2 py-0.5 font-mono text-[10px] text-slate-300">
                {savedResources.length}
              </span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setActiveTab("overview")}
            className={`flex min-h-[44px] items-center justify-center whitespace-nowrap border-b-2 px-4 text-sm font-medium transition-colors ${
              activeTab === "overview"
                ? "border-cyan-400 font-semibold text-cyan-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            {dict.profilePage.tabs.overview}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("replies")}
            className={`flex min-h-[44px] items-center justify-center gap-1.5 whitespace-nowrap border-b-2 px-4 text-sm font-medium transition-colors ${
              activeTab === "replies"
                ? "border-cyan-400 font-semibold text-cyan-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <span>{dict.profilePage.tabs.replies}</span>
            <span className="rounded-full bg-slate-800 px-2 py-0.5 font-mono text-[10px] text-slate-300">
              {replies.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("badges")}
            className={`flex items-center gap-1.5 whitespace-nowrap border-b-2 px-4 py-3 font-mono text-xs font-semibold transition-colors ${
              activeTab === "badges"
                ? "border-cyan-400 text-cyan-300"
                : "border-transparent text-slate-400 hover:border-slate-700 hover:text-slate-200"
            }`}
          >
            <span>{dict.profilePage.tabs.badges}</span>
            <span className="rounded-full bg-cyan-950 px-2 py-0.5 text-[10px] text-cyan-300">
              {badges.filter((b) => b.isUnlocked).length}/{badges.length}
            </span>
          </button>

          {isCurrentUser && (
            <button
              type="button"
              onClick={() => setActiveTab("settings")}
              className={`whitespace-nowrap border-b-2 px-4 py-3 font-mono text-xs font-semibold transition-colors ${
                activeTab === "settings"
                  ? "border-cyan-400 text-cyan-300"
                  : "border-transparent text-slate-400 hover:border-slate-700 hover:text-slate-200"
              }`}
            >
              {dict.profilePage.tabs.settings}
            </button>
          )}
        </nav>
      </div>

      {/* 1. Overview Tab */}
      {activeTab === "overview" && (
        <div className="space-y-8">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <StatCard
              label={dict.profilePage.stats.reputation}
              value={stats.reputation}
              accent="text-cyan-300"
            />
            <StatCard
              label={dict.profilePage.stats.topics}
              value={stats.topicsCount}
              accent="text-slate-200"
            />
            <StatCard
              label={dict.profilePage.stats.replies}
              value={stats.repliesCount}
              accent="text-slate-200"
            />
            <StatCard
              label={dict.profilePage.stats.acceptedSolutions}
              value={stats.acceptedSolutionsCount}
              accent="text-emerald-400"
            />
            <StatCard
              label={dict.profilePage.stats.contributions}
              value={stats.contributionsCount}
              accent="text-amber-300"
            />
            <StatCard
              label={dict.profilePage.stats.upvotes}
              value={stats.upvotesReceived}
              accent="text-indigo-300"
            />
          </div>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            {/* Bio & Interests (col-span-2) */}
            <div className="space-y-6 lg:col-span-2">
              <div className="rounded-2xl border border-slate-800/90 bg-[#0d1322]/90 p-6">
                <h2 className="font-mono text-xs font-bold uppercase tracking-wider text-cyan-400">
                  {dict.profilePage.aboutTitle}
                </h2>
                {profile.bio ? (
                  <p className="mt-3 text-sm leading-relaxed text-slate-300">
                    {profile.bio}
                  </p>
                ) : (
                  <p className="mt-3 text-xs italic text-slate-500">
                    {dict.profilePage.bioEmpty}
                  </p>
                )}
              </div>

              {/* Technical Interests */}
              <div className="rounded-2xl border border-slate-800/90 bg-[#0d1322]/90 p-6">
                <h2 className="font-mono text-xs font-bold uppercase tracking-wider text-indigo-400">
                  {dict.profilePage.interestsTitle}
                </h2>
                {profile.interests && profile.interests.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {profile.interests.map((interest) => (
                      <span
                        key={interest}
                        className="rounded-lg border border-slate-700 bg-[#070b14] px-2.5 py-1 font-mono text-xs text-slate-300"
                      >
                        #{interest}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 text-xs italic text-slate-500">
                    {dict.profilePage.interestsEmpty}
                  </p>
                )}
              </div>

              {/* Recent Topics Snippet */}
              {topics.length > 0 && (
                <div className="rounded-2xl border border-slate-800/90 bg-[#0d1322]/90 p-6">
                  <div className="flex items-center justify-between">
                    <h2 className="font-mono text-xs font-bold uppercase tracking-wider text-slate-300">
                      Últimos Tópicos no Fórum
                    </h2>
                    <button
                      type="button"
                      onClick={() => setActiveTab("topics")}
                      className="font-mono text-xs text-cyan-400 hover:underline"
                    >
                      Ver todos ({topics.length}) →
                    </button>
                  </div>
                  <div className="mt-4 space-y-3">
                    {topics.slice(0, 3).map((topic) => (
                      <Link
                        key={topic.id}
                        href={`/forum/${topic.id}`}
                        className="block rounded-xl border border-slate-800/80 bg-[#070b14] p-3.5 transition-colors hover:border-cyan-500/40"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="text-sm font-medium text-slate-100 hover:text-cyan-300">
                            {isPt ? topic.title_pt : topic.title_en}
                          </h3>
                          <span className="shrink-0 font-mono text-xs text-cyan-400">
                            ▲ {topic.voteCount}
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar: Social Links & Top Badges */}
            <div className="space-y-6">
              {/* Professional Links */}
              <div className="rounded-2xl border border-slate-800/90 bg-[#0d1322]/90 p-6">
                <h2 className="font-mono text-xs font-bold uppercase tracking-wider text-slate-300">
                  {dict.profilePage.socialTitle}
                </h2>
                <div className="mt-4 space-y-2.5">
                  {profile.githubUrl ? (
                    <a
                      href={profile.githubUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 rounded-xl border border-slate-800 bg-[#070b14] px-3.5 py-2 text-xs font-medium text-slate-300 transition-colors hover:border-slate-700 hover:text-cyan-300"
                    >
                      <span className="font-mono font-bold text-slate-400">GH</span>
                      <span className="truncate">{profile.githubUrl.replace(/^https:\/\/(www\.)?github\.com\//, "")}</span>
                    </a>
                  ) : null}

                  {profile.linkedinUrl ? (
                    <a
                      href={profile.linkedinUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 rounded-xl border border-slate-800 bg-[#070b14] px-3.5 py-2 text-xs font-medium text-slate-300 transition-colors hover:border-slate-700 hover:text-cyan-300"
                    >
                      <span className="font-mono font-bold text-blue-400">IN</span>
                      <span className="truncate">{profile.linkedinUrl.replace(/^https:\/\/(www\.)?linkedin\.com\/(in|company)\//, "")}</span>
                    </a>
                  ) : null}

                  {!profile.githubUrl && !profile.linkedinUrl && (
                    <p className="text-xs italic text-slate-500">
                      {dict.profilePage.noSocial}
                    </p>
                  )}
                </div>
              </div>

              {/* Unlocked Badges Preview */}
              <div className="rounded-2xl border border-slate-800/90 bg-[#0d1322]/90 p-6">
                <div className="flex items-center justify-between">
                  <h2 className="font-mono text-xs font-bold uppercase tracking-wider text-slate-300">
                    Conquistas ({badges.filter((b) => b.isUnlocked).length})
                  </h2>
                  <button
                    type="button"
                    onClick={() => setActiveTab("badges")}
                    className="font-mono text-xs text-cyan-400 hover:underline"
                  >
                    Ver todas →
                  </button>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {badges
                    .filter((b) => b.isUnlocked)
                    .slice(0, 4)
                    .map((badge) => (
                      <span
                        key={badge.id}
                        title={isPt ? badge.description_pt : badge.description_en}
                        className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 font-mono text-xs font-medium ${badge.color}`}
                      >
                        <span>{badge.icon}</span>
                        <span>{isPt ? badge.name_pt : badge.name_en}</span>
                      </span>
                    ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Topics Tab */}
      {activeTab === "topics" && (
        <div className="space-y-4">
          {topics.length === 0 ? (
            <div className="rounded-2xl border border-slate-800 bg-[#0d1322]/50 p-8 text-center text-xs text-slate-500">
              {dict.profilePage.emptyStates.topics}
            </div>
          ) : (
            topics.map((topic) => (
              <article
                key={topic.id}
                className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-800/90 bg-[#0d1322]/90 p-5 transition-colors hover:border-slate-700 sm:flex-row sm:items-center"
              >
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded border border-indigo-500/30 bg-indigo-500/10 px-2 py-0.5 font-mono text-[11px] text-indigo-300">
                      {topic.categorySlug}
                    </span>
                    {topic.acceptedPostId && (
                      <span className="inline-flex items-center gap-1 rounded border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 font-mono text-[11px] text-emerald-300">
                        ✓ Solucionado
                      </span>
                    )}
                    <span className="font-mono text-xs text-slate-500">
                      {topic.createdAt.slice(0, 10)}
                    </span>
                  </div>

                  <h3 className="text-base font-semibold text-slate-100">
                    <Link
                      href={`/forum/${topic.id}`}
                      className="transition-colors hover:text-cyan-300"
                    >
                      {isPt ? topic.title_pt : topic.title_en}
                    </Link>
                  </h3>

                  <div className="flex flex-wrap gap-1.5">
                    {topic.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded border border-slate-800 bg-[#070b14] px-2 py-0.5 font-mono text-[11px] text-slate-400"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="rounded-lg border border-slate-800 bg-[#070b14] px-3 py-1 font-mono text-xs text-cyan-300">
                    ▲ {topic.voteCount} votos
                  </div>
                  <Link
                    href={`/forum/${topic.id}`}
                    className="rounded-xl border border-slate-700 bg-[#070b14] px-3.5 py-1.5 text-xs font-medium text-slate-300 hover:border-cyan-500 hover:text-cyan-300"
                  >
                    Ver Discussão
                  </Link>
                </div>
              </article>
            ))
          )}
        </div>
      )}

      {/* 3. Replies Tab */}
      {activeTab === "replies" && (
        <div className="space-y-4">
          {replies.length === 0 ? (
            <div className="rounded-2xl border border-slate-800 bg-[#0d1322]/50 p-8 text-center text-xs text-slate-500">
              {dict.profilePage.emptyStates.replies}
            </div>
          ) : (
            replies.map((reply) => (
              <div
                key={reply.id}
                className="space-y-3 rounded-2xl border border-slate-800/90 bg-[#0d1322]/90 p-5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-mono text-xs text-slate-400">
                    <span>Em resposta a:</span>
                    <Link
                      href={`/forum/${reply.topicId}`}
                      className="font-medium text-cyan-400 hover:underline"
                    >
                      {reply.topicTitle || reply.topicId}
                    </Link>
                  </div>
                  {reply.isAcceptedSolution && (
                    <span className="inline-flex items-center gap-1 rounded border border-emerald-500/40 bg-emerald-500/15 px-2.5 py-0.5 font-mono text-xs font-semibold text-emerald-300">
                      ✓ SOLUÇÃO ACEITA
                    </span>
                  )}
                </div>

                <p className="line-clamp-3 font-mono text-xs leading-relaxed text-slate-300">
                  {reply.body}
                </p>

                <div className="flex items-center justify-between border-t border-slate-800/80 pt-3 text-xs text-slate-500">
                  <span>{reply.createdAt.slice(0, 10)}</span>
                  <span className="font-mono text-cyan-300">
                    ▲ {reply.voteCount} votos
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* 4. Contributions Tab */}
      {activeTab === "contributions" && (
        <div className="space-y-4">
          {isCurrentUser && (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl border border-cyan-500/30 bg-cyan-950/20 p-4">
              <div className="space-y-0.5">
                <p className="font-semibold text-xs text-cyan-200">
                  Painel Integrado de Envios e Atividades
                </p>
                <p className="text-[11px] text-slate-400">
                  Acesse a central dedicada para visualizar justificativas de moderação e sua linha do tempo pessoal.
                </p>
              </div>
              <Link
                href="/my-contributions"
                className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-cyan-500 px-3.5 py-1.5 text-xs font-semibold text-slate-950 hover:bg-cyan-400"
              >
                <span>Acessar Painel</span>
                <span aria-hidden="true">→</span>
              </Link>
            </div>
          )}
          {contributions.length === 0 ? (
            <div className="rounded-2xl border border-slate-800 bg-[#0d1322]/50 p-8 text-center text-xs text-slate-500">
              {dict.profilePage.emptyStates.contributions}
            </div>
          ) : (
            contributions.map((item) => (
              <div
                key={item.slug}
                className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-800/90 bg-[#0d1322]/90 p-5 sm:flex-row sm:items-center"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded px-2 py-0.5 font-mono text-[10px] font-semibold uppercase ${
                        item.status === "pending"
                          ? "border border-amber-500/40 bg-amber-500/15 text-amber-300"
                          : "border border-emerald-500/40 bg-emerald-500/15 text-emerald-300"
                      }`}
                    >
                      {item.status === "pending" ? "EM ANÁLISE" : "APROVADO"}
                    </span>
                    <span className="font-mono text-xs text-slate-500">
                      {item.categorySlug} · {item.type}
                    </span>
                  </div>

                  <h3 className="text-base font-semibold text-slate-100">
                    {item.name}
                  </h3>

                  <p className="line-clamp-2 text-xs text-slate-400">
                    {isPt ? item.description_pt : item.description_en}
                  </p>
                </div>

                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex shrink-0 items-center gap-1 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-xs font-semibold text-cyan-300 hover:bg-cyan-500/20"
                >
                  <span>Acessar Recurso</span>
                  <span aria-hidden="true">↗</span>
                </a>
              </div>
            ))
          )}
        </div>
      )}

      {/* 5. Badges Tab */}
      {activeTab === "badges" && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {badges.map((badge) => (
            <div
              key={badge.id}
              className={`relative overflow-hidden rounded-2xl border p-5 transition-all ${
                badge.isUnlocked
                  ? "border-slate-800 bg-[#0d1322]/90 shadow-md"
                  : "border-slate-800/40 bg-[#0a0f1d]/40 opacity-60"
              }`}
            >
              <div className="flex items-start justify-between">
                <span className="text-3xl" aria-hidden="true">
                  {badge.icon}
                </span>
                <span
                  className={`rounded border px-2 py-0.5 font-mono text-[10px] font-semibold uppercase ${
                    badge.isUnlocked ? badge.color : "border-slate-800 text-slate-600"
                  }`}
                >
                  {badge.isUnlocked ? "CONQUISTADO" : "BLOQUEADO"}
                </span>
              </div>

              <h3 className="mt-3 text-base font-semibold text-slate-100">
                {isPt ? badge.name_pt : badge.name_en}
              </h3>

              <p className="mt-1 text-xs leading-relaxed text-slate-400">
                {isPt ? badge.description_pt : badge.description_en}
              </p>

              {badge.progress && !badge.isUnlocked && (
                <div className="mt-3">
                  <div className="flex justify-between font-mono text-[10px] text-slate-500">
                    <span>Progresso</span>
                    <span>
                      {badge.progress.current}/{badge.progress.required}
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                    <div
                      className="h-full bg-cyan-500"
                      style={{
                        width: `${Math.min(
                          100,
                          (badge.progress.current / badge.progress.required) * 100
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 6. Settings & Security Tab */}
      {activeTab === "settings" && isCurrentUser && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-800/90 bg-[#0d1322]/90 p-6 sm:p-8">
            <h2 className="text-lg font-bold text-slate-100">
              {dict.profilePage.settings.title}
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              {dict.profilePage.settings.accountSubtitle}
            </p>

            <div className="mt-6 space-y-4 border-t border-slate-800 pt-6">
              <div>
                <label className="block font-mono text-xs font-semibold uppercase text-slate-400">
                  {dict.profilePage.settings.emailLabel}
                </label>
                <div className="mt-1 flex items-center gap-3">
                  <span className="font-mono text-sm text-slate-200">
                    {profile.email}
                  </span>
                  <span className="rounded bg-slate-800 px-2 py-0.5 font-mono text-[10px] text-slate-400">
                    Privado
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  {dict.profilePage.settings.emailHint}
                </p>
              </div>

              <div>
                <label className="block font-mono text-xs font-semibold uppercase text-slate-400">
                  {dict.profilePage.settings.roleLabel}
                </label>
                <div className="mt-1">
                  <span className="font-mono text-sm font-semibold uppercase text-cyan-300">
                    {profile.role}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  {dict.profilePage.settings.roleHint}
                </p>
              </div>

              <div>
                <label className="block font-mono text-xs font-semibold uppercase text-slate-400">
                  {dict.profilePage.settings.statusLabel}
                </label>
                <div className="mt-1">
                  <span
                    className={`font-mono text-sm font-semibold ${
                      profile.isSuspended ? "text-rose-400" : "text-emerald-400"
                    }`}
                  >
                    {profile.isSuspended
                      ? dict.profilePage.settings.suspendedStatus
                      : dict.profilePage.settings.activeStatus}
                  </span>
                </div>
              </div>

              <div className="rounded-xl border border-slate-800 bg-[#070b14] p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-slate-200">
                      {dict.profilePage.settings.mfaTitle}
                    </h3>
                    <p className="mt-0.5 text-xs text-slate-400">
                      {dict.profilePage.settings.mfaSubtitle}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 flex justify-end border-t border-slate-800 pt-6">
              <button
                type="button"
                onClick={signOut}
                className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-5 py-2.5 font-mono text-xs font-semibold text-rose-300 transition-colors hover:bg-rose-500/20"
              >
                {dict.profilePage.settings.signOutButton}
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === "saved" && isCurrentUser && (
        <div className="space-y-3">
          {savedResources.length === 0 ? (
            <div className="rounded-2xl border border-slate-800/80 bg-[#0d1322]/70 p-8 text-center">
              <p className="text-sm text-slate-300">
                {isPt
                  ? "Você ainda não salvou recursos nos favoritos."
                  : "You have not bookmarked any resources yet."}
              </p>
              <Link
                href="/catalog"
                className="mt-4 inline-flex min-h-[44px] items-center rounded-xl bg-cyan-500 px-5 text-sm font-semibold text-slate-950 hover:bg-cyan-400"
              >
                {isPt ? "Explorar catálogo" : "Explore catalog"}
              </Link>
            </div>
          ) : (
            savedResources.map((res) => (
              <Link
                key={res.slug}
                href={`/catalog/${res.slug}`}
                className="flex items-center justify-between gap-3 rounded-2xl border border-slate-800/90 bg-[#0d1322]/90 p-4 transition-colors hover:border-cyan-500/40"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-100">
                    {res.name}
                  </p>
                  <p className="mt-1 line-clamp-2 text-xs text-slate-400">
                    {isPt ? res.description_pt : res.description_en}
                  </p>
                </div>
                <span className="shrink-0 font-mono text-xs font-semibold text-cyan-400">
                  {dict.catalogSection.viewDetails} →
                </span>
              </Link>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-800/90 bg-[#0d1322]/90 p-4">
      <span className="block font-mono text-[11px] font-medium uppercase tracking-wider text-slate-400">
        {label}
      </span>
      <span className={`mt-1 block font-mono text-2xl font-bold ${accent}`}>
        {value}
      </span>
    </div>
  );
}
