"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { useEffect, useState } from "react";
import { SignOutErrorBanner } from "@/components/auth/sign-out-error-banner";
import { AdminGuard } from "@/features/admin/components/admin-guard";
import { AdminSidebar } from "@/features/admin/components/admin-sidebar";
import { adminDataProvider } from "@/features/admin/services/admin-provider";
import type { AdminStats } from "@/features/admin/types";
import { useAuthStore } from "@/features/auth/use-auth-store";
import { useI18n } from "@/lib/i18n/context";

function getAdminPageTitle(pathname: string | null, isPt: boolean): string {
  if (!pathname || pathname === "/admin") {
    return isPt ? "Visão geral" : "Overview";
  }
  if (pathname.startsWith("/admin/moderation")) {
    return isPt ? "Moderação" : "Moderation";
  }
  if (pathname.startsWith("/admin/reports")) {
    return isPt ? "Denúncias" : "Reports";
  }
  if (pathname.startsWith("/admin/users")) {
    return isPt ? "Usuários" : "Users";
  }
  if (pathname.startsWith("/admin/audit")) {
    return isPt ? "Auditoria" : "Audit";
  }
  if (pathname.startsWith("/admin/catalog")) {
    return isPt ? "Catálogo" : "Catalog";
  }
  if (pathname.startsWith("/admin/forum")) {
    return isPt ? "Fórum" : "Forum";
  }
  if (pathname.startsWith("/admin/research")) {
    return "Research";
  }
  return isPt ? "Visão geral" : "Overview";
}

