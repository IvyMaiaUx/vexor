"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { useEffect, useState } from "react";
import { adminDataProvider } from "@/features/admin/services/admin-provider";
import type { AdminStats } from "@/features/admin/types";
import { useAuthStore } from "@/features/auth/use-auth-store";
import { useI18n } from "@/lib/i18n/context";

interface AdminSidebarProps {
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
  statsOverride?: AdminStats | null;
}

type AdminIconKey =
  | "dashboard"
  | "moderation"
  | "reports"
  | "research"
  | "catalog"
  | "forum"
  | "users"
  | "audit";

function AdminNavIcon({ name }: { name: AdminIconKey }) {
  const cls = "h-5 w-5 shrink-0";
  switch (name) {
    case "dashboard":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={cls} aria-hidden="true">
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
      );
    case "moderation":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={cls} aria-hidden="true">
          <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" />
        </svg>
      );
    case "reports":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={cls} aria-hidden="true">
          <path d="M5 21V4h11l-2 4 2 4H5" />
        </svg>
      );
    case "research":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={cls} aria-hidden="true">
          <path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-9V3" />
        </svg>
      );
    case "catalog":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={cls} aria-hidden="true">
          <path d="M5 4h12a2 2 0 0 1 2 2v14H7a2 2 0 0 1-2-2zM5 18a2 2 0 0 1 2-2h12" />
        </svg>
      );
    case "forum":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={cls} aria-hidden="true">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      );
    case "users":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={cls} aria-hidden="true">
          <circle cx="9" cy="8" r="3.5" />
          <path d="M2 20a7 7 0 0 1 14 0M16 4.5a3.5 3.5 0 0 1 0 7M22 20a7 7 0 0 0-4-6.3" />
        </svg>
      );
    case "audit":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={cls} aria-hidden="true">
          <path d="M7 3h7l5 5v13H7zM14 3v5h5M10 13h6M10 17h6" />
        </svg>
      );
  }
}

function LockIcon({ label }: { label: string }) {
  return (
    <span className="text-amber-400" aria-label={label} title={label}>
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-4 w-4"
        aria-hidden="true"
      >
        <rect x="5" y="11" width="14" height="9" rx="2" />
        <path d="M8 11V8a4 4 0 0 1 8 0v3" />
      </svg>
    </span>
  );
}

interface NavItem {
  href: string;
  labelPt: string;
  labelEn: string;
  icon: AdminIconKey;
  adminOnly?: boolean;
  getBadgeCount?: (stats: AdminStats | null) => number;
}

