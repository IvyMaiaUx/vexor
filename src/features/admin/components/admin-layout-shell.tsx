"use client";

import React, { useState } from "react";
import Link from "next/link";
import { SignOutErrorBanner } from "@/components/auth/sign-out-error-banner";
import { AdminGuard } from "@/features/admin/components/admin-guard";
import { AdminSidebar } from "@/features/admin/components/admin-sidebar";
import { AdminBreadcrumbs } from "@/features/admin/components/admin-breadcrumbs";
import { useAuthStore } from "@/features/auth/use-auth-store";
import { useI18n } from "@/lib/i18n/context";

export function AdminLayoutShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const user = useAuthStore((s) => s.user);
  const isAdmin = useAuthStore((s) => s.isAdmin);
  const { dict, locale, setLocale } = useI18n();

  return (
    <AdminGuard>
      <div className="flex min-h-screen flex-col bg-[#070b14] text-slate-100">
        {/* Admin Top Utility Bar */}
        <header
          role="banner"
          className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-slate-800/90 bg-[#090e1c]/90 px-4 backdrop-blur-md sm:px-6"
        >
          {/* Left: Mobile Toggle + Breadcrumbs */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileSidebarOpen(true)}
              aria-label="Abrir menu lateral de moderação"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-800 bg-[#0d1322] text-slate-300 transition-colors hover:border-cyan-500/40 hover:text-cyan-300 lg:hidden"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
                />
              </svg>
            </button>

            <AdminBreadcrumbs />
          </div>

          {/* Right: Quick actions + Language + User Role Pill */}
          <div className="flex shrink-0 items-center gap-2.5">
            {/* Quick Lang Switch */}
            <button
              type="button"
              onClick={() => setLocale(locale === "pt-BR" ? "en" : "pt-BR")}
              className="hidden rounded-lg border border-slate-800 bg-[#0d1322] px-2.5 py-1 font-mono text-xs font-medium text-cyan-300 transition-colors hover:border-cyan-500/40 sm:inline-flex"
              title="Trocar idioma da interface"
            >
              {locale.toUpperCase()}
            </button>

            {user && (
              <span
                className={`rounded-full px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider ${
                  isAdmin
                    ? "border border-amber-500/40 bg-amber-500/15 text-amber-300"
                    : "border border-cyan-500/40 bg-cyan-500/15 text-cyan-300"
                }`}
              >
                {isAdmin ? "ROOT ADMIN" : "MODERATOR"}
              </span>
            )}

            <Link
              href="/"
              className="hidden rounded-lg border border-slate-800 bg-[#0d1322] px-3 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:border-slate-700 hover:text-white md:inline-flex"
            >
              ← {dict.adminPanel.sidebar.backToSite}
            </Link>
          </div>
        </header>
        <SignOutErrorBanner dict={dict} />

        {/* Main Body Shell: Sidebar + Content Area */}
        <div className="flex flex-1">
          {/* Responsive Admin Sidebar */}
          <AdminSidebar
            mobileOpen={mobileSidebarOpen}
            onCloseMobile={() => setMobileSidebarOpen(false)}
          />

          {/* Page Content Container */}
          <main className="flex-1 min-w-0 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
            <div className="mx-auto max-w-7xl">
              {children}
            </div>
          </main>
        </div>
      </div>
    </AdminGuard>
  );
}
