"use client";

import Image from "next/image";
import Link from "next/link";
import React, { useCallback, useEffect, useState } from "react";
import {
  adminDataProvider,
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
  const { locale } = useI18n();
  const isPt = locale === "pt-BR";
  const currentUser = useAuthStore((s) => s.user);

  const [searchInput, setSearchInput] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<DbUserRole | "all">("all");
  const [statusFilter, setStatusFilter] = useState<AdminUserStatus | "all">(
    "all"
  );
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("all");
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);

  const [usersResult, setUsersResult] = useState<PaginatedResult<AdminUser>>({
    items: [],
    total: 0,
    page: 1,
    pageSize: 50,
    totalPages: 1,
  });
  const [summary, setSummary] = useState<AdminUsersSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const [openMenuUserId, setOpenMenuUserId] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [roleTargetUser, setRoleTargetUser] = useState<AdminUser | null>(null);
  const [suspensionTargetUser, setSuspensionTargetUser] =
    useState<AdminUser | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchInput.trim());
    }, 250);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const fetchUsersSnapshot = useCallback(async () => {
    const [listRes, summaryRes] = await Promise.all([
      adminDataProvider.users.listUsers(
        {
          query: debouncedQuery || undefined,
          role: roleFilter,
          status: statusFilter,
          period: periodFilter,
        },
        { page: 1, pageSize: 50 }
      ),
      adminDataProvider.users.getUsersSummary(),
    ]);
    return { listRes, summaryRes };
  }, [debouncedQuery, roleFilter, statusFilter, periodFilter]);

  useEffect(() => {
    let active = true;
    fetchUsersSnapshot()
      .then(({ listRes, summaryRes }) => {
        if (!active) return;
        setUsersResult(listRes);
        setSummary(summaryRes);
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

  useEffect(() => {
    if (!openMenuUserId) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenMenuUserId(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [openMenuUserId]);

  const handleRefresh = useCallback(async () => {
    try {
      const { listRes, summaryRes } = await fetchUsersSnapshot();
      setUsersResult(listRes);
      setSummary(summaryRes);
      setLoadError(false);
    } catch {
      setLoadError(true);
    }
  }, [fetchUsersSnapshot]);

  const dateFormatter = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const roleLabel = (role: DbUserRole) => {
    if (role === "admin") return "Admin";
    if (role === "moderator") return isPt ? "Moderador" : "Moderator";
    return isPt ? "Membro" : "Member";
  };

  const roleBadgeClass = (role: DbUserRole) => {
    if (role === "admin") {
      return "border-indigo-500/40 bg-indigo-500/15 text-indigo-300";
    }
    if (role === "moderator") {
      return "border-cyan-500/40 bg-cyan-500/10 text-cyan-300";
    }
    return "border-slate-700 bg-slate-800/80 text-slate-300";
  };

  const totalUsers = summary?.totalUsers ?? usersResult.total;
  const hasSheetFilters =
    roleFilter !== "all" || statusFilter !== "all" || periodFilter !== "all";

  return (
    <AdminGuard requireAdmin={true}>
      <div className="space-y-3">
        {/* Header */}
        <div>
          <h1 className="text-[26px] font-bold leading-tight tracking-tight text-slate-100">
            {isPt ? "Usuários" : "Users"}
          </h1>
          <p className="mt-0.5 text-sm text-slate-400">
            {isPt
              ? `${totalUsers} ${totalUsers === 1 ? "conta cadastrada" : "contas cadastradas"}`
              : `${totalUsers} registered ${totalUsers === 1 ? "account" : "accounts"}`}
          </p>
        </div>

        {/* Summary Strip */}
        <div className="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <span className="inline-flex min-h-[40px] shrink-0 items-center gap-1.5 rounded-full border border-slate-800 bg-[#0b1220] px-3.5 text-sm text-slate-300">
            <strong className="font-mono text-slate-100">
              {summary?.totalUsers ?? 0}
            </strong>
            <span>{isPt ? "total" : "total"}</span>
          </span>
          <span className="inline-flex min-h-[40px] shrink-0 items-center gap-1.5 rounded-full border border-slate-800 bg-[#0b1220] px-3.5 text-sm text-slate-300">
            <strong className="font-mono text-emerald-400">
              {summary?.activeUsers ?? 0}
            </strong>
            <span>{isPt ? "ativos" : "active"}</span>
          </span>
          <span className="inline-flex min-h-[40px] shrink-0 items-center gap-1.5 rounded-full border border-slate-800 bg-[#0b1220] px-3.5 text-sm text-slate-300">
            <strong className="font-mono text-rose-300">
              {summary?.suspendedUsers ?? 0}
            </strong>
            <span>{isPt ? "suspensos" : "suspended"}</span>
          </span>
          <span className="inline-flex min-h-[40px] shrink-0 items-center gap-1.5 rounded-full border border-slate-800 bg-[#0b1220] px-3.5 text-sm text-slate-300">
            <strong className="font-mono text-indigo-300">
              {summary?.adminUsers ?? 0}
            </strong>
            <span>admins</span>
          </span>
          <span className="inline-flex min-h-[40px] shrink-0 items-center gap-1.5 rounded-full border border-slate-800 bg-[#0b1220] px-3.5 text-sm text-slate-300">
            <strong className="font-mono text-cyan-400">
              {summary?.moderatorUsers ?? 0}
            </strong>
            <span>{isPt ? "moderadores" : "moderators"}</span>
          </span>
        </div>

        {/* Search + Filter Button */}
        <div className="flex gap-2">
          <label className="flex min-h-[48px] flex-1 items-center gap-2 rounded-xl border border-slate-800 bg-[#0b1220] px-3 text-slate-400 focus-within:border-cyan-500/60">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px] shrink-0" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4.3-4.3" />
            </svg>
            <input
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder={
                isPt
                  ? "Buscar por nome ou @username"
                  : "Search by name or @username"
              }
              aria-label={isPt ? "Buscar" : "Search"}
              className="w-full min-w-0 bg-transparent text-[15px] text-slate-100 placeholder:text-slate-500 focus:outline-none"
            />
          </label>

          <button
            type="button"
            onClick={() => setFilterSheetOpen(true)}
            aria-label={isPt ? "Filtros" : "Filters"}
            className="relative inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-slate-800 bg-[#0b1220] text-slate-200 transition-colors hover:border-cyan-500/50 hover:text-cyan-300"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-[22px] w-[22px]" aria-hidden="true">
              <path d="M3 5h18M6 12h12M10 19h4" />
            </svg>
            {hasSheetFilters && (
              <span
                aria-hidden="true"
                className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-cyan-400"
              />
            )}
          </button>
        </div>

        {/* User Cards */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-24 animate-pulse rounded-2xl border border-slate-800 bg-[#0b1220]/70"
              />
            ))}
          </div>
        ) : loadError ? (
          <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 p-6 text-center">
            <p className="text-sm text-rose-200">
              {isPt
                ? "Não foi possível carregar os usuários."
                : "Could not load users."}
            </p>
            <button
              type="button"
              onClick={() => void handleRefresh()}
              className="mt-3 inline-flex min-h-[44px] items-center rounded-xl bg-rose-500/20 px-4 text-xs font-semibold text-rose-200"
            >
              {isPt ? "Tentar novamente" : "Retry"}
            </button>
          </div>
        ) : usersResult.items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-800 bg-[#0b1220]/50 p-10 text-center text-sm text-slate-400">
            {isPt ? "Nenhum usuário encontrado." : "No users found."}
          </div>
        ) : (
          <div className="space-y-2.5">
            {usersResult.items.map((u) => {
              const isSelf = Boolean(currentUser && currentUser.id === u.id);
              const initial = (u.displayName || u.username || "V")
                .slice(0, 1)
                .toUpperCase();
              const isMenuOpen = openMenuUserId === u.id;

              return (
                <article
                  key={u.id}
                  className="rounded-2xl border border-slate-800 bg-[#0b1220] p-3.5 space-y-2"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-cyan-500/15 font-mono text-base font-bold text-cyan-300">
                      {u.avatarUrl ? (
                        <Image
                          src={u.avatarUrl}
                          alt={u.displayName || u.username}
                          width={44}
                          height={44}
                          unoptimized
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        initial
                      )}
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="truncate text-[15px] font-semibold text-slate-100">
                          {u.displayName || `@${u.username}`}
                        </span>
                        {isSelf && (
                          <span className="inline-flex h-[20px] items-center rounded border border-cyan-500/40 bg-cyan-500/10 px-1.5 font-mono text-[10px] font-semibold text-cyan-300">
                            {isPt ? "Você" : "You"}
                          </span>
                        )}
                      </div>
                      <div className="truncate font-mono text-[13px] text-slate-400">
                        @{u.username}
                      </div>
                    </div>

                    <div className="relative">
                      <button
                        type="button"
                        disabled={isSelf}
                        aria-label={isPt ? "Ações do usuário" : "User actions"}
                        aria-expanded={isMenuOpen}
                        aria-haspopup="menu"
                        onClick={() =>
                          setOpenMenuUserId((prev) =>
                            prev === u.id ? null : u.id
                          )
                        }
                        className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-slate-300 transition-colors hover:bg-slate-800/70 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <span aria-hidden="true" className="text-lg font-bold leading-none">
                          ⋯
                        </span>
                      </button>

                      {isMenuOpen && !isSelf && (
                        <div
                          role="menu"
                          className="absolute right-0 top-12 z-20 min-w-[180px] rounded-xl border border-slate-800 bg-[#070b14] p-1.5 shadow-xl"
                        >
                          <button
                            type="button"
                            role="menuitem"
                            onClick={() => {
                              setOpenMenuUserId(null);
                              setSelectedUserId(u.id);
                            }}
                            className="flex min-h-[44px] w-full items-center rounded-lg px-3 text-left text-xs font-medium text-slate-200 hover:bg-slate-800/70"
                          >
                            {isPt ? "Detalhes" : "Details"}
                          </button>
                          <button
                            type="button"
                            role="menuitem"
                            onClick={() => {
                              setOpenMenuUserId(null);
                              setRoleTargetUser(u);
                            }}
                            className="flex min-h-[44px] w-full items-center rounded-lg px-3 text-left text-xs font-medium text-slate-200 hover:bg-slate-800/70"
                          >
                            {isPt ? "Alterar papel" : "Change role"}
                          </button>
                          <button
                            type="button"
                            role="menuitem"
                            onClick={() => {
                              setOpenMenuUserId(null);
                              setSuspensionTargetUser(u);
                            }}
                            className={`flex min-h-[44px] w-full items-center rounded-lg px-3 text-left text-xs font-semibold ${
                              u.isSuspended
                                ? "text-emerald-300 hover:bg-emerald-500/15"
                                : "text-rose-300 hover:bg-rose-500/15"
                            }`}
                          >
                            {u.isSuspended
                              ? isPt
                                ? "Reativar conta"
                                : "Reactivate"
                              : isPt
                                ? "Suspender"
                                : "Suspend"}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    <span
                      className={`inline-flex h-[22px] items-center rounded-md border px-2 font-mono text-[11px] font-semibold ${roleBadgeClass(u.role)}`}
                    >
                      {roleLabel(u.role)}
                    </span>
                    <span
                      className={`inline-flex h-[22px] items-center rounded-md border px-2 font-mono text-[11px] font-semibold ${
                        u.isSuspended
                          ? "border-rose-500/40 bg-rose-500/10 text-rose-300"
                          : "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                      }`}
                    >
                      {u.isSuspended
                        ? isPt
                          ? "Suspenso"
                          : "Suspended"
                        : isPt
                          ? "Ativo"
                          : "Active"}
                    </span>
                    <span className="ml-auto text-xs text-slate-400">
                      {isPt ? "desde" : "since"}{" "}
                      {dateFormatter.format(new Date(u.createdAt))}
                    </span>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {/* Link to Access Change History */}
        <Link
          href="/admin/audit?entity=profile"
          className="flex min-h-[52px] items-center justify-between rounded-2xl border border-slate-800 bg-[#0b1220] px-4 text-sm font-medium text-slate-100 transition-colors hover:border-cyan-500/40 hover:text-cyan-300"
        >
          <span>
            {isPt
              ? "Histórico de alterações de acesso"
              : "Access change history"}
          </span>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px] text-slate-400" aria-hidden="true">
            <path d="M9 6l6 6-6 6" />
          </svg>
        </Link>

        {/* Filter Sheet */}
        {filterSheetOpen && (
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-4"
            onClick={() => setFilterSheetOpen(false)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-t-3xl border border-slate-800 bg-[#0b1220] px-5 pb-6 pt-3 space-y-4 sm:rounded-3xl sm:p-6"
            >
              <div className="mx-auto h-1 w-10 rounded-full bg-slate-700 sm:hidden" />
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-100">
                  {isPt ? "Filtros" : "Filters"}
                </h2>
                <button
                  type="button"
                  onClick={() => {
                    setRoleFilter("all");
                    setStatusFilter("all");
                    setPeriodFilter("all");
                  }}
                  className="min-h-[44px] px-2 text-sm text-slate-400 hover:text-slate-200"
                >
                  {isPt ? "Limpar tudo" : "Clear all"}
                </button>
              </div>

              <div>
                <p className="mb-2 font-mono text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  {isPt ? "Papel" : "Role"}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {(
                    [
                      { id: "all", label: isPt ? "Todos" : "All" },
                      { id: "admin", label: "Admin" },
                      { id: "moderator", label: isPt ? "Moderador" : "Moderator" },
                      { id: "member", label: isPt ? "Membro" : "Member" },
                    ] as const
                  ).map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setRoleFilter(opt.id)}
                      className={`min-h-[40px] rounded-full border px-3.5 text-sm ${
                        roleFilter === opt.id
                          ? "border-cyan-500/50 bg-cyan-500/15 text-cyan-300"
                          : "border-slate-800 bg-[#080e1a] text-slate-300"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-2 font-mono text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  {isPt ? "Situação" : "Status"}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {(
                    [
                      { id: "all", label: isPt ? "Todas" : "All" },
                      { id: "active", label: isPt ? "Ativo" : "Active" },
                      { id: "suspended", label: isPt ? "Suspenso" : "Suspended" },
                    ] as const
                  ).map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setStatusFilter(opt.id)}
                      className={`min-h-[40px] rounded-full border px-3.5 text-sm ${
                        statusFilter === opt.id
                          ? "border-cyan-500/50 bg-cyan-500/15 text-cyan-300"
                          : "border-slate-800 bg-[#080e1a] text-slate-300"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setFilterSheetOpen(false)}
                className="inline-flex min-h-[48px] w-full items-center justify-center rounded-xl bg-cyan-500 text-sm font-bold text-slate-950 hover:bg-cyan-400"
              >
                {isPt ? "Aplicar filtros" : "Apply filters"}
              </button>
            </div>
          </div>
        )}

        {/* Existing User Modals (server-validated & audited) */}
        {selectedUserId && (
          <AdminUserDetailModal
            userId={selectedUserId}
            currentAdminId={currentUser?.id}
            activeAdminsCount={summary?.adminUsers ?? 1}
            onClose={() => setSelectedUserId(null)}
            onOpenRoleModal={(u) => {
              setSelectedUserId(null);
              setRoleTargetUser(u);
            }}
            onOpenSuspensionModal={(u) => {
              setSelectedUserId(null);
              setSuspensionTargetUser(u);
            }}
          />
        )}

        {roleTargetUser && (
          <AdminUserRoleModal
            user={roleTargetUser}
            activeAdminsCount={summary?.adminUsers ?? 1}
            onClose={() => setRoleTargetUser(null)}
            onSuccess={() => {
              setRoleTargetUser(null);
              void handleRefresh();
            }}
          />
        )}

        {suspensionTargetUser && (
          <AdminUserSuspensionModal
            user={suspensionTargetUser}
            activeAdminsCount={summary?.adminUsers ?? 1}
            onClose={() => setSuspensionTargetUser(null)}
            onSuccess={() => {
              setSuspensionTargetUser(null);
              void handleRefresh();
            }}
          />
        )}
      </div>
    </AdminGuard>
  );
}
