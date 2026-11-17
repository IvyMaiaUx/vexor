"use client";

import React from "react";
import Link from "next/link";
import type { AdminDashboardStats } from "../types";
import { useI18n } from "@/lib/i18n/context";

interface AdminMetricsGridProps {
  stats: AdminDashboardStats | null;
  loading?: boolean;
}

export function AdminMetricsGrid({ stats, loading = false }: AdminMetricsGridProps) {
  const { dict } = useI18n();
  const m = dict.adminPanel.dashboard.metrics;

  const cards = [
    {
      id: "total-users",
      href: "/admin/users",
      title: m.totalUsersTitle,
      value: stats?.totalUsers ?? 0,
      description: m.totalUsersDesc(stats?.suspendedUsers ?? 0),
      accent: "text-cyan-300 border-slate-800/90 hover:border-cyan-500/40",
      iconColor: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
      icon: (
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      ),
    },
    {
      id: "active-users",
      href: "/admin/users",
      title: m.activeUsersTitle,
      value: stats?.activeUsers ?? 0,
      description: m.activeUsersDesc,
      accent: "text-emerald-300 border-slate-800/90 hover:border-emerald-500/40",
      iconColor: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
      icon: (
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M20 6 9 17l-5-5" />
        </svg>
      ),
    },
    {
      id: "publications",
      href: "/admin/catalog",
      title: m.publicationsTitle,
      value: stats?.totalPublications ?? 0,
      description: m.publicationsDesc(stats?.publishedResources ?? 0, stats?.totalTopics ?? 0),
      accent: "text-sky-300 border-slate-800/90 hover:border-sky-500/40",
      iconColor: "text-sky-400 bg-sky-500/10 border-sky-500/20",
      icon: (
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
        </svg>
      ),
    },
    {
      id: "pending-reports",
      href: "/admin/reports",
      title: m.pendingReportsTitle,
      value: stats?.openReports ?? 0,
      description: m.pendingReportsDesc(stats?.openReports ?? 0),
      accent: "text-rose-300 border-slate-800/90 hover:border-rose-500/40",
      iconColor: "text-rose-400 bg-rose-500/10 border-rose-500/20",
      icon: (
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
        </svg>
      ),
    },
    {
      id: "pending-resources",
      href: "/admin/catalog",
      title: m.pendingResourcesTitle,
      value: stats?.pendingResources ?? 0,
      description: m.pendingResourcesDesc(stats?.pendingResources ?? 0),
      accent: "text-amber-300 border-slate-800/90 hover:border-amber-500/40",
      iconColor: "text-amber-400 bg-amber-500/10 border-amber-500/20",
      icon: (
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
          <circle cx="12" cy="12" r="10" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2" />
        </svg>
      ),
    },
    {
      id: "moderation-queue",
      href: "/admin/moderation",
      title: m.moderationQueueTitle,
      value: stats?.pendingModerationItems ?? 0,
      description: m.moderationQueueDesc(stats?.pendingModerationItems ?? 0),
      accent: "text-violet-300 border-slate-800/90 hover:border-violet-500/40",
      iconColor: "text-violet-400 bg-violet-500/10 border-violet-500/20",
      icon: (
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
        </svg>
      ),
    },
  ];

  return (
    <section aria-label={dict.adminPanel.dashboard.statsTitle} className="space-y-4">
      <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
        <h2 className="text-sm font-semibold tracking-wider text-slate-200 uppercase">
          {dict.adminPanel.dashboard.statsTitle}
        </h2>
        <span className="font-mono text-[11px] text-slate-400">
          {dict.adminPanel.dashboard.noHistoricalTrends}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <Link
            key={card.id}
            href={card.href}
            className={`group rounded-2xl border bg-[#0c1220]/90 p-5 transition-colors hover:bg-[#0f172a] focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 ${card.accent}`}
          >
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-medium text-slate-300 group-hover:text-white">
                {card.title}
              </span>
              <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${card.iconColor}`}>
                {card.icon}
              </span>
            </div>

            <div className="mt-3 font-mono text-2xl font-bold tracking-tight">
              {loading ? (
                <span className="inline-block h-7 w-12 animate-pulse rounded bg-slate-800 align-middle" />
              ) : (
                card.value
              )}
            </div>

            <p className="mt-1.5 text-xs text-slate-400">
              {card.description}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
