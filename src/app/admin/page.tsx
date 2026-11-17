"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  adminDataProvider,
  type AdminAuditEntry,
  type AdminDashboardStats,
  type AdminReport,
  type AdminResource,
  type ModerationQueueItem,
} from "@/features/admin";
import { AdminAlerts } from "@/features/admin/components/admin-alerts";
import { AdminMetricsGrid } from "@/features/admin/components/admin-metrics-grid";
import { AdminModerationPreview } from "@/features/admin/components/admin-moderation-preview";
import { AdminPendingResourcesPreview } from "@/features/admin/components/admin-pending-resources-preview";
import { AdminRecentActivity } from "@/features/admin/components/admin-recent-activity";
import { AdminReportsPreview } from "@/features/admin/components/admin-reports-preview";
import { useAuthStore } from "@/features/auth/use-auth-store";
import { useI18n } from "@/lib/i18n/context";

export default function AdminDashboardPage() {
  const { dict, locale } = useI18n();
  const user = useAuthStore((s) => s.user);
  const isAdmin = useAuthStore((s) => s.isAdmin);
  const d = dict.adminPanel.dashboard;

  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<AdminAuditEntry[]>([]);
  const [pendingQueue, setPendingQueue] = useState<ModerationQueueItem[]>([]);
  const [pendingReports, setPendingReports] = useState<AdminReport[]>([]);
  const [pendingResources, setPendingResources] = useState<AdminResource[]>([]);

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
      queueItems: queueRes.items
        .filter(
          (item) =>
            item.status === "pending" || item.status === "revision_requested"
        )
        .slice(0, 5),
      reportItems: reportsRes.items
        .filter((r) => r.status === "open" || r.status === "reviewing")
        .slice(0, 5),
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
      setPendingQueue(snap.queueItems);
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
        setPendingQueue(snap.queueItems);
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

  return (
    <div className="flex flex-col gap-6 pb-12">
      {/* A. Dashboard Header */}
      <header className="rounded-2xl border border-slate-800/90 bg-[#091020] p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-[11px] uppercase tracking-wider text-cyan-400">
                {d.eyebrow}
              </span>
              <span
                className={`rounded border px-2 py-0.5 font-mono text-[10px] font-semibold uppercase ${
                  isAdmin
                    ? "border-amber-500/40 bg-amber-500/15 text-amber-300"
                    : "border-cyan-500/40 bg-cyan-500/15 text-cyan-300"
                }`}
              >
                {isAdmin
                  ? dict.adminPanel.sidebar.roleAdminBadge
                  : dict.adminPanel.sidebar.roleModBadge}
              </span>
            </div>

            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                {d.title}
              </h1>
              {user && (
                <span className="text-sm font-medium text-cyan-300">
                  {d.greeting(user.displayName || user.username)}
                </span>
              )}
            </div>

            <p className="max-w-2xl text-sm text-slate-300">{d.subtitle}</p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <div className="rounded-xl border border-slate-800 bg-[#070b14] px-3 py-2 text-xs">
              <span className="text-slate-400">{d.currentDateLabel}: </span>
              <span className="font-mono text-slate-200">{currentDateText}</span>
            </div>

            <button
              type="button"
              onClick={() => void handleRefresh()}
              disabled={loading || refreshing}
              className="inline-flex min-h-[38px] items-center gap-2 rounded-xl border border-cyan-500/40 bg-cyan-500/15 px-3.5 py-2 text-xs font-semibold text-cyan-200 transition-colors hover:bg-cyan-500/25 disabled:cursor-not-allowed disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
            >
              <svg
                className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 12a9 9 0 1 1-3-6.7L21 8m0-5v5h-5"
                />
              </svg>
              <span>{refreshing ? d.refreshingButton : d.refreshButton}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Error State (never leaves page blank) */}
      {loadError && (
        <div
          role="alert"
          className="flex flex-col items-start justify-between gap-3 rounded-2xl border border-rose-500/40 bg-rose-500/10 p-5 sm:flex-row sm:items-center"
        >
          <div className="space-y-1">
            <h2 className="text-sm font-semibold text-rose-200">{d.errorTitle}</h2>
            <p className="text-xs text-rose-200/80">{d.errorMessage}</p>
          </div>
          <button
            type="button"
            onClick={() => void handleRefresh()}
            className="inline-flex min-h-[38px] shrink-0 items-center justify-center rounded-xl bg-rose-500 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-rose-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-300"
          >
            {d.retryButton}
          </button>
        </div>
      )}

      {/* B. Key Indicators */}
      <AdminMetricsGrid stats={stats} loading={loading} />

      {/* Operational Alerts */}
      <AdminAlerts stats={stats} />

      {/* D, E, F, C. Dashboard Previews & Recent Activity */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <AdminModerationPreview items={pendingQueue} loading={loading} />
        <AdminReportsPreview
          reports={pendingReports}
          pendingCount={stats?.openReports ?? pendingReports.length}
          loading={loading}
        />
        <AdminPendingResourcesPreview
          resources={pendingResources}
          loading={loading}
        />
        <AdminRecentActivity entries={recentActivity} loading={loading} />
      </div>
    </div>
  );
}
