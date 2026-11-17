"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/features/auth/use-auth-store";
import { useI18n } from "@/lib/i18n/context";
import { adminDataProvider } from "@/features/admin/services/admin-provider";
import type { AdminStats } from "@/features/admin/types";

interface AdminSidebarProps {
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

interface NavItem {
  href: string;
  labelKey: keyof ReturnType<typeof useI18n>["dict"]["adminPanel"]["sidebar"];
  icon: string;
  adminOnly?: boolean;
  getBadgeCount?: (stats: AdminStats | null) => number;
}

export function AdminSidebar({ mobileOpen = false, onCloseMobile }: AdminSidebarProps) {
  const pathname = usePathname();
  const { dict } = useI18n();
  const user = useAuthStore((s) => s.user);
  const isAdmin = useAuthStore((s) => s.isAdmin);
  const [stats, setStats] = useState<AdminStats | null>(null);

  useEffect(() => {
    let mounted = true;
    adminDataProvider.dashboard
      .getDashboardStats()
      .then((res) => {
        if (mounted) setStats(res);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, [pathname]);

  const navItems: NavItem[] = [
    {
      href: "/admin",
      labelKey: "dashboard",
      icon: "📊",
    },
    {
      href: "/admin/moderation",
      labelKey: "moderation",
      icon: "⚖️",
      getBadgeCount: (s) => (s?.pendingResources || 0) + (s?.pendingResearch || 0),
    },
    {
      href: "/admin/catalog",
      labelKey: "catalog",
      icon: "📚",
      getBadgeCount: (s) => s?.pendingResources || 0,
    },
    {
      href: "/admin/forum",
      labelKey: "forum",
      icon: "💬",
    },
    {
      href: "/admin/research",
      labelKey: "research",
      icon: "🔬",
      getBadgeCount: (s) => s?.pendingResearch || 0,
    },
    {
      href: "/admin/reports",
      labelKey: "reports",
      icon: "🚨",
      getBadgeCount: (s) => s?.openReports || 0,
    },
    {
      href: "/admin/users",
      labelKey: "users",
      icon: "👥",
      adminOnly: true,
    },
    {
      href: "/admin/audit",
      labelKey: "audit",
      icon: "📜",
      adminOnly: true,
    },
  ];

  const renderContent = () => (
    <div className="flex h-full flex-col justify-between p-4">
      {/* Top / Brand + Nav */}
      <div className="flex flex-col gap-6">
        {/* Brand Header */}
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
          <Link
            href="/admin"
            onClick={onCloseMobile}
            className="flex items-center gap-2.5 transition-opacity hover:opacity-90"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-cyan-500/40 bg-cyan-500/10 font-mono text-base font-bold text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.2)]">
              🛡️
            </div>
            <div className="flex flex-col">
              <span className="font-mono text-sm font-bold tracking-wider text-slate-100">
                VEXOR <span className="text-cyan-400">ADMIN</span>
              </span>
              <span className="font-mono text-[10px] text-slate-400">
                {dict.adminPanel.sidebar.title}
              </span>
            </div>
          </Link>

          {/* Close button for mobile drawer */}
          {onCloseMobile && (
            <button
              type="button"
              onClick={onCloseMobile}
              aria-label="Fechar navegação"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-800 bg-[#0c1220] text-slate-400 hover:text-slate-200 lg:hidden"
            >
              ✕
            </button>
          )}
        </div>

        {/* Navigation list */}
        <nav aria-label="Navegação Administrativa" className="flex flex-col gap-1.5">
          {navItems.map((item) => {
            const isExactActive = pathname === item.href;
            const isNestedActive =
              item.href !== "/admin" && pathname?.startsWith(item.href);
            const isActive = isExactActive || isNestedActive;
            const badgeCount = item.getBadgeCount ? item.getBadgeCount(stats) : 0;
            const label = dict.adminPanel.sidebar[item.labelKey] as string;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onCloseMobile}
                className={`group flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                  isActive
                    ? "border border-cyan-500/40 bg-cyan-500/15 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.15)]"
                    : "text-slate-300 hover:border-slate-700/60 hover:bg-slate-800/40 hover:text-slate-100"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-base">{item.icon}</span>
                  <span className="truncate">{label}</span>
                </div>

                <div className="flex items-center gap-1.5">
                  {/* Real-time pending count badge */}
                  {badgeCount > 0 && (
                    <span
                      className="rounded-full bg-rose-500/20 px-2 py-0.5 font-mono text-[11px] font-bold text-rose-300 ring-1 ring-rose-500/40"
                      title={`${badgeCount} itens pendentes de ação`}
                    >
                      {badgeCount}
                    </span>
                  )}

                  {/* Admin-only tag */}
                  {item.adminOnly && (
                    <span
                      className={`rounded px-1.5 py-0.2 font-mono text-[10px] font-semibold uppercase ${
                        isAdmin
                          ? "border border-amber-500/30 bg-amber-500/10 text-amber-300"
                          : "border border-slate-700 bg-slate-800 text-slate-400"
                      }`}
                      title={
                        isAdmin
                          ? "Acesso Root Liberado"
                          : "Requer privilégios de Administrador (Root)"
                      }
                    >
                      {dict.adminPanel.sidebar.adminOnlyBadge}
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Bottom Area / User Info + Back link */}
      <div className="flex flex-col gap-3 border-t border-slate-800/80 pt-4">
        {/* User Card */}
        {user && (
          <div className="flex items-center justify-between rounded-xl border border-slate-800/80 bg-[#0a0f1d] p-2.5">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-700 bg-slate-800 font-mono text-xs font-bold text-cyan-300">
                {user.username.slice(0, 2).toUpperCase()}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="truncate font-mono text-xs font-semibold text-slate-200">
                  @{user.username}
                </span>
                <span className="truncate text-[10px] text-slate-400">
                  {user.displayName}
                </span>
              </div>
            </div>

            <span
              className={`shrink-0 rounded px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase ${
                isAdmin
                  ? "border border-amber-500/40 bg-amber-500/20 text-amber-300"
                  : "border border-cyan-500/40 bg-cyan-500/20 text-cyan-300"
              }`}
            >
              {isAdmin
                ? dict.adminPanel.sidebar.roleAdminBadge
                : dict.adminPanel.sidebar.roleModBadge}
            </span>
          </div>
        )}

        {/* Back to main platform */}
        <Link
          href="/"
          onClick={onCloseMobile}
          className="flex items-center justify-center gap-2 rounded-xl border border-slate-800 bg-[#0d1322] px-3 py-2 text-xs font-medium text-slate-300 transition-colors hover:border-slate-700 hover:text-white"
        >
          <span>↩️</span>
          <span>{dict.adminPanel.sidebar.backToSite}</span>
        </Link>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar (lg+) */}
      <aside
        aria-label="Sidebar Administrativa"
        className="hidden w-64 shrink-0 border-r border-slate-800/80 bg-[#070b14]/95 backdrop-blur-md lg:flex lg:flex-col lg:min-h-[calc(100vh-4rem)]"
      >
        {renderContent()}
      </aside>

      {/* Mobile Drawer Overlay (< lg) */}
      {mobileOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Menu Administrativo Mobile"
          className="fixed inset-0 z-50 flex lg:hidden"
        >
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
            onClick={onCloseMobile}
            aria-hidden="true"
          />

          {/* Drawer content */}
          <div className="relative z-10 flex h-full w-4/5 max-w-xs flex-col bg-[#070b14] shadow-2xl">
            {renderContent()}
          </div>
        </div>
      )}
    </>
  );
}
