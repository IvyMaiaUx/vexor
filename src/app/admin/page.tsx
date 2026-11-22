"use client";

import Link from "next/link";
import React, { useCallback, useEffect, useState } from "react";
import {
  adminDataProvider,
  type AdminAuditEntry,
  type AdminDashboardStats,
  type AdminReport,
  type AdminResource,
  type ModerationQueueItem,
} from "@/features/admin";
import { useAuthStore } from "@/features/auth/use-auth-store";
import { useI18n } from "@/lib/i18n/context";

type WorkQueueTab = "moderation" | "reports" | "resources";

function formatShortDate(iso: string, locale: string): string {
  try {
    return new Intl.DateTimeFormat(locale, {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export default function AdminDashboardPage() {
  const { locale } = useI18n();
  const isPt = locale === "pt-BR";
  const isAdmin = useAuthStore((s) => s.isAdmin);

  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<AdminAuditEntry[]>([]);
  const [queueItems, setQueueItems] = useState<ModerationQueueItem[]>([]);
  const [queueTotal, setQueueTotal] = useState(0);
  const [pendingReports, setPendingReports] = useState<AdminReport[]>([]);
  const [pendingResources, setPendingResources] = useState<AdminResource[]>([]);

  const [workTab, setWorkTab] = useState<WorkQueueTab>("moderation");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const fetchDashboardSnapshot = useCallback(async () => {
    const emptyAuditRes = {
      items: [] as AdminAuditEntry[],
      total: 0,
      page: 1,
      pageSize: 5,
      totalPages: 1,
    };

    const [statsRes, auditRes, queueRes, reportsRes, resourcesRes] =
      await Promise.all([
        adminDataProvider.dashboard.getDashboardStats(),
        isAdmin
          ? adminDataProvider.audit
              .listAuditEntries({}, { page: 1, pageSize: 5 })
              .catch(() => emptyAuditRes)
          : Promise.resolve(emptyAuditRes),
        adminDataProvider.moderation.listQueue({}, { page: 1, pageSize: 20 }),
        adminDataProvider.reports.listReports({}, { page: 1, pageSize: 20 }),
        adminDataProvider.resources.listResources(
          { status: "pending" },
          { page: 1, pageSize: 5 }
        ),
      ]);

    return {
      statsRes,
      auditItems: auditRes.items,
      queueItems: queueRes.items,
      queueTotal: queueRes.total,
      reportItems: reportsRes.items.filter(
        (r) => r.status === "open" || r.status === "reviewing"
      ),
      resourceItems: resourcesRes.items,
    };
  }, [isAdmin]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    setLoadError(false);
    try {
      const snap = await fetchDashboardSnapshot();
      setStats(snap.statsRes);
      setRecentActivity(snap.auditItems);
      setQueueItems(snap.queueItems);
      setQueueTotal(snap.queueTotal);
      setPendingReports(snap.reportItems);
      setPendingResources(snap.resourceItems);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [fetchDashboardSnapshot]);

  useEffect(() => {
    let active = true;
    fetchDashboardSnapshot()
      .then((snap) => {
        if (!active) return;
        setStats(snap.statsRes);
        setRecentActivity(snap.auditItems);
        setQueueItems(snap.queueItems);
        setQueueTotal(snap.queueTotal);
        setPendingReports(snap.reportItems);
        setPendingResources(snap.resourceItems);
        setLoadError(false);
        setLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setLoadError(true);
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [fetchDashboardSnapshot]);

  const currentDateText = new Intl.DateTimeFormat(locale, {
    dateStyle: "long",
  }).format(new Date());

  const openReportsCount = stats?.openReports ?? pendingReports.length;
  const pendingResourcesCount = stats?.pendingResources ?? pendingResources.length;
  const inQueueCount = queueTotal || queueItems.length;
  const totalUsers = stats?.totalUsers ?? 0;
  const suspendedUsers = stats?.suspendedUsers ?? 0;
  const activeUsers = Math.max(0, totalUsers - suspendedUsers);
  const totalResources = stats?.publishedResources ?? 0;
  const totalTopics = stats?.totalTopics ?? 0;
  const totalPublications = totalResources + totalTopics;

  const workTabHref =
    workTab === "moderation"
      ? "/admin/moderation"
      : workTab === "reports"
        ? "/admin/reports"
        : "/admin/catalog";

  const pendingModItems = queueItems.filter(
    (it) => it.status === "pending" || it.status === "revision_requested"
  );

  return (
    <div className="space-y-4">
      {/* Header: Title + Date + Refresh Icon Button */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-bold leading-tight tracking-tight text-slate-100">
            {isPt ? "Visão geral" : "Overview"}
          </h1>
          <p className="mt-0.5 text-sm text-slate-400">{currentDateText}</p>
        </div>

        <button
          type="button"
          onClick={() => void handleRefresh()}
          disabled={loading || refreshing}
          aria-label={isPt ? "Atualizar" : "Refresh"}
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-800 bg-[#0b1220] text-slate-200 transition-colors hover:border-cyan-500/40 hover:text-cyan-300 disabled:opacity-50"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`h-[22px] w-[22px] ${refreshing ? "animate-spin" : ""}`}
            aria-hidden="true"
          >
            <path d="M20 12a8 8 0 1 1-2.3-5.7M20 4v5h-5" />
          </svg>
        </button>
      </div>

      {loadError && (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 rounded-2xl border border-rose-500/40 bg-rose-500/10 p-4"
        >
          <p className="text-xs text-rose-200">
            {isPt
              ? "Não foi possível carregar os indicadores."
              : "Could not load dashboard metrics."}
          </p>
          <button
            type="button"
            onClick={() => void handleRefresh()}
            className="inline-flex min-h-[44px] shrink-0 items-center rounded-xl bg-rose-500/20 px-3.5 text-xs font-semibold text-rose-200 hover:bg-rose-500/30"
          >
            {isPt ? "Tentar novamente" : "Retry"}
          </button>
        </div>
      )}

      {/* 1. PRECISA DE ATENÇÃO: 3 touchable tiles */}
      <section aria-labelledby="attention-heading">
        <p
          id="attention-heading"
          className="mb-2 font-mono text-[11px] font-semibold uppercase tracking-widest text-slate-400"
        >
          {isPt ? "Precisa de atenção" : "Needs attention"}
        </p>
        <div className="grid grid-cols-3 gap-2">
          <Link
            href="/admin/reports"
            className="flex flex-col gap-1.5 rounded-2xl border border-slate-800 bg-[#0b1220] p-3 transition-colors hover:border-rose-500/40"
          >
            <span className="text-rose-300">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
                <path d="M5 21V4h11l-2 4 2 4H5" />
              </svg>
            </span>
            <strong className="font-mono text-[26px] font-bold leading-none text-rose-300">
              {loading ? "—" : openReportsCount}
            </strong>
            <span className="text-xs text-slate-400">
              {isPt ? "Denúncias" : "Reports"}
            </span>
          </Link>

          <Link
            href="/admin/catalog"
            className="flex flex-col gap-1.5 rounded-2xl border border-slate-800 bg-[#0b1220] p-3 transition-colors hover:border-amber-500/40"
          >
            <span className="text-amber-400">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
                <path d="M5 4h12a2 2 0 0 1 2 2v14H7a2 2 0 0 1-2-2zM5 18a2 2 0 0 1 2-2h12" />
              </svg>
            </span>
            <strong className="font-mono text-[26px] font-bold leading-none text-amber-400">
              {loading ? "—" : pendingResourcesCount}
            </strong>
            <span className="text-xs text-slate-400">
              {isPt ? "Recursos" : "Resources"}
            </span>
          </Link>

          <Link
            href="/admin/moderation"
            className="flex flex-col gap-1.5 rounded-2xl border border-slate-800 bg-[#0b1220] p-3 transition-colors hover:border-indigo-500/40"
          >
            <span className="text-indigo-300">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
                <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" />
              </svg>
            </span>
            <strong className="font-mono text-[26px] font-bold leading-none text-indigo-300">
              {loading ? "—" : inQueueCount}
            </strong>
            <span className="text-xs text-slate-400">
              {isPt ? "Na fila" : "In queue"}
            </span>
          </Link>
        </div>
      </section>

      {/* 2. COMUNIDADE: 2x2 grid */}
      <section aria-labelledby="community-heading">
        <p
          id="community-heading"
          className="mb-2 font-mono text-[11px] font-semibold uppercase tracking-widest text-slate-400"
        >
          {isPt ? "Comunidade" : "Community"}
        </p>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          <div className="flex flex-col gap-1 rounded-2xl border border-slate-800 bg-[#0b1220] p-3.5">
            <div className="flex items-center justify-between text-cyan-400">
              <span className="text-[13px] text-slate-400">
                {isPt ? "Usuários" : "Users"}
              </span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]" aria-hidden="true">
                <circle cx="9" cy="8" r="3.5" />
                <path d="M2 20a7 7 0 0 1 14 0M16 4.5a3.5 3.5 0 0 1 0 7M22 20a7 7 0 0 0-4-6.3" />
              </svg>
            </div>
            <strong className="font-mono text-2xl font-bold text-cyan-400">
              {loading ? "—" : totalUsers}
            </strong>
            <span className="text-xs text-slate-400">
              {suspendedUsers} {isPt ? "suspensos" : "suspended"}
            </span>
          </div>

          <div className="flex flex-col gap-1 rounded-2xl border border-slate-800 bg-[#0b1220] p-3.5">
            <div className="flex items-center justify-between text-emerald-400">
              <span className="text-[13px] text-slate-400">
                {isPt ? "Ativos" : "Active"}
              </span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]" aria-hidden="true">
                <path d="M5 12l5 5 9-10" />
              </svg>
            </div>
            <strong className="font-mono text-2xl font-bold text-emerald-400">
              {loading ? "—" : activeUsers}
            </strong>
            <span className="text-xs text-slate-400">
              {isPt ? "contas habilitadas" : "enabled accounts"}
            </span>
          </div>

          <div className="flex flex-col gap-1 rounded-2xl border border-slate-800 bg-[#0b1220] p-3.5">
            <div className="flex items-center justify-between text-sky-400">
              <span className="text-[13px] text-slate-400">
                {isPt ? "Publicações" : "Content"}
              </span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]" aria-hidden="true">
                <path d="M5 4h12a2 2 0 0 1 2 2v14H7a2 2 0 0 1-2-2zM5 18a2 2 0 0 1 2-2h12" />
              </svg>
            </div>
            <strong className="font-mono text-2xl font-bold text-sky-400">
              {loading ? "—" : totalPublications}
            </strong>
            <span className="text-xs text-slate-400">
              {totalResources} {isPt ? "recursos" : "resources"} · {totalTopics}{" "}
              {isPt ? "tópicos" : "topics"}
            </span>
          </div>

          <div className="flex flex-col gap-1 rounded-2xl border border-slate-800 bg-[#0b1220] p-3.5">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[13px] text-slate-400">
                {isPt ? "Suspensos" : "Suspended"}
              </span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]" aria-hidden="true">
                <rect x="5" y="11" width="14" height="9" rx="2" />
                <path d="M8 11V8a4 4 0 0 1 8 0v3" />
              </svg>
            </div>
            <strong className="font-mono text-2xl font-bold text-slate-300">
              {loading ? "—" : suspendedUsers}
            </strong>
            <span className="text-xs text-slate-400">
              {isPt ? "contas bloqueadas" : "blocked accounts"}
            </span>
          </div>
        </div>
      </section>

      {/* 3. Single Card: Fila de trabalho with tabs */}
      <section className="rounded-2xl border border-slate-800 bg-[#0b1220] p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-base font-semibold text-slate-100">
            {isPt ? "Fila de trabalho" : "Work queue"}
          </h2>
          <Link
            href={workTabHref}
            className="inline-flex min-h-[36px] items-center text-sm font-medium text-cyan-400 hover:text-cyan-300"
          >
            {isPt ? "Abrir →" : "Open →"}
          </Link>
        </div>

        <div
          role="tablist"
          aria-label={isPt ? "Abas da fila de trabalho" : "Work queue tabs"}
          className="no-scrollbar flex gap-1.5 overflow-x-auto"
        >
          {(
            [
              {
                id: "moderation",
                label: isPt ? "Moderação" : "Moderation",
                count: inQueueCount,
              },
              {
                id: "reports",
                label: isPt ? "Denúncias" : "Reports",
                count: openReportsCount,
              },
              {
                id: "resources",
                label: isPt ? "Recursos" : "Resources",
                count: pendingResourcesCount,
              },
            ] as const
          ).map((tab) => {
            const active = workTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setWorkTab(tab.id)}
                className={`inline-flex min-h-[40px] shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-xs font-medium transition-colors ${
                  active
                    ? "border-cyan-500/50 bg-cyan-500/15 text-cyan-300"
                    : "border-slate-800 bg-[#080e1a] text-slate-300 hover:border-slate-700"
                }`}
              >
                <span>{tab.label}</span>
                <span className="font-mono text-[11px]">{tab.count}</span>
              </button>
            );
          })}
        </div>

        {loading ? (
          <div className="h-12 animate-pulse rounded-xl bg-slate-800/40" />
        ) : workTab === "moderation" ? (
          pendingModItems.length > 0 ? (
            <ul className="divide-y divide-slate-800/70">
              {pendingModItems.slice(0, 3).map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <span className="truncate text-slate-200">{item.title}</span>
                  <span className="shrink-0 font-mono text-xs text-slate-400">
                    @{item.authorUsername}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-400">
              {inQueueCount > 0
                ? isPt
                  ? `Os ${inQueueCount} itens da fila já estão publicados; abra para revisar.`
                  : `All ${inQueueCount} items in the queue are published; open to review.`
                : isPt
                  ? "Nenhum item pendente na fila."
                  : "No pending items in the queue."}
            </p>
          )
        ) : workTab === "reports" ? (
          pendingReports.length > 0 ? (
            <ul className="divide-y divide-slate-800/70">
              {pendingReports.slice(0, 3).map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <span className="truncate text-slate-200">
                    {r.targetTitle || r.details || r.reason}
                  </span>
                  <span className="shrink-0 font-mono text-xs text-rose-300">
                    {r.reason}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-400">
              {isPt
                ? "Nenhuma denúncia aguardando análise."
                : "No reports awaiting review."}
            </p>
          )
        ) : pendingResources.length > 0 ? (
          <ul className="divide-y divide-slate-800/70">
            {pendingResources.slice(0, 3).map((res) => (
              <li key={res.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <span className="truncate text-slate-200">{res.name}</span>
                <span className="shrink-0 font-mono text-xs text-amber-300">
                  {res.type}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-400">
            {isPt
              ? "Nenhum recurso pendente de aprovação."
              : "No resources pending approval."}
          </p>
        )}
      </section>

      {/* 4. Atividade recente */}
      <section className="rounded-2xl border border-slate-800 bg-[#0b1220] p-4 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-base font-semibold text-slate-100">
            {isPt ? "Atividade recente" : "Recent activity"}
          </h2>
          {isAdmin && (
            <Link
              href="/admin/audit"
              className="inline-flex min-h-[36px] items-center text-sm font-medium text-cyan-400 hover:text-cyan-300"
            >
              {isPt ? "Ver auditoria →" : "View audit →"}
            </Link>
          )}
        </div>

        {loading ? (
          <div className="h-12 animate-pulse rounded-xl bg-slate-800/40" />
        ) : recentActivity.length === 0 ? (
          <div className="flex min-h-[44px] items-center gap-2.5 text-sm text-slate-400">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px] shrink-0" aria-hidden="true">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5l3 2" />
            </svg>
            <span>
              {isPt
                ? "Nenhum evento registrado ainda."
                : "No events recorded yet."}
            </span>
          </div>
        ) : (
          <ul className="divide-y divide-slate-800/70">
            {recentActivity.slice(0, 5).map((entry) => (
              <li key={entry.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium text-slate-200">
                    {entry.action}
                  </p>
                  <p className="text-xs text-slate-400">
                    @{entry.actorUsername || "sistema"} · {entry.entityType}
                  </p>
                </div>
                <span className="shrink-0 font-mono text-xs text-slate-500">
                  {formatShortDate(entry.createdAt, locale)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
