"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  adminDataProvider,
  type AdminAuditEntry,
  type AdminUser,
  type AdminUserStatus,
  type AdminUsersSummary,
  type DbUserRole,
  type PaginatedResult,
} from "@/features/admin";
import { AdminGuard } from "@/features/admin/components/admin-guard";
import { AdminUserDetailModal } from "@/features/admin/components/admin-user-detail-modal";
import { AdminUserRoleModal } from "@/features/admin/components/admin-user-role-modal";
import { AdminUserSuspensionModal } from "@/features/admin/components/admin-user-suspension-modal";
import { useAuthStore } from "@/features/auth/use-auth-store";
import { useI18n } from "@/lib/i18n/context";

type PeriodFilter = "all" | "7d" | "30d" | "90d";

export default function AdminUsersPage() {
  const { dict, locale } = useI18n();
  const currentUser = useAuthStore((s) => s.user);
  const t = dict.adminPanel.usersPage;

  // Query & filter state
  const [searchInput, setSearchInput] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<DbUserRole | "all">("all");
  const [statusFilter, setStatusFilter] = useState<AdminUserStatus | "all">("all");
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  // Data state
  const [usersResult, setUsersResult] = useState<PaginatedResult<AdminUser>>({
    items: [],
    total: 0,
    page: 1,
    pageSize: 5,
    totalPages: 1,
    isSimulatedDemoData: true,
  });
  const [summary, setSummary] = useState<AdminUsersSummary | null>(null);
  const [auditEntries, setAuditEntries] = useState<AdminAuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(false);

  // Modals state
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [roleTargetUser, setRoleTargetUser] = useState<AdminUser | null>(null);
  const [suspensionTargetUser, setSuspensionTargetUser] = useState<AdminUser | null>(null);

  // Debounce search input to avoid querying on every keystroke
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchInput.trim());
      setPage(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const fetchUsersSnapshot = useCallback(async () => {
    const [listRes, summaryRes, auditRes] = await Promise.all([
      adminDataProvider.users.listUsers(
        {
          query: debouncedQuery || undefined,
          role: roleFilter,
          status: statusFilter,
          period: periodFilter,
        },
        { page, pageSize }
      ),
      adminDataProvider.users.getUsersSummary(),
      adminDataProvider.audit.listAuditEntries(
        { entityType: "profile" },
        { page: 1, pageSize: 10 }
      ),
    ]);
    return { listRes, summaryRes, auditRes };
  }, [debouncedQuery, roleFilter, statusFilter, periodFilter, page, pageSize]);

  useEffect(() => {
    let active = true;
    fetchUsersSnapshot()
      .then(({ listRes, summaryRes, auditRes }) => {
        if (!active) return;
        setUsersResult(listRes);
        setSummary(summaryRes);
        setAuditEntries(auditRes.items);
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
  }, [fetchUsersSnapshot]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    setLoadError(false);
    try {
      const { listRes, summaryRes, auditRes } = await fetchUsersSnapshot();
      setUsersResult(listRes);
      setSummary(summaryRes);
      setAuditEntries(auditRes.items);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [fetchUsersSnapshot]);

  const handleClearFilters = () => {
    setSearchInput("");
    setDebouncedQuery("");
    setRoleFilter("all");
    setStatusFilter("all");
    setPeriodFilter("all");
    setPage(1);
  };

  const hasActiveFilters =
    Boolean(searchInput.trim()) ||
    roleFilter !== "all" ||
    statusFilter !== "all" ||
    periodFilter !== "all";

  const isSimulated =
    adminDataProvider.isSimulated || Boolean(summary?.isSimulatedDemoData);

  const dateFormatter = new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
  });
  const dateTimeFormatter = new Intl.DateTimeFormat(locale, {
    dateStyle: "short",
    timeStyle: "short",
  });

  const roleBadgeStyles: Record<string, string> = {
    admin: "border-violet-500/40 bg-violet-500/15 text-violet-300",
    moderator: "border-cyan-500/40 bg-cyan-500/15 text-cyan-300",
    member: "border-slate-700 bg-slate-800/90 text-slate-300",
  };

  const summaryCards = [
    {
      id: "total",
      label: t.summary.totalUsers,
      value: summary?.totalUsers ?? 0,
      accent: "text-white border-slate-800/90",
    },
    {
      id: "active",
      label: t.summary.activeUsers,
      value: summary?.activeUsers ?? 0,
      accent: "text-emerald-300 border-slate-800/90",
    },
    {
      id: "suspended",
      label: t.summary.suspendedUsers,
      value: summary?.suspendedUsers ?? 0,
      accent: "text-rose-300 border-slate-800/90",
    },
    {
      id: "admins",
      label: t.summary.admins,
      value: summary?.adminUsers ?? 0,
      accent: "text-violet-300 border-slate-800/90",
    },
    {
      id: "moderators",
      label: t.summary.moderators,
      value: summary?.moderatorUsers ?? 0,
      accent: "text-cyan-300 border-slate-800/90",
    },
  ];

  return (
    <AdminGuard requireAdmin={true}>
      <div className="flex flex-col gap-6 pb-16">
        {/* Header */}
        <header className="rounded-2xl border border-slate-800/90 bg-[#091020] p-5 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-[11px] uppercase tracking-wider text-cyan-400">
                  {t.eyebrow}
                </span>
                <span className="rounded border border-violet-500/40 bg-violet-500/15 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase text-violet-300">
                  ADMIN ONLY
                </span>
                {isSimulated && (
                  <span className="rounded border border-sky-500/40 bg-sky-500/15 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase text-sky-300">
                    {t.demoBadge}
                  </span>
                )}
              </div>

              <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                {t.title}
              </h1>
              <p className="max-w-2xl text-sm text-slate-300">{t.subtitle}</p>
            </div>

            <button
              type="button"
              onClick={() => void handleRefresh()}
              disabled={loading || refreshing}
              className="inline-flex min-h-[38px] shrink-0 items-center gap-2 self-start rounded-xl border border-cyan-500/40 bg-cyan-500/15 px-3.5 py-2 text-xs font-semibold text-cyan-200 transition-colors hover:bg-cyan-500/25 disabled:cursor-not-allowed disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
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
              <span>{refreshing ? t.refreshingButton : t.refreshButton}</span>
            </button>
          </div>

          {isSimulated && (
            <div className="mt-4 rounded-xl border border-slate-800/90 bg-[#070b14]/80 p-3.5 text-xs text-slate-300">
              <strong className="text-sky-300">{t.demoNoticeTitle} </strong>
              <span>{t.demoNoticeBody}</span>
            </div>
          )}
        </header>

        {/* Error Banner */}
        {loadError && (
          <div
            role="alert"
            className="flex flex-col items-start justify-between gap-3 rounded-2xl border border-rose-500/40 bg-rose-500/10 p-5 sm:flex-row sm:items-center"
          >
            <div className="space-y-1">
              <h2 className="text-sm font-semibold text-rose-200">{t.errorTitle}</h2>
              <p className="text-xs text-rose-200/80">{t.errorMessage}</p>
            </div>
            <button
              type="button"
              onClick={() => void handleRefresh()}
              className="inline-flex min-h-[38px] shrink-0 items-center justify-center rounded-xl bg-rose-500 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-rose-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-300"
            >
              {t.retryButton}
            </button>
          </div>
        )}

        {/* Summary Indicators */}
        <section aria-label={t.summary.totalUsers} className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {summaryCards.map((card) => (
            <div
              key={card.id}
              className={`rounded-2xl border bg-[#0c1220]/90 p-4 ${card.accent}`}
            >
              <span className="block text-xs font-medium text-slate-400">
                {card.label}
              </span>
              <div className="mt-2 font-mono text-2xl font-bold">
                {loading ? (
                  <span className="inline-block h-7 w-10 animate-pulse rounded bg-slate-800" />
                ) : (
                  card.value
                )}
              </div>
            </div>
          ))}
        </section>

        {/* Search & Filters */}
        <section
          aria-label={t.searchLabel}
          className="rounded-2xl border border-slate-800/90 bg-[#0c1220]/90 p-4 sm:p-5"
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <div className="lg:col-span-2">
              <label htmlFor="admin-users-search" className="mb-1 block text-[11px] font-medium text-slate-400">
                {t.searchLabel}
              </label>
              <input
                id="admin-users-search"
                type="search"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder={t.searchPlaceholder}
                className="w-full rounded-xl border border-slate-800 bg-[#070b14] px-3.5 py-2 text-xs text-slate-100 placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
              />
            </div>

            <div>
              <label htmlFor="admin-users-role" className="mb-1 block text-[11px] font-medium text-slate-400">
                {t.filterRole}
              </label>
              <select
                id="admin-users-role"
                value={roleFilter}
                onChange={(e) => {
                  setRoleFilter(e.target.value as DbUserRole | "all");
                  setPage(1);
                }}
                className="w-full rounded-xl border border-slate-800 bg-[#070b14] px-3 py-2 text-xs text-slate-100 focus:border-cyan-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
              >
                <option value="all">{t.allRoles}</option>
                <option value="member">{t.roleLabels.member}</option>
                <option value="moderator">{t.roleLabels.moderator}</option>
                <option value="admin">{t.roleLabels.admin}</option>
              </select>
            </div>

            <div>
              <label htmlFor="admin-users-status" className="mb-1 block text-[11px] font-medium text-slate-400">
                {t.filterStatus}
              </label>
              <select
                id="admin-users-status"
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value as AdminUserStatus | "all");
                  setPage(1);
                }}
                className="w-full rounded-xl border border-slate-800 bg-[#070b14] px-3 py-2 text-xs text-slate-100 focus:border-cyan-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
              >
                <option value="all">{t.allStatuses}</option>
                <option value="active">{t.statusActive}</option>
                <option value="suspended">{t.statusSuspended}</option>
              </select>
            </div>

            <div>
              <label htmlFor="admin-users-period" className="mb-1 block text-[11px] font-medium text-slate-400">
                {t.filterPeriod}
              </label>
              <select
                id="admin-users-period"
                value={periodFilter}
                onChange={(e) => {
                  setPeriodFilter(e.target.value as PeriodFilter);
                  setPage(1);
                }}
                className="w-full rounded-xl border border-slate-800 bg-[#070b14] px-3 py-2 text-xs text-slate-100 focus:border-cyan-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
              >
                <option value="all">{t.allPeriods}</option>
                <option value="7d">{t.period7d}</option>
                <option value="30d">{t.period30d}</option>
                <option value="90d">{t.period90d}</option>
              </select>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800/80 pt-3 text-xs">
            <span className="font-mono text-slate-300">
              {t.resultsCount(usersResult.items.length, usersResult.total)}
            </span>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <label htmlFor="admin-users-pagesize" className="text-slate-400">
                  {t.pageSizeLabel}:
                </label>
                <select
                  id="admin-users-pagesize"
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setPage(1);
                  }}
                  className="rounded-lg border border-slate-800 bg-[#070b14] px-2.5 py-1 font-mono text-xs text-slate-200 focus:border-cyan-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
                >
                  <option value={3}>3</option>
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                </select>
              </div>

              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleClearFilters}
                  className="rounded-lg border border-slate-700 bg-[#070b14] px-3 py-1 text-xs font-medium text-cyan-300 transition-colors hover:border-cyan-500/50 hover:text-cyan-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
                >
                  {t.clearFiltersBtn}
                </button>
              )}
            </div>
          </div>
        </section>

        {/* Users Table / Mobile Cards */}
        {loading ? (
          <div className="rounded-2xl border border-slate-800 bg-[#0c1220] p-10 text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
            <p className="mt-3 font-mono text-xs text-slate-400">
              {t.loadingMessage}
            </p>
          </div>
        ) : usersResult.items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-800 bg-[#0c1220] p-10 text-center">
            <h2 className="text-sm font-semibold text-slate-200">{t.emptyTitle}</h2>
            <p className="mt-1 text-xs text-slate-400">{t.emptyState}</p>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleClearFilters}
                className="mt-4 rounded-xl border border-cyan-500/40 bg-cyan-500/10 px-4 py-2 text-xs font-semibold text-cyan-300 transition-colors hover:bg-cyan-500/20"
              >
                {t.clearFiltersBtn}
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-800/90 bg-[#0c1220]/90">
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-800 bg-[#080d1a] font-mono uppercase tracking-wider text-slate-400">
                  <tr>
                    <th scope="col" className="px-5 py-3.5">{t.userCol}</th>
                    <th scope="col" className="px-5 py-3.5">{t.roleCol}</th>
                    <th scope="col" className="px-5 py-3.5">{t.statusCol}</th>
                    <th scope="col" className="px-5 py-3.5">{t.createdCol}</th>
                    <th scope="col" className="px-5 py-3.5">{t.activityCol}</th>
                    <th scope="col" className="px-5 py-3.5 text-right">{t.actionsCol}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70">
                  {usersResult.items.map((u) => {
                    const isSelf = currentUser?.id === u.id;
                    return (
                      <tr
                        key={u.id}
                        className="transition-colors hover:bg-slate-800/30"
                      >
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-700 bg-[#070b14] font-mono text-sm font-bold text-cyan-300">
                              {u.displayName.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-slate-100 truncate">
                                  {u.displayName}
                                </span>
                                {isSelf && (
                                  <span className="rounded border border-cyan-500/40 bg-cyan-500/15 px-1.5 py-0.5 font-mono text-[10px] text-cyan-300">
                                    {t.selfBadge}
                                  </span>
                                )}
                              </div>
                              <span className="font-mono text-[11px] text-slate-400">
                                @{u.username}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex rounded-full border px-2.5 py-0.5 font-mono text-[11px] font-semibold ${
                              roleBadgeStyles[u.role] ?? roleBadgeStyles.member
                            }`}
                          >
                            {t.roleLabels[u.role] ?? u.role}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex rounded-full border px-2.5 py-0.5 font-mono text-[11px] font-semibold ${
                              u.isSuspended
                                ? "border-rose-500/40 bg-rose-500/15 text-rose-300"
                                : "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                            }`}
                          >
                            {u.isSuspended ? t.statusSuspended : t.statusActive}
                          </span>
                        </td>
                        <td className="px-5 py-4 font-mono text-slate-300">
                          <time dateTime={u.createdAt}>
                            {dateFormatter.format(new Date(u.createdAt))}
                          </time>
                        </td>
                        <td className="px-5 py-4 font-mono text-slate-400">
                          {u.lastActivityAt ? (
                            <time dateTime={u.lastActivityAt}>
                              {dateTimeFormatter.format(new Date(u.lastActivityAt))}
                            </time>
                          ) : (
                            t.noActivity
                          )}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <div className="flex flex-wrap items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => setSelectedUserId(u.id)}
                              className="inline-flex items-center rounded-lg border border-slate-700 bg-[#070b14] px-2.5 py-1.5 text-xs font-medium text-slate-200 transition-colors hover:border-cyan-500/50 hover:text-cyan-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
                            >
                              {t.viewDetailsBtn}
                            </button>
                            <button
                              type="button"
                              disabled={
                                isSelf ||
                                (u.role === "admin" &&
                                  !u.isSuspended &&
                                  (summary?.activeAdminUsers ?? 1) <= 1)
                              }
                              onClick={() => setRoleTargetUser(u)}
                              className="inline-flex items-center rounded-lg border border-violet-500/40 bg-violet-500/15 px-2.5 py-1.5 text-xs font-medium text-violet-200 transition-colors hover:bg-violet-500/25 disabled:cursor-not-allowed disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
                            >
                              {t.changeRoleBtn}
                            </button>
                            <button
                              type="button"
                              disabled={
                                (isSelf && !u.isSuspended) ||
                                (u.role === "admin" &&
                                  !u.isSuspended &&
                                  (summary?.activeAdminUsers ?? 1) <= 1)
                              }
                              onClick={() => setSuspensionTargetUser(u)}
                              className={`inline-flex items-center rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 focus:outline-none focus-visible:ring-2 ${
                                u.isSuspended
                                  ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-200 hover:bg-emerald-500/25 focus-visible:ring-emerald-400"
                                  : "border-rose-500/40 bg-rose-500/15 text-rose-200 hover:bg-rose-500/25 focus-visible:ring-rose-400"
                              }`}
                            >
                              {u.isSuspended ? t.unsuspendBtn : t.suspendBtn}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="divide-y divide-slate-800/80 md:hidden">
              {usersResult.items.map((u) => {
                const isSelf = currentUser?.id === u.id;
                return (
                  <div key={u.id} className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-700 bg-[#070b14] font-mono text-sm font-bold text-cyan-300">
                          {u.displayName.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="font-semibold text-slate-100 break-words">
                              {u.displayName}
                            </span>
                            {isSelf && (
                              <span className="rounded border border-cyan-500/40 bg-cyan-500/15 px-1.5 py-0.5 font-mono text-[9px] text-cyan-300">
                                {t.selfBadge}
                              </span>
                            )}
                          </div>
                          <span className="font-mono text-xs text-slate-400">
                            @{u.username}
                          </span>
                        </div>
                      </div>

                      <span
                        className={`shrink-0 rounded-full border px-2 py-0.5 font-mono text-[10px] font-semibold ${
                          u.isSuspended
                            ? "border-rose-500/40 bg-rose-500/15 text-rose-300"
                            : "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                        }`}
                      >
                        {u.isSuspended ? t.statusSuspended : t.statusActive}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
                      <span
                        className={`rounded-full border px-2 py-0.5 font-mono text-[10px] font-semibold ${
                          roleBadgeStyles[u.role] ?? roleBadgeStyles.member
                        }`}
                      >
                        {t.roleLabels[u.role] ?? u.role}
                      </span>
                      <span className="font-mono text-[11px]">
                        {dateFormatter.format(new Date(u.createdAt))}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                      <button
                        type="button"
                        onClick={() => setSelectedUserId(u.id)}
                        className="min-h-[38px] w-full rounded-xl border border-slate-700 bg-[#070b14] px-3 py-2 text-center text-xs font-medium text-slate-200 transition-colors hover:border-cyan-500/50 hover:text-cyan-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
                      >
                        {t.viewDetailsBtn}
                      </button>
                      <button
                        type="button"
                        disabled={
                          isSelf ||
                          (u.role === "admin" &&
                            !u.isSuspended &&
                            (summary?.activeAdminUsers ?? 1) <= 1)
                        }
                        onClick={() => setRoleTargetUser(u)}
                        className="min-h-[38px] w-full rounded-xl border border-violet-500/40 bg-violet-500/15 px-3 py-2 text-center text-xs font-medium text-violet-200 transition-colors hover:bg-violet-500/25 disabled:cursor-not-allowed disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
                      >
                        {t.changeRoleBtn}
                      </button>
                      <button
                        type="button"
                        disabled={
                          (isSelf && !u.isSuspended) ||
                          (u.role === "admin" &&
                            !u.isSuspended &&
                            (summary?.activeAdminUsers ?? 1) <= 1)
                        }
                        onClick={() => setSuspensionTargetUser(u)}
                        className={`min-h-[38px] w-full rounded-xl border px-3 py-2 text-center text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 focus:outline-none focus-visible:ring-2 ${
                          u.isSuspended
                            ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-200 hover:bg-emerald-500/25 focus-visible:ring-emerald-400"
                            : "border-rose-500/40 bg-rose-500/15 text-rose-200 hover:bg-rose-500/25 focus-visible:ring-rose-400"
                        }`}
                      >
                        {u.isSuspended ? t.unsuspendBtn : t.suspendBtn}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 bg-[#080d1a] px-5 py-3.5 text-xs text-slate-400">
              <span className="font-mono">
                {t.pageIndicator(usersResult.page, usersResult.totalPages)}
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={usersResult.page <= 1}
                  className="rounded-lg border border-slate-800 bg-[#0c1220] px-3 py-1.5 text-xs text-slate-200 transition-colors hover:border-slate-700 hover:text-white disabled:cursor-not-allowed disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
                >
                  ← {t.prevPageBtn}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setPage((p) => Math.min(usersResult.totalPages, p + 1))
                  }
                  disabled={usersResult.page >= usersResult.totalPages}
                  className="rounded-lg border border-slate-800 bg-[#0c1220] px-3 py-1.5 text-xs text-slate-200 transition-colors hover:border-slate-700 hover:text-white disabled:cursor-not-allowed disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
                >
                  {t.nextPageBtn} →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Demonstrative Audit History (Append-Only) */}
        <section
          aria-label={t.auditHistory.title}
          className="rounded-2xl border border-slate-800/90 bg-[#0c1220]/90 p-5"
        >
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-800/80 pb-4">
            <div>
              <h2 className="text-base font-bold text-white">
                {t.auditHistory.title}
              </h2>
              <p className="mt-1 text-xs text-slate-400">
                {t.auditHistory.subtitle}
              </p>
            </div>
            <span className="rounded border border-cyan-500/40 bg-cyan-500/15 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase text-cyan-300">
              {t.auditHistory.appendOnlyBadge}
            </span>
          </div>

          {loading ? (
            <p className="py-6 text-center font-mono text-xs text-slate-400">
              {t.auditHistory.loading}
            </p>
          ) : auditEntries.length === 0 ? (
            <p className="py-6 text-center text-xs text-slate-400">
              {t.auditHistory.empty}
            </p>
          ) : (
            <ul className="mt-4 space-y-2.5">
              {auditEntries.map((entry) => {
                const actionLabel =
                  t.auditHistory.actions[entry.action] ?? entry.action;
                const targetUsername =
                  typeof entry.metadata?.targetUsername === "string"
                    ? entry.metadata.targetUsername
                    : entry.entityId;
                const fromRole =
                  typeof entry.metadata?.from === "string"
                    ? entry.metadata.from
                    : null;
                const toRole =
                  typeof entry.metadata?.to === "string"
                    ? entry.metadata.to
                    : null;
                const reason =
                  entry.action === "user.suspended" &&
                  typeof entry.metadata?.reason === "string"
                    ? entry.metadata.reason
                    : null;

                return (
                  <li
                    key={entry.id}
                    className="rounded-xl border border-slate-800 bg-[#070b14] p-3.5 text-xs"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-semibold text-cyan-300">
                        {actionLabel}
                      </span>
                      <time
                        dateTime={entry.createdAt}
                        className="font-mono text-[11px] text-slate-400"
                      >
                        {dateTimeFormatter.format(new Date(entry.createdAt))}
                      </time>
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-300">
                      <span>
                        <strong className="text-slate-400">
                          {t.auditHistory.actorLabel}:
                        </strong>{" "}
                        @{entry.actorUsername}
                      </span>
                      <span>
                        <strong className="text-slate-400">
                          {t.auditHistory.targetLabel}:
                        </strong>{" "}
                        @{targetUsername}
                      </span>
                      {fromRole && toRole && (
                        <span className="font-mono text-violet-300">
                          {t.auditHistory.roleTransition(fromRole, toRole)}
                        </span>
                      )}
                    </div>
                    {reason && (
                      <p className="mt-1.5 text-[11px] text-rose-200/90">
                        <strong className="text-rose-300">
                          {t.auditHistory.reasonLabel}:
                        </strong>{" "}
                        {reason}
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* User Detail Modal */}
        <AdminUserDetailModal
          userId={selectedUserId}
          currentAdminId={currentUser?.id}
          activeAdminsCount={summary?.activeAdminUsers ?? 1}
          onClose={() => setSelectedUserId(null)}
          onOpenRoleModal={(target) => setRoleTargetUser(target)}
          onOpenSuspensionModal={(target) => setSuspensionTargetUser(target)}
        />

        {/* Role Change Modal */}
        <AdminUserRoleModal
          key={roleTargetUser?.id ?? "role-modal-closed"}
          user={roleTargetUser}
          activeAdminsCount={summary?.activeAdminUsers ?? 1}
          onClose={() => setRoleTargetUser(null)}
          onSuccess={() => {
            void handleRefresh();
          }}
        />

        {/* Suspension / Reactivation Modal */}
        <AdminUserSuspensionModal
          key={
            suspensionTargetUser
              ? `${suspensionTargetUser.id}-${suspensionTargetUser.isSuspended ? "s" : "a"}`
              : "suspension-modal-closed"
          }
          user={suspensionTargetUser}
          activeAdminsCount={summary?.activeAdminUsers ?? 1}
          onClose={() => setSuspensionTargetUser(null)}
          onSuccess={() => {
            void handleRefresh();
          }}
        />
      </div>
    </AdminGuard>
  );
}