export function AdminLayoutShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const user = useAuthStore((s) => s.user);
  const { dict, locale } = useI18n();
  const isPt = locale === "pt-BR";

  useEffect(() => {
    let active = true;
    adminDataProvider.dashboard
      .getDashboardStats()
      .then((res) => {
        if (active) setStats(res);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [pathname]);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileMenuOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mobileMenuOpen]);

  const pageTitle = getAdminPageTitle(pathname, isPt);
  const moderationBadgeCount =
    (stats?.pendingResources || 0) +
    (stats?.pendingResearch || 0) +
    (stats?.totalTopics || 0);
  const initials = (user?.displayName || user?.username || "AD")
    .slice(0, 2)
    .toUpperCase();

  const isMoreActive = Boolean(
    pathname &&
      (pathname.startsWith("/admin/audit") ||
        pathname.startsWith("/admin/research") ||
        pathname.startsWith("/admin/catalog") ||
        pathname.startsWith("/admin/forum"))
  );

  return (
    <AdminGuard>
      <div className="flex min-h-screen flex-col bg-[#060b14] text-slate-100">
        {/* Top Bar: Menu + "Admin / página" + Avatar (NO ROOT ADMIN badge) */}
        <header
          role="banner"
          className="sticky top-0 z-40 flex h-[60px] items-center justify-between border-b border-slate-800/90 bg-[#080e1a]/95 px-3 backdrop-blur-md sm:px-5"
        >
          <div className="flex min-w-0 items-center gap-2.5">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label={isPt ? "Menu" : "Menu"}
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-800 bg-[#0b1220] text-slate-200 transition-colors hover:border-cyan-500/40 hover:text-cyan-300 lg:hidden"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-[22px] w-[22px]" aria-hidden="true">
                <path d="M4 7h16M4 12h16M4 17h16" />
              </svg>
            </button>

            <div className="truncate text-[15px] text-slate-400">
              <Link href="/admin" className="hover:text-slate-200">
                Admin
              </Link>
              <span className="mx-1.5 text-slate-600">/</span>
              <span className="font-semibold text-slate-100">{pageTitle}</span>
            </div>
          </div>

          <Link
            href="/profile"
            aria-label={user ? `@${user.username}` : isPt ? "Perfil" : "Profile"}
            className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-cyan-500/15 font-mono text-xs font-bold text-cyan-300 ring-1 ring-cyan-500/30 transition-opacity hover:opacity-90"
          >
            {user?.avatarUrl ? (
              <Image
                src={user.avatarUrl}
                alt={user.displayName || user.username}
                width={36}
                height={36}
                unoptimized
                className="h-full w-full object-cover"
              />
            ) : (
              initials
            )}
          </Link>
        </header>

        <SignOutErrorBanner dict={dict} />

        {/* Main Shell */}
        <div className="flex flex-1">
          <AdminSidebar
            mobileOpen={mobileMenuOpen}
            onCloseMobile={() => setMobileMenuOpen(false)}
            statsOverride={stats}
          />

          <main className="min-w-0 flex-1 px-4 pb-24 pt-4 sm:px-6 sm:pt-6 lg:px-8 lg:pb-10">
            <div className="mx-auto max-w-6xl">{children}</div>
          </main>
        </div>

        {/* Mobile Bottom Navigation Bar */}
        <nav
          aria-label={isPt ? "Navegação do admin" : "Admin navigation"}
          className="fixed inset-x-0 bottom-0 z-40 flex h-[72px] items-end justify-around border-t border-slate-800/90 bg-[#080e1a]/95 px-1 pb-[calc(0.5rem+env(safe-area-inset-bottom))] backdrop-blur-md lg:hidden"
        >
          <Link
            href="/admin"
            className={`flex min-h-[52px] flex-1 flex-col items-center justify-center gap-0.5 text-[11px] transition-colors ${
              pathname === "/admin"
                ? "font-semibold text-cyan-400"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-[22px] w-[22px]" aria-hidden="true">
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
            </svg>
            <span>{isPt ? "Visão geral" : "Overview"}</span>
          </Link>

          <Link
            href="/admin/moderation"
            className={`relative flex min-h-[52px] flex-1 flex-col items-center justify-center gap-0.5 text-[11px] transition-colors ${
              pathname?.startsWith("/admin/moderation")
                ? "font-semibold text-cyan-400"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-[22px] w-[22px]" aria-hidden="true">
              <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" />
            </svg>
            <span>{isPt ? "Moderação" : "Moderation"}</span>
            {moderationBadgeCount > 0 && (
              <span className="absolute left-[calc(50%+6px)] top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-cyan-400 px-1 font-sans text-[10px] font-bold text-slate-950">
                {moderationBadgeCount > 99 ? "99+" : moderationBadgeCount}
              </span>
            )}
          </Link>

          <Link
            href="/admin/reports"
            className={`relative flex min-h-[52px] flex-1 flex-col items-center justify-center gap-0.5 text-[11px] transition-colors ${
              pathname?.startsWith("/admin/reports")
                ? "font-semibold text-cyan-400"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-[22px] w-[22px]" aria-hidden="true">
              <path d="M5 21V4h11l-2 4 2 4H5" />
            </svg>
            <span>{isPt ? "Denúncias" : "Reports"}</span>
          </Link>

          <Link
            href="/admin/users"
            className={`flex min-h-[52px] flex-1 flex-col items-center justify-center gap-0.5 text-[11px] transition-colors ${
              pathname?.startsWith("/admin/users")
                ? "font-semibold text-cyan-400"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-[22px] w-[22px]" aria-hidden="true">
              <circle cx="9" cy="8" r="3.5" />
              <path d="M2 20a7 7 0 0 1 14 0M16 4.5a3.5 3.5 0 0 1 0 7M22 20a7 7 0 0 0-4-6.3" />
            </svg>
            <span>{isPt ? "Usuários" : "Users"}</span>
          </Link>

          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className={`flex min-h-[52px] flex-1 flex-col items-center justify-center gap-0.5 text-[11px] transition-colors ${
              isMoreActive || mobileMenuOpen
                ? "font-semibold text-cyan-400"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-[22px] w-[22px]" aria-hidden="true">
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
            <span>{isPt ? "Mais" : "More"}</span>
          </button>
        </nav>
      </div>
    </AdminGuard>
  );
}
