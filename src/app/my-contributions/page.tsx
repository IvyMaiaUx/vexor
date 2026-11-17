"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { FeaturedResourceItem } from "@/config/site";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { useActivityStore } from "@/features/activity/use-activity-store";
import { useAuthStore } from "@/features/auth/use-auth-store";
import { useCatalogStore } from "@/features/catalog/use-catalog-store";
import { useForumStore } from "@/features/forum/use-forum-store";
import { calculateProfileStats } from "@/features/profile/badges";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { researchService } from "@/features/cybercrime-research/services/research-service";
import type {
  ResearchSubmissionDetail,
  ResearchSubmissionSummary,
} from "@/features/cybercrime-research/types";
import { ResearchSubmitModal } from "@/features/cybercrime-research/components/research-submit-modal";

export default function MyContributionsPage() {
  const { user } = useAuthStore();
  const { locale, setLocale, allResources } = useCatalogStore();
  const { topics, posts } = useForumStore();
  const { activities, clearActivities, removeActivity } = useActivityStore();

  const dict = useMemo(() => getDictionary(locale), [locale]);
  const isPt = locale === "pt-BR";

  // Stable timestamp for pure render computations
  const [mountedAt] = useState(() => Date.now());

  // Navigation tabs
  const [activeTab, setActiveTab] = useState<
    "overview" | "contributions" | "activities"
  >("overview");

  // Sub-tabs in "contributions"
  const [contribSubTab, setContribSubTab] = useState<
    "catalog" | "topics" | "replies" | "research"
  >("catalog");
  const [researchReloadKey, setResearchReloadKey] = useState(0);
  const [resubmitFeedback, setResubmitFeedback] = useState<string | null>(null);

  // Filters for Catalog Submissions
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  // Filters for Activities Timeline
  const [activityCategoryFilter, setActivityCategoryFilter] =
    useState<string>("all");
  const [activityPeriodFilter, setActivityPeriodFilter] =
    useState<string>("all");

  // Confirmation dialog state for clearing timeline
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Compute user contributions and stats
  const { stats, userTopics, userPosts, userContributions } = useMemo(() => {
    if (!user) {
      return {
        stats: {
          reputation: 0,
          topicsCount: 0,
          repliesCount: 0,
          acceptedSolutionsCount: 0,
          contributionsCount: 0,
          upvotesReceived: 0,
        },
        userTopics: [],
        userPosts: [],
        userContributions: [],
      };
    }
    return calculateProfileStats(user, topics, posts, allResources);
  }, [user, topics, posts, allResources]);

  const [loadedResearchSubmissions, setLoadedResearchSubmissions] = useState<
    ResearchSubmissionSummary[]
  >([]);
  const userResearchSubmissions = user ? loadedResearchSubmissions : [];
  const [editingResearch, setEditingResearch] =
    useState<ResearchSubmissionDetail | null>(null);
  const [isResearchModalOpen, setIsResearchModalOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    let active = true;
    void researchService.listSubmissions({ scope: "mine" }, 1, 50).then((res) => {
      if (!active) return;
      if (res.success && res.data) {
        setLoadedResearchSubmissions(res.data.items);
      } else {
        setLoadedResearchSubmissions([]);
      }
    });
    return () => {
      active = false;
    };
  }, [user, researchReloadKey]);

  // Enriched sample contributions for demonstration if the user has few
  const sampleItems: FeaturedResourceItem[] = useMemo(() => {
    if (!user) return [];
    return [
      {
        slug: "sysmon-modular-config",
        name: "Sysmon Modular Configuration",
        description_pt:
          "Configuração modular do Sysmon para caçadores de ameaças e analistas de SOC cobrindo o framework MITRE ATT&CK.",
        description_en:
          "Modular Sysmon configuration for threat hunters and SOC analysts aligned with MITRE ATT&CK.",
        categorySlug: "blue-team",
        type: "repository",
        url: "https://github.com/olafhartong/sysmon-modular",
        language: "pt-BR",
        difficulty: "intermediate",
        authorName: `@${user.username}`,
        publishedAt: "2026-10-18T10:00:00Z",
        status: "approved",
      },
      {
        slug: "sigma-windows-triage",
        name: "Sigma Windows Event Log Triage Tool",
        description_pt:
          "Script em Python para triagem rápida de logs de segurança em servidores Active Directory.",
        description_en:
          "Python script for rapid security log triage on Active Directory domain controllers.",
        categorySlug: "dfir",
        type: "script",
        url: "https://github.com/SigmaHQ/sigma",
        language: "en",
        difficulty: "advanced",
        authorName: `@${user.username}`,
        publishedAt: "2026-11-02T14:30:00Z",
        status: "pending",
      },
      {
        slug: "unverified-pentest-tool",
        name: "Automated Recon Framework (v0.1)",
        description_pt:
          "Framework de automação de reconhecimento para enumeração de subdomínios.",
        description_en:
          "Automated reconnaissance framework for subdomain enumeration.",
        categorySlug: "tools",
        type: "tool",
        url: "https://github.com/broken-link-sample/recon",
        language: "en",
        difficulty: "beginner",
        authorName: `@${user.username}`,
        publishedAt: "2026-10-22T08:00:00Z",
        status: "rejected",
        rejectionReason: isPt
          ? "O repositório oficial informado retornou erro 404 (não encontrado) e não continha documentação defensiva clara. Por favor, valide o link e envie novamente."
          : "The repository URL returned HTTP 404 and lacked verifiable documentation. Please verify the URL and submit again.",
      },
    ];
  }, [user, isPt]);

  // Combined catalog items (real user contributions + sample demonstration items)
  const allUserCatalogItems = useMemo(() => {
    const combined = [...userContributions];
    // Merge samples if not already present
    for (const sample of sampleItems) {
      if (!combined.some((item) => item.slug === sample.slug)) {
        combined.push(sample);
      }
    }
    return combined;
  }, [userContributions, sampleItems]);

  // Filtered catalog submissions
  const filteredCatalogItems = useMemo(() => {
    return allUserCatalogItems.filter((item) => {
      const matchesStatus =
        statusFilter === "all" || (item.status || "approved") === statusFilter;
      const matchesType = typeFilter === "all" || item.type === typeFilter;
      return matchesStatus && matchesType;
    });
  }, [allUserCatalogItems, statusFilter, typeFilter]);

  // Filtered activities timeline
  const filteredActivities = useMemo(() => {
    const oneDay = 24 * 60 * 60 * 1000;
    const oneWeek = 7 * oneDay;
    const oneMonth = 30 * oneDay;

    return activities.filter((act) => {
      const matchesCat =
        activityCategoryFilter === "all" ||
        act.category === activityCategoryFilter;

      if (!matchesCat) return false;

      const actTime = new Date(act.timestamp).getTime();
      const diff = mountedAt - actTime;

      if (activityPeriodFilter === "today") return diff <= oneDay;
      if (activityPeriodFilter === "week") return diff <= oneWeek;
      if (activityPeriodFilter === "month") return diff <= oneMonth;
      return true;
    });
  }, [activities, activityCategoryFilter, activityPeriodFilter, mountedAt]);

  // Contribution counts
  const totalCatalog = allUserCatalogItems.length;
  const approvedCount = allUserCatalogItems.filter(
    (i) => !i.status || i.status === "approved"
  ).length;
  const pendingCount = allUserCatalogItems.filter(
    (i) => i.status === "pending"
  ).length;
  const rejectedCount = allUserCatalogItems.filter(
    (i) => i.status === "rejected"
  ).length;
  const approvalRate =
    totalCatalog > 0 ? Math.round((approvedCount / totalCatalog) * 100) : 100;

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
              href="/profile"
              className="transition-colors hover:text-cyan-400 focus:outline-none focus-visible:text-cyan-400"
            >
              {dict.nav.myProfile}
            </Link>
            <span aria-hidden="true" className="text-slate-600">
              /
            </span>
            <span aria-current="page" className="text-cyan-300">
              {dict.myContributionsPage.title}
            </span>
          </nav>

          {!user ? (
            /* Auth Gate for unauthenticated visitors */
            <div className="rounded-3xl border border-amber-500/30 bg-amber-500/10 p-8 text-center sm:p-12">
              <span className="text-4xl" aria-hidden="true">
                🔒
              </span>
              <h1 className="mt-4 text-xl font-bold text-amber-200 sm:text-2xl">
                {dict.myContributionsPage.authRequiredTitle}
              </h1>
              <p className="mx-auto mt-2 max-w-md text-sm text-amber-300/80">
                {dict.myContributionsPage.authRequiredDesc}
              </p>
              <div className="mt-6 flex justify-center gap-3">
                <Link
                  href="/login?next=/my-contributions"
                  className="rounded-xl bg-amber-500 px-5 py-2.5 text-xs font-bold text-slate-950 transition-colors hover:bg-amber-400"
                >
                  {dict.auth.signInLink}
                </Link>
                <Link
                  href="/register?next=/my-contributions"
                  className="rounded-xl border border-slate-700 bg-[#0d1322] px-5 py-2.5 text-xs font-semibold text-slate-300 transition-colors hover:border-slate-600 hover:text-slate-100"
                >
                  {dict.auth.createAccountLink}
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Top Banner Card */}
              <div className="relative overflow-hidden rounded-3xl border border-slate-800/90 bg-[#0d1322]/90 p-6 sm:p-8">
                <div
                  className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-cyan-500/10 blur-3xl"
                  aria-hidden="true"
                />
                <div
                  className="pointer-events-none absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl"
                  aria-hidden="true"
                />

                <div className="relative z-10 flex flex-col justify-between gap-6 sm:flex-row sm:items-center">
                  <div className="space-y-2">
                    <span className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 font-mono text-[11px] font-semibold uppercase tracking-widest text-cyan-300">
                      <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                      {dict.myContributionsPage.eyebrow}
                    </span>

                    <h1 className="text-2xl font-bold tracking-tight text-slate-100 sm:text-3xl">
                      {dict.myContributionsPage.title}
                    </h1>

                    <p className="max-w-2xl text-xs leading-relaxed text-slate-400 sm:text-sm">
                      {dict.myContributionsPage.subtitle}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <Link
                      href="/catalog/submit"
                      className="rounded-xl bg-cyan-500 px-4 py-2.5 text-xs font-semibold text-slate-950 shadow-[0_0_20px_rgba(6,182,212,0.3)] transition-colors hover:bg-cyan-400"
                    >
                      {dict.myContributionsPage.quickActions.submitResource}
                    </Link>
                    <Link
                      href="/forum/new"
                      className="rounded-xl border border-indigo-500/40 bg-indigo-500/15 px-4 py-2.5 text-xs font-semibold text-indigo-200 transition-colors hover:bg-indigo-500/25"
                    >
                      {dict.myContributionsPage.quickActions.createTopic}
                    </Link>
                  </div>
                </div>
              </div>

              {/* Main Tab Navigation */}
              <div className="no-scrollbar flex overflow-x-auto border-b border-slate-800 pb-px">
                <nav className="flex space-x-2" aria-label="Sections">
                  <button
                    type="button"
                    onClick={() => setActiveTab("overview")}
                    className={`whitespace-nowrap border-b-2 px-4 py-3 font-mono text-xs font-semibold transition-colors ${
                      activeTab === "overview"
                        ? "border-cyan-400 text-cyan-300"
                        : "border-transparent text-slate-400 hover:border-slate-700 hover:text-slate-200"
                    }`}
                  >
                    {dict.myContributionsPage.tabs.overview}
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab("contributions")}
                    className={`flex items-center gap-1.5 whitespace-nowrap border-b-2 px-4 py-3 font-mono text-xs font-semibold transition-colors ${
                      activeTab === "contributions"
                        ? "border-cyan-400 text-cyan-300"
                        : "border-transparent text-slate-400 hover:border-slate-700 hover:text-slate-200"
                    }`}
                  >
                    <span>{dict.myContributionsPage.tabs.contributions}</span>
                    <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] text-slate-300">
                      {totalCatalog + userTopics.length + userPosts.length}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab("activities")}
                    className={`flex items-center gap-1.5 whitespace-nowrap border-b-2 px-4 py-3 font-mono text-xs font-semibold transition-colors ${
                      activeTab === "activities"
                        ? "border-cyan-400 text-cyan-300"
                        : "border-transparent text-slate-400 hover:border-slate-700 hover:text-slate-200"
                    }`}
                  >
                    <span>{dict.myContributionsPage.tabs.activities}</span>
                    <span className="rounded-full bg-cyan-950 px-2 py-0.5 text-[10px] text-cyan-300">
                      {activities.length}
                    </span>
                  </button>
                </nav>
              </div>

              {/* 1. VISÃO GERAL (OVERVIEW) */}
              {activeTab === "overview" && (
                <div className="space-y-8">
                  {/* Top metrics grid */}
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
                    <MetricCard
                      label={dict.myContributionsPage.stats.totalSubmitted}
                      value={totalCatalog}
                      accent="text-slate-100"
                    />
                    <MetricCard
                      label={dict.myContributionsPage.stats.approved}
                      value={approvedCount}
                      accent="text-emerald-400"
                    />
                    <MetricCard
                      label={dict.myContributionsPage.stats.pending}
                      value={pendingCount}
                      accent="text-amber-400"
                    />
                    <MetricCard
                      label={dict.myContributionsPage.stats.rejected}
                      value={rejectedCount}
                      accent="text-rose-400"
                    />
                    <MetricCard
                      label={dict.myContributionsPage.stats.approvalRate}
                      value={`${approvalRate}%`}
                      accent="text-cyan-400"
                    />
                    <MetricCard
                      label={dict.myContributionsPage.stats.forumTopics}
                      value={userTopics.length}
                      accent="text-indigo-300"
                    />
                    <MetricCard
                      label={dict.myContributionsPage.stats.acceptedSolutions}
                      value={stats.acceptedSolutionsCount}
                      accent="text-emerald-300"
                    />
                    <MetricCard
                      label={dict.myContributionsPage.stats.vexorScore}
                      value={stats.reputation}
                      accent="text-cyan-300"
                    />
                  </div>

                  {/* Summary Columns */}
                  <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
                    {/* Catalog Submissions Preview */}
                    <div className="rounded-2xl border border-slate-800/90 bg-[#0d1322]/90 p-6">
                      <div className="flex items-center justify-between">
                        <h2 className="font-mono text-xs font-bold uppercase tracking-wider text-cyan-400">
                          {dict.myContributionsPage.subTabs.catalogResources} ({totalCatalog})
                        </h2>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveTab("contributions");
                            setContribSubTab("catalog");
                          }}
                          className="font-mono text-xs text-cyan-400 hover:underline"
                        >
                          Ver todos →
                        </button>
                      </div>

                      <div className="mt-4 space-y-3">
                        {allUserCatalogItems.slice(0, 3).map((item) => (
                          <div
                            key={item.slug}
                            className="flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-[#070b14] p-3.5"
                          >
                            <div className="min-w-0 space-y-1">
                              <div className="flex items-center gap-2">
                                <StatusBadge status={item.status || "approved"} />
                                <span className="font-mono text-[11px] text-slate-500">
                                  {item.categorySlug}
                                </span>
                              </div>
                              <h3 className="truncate text-sm font-medium text-slate-200">
                                {item.name}
                              </h3>
                            </div>
                            <a
                              href={item.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="shrink-0 text-xs text-cyan-400 hover:underline"
                            >
                              Link ↗
                            </a>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Timeline Activity Snippet */}
                    <div className="rounded-2xl border border-slate-800/90 bg-[#0d1322]/90 p-6">
                      <div className="flex items-center justify-between">
                        <h2 className="font-mono text-xs font-bold uppercase tracking-wider text-indigo-400">
                          {dict.myContributionsPage.timelineTitle}
                        </h2>
                        <button
                          type="button"
                          onClick={() => setActiveTab("activities")}
                          className="font-mono text-xs text-indigo-400 hover:underline"
                        >
                          Abrir Timeline →
                        </button>
                      </div>

                      <div className="mt-4 space-y-3">
                        {activities.slice(0, 3).map((act) => (
                          <div
                            key={act.id}
                            className="flex items-start gap-3 rounded-xl border border-slate-800 bg-[#070b14] p-3.5"
                          >
                            <span className="text-xl" aria-hidden="true">
                              {act.icon}
                            </span>
                            <div className="min-w-0 flex-1 space-y-0.5">
                              <p className="text-xs font-semibold text-slate-200">
                                {isPt ? act.title_pt : act.title_en}
                              </p>
                              {act.detail_pt && (
                                <p className="truncate text-[11px] text-slate-400">
                                  {isPt ? act.detail_pt : act.detail_en}
                                </p>
                              )}
                              <p className="font-mono text-[10px] text-slate-500">
                                {new Date(act.timestamp).toLocaleDateString(
                                  isPt ? "pt-BR" : "en-US",
                                  { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }
                                )}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 2. MINHAS CONTRIBUIÇÕES (CONTRIBUTIONS) */}
              {activeTab === "contributions" && (
                <div className="space-y-6">
                  {/* Segmented controls for contribution types */}
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex rounded-xl border border-slate-800 bg-[#0d1322] p-1">
                      <button
                        type="button"
                        onClick={() => setContribSubTab("catalog")}
                        className={`rounded-lg px-3.5 py-1.5 font-mono text-xs font-semibold transition-colors ${
                          contribSubTab === "catalog"
                            ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                            : "text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        {dict.myContributionsPage.subTabs.catalogResources} (
                        {allUserCatalogItems.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setContribSubTab("topics")}
                        className={`rounded-lg px-3.5 py-1.5 font-mono text-xs font-semibold transition-colors ${
                          contribSubTab === "topics"
                            ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                            : "text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        {dict.myContributionsPage.subTabs.forumTopics} (
                        {userTopics.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setContribSubTab("replies")}
                        className={`rounded-lg px-3.5 py-1.5 font-mono text-xs font-semibold transition-colors ${
                          contribSubTab === "replies"
                            ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                            : "text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        {dict.myContributionsPage.subTabs.forumReplies} (
                        {userPosts.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setContribSubTab("research")}
                        className={`rounded-lg px-3.5 py-1.5 font-mono text-xs font-semibold transition-colors ${
                          contribSubTab === "research"
                            ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                            : "text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        {isPt ? "Pesquisas (Cybercrime)" : "Research Papers"} (
                        {userResearchSubmissions.length})
                      </button>
                    </div>

                    {/* Status & Type filters (for catalog) */}
                    {contribSubTab === "catalog" && (
                      <div className="flex flex-wrap items-center gap-2">
                        <select
                          value={statusFilter}
                          onChange={(e) => setStatusFilter(e.target.value)}
                          className="rounded-xl border border-slate-800 bg-[#0d1322] px-3 py-1.5 font-mono text-xs text-slate-200 focus:border-cyan-500 focus:outline-none"
                        >
                          <option value="all">
                            {dict.myContributionsPage.filters.allStatuses}
                          </option>
                          <option value="approved">
                            {dict.myContributionsPage.filters.approved}
                          </option>
                          <option value="pending">
                            {dict.myContributionsPage.filters.pending}
                          </option>
                          <option value="rejected">
                            {dict.myContributionsPage.filters.rejected}
                          </option>
                        </select>

                        <select
                          value={typeFilter}
                          onChange={(e) => setTypeFilter(e.target.value)}
                          className="rounded-xl border border-slate-800 bg-[#0d1322] px-3 py-1.5 font-mono text-xs text-slate-200 focus:border-cyan-500 focus:outline-none"
                        >
                          <option value="all">
                            {dict.myContributionsPage.filters.allTypes}
                          </option>
                          <option value="tool">Ferramenta / Tool</option>
                          <option value="repository">Repositório / Repo</option>
                          <option value="script">Script</option>
                          <option value="framework">Framework</option>
                        </select>
                      </div>
                    )}
                  </div>

                  {/* Sub-tab 1: Catalog Resources */}
                  {contribSubTab === "catalog" && (
                    <div className="space-y-4">
                      {filteredCatalogItems.length === 0 ? (
                        <div className="rounded-2xl border border-slate-800 bg-[#0d1322]/50 p-10 text-center">
                          <p className="text-xs text-slate-400">
                            {dict.myContributionsPage.emptyStates.catalog}
                          </p>
                          <Link
                            href="/catalog/submit"
                            className="mt-4 inline-flex items-center gap-1 rounded-xl bg-cyan-500 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-cyan-400"
                          >
                            {dict.myContributionsPage.quickActions.submitResource}
                          </Link>
                        </div>
                      ) : (
                        filteredCatalogItems.map((item) => (
                          <div
                            key={item.slug}
                            className="rounded-2xl border border-slate-800/90 bg-[#0d1322]/90 p-5 sm:p-6"
                          >
                            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                              <div className="space-y-2">
                                <div className="flex flex-wrap items-center gap-2">
                                  <StatusBadge status={item.status || "approved"} />
                                  <span className="rounded border border-indigo-500/30 bg-indigo-500/10 px-2 py-0.5 font-mono text-[11px] text-indigo-300">
                                    {item.categorySlug}
                                  </span>
                                  <span className="font-mono text-xs text-slate-500">
                                    {item.type} · {item.language}
                                  </span>
                                </div>

                                <h3 className="text-base font-semibold text-slate-100 sm:text-lg">
                                  {item.name}
                                </h3>

                                <p className="text-xs leading-relaxed text-slate-300 sm:text-sm">
                                  {isPt ? item.description_pt : item.description_en}
                                </p>
                              </div>

                              <a
                                href={item.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-xs font-semibold text-cyan-300 hover:bg-cyan-500/20"
                              >
                                <span>Acessar</span>
                                <span aria-hidden="true">↗</span>
                              </a>
                            </div>

                            {/* Moderation Rejection Feedback Box */}
                            {item.status === "rejected" && item.rejectionReason && (
                              <div className="mt-4 rounded-xl border border-rose-500/40 bg-rose-950/20 p-4 text-xs">
                                <div className="flex items-start gap-2">
                                  <span className="text-sm text-rose-400">⚠️</span>
                                  <div className="space-y-1">
                                    <p className="font-mono font-bold uppercase text-rose-300">
                                      {dict.myContributionsPage.rejectionReasonLabel}
                                    </p>
                                    <p className="leading-relaxed text-rose-200/90">
                                      {item.rejectionReason}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {/* Sub-tab 2: Forum Topics */}
                  {contribSubTab === "topics" && (
                    <div className="space-y-4">
                      {userTopics.length === 0 ? (
                        <div className="rounded-2xl border border-slate-800 bg-[#0d1322]/50 p-10 text-center">
                          <p className="text-xs text-slate-400">
                            {dict.myContributionsPage.emptyStates.topics}
                          </p>
                          <Link
                            href="/forum/new"
                            className="mt-4 inline-flex items-center gap-1 rounded-xl bg-indigo-500 px-4 py-2 text-xs font-semibold text-slate-100 hover:bg-indigo-400"
                          >
                            {dict.myContributionsPage.quickActions.createTopic}
                          </Link>
                        </div>
                      ) : (
                        userTopics.map((topic) => (
                          <div
                            key={topic.id}
                            className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-800/90 bg-[#0d1322]/90 p-5 sm:flex-row sm:items-center"
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
                                Ver Tópico
                              </Link>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {/* Sub-tab 3: Forum Replies */}
                  {contribSubTab === "replies" && (
                    <div className="space-y-4">
                      {userPosts.length === 0 ? (
                        <div className="rounded-2xl border border-slate-800 bg-[#0d1322]/50 p-10 text-center">
                          <p className="text-xs text-slate-400">
                            {dict.myContributionsPage.emptyStates.replies}
                          </p>
                          <Link
                            href="/forum"
                            className="mt-4 inline-flex items-center gap-1 rounded-xl bg-cyan-500 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-cyan-400"
                          >
                            Explorar Fórum
                          </Link>
                        </div>
                      ) : (
                        userPosts.map((reply) => (
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

                  {/* Sub-tab 4: Cybercrime Research */}
                  {contribSubTab === "research" && (
                    <div className="space-y-4">
                      {resubmitFeedback && (
                        <div className="rounded-xl border border-cyan-500/40 bg-cyan-500/10 p-3 text-xs text-cyan-300">
                          {resubmitFeedback}
                        </div>
                      )}

                      {userResearchSubmissions.length === 0 ? (
                        <div className="rounded-2xl border border-slate-800 bg-[#0d1322]/50 p-10 text-center space-y-3">
                          <p className="text-xs text-slate-400">
                            {isPt
                              ? "Você ainda não submeteu nenhum relatório de Cybercrime Research."
                              : "You haven't submitted any Cybercrime Research papers yet."}
                          </p>
                          <Link
                            href="/cybercrime-research"
                            className="inline-flex items-center gap-1 rounded-xl bg-cyan-500 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-cyan-400"
                          >
                            {isPt ? "Explorar Área de Pesquisa" : "Explore Research Area"}
                          </Link>
                        </div>
                      ) : (
                        userResearchSubmissions.map((sub) => {
                          const statusBadge =
                            sub.status === "approved"
                              ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-300"
                              : sub.status === "rejected"
                              ? "border-rose-500/40 bg-rose-500/15 text-rose-300"
                              : "border-amber-500/40 bg-amber-500/15 text-amber-300";

                          const statusLabel =
                            sub.status === "approved"
                              ? isPt ? "Aprovado & Publicado" : "Approved & Published"
                              : sub.status === "rejected"
                              ? isPt ? "Rejeitado" : "Rejected"
                              : isPt ? "Aguardando Moderação" : "Pending Review";

                          return (
                            <div
                              key={sub.id}
                              className="space-y-3 rounded-2xl border border-slate-800/90 bg-[#0d1322]/90 p-5"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                                <div className="flex items-center gap-2">
                                  <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 font-mono text-[10px] font-semibold ${statusBadge}`}>
                                    {statusLabel}
                                  </span>
                                  <span className="rounded bg-slate-800 px-2 py-0.5 font-mono text-[10px] text-cyan-300 uppercase">
                                    {sub.domain}
                                  </span>
                                </div>
                                <span className="font-mono text-xs text-slate-500">
                                  {sub.createdAt.slice(0, 10)}
                                </span>
                              </div>

                              <div>
                                <h4 className="text-base font-bold text-slate-100">
                                  {isPt ? sub.titlePt : sub.titleEn || sub.titlePt}
                                </h4>
                                <p className="mt-1 text-xs text-slate-400 line-clamp-2 leading-relaxed">
                                  {isPt ? sub.summaryPt : sub.summaryEn || sub.summaryPt}
                                </p>
                              </div>

                              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/60 text-xs font-mono">
                                <div className="flex items-center gap-2 text-slate-400 text-[11px]">
                                  <span>{sub.severity.toUpperCase()}</span>
                                  <span>•</span>
                                  <span>TLP:{sub.tlp}</span>
                                </div>

                                {(sub.status === "rejected" || sub.status === "pending") && (
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      const detailRes = await researchService.getSubmissionDetail(
                                        sub.id
                                      );
                                      if (!detailRes.success || !detailRes.data) {
                                        setResubmitFeedback(
                                          detailRes.error ||
                                            (isPt
                                              ? "Não foi possível carregar os detalhes da pesquisa."
                                              : "Unable to load research details.")
                                        );
                                        return;
                                      }
                                      // Edit pending or invoke researchService.resubmitResearch via ResearchSubmitModal
                                      setEditingResearch(detailRes.data.item);
                                      setIsResearchModalOpen(true);
                                    }}
                                    className="rounded-lg bg-cyan-500/20 border border-cyan-500/40 px-3 py-1 font-mono text-xs font-semibold text-cyan-200 hover:bg-cyan-500/30 transition-colors"
                                  >
                                    {sub.status === "rejected"
                                      ? `🔄 ${isPt ? "Editar e Reenviar" : "Edit & Resubmit"}`
                                      : `✏️ ${isPt ? "Editar Pendente" : "Edit Pending"}`}
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* 3. MINHAS ATIVIDADES (TIMELINE) */}
              {activeTab === "activities" && (
                <div className="space-y-6">
                  {/* Informational and Privacy Cards */}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="rounded-2xl border border-cyan-500/30 bg-[#0d1322]/90 p-4 text-xs text-cyan-200">
                      <p className="font-semibold">{dict.myContributionsPage.timelinePrivacyNote}</p>
                    </div>
                    <div className="rounded-2xl border border-slate-800 bg-[#070b14] p-4 text-xs text-slate-400">
                      <p>{dict.myContributionsPage.timelineAuditNote}</p>
                    </div>
                  </div>

                  {/* Activity Filters and Actions */}
                  <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-800/90 bg-[#0d1322]/90 p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-semibold text-slate-400">
                        Filtrar:
                      </span>
                      {(
                        [
                          ["all", dict.myContributionsPage.filters.allActivities],
                          ["catalog", dict.myContributionsPage.filters.catalog],
                          ["forum", dict.myContributionsPage.filters.forum],
                          ["bookmarks", dict.myContributionsPage.filters.bookmarks],
                          ["profile", dict.myContributionsPage.filters.profile],
                        ] as const
                      ).map(([catKey, catLabel]) => (
                        <button
                          key={catKey}
                          type="button"
                          onClick={() => setActivityCategoryFilter(catKey)}
                          className={`rounded-lg px-2.5 py-1 font-mono text-xs font-medium transition-colors ${
                            activityCategoryFilter === catKey
                              ? "border border-cyan-500/40 bg-cyan-500/20 text-cyan-300"
                              : "border border-slate-800 bg-[#070b14] text-slate-400 hover:text-slate-200"
                          }`}
                        >
                          {catLabel}
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center gap-3">
                      <select
                        value={activityPeriodFilter}
                        onChange={(e) => setActivityPeriodFilter(e.target.value)}
                        className="rounded-xl border border-slate-800 bg-[#070b14] px-3 py-1.5 font-mono text-xs text-slate-200 focus:border-cyan-500 focus:outline-none"
                      >
                        <option value="all">
                          {dict.myContributionsPage.filters.periodAll}
                        </option>
                        <option value="today">
                          {dict.myContributionsPage.filters.periodToday}
                        </option>
                        <option value="week">
                          {dict.myContributionsPage.filters.periodWeek}
                        </option>
                        <option value="month">
                          {dict.myContributionsPage.filters.periodMonth}
                        </option>
                      </select>

                      <button
                        type="button"
                        onClick={() => setShowClearConfirm(true)}
                        className="rounded-xl border border-slate-700 bg-[#070b14] px-3 py-1.5 font-mono text-xs font-medium text-slate-400 hover:border-rose-500/50 hover:text-rose-300"
                      >
                        {dict.myContributionsPage.clearTimelineBtn}
                      </button>
                    </div>
                  </div>

                  {/* Clear confirmation banner */}
                  {showClearConfirm && (
                    <div className="flex items-center justify-between rounded-xl border border-rose-500/40 bg-rose-950/20 p-4 text-xs text-rose-200">
                      <span>{dict.myContributionsPage.clearTimelineConfirm}</span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setShowClearConfirm(false)}
                          className="rounded-lg border border-slate-700 px-3 py-1 font-mono text-xs text-slate-300 hover:bg-slate-800"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            clearActivities();
                            setShowClearConfirm(false);
                          }}
                          className="rounded-lg bg-rose-600 px-3 py-1 font-mono text-xs font-semibold text-white hover:bg-rose-500"
                        >
                          Confirmar Limpeza
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Visual Timeline Track */}
                  {filteredActivities.length === 0 ? (
                    <div className="rounded-2xl border border-slate-800 bg-[#0d1322]/50 p-10 text-center text-xs text-slate-500">
                      {dict.myContributionsPage.emptyStates.activities}
                    </div>
                  ) : (
                    <div className="relative pl-6 sm:pl-8">
                      {/* Vertical neon track line */}
                      <div
                        className="absolute bottom-4 left-2.5 top-4 w-0.5 bg-gradient-to-b from-cyan-500 via-indigo-500/50 to-slate-800 sm:left-3.5"
                        aria-hidden="true"
                      />

                      <div className="space-y-6">
                        {filteredActivities.map((act) => (
                          <div key={act.id} className="relative flex items-start gap-4">
                            {/* Timeline node icon */}
                            <div className="absolute -left-6 flex h-7 w-7 items-center justify-center rounded-full border border-cyan-500/40 bg-[#0d1322] text-sm shadow-[0_0_10px_rgba(6,182,212,0.3)] sm:-left-8 sm:h-8 sm:w-8">
                              {act.icon}
                            </div>

                            {/* Event content box */}
                            <div className="flex-1 rounded-2xl border border-slate-800/90 bg-[#0d1322]/90 p-4 transition-colors hover:border-cyan-500/40 sm:p-5">
                              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/70 pb-2">
                                <div className="flex items-center gap-2">
                                  <span className="rounded border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase text-cyan-300">
                                    {act.badgeLabel || act.category}
                                  </span>
                                  <span className="font-mono text-xs text-slate-500">
                                    {new Date(act.timestamp).toLocaleDateString(
                                      isPt ? "pt-BR" : "en-US",
                                      {
                                        month: "short",
                                        day: "numeric",
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      }
                                    )}
                                  </span>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => removeActivity(act.id)}
                                  title="Remover evento"
                                  className="text-xs text-slate-600 hover:text-rose-400"
                                >
                                  ✕
                                </button>
                              </div>

                              <div className="mt-2.5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                                <div>
                                  <h3 className="text-sm font-semibold text-slate-100">
                                    {isPt ? act.title_pt : act.title_en}
                                  </h3>
                                  {act.detail_pt && (
                                    <p className="mt-1 text-xs text-slate-400">
                                      {isPt ? act.detail_pt : act.detail_en}
                                    </p>
                                  )}
                                </div>

                                {act.link && (
                                  <Link
                                    href={act.link}
                                    className="inline-flex shrink-0 items-center gap-1 font-mono text-xs font-semibold text-cyan-300 hover:text-cyan-200"
                                  >
                                    <span>Acessar</span>
                                    <span aria-hidden="true">→</span>
                                  </Link>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      <Footer locale={locale} dict={dict} />
      <ResearchSubmitModal
        isOpen={isResearchModalOpen}
        onClose={() => {
          setIsResearchModalOpen(false);
          setEditingResearch(null);
        }}
        onSubmitted={() => setResearchReloadKey((k) => k + 1)}
        isPt={isPt}
        initialSubmission={editingResearch}
      />
    </div>
  );
}

function MetricCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number | string;
  accent: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-800/90 bg-[#0d1322]/90 p-3.5">
      <span className="block font-mono text-[10px] font-medium uppercase tracking-wider text-slate-400">
        {label}
      </span>
      <span className={`mt-1 block font-mono text-xl font-bold sm:text-2xl ${accent}`}>
        {value}
      </span>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "approved") {
    return (
      <span className="rounded border border-emerald-500/40 bg-emerald-500/15 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase text-emerald-300">
        ✓ APROVADO
      </span>
    );
  }
  if (status === "rejected") {
    return (
      <span className="rounded border border-rose-500/40 bg-rose-500/15 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase text-rose-300">
        ✕ REJEITADO
      </span>
    );
  }
  return (
    <span className="rounded border border-amber-500/40 bg-amber-500/15 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase text-amber-300">
      ⏳ EM ANÁLISE
    </span>
  );
}