export function AdminSidebar({
  mobileOpen = false,
  onCloseMobile,
  statsOverride,
}: AdminSidebarProps) {
  const pathname = usePathname();
  const { locale } = useI18n();
  const isPt = locale === "pt-BR";
  const user = useAuthStore((s) => s.user);
  const [fetchedStats, setFetchedStats] = useState<AdminStats | null>(null);
  const stats = statsOverride !== undefined ? statsOverride : fetchedStats;

  useEffect(() => {
    if (statsOverride !== undefined) return;
    let mounted = true;
    adminDataProvider.dashboard
      .getDashboardStats()
      .then((res) => {
        if (mounted) setFetchedStats(res);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, [pathname, statsOverride]);

  const moderationItems: NavItem[] = [
    {
      href: "/admin/moderation",
      labelPt: "Moderação",
      labelEn: "Moderation",
      icon: "moderation",
      getBadgeCount: (s) =>
        (s?.pendingResources || 0) +
        (s?.pendingResearch || 0) +
        (s?.totalTopics || 0),
    },
    {
      href: "/admin/reports",
      labelPt: "Denúncias",
      labelEn: "Reports",
      icon: "reports",
      getBadgeCount: (s) => s?.openReports || 0,
    },
    {
      href: "/admin/research",
      labelPt: "Cybercrime Research",
      labelEn: "Cybercrime Research",
      icon: "research",
      getBadgeCount: (s) => s?.pendingResearch || 0,
    },
    {
      href: "/admin/catalog",
      labelPt: "Catálogo",
      labelEn: "Catalog",
      icon: "catalog",
      getBadgeCount: (s) => s?.pendingResources || 0,
    },
    {
      href: "/admin/forum",
      labelPt: "Fórum",
      labelEn: "Forum",
      icon: "forum",
    },
  ];

  const adminItems: NavItem[] = [
    {
      href: "/admin/users",
      labelPt: "Usuários",
      labelEn: "Users",
      icon: "users",
      adminOnly: true,
    },
    {
      href: "/admin/audit",
      labelPt: "Auditoria",
      labelEn: "Audit",
      icon: "audit",
      adminOnly: true,
    },
  ];

  const isActivePath = (href: string) =>
    href === "/admin" ? pathname === "/admin" : Boolean(pathname?.startsWith(href));

  const renderLink = (item: NavItem) => {
    const active = isActivePath(item.href);
    const badgeCount = item.getBadgeCount ? item.getBadgeCount(stats) : 0;
    const label = isPt ? item.labelPt : item.labelEn;

    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={onCloseMobile}
        className={`flex min-h-[48px] items-center gap-3 rounded-xl px-3 text-[15px] font-medium transition-colors ${
          active
            ? "border border-cyan-500/40 bg-cyan-500/15 text-cyan-300"
            : "border border-transparent text-slate-200 hover:bg-slate-800/50 hover:text-white"
        }`}
      >
        <AdminNavIcon name={item.icon} />
        <span className="flex-1 truncate">{label}</span>
        {badgeCount > 0 && (
          <span className="inline-flex h-[22px] min-w-[24px] items-center justify-center rounded-md border border-cyan-500/40 bg-cyan-500/10 px-1.5 font-mono text-[11px] font-semibold text-cyan-300">
            {badgeCount}
          </span>
        )}
        {item.adminOnly && (
          <LockIcon label={isPt ? "Somente admin" : "Admin only"} />
        )}
      </Link>
    );
  };

  const initials = (user?.displayName || user?.username || "AD")
    .slice(0, 2)
    .toUpperCase();

  const renderContent = () => (
    <div className="flex h-full flex-col justify-between p-4">
      <div className="space-y-4 overflow-y-auto">
        {/* Brand Header */}
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-cyan-500/40 bg-[#0b1220] text-cyan-400">
            <AdminNavIcon name="moderation" />
          </span>
          <div className="min-w-0 flex-1">
            <span className="font-mono text-base font-bold tracking-wider text-slate-100">
              VEXOR <span className="text-cyan-400">ADMIN</span>
            </span>
          </div>
          {onCloseMobile && (
            <button
              type="button"
              onClick={onCloseMobile}
              aria-label={isPt ? "Fechar menu" : "Close menu"}
              className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-800 bg-[#0b1220] text-slate-300 hover:border-slate-700 hover:text-white lg:hidden"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          )}
        </div>

        {/* Grouped Navigation */}
        <nav
          aria-label={isPt ? "Navegação do painel" : "Admin navigation"}
          className="space-y-4"
        >
          <div>
            {renderLink({
              href: "/admin",
              labelPt: "Visão geral",
              labelEn: "Overview",
              icon: "dashboard",
            })}
          </div>

          <div>
            <p className="mb-1.5 px-3 font-mono text-[11px] font-semibold uppercase tracking-widest text-slate-500">
              {isPt ? "Moderação" : "Moderation"}
            </p>
            <div className="space-y-1">{moderationItems.map(renderLink)}</div>
          </div>

          <div>
            <p className="mb-1.5 px-3 font-mono text-[11px] font-semibold uppercase tracking-widest text-slate-500">
              {isPt ? "Administração" : "Administration"}
            </p>
            <div className="space-y-1">{adminItems.map(renderLink)}</div>
          </div>
        </nav>
      </div>

      {/* Footer: Profile + Back to Platform */}
      <div className="mt-4 space-y-2 border-t border-slate-800/80 pt-4">
        {user && (
          <Link
            href="/profile"
            onClick={onCloseMobile}
            className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-[#0b1220] p-3 transition-colors hover:border-slate-700"
          >
            <span className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-cyan-500/15 font-mono text-sm font-bold text-cyan-300">
              {user.avatarUrl ? (
                <Image
                  src={user.avatarUrl}
                  alt={user.displayName || user.username}
                  width={40}
                  height={40}
                  unoptimized
                  className="h-full w-full object-cover"
                />
              ) : (
                initials
              )}
            </span>
            <div className="min-w-0 flex-1">
              <div className="truncate font-mono text-sm font-semibold text-emerald-400">
                @{user.username}
              </div>
              {user.displayName && (
                <div className="truncate text-xs text-slate-400">
                  {user.displayName}
                </div>
              )}
            </div>
          </Link>
        )}

        <Link
          href="/"
          onClick={onCloseMobile}
          className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl border border-slate-800 bg-[#0b1220] px-4 text-sm font-medium text-slate-200 transition-colors hover:border-cyan-500/40 hover:text-cyan-300"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]" aria-hidden="true">
            <path d="M9 14L4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3" />
          </svg>
          <span>{isPt ? "Voltar à plataforma" : "Back to platform"}</span>
        </Link>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden w-64 shrink-0 border-r border-slate-800/80 bg-[#080e1a] lg:block">
        <div className="sticky top-15 h-[calc(100vh-3.75rem)] overflow-y-auto">
          {renderContent()}
        </div>
      </aside>

      {/* Mobile Drawer ("Mais") */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-50 flex lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label={isPt ? "Menu administrativo" : "Admin menu"}
        >
          <div
            className="fixed inset-0 bg-black/75 backdrop-blur-sm"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <aside className="relative z-10 flex h-full w-full max-w-[320px] flex-col border-r border-slate-800 bg-[#060b14] shadow-2xl">
            {renderContent()}
          </aside>
        </div>
      )}
    </>
  );
}
