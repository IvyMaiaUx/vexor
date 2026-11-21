"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { SignOutErrorBanner } from "@/components/auth/sign-out-error-banner";
import { siteConfig, type SupportedLocale } from "@/config/site";
import { useAuthStore } from "@/features/auth/use-auth-store";
import { NotificationBell } from "@/features/notifications/notification-bell";
import { MessagesNavBadge } from "@/features/messages/messages-nav-badge";
import type { Dictionary } from "@/lib/i18n/dictionaries";

interface HeaderProps {
  locale: SupportedLocale;
  onLocaleChange: (locale: SupportedLocale) => void;
  dict: Dictionary;
}

export function Header({ locale, onLocaleChange, dict }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut } = useAuthStore();

  const handleSignOut = async () => {
    setMobileMenuOpen(false);
    await signOut();
    const currentPath = pathname ?? "";
    const isProtected = [
      "/admin",
      "/cybercrime-research",
      "/catalog",
      "/forum",
      "/messages",
      "/my-contributions",
      "/profile",
    ].some((prefix) => currentPath === prefix || currentPath.startsWith(`${prefix}/`));
    if (isProtected) {
      router.push("/login");
    } else {
      router.refresh();
    }
  };

  const isHomeActive = pathname === "/";
  const isCatalogActive =
    pathname?.startsWith("/catalog") && pathname !== "/catalog/submit";
  const isForumActive = pathname?.startsWith("/forum");
  const isMessagesActive = pathname?.startsWith("/messages");
  const isSubmitActive = pathname === "/catalog/submit";
  const isResearchActive = pathname?.startsWith("/cybercrime-research");
  const isProfileActive = pathname?.startsWith("/profile");
  const isAuthActive = pathname === "/login" || pathname === "/register";

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-slate-800/80 bg-[#070b14]/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-2 px-4 sm:px-6 lg:px-8">
          {/* Official Vexor Brand Identity */}
          <Link
            href="/"
            onClick={() => setMobileMenuOpen(false)}
            className="group flex min-w-0 items-center gap-2.5 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
          >
            <Image
              src={siteConfig.logoHorizontalPath}
              alt={siteConfig.name}
              width={150}
              height={64}
              priority
              className="h-9 w-auto shrink-0 object-contain drop-shadow-[0_0_14px_rgba(34,211,238,0.28)] transition-transform group-hover:scale-[1.02] sm:h-10"
            />
          </Link>

          {/* Desktop Navigation (lg+) */}
          <nav
            aria-label="Main Navigation"
            className="hidden items-center gap-6 whitespace-nowrap lg:flex"
          >
            <Link
              href="/"
              className={`text-sm font-medium transition-colors hover:text-cyan-400 focus:outline-none focus-visible:text-cyan-400 ${
                isHomeActive ? "text-cyan-400" : "text-slate-300"
              }`}
            >
              {user ? "Timeline" : dict.nav.home}
            </Link>
            {user && (
              <>
                <Link
                  href="/catalog"
                  className={`text-sm font-medium transition-colors hover:text-cyan-400 focus:outline-none focus-visible:text-cyan-400 ${
                    isCatalogActive ? "text-cyan-400" : "text-slate-300"
                  }`}
                >
                  {dict.nav.catalog}
                </Link>
                <Link
                  href="/forum"
                  className={`text-sm font-medium transition-colors hover:text-cyan-400 focus:outline-none focus-visible:text-cyan-400 ${
                    isForumActive ? "text-cyan-400" : "text-slate-300"
                  }`}
                >
                  {dict.nav.forum}
                </Link>
                <Link
                  href="/cybercrime-research"
                  className={`text-sm font-medium transition-colors hover:text-cyan-400 focus:outline-none focus-visible:text-cyan-400 ${
                    isResearchActive ? "text-cyan-400" : "text-slate-300"
                  }`}
                >
                  {locale === "pt-BR" ? "Pesquisas" : "Research"}
                </Link>
                <MessagesNavBadge locale={locale} active={isMessagesActive} />
              </>
            )}
          </nav>

          {/* Desktop Actions + Language Switcher + Auth Session (lg+) */}
          <div className="hidden items-center gap-2.5 lg:flex">
            <div
              role="group"
              aria-label={dict.nav.languageLabel}
              className="flex items-center rounded-lg border border-slate-800 bg-[#0d1322] p-0.5"
            >
              <button
                type="button"
                onClick={() => onLocaleChange("pt-BR")}
                aria-pressed={locale === "pt-BR"}
                className={`rounded-md px-2.5 py-1 font-mono text-xs font-medium transition-colors ${
                  locale === "pt-BR"
                    ? "border border-cyan-500/40 bg-cyan-500/20 text-cyan-300"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                PT-BR
              </button>
              <button
                type="button"
                onClick={() => onLocaleChange("en")}
                aria-pressed={locale === "en"}
                className={`rounded-md px-2.5 py-1 font-mono text-xs font-medium transition-colors ${
                  locale === "en"
                    ? "border border-cyan-500/40 bg-cyan-500/20 text-cyan-300"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                EN
              </button>
            </div>

            {user ? (
              <div className="flex items-center gap-2">
                <NotificationBell locale={locale} />
                <Link
                  href="/catalog/submit"
                  className="rounded-lg border border-slate-700/80 bg-[#0d1322] px-3 py-1.5 text-xs font-medium text-slate-200 transition-colors hover:border-cyan-500/50 hover:text-cyan-300"
                >
                  + {dict.nav.submitResource}
                </Link>

                <div className="flex items-center gap-2 rounded-lg border border-slate-800 bg-[#0d1322] px-2.5 py-1">
                  <Link
                    href="/profile"
                    className="flex items-center gap-1.5 font-mono text-xs font-medium text-slate-200 transition-colors hover:text-cyan-400"
                    title={dict.profilePage.title}
                  >
                    <span>@{user.username}</span>
                  </Link>
                  <span
                    className={`rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase ${
                      user.isSuspended
                        ? "border border-rose-500/40 bg-rose-500/15 text-rose-300"
                        : user.role === "moderator" || user.role === "admin"
                          ? "border border-indigo-500/40 bg-indigo-500/15 text-indigo-300"
                          : "border border-emerald-500/40 bg-emerald-500/15 text-emerald-300"
                    }`}
                  >
                    {user.isSuspended
                      ? "SUSPENDED"
                      : user.role === "moderator"
                        ? "MOD"
                        : user.role.toUpperCase()}
                  </span>
                  <button
                    type="button"
                    onClick={() => void handleSignOut()}
                    className="ml-1 rounded px-1.5 py-0.5 text-xs font-medium text-slate-400 transition-colors hover:bg-slate-800 hover:text-rose-300"
                  >
                    {dict.nav.signOut}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  className={`rounded-lg border px-3.5 py-1.5 text-xs font-medium transition-colors ${
                    isAuthActive
                      ? "border-cyan-500/50 bg-cyan-500/15 text-cyan-300"
                      : "border-slate-700/80 bg-[#0d1322] text-slate-200 hover:border-cyan-500/50 hover:text-cyan-300"
                  }`}
                >
                  {dict.nav.signIn}
                </Link>
                <Link
                  href="/register"
                  className="rounded-lg bg-cyan-500 px-3.5 py-1.5 text-xs font-semibold text-slate-950 shadow-[0_0_20px_rgba(6,182,212,0.25)] transition-colors hover:bg-cyan-400"
                >
                  {dict.nav.signUp}
                </Link>
              </div>
            )}
          </div>

          {/* Mobile & Tablet Controls (< lg) */}
          <div className="flex shrink-0 items-center gap-2 lg:hidden">
            {user && <NotificationBell locale={locale} />}
            <button
              type="button"
              onClick={() => onLocaleChange(locale === "pt-BR" ? "en" : "pt-BR")}
              aria-label={dict.nav.languageLabel}
              className="flex h-10 items-center justify-center rounded-lg border border-slate-800 bg-[#0d1322] px-2.5 font-mono text-xs font-medium text-cyan-300 active:scale-95"
            >
              {locale.toUpperCase()}
            </button>

            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-expanded={mobileMenuOpen}
              aria-label="Toggle Menu"
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-800 bg-[#0d1322] text-slate-200 transition-colors hover:border-cyan-500/40 hover:text-cyan-300 active:scale-95"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="h-5 w-5"
              >
                {mobileMenuOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile & Tablet Drawer (< lg) */}
        {mobileMenuOpen && (
          <div className="max-h-[calc(100vh-4rem)] overflow-y-auto border-t border-slate-800/80 bg-[#0b101e]/98 px-4 py-4 shadow-2xl lg:hidden">
            <nav aria-label="Mobile Navigation" className="flex flex-col gap-1.5">
              <Link
                href="/"
                onClick={() => setMobileMenuOpen(false)}
                className={`flex min-h-[44px] items-center rounded-xl px-3.5 text-sm font-medium transition-colors ${
                  isHomeActive
                    ? "border border-cyan-500/30 bg-cyan-500/15 text-cyan-300"
                    : "text-slate-200 hover:bg-slate-800/60"
                }`}
              >
                {dict.nav.home}
              </Link>
              {user && (
                <>
                  <Link
                    href="/catalog"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex min-h-[44px] items-center rounded-xl px-3.5 text-sm font-medium transition-colors ${
                      isCatalogActive
                        ? "border border-cyan-500/30 bg-cyan-500/15 text-cyan-300"
                        : "text-slate-200 hover:bg-slate-800/60"
                    }`}
                  >
                    {dict.nav.catalog}
                  </Link>
                  <Link
                    href="/catalog/bookmarks"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex min-h-[44px] items-center rounded-xl px-3.5 text-sm font-medium text-slate-200 hover:bg-slate-800/60"
                  >
                    {dict.nav.bookmarks}
                  </Link>
                  <Link
                    href="/#categories"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex min-h-[44px] items-center rounded-xl px-3.5 text-sm font-medium text-slate-200 hover:bg-slate-800/60"
                  >
                    {dict.nav.categories}
                  </Link>
                  <Link
                    href="/forum"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex min-h-[44px] items-center rounded-xl px-3.5 text-sm font-medium transition-colors ${
                      isForumActive
                        ? "border border-cyan-500/30 bg-cyan-500/15 text-cyan-300"
                        : "text-slate-200 hover:bg-slate-800/60"
                    }`}
                  >
                    {dict.nav.forum}
                  </Link>
                  <Link
                    href="/cybercrime-research"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex min-h-[44px] items-center rounded-xl px-3.5 text-sm font-medium transition-colors ${
                      pathname?.startsWith("/cybercrime-research")
                        ? "border border-cyan-500/30 bg-cyan-500/15 text-cyan-300"
                        : "text-slate-200 hover:bg-slate-800/60"
                    }`}
                  >
                    {dict.cybercrimeResearchPage.title}
                  </Link>
                  <Link
                    href="/catalog/submit"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex min-h-[44px] items-center rounded-xl px-3.5 text-sm font-medium transition-colors ${
                      isSubmitActive
                        ? "border border-cyan-500/30 bg-cyan-500/15 text-cyan-300"
                        : "text-slate-200 hover:bg-slate-800/60"
                    }`}
                  >
                    {dict.nav.contribute}
                  </Link>
                </>
              )}

              {/* Language Switcher inside Drawer */}
              <div className="mt-2 flex items-center justify-between rounded-xl border border-slate-800 bg-[#070b14] px-3.5 py-2.5">
                <span className="text-xs font-medium text-slate-400">
                  {dict.nav.languageLabel}
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => onLocaleChange("pt-BR")}
                    className={`rounded-md px-2.5 py-1 font-mono text-xs font-medium ${
                      locale === "pt-BR"
                        ? "border border-cyan-500/40 bg-cyan-500/20 text-cyan-300"
                        : "text-slate-400"
                    }`}
                  >
                    PT-BR
                  </button>
                  <button
                    type="button"
                    onClick={() => onLocaleChange("en")}
                    className={`rounded-md px-2.5 py-1 font-mono text-xs font-medium ${
                      locale === "en"
                        ? "border border-cyan-500/40 bg-cyan-500/20 text-cyan-300"
                        : "text-slate-400"
                    }`}
                  >
                    EN
                  </button>
                </div>
              </div>

              {user ? (
                <div className="mt-3 flex flex-col gap-2.5 border-t border-slate-800 pt-3">
                  <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-[#070b14] px-3.5 py-2.5">
                    <Link
                      href="/profile"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-2"
                    >
                      <span className="font-mono text-xs font-medium text-slate-200 hover:text-cyan-400">
                        @{user.username}
                      </span>
                      <span
                        className={`rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase ${
                          user.isSuspended
                            ? "border border-rose-500/40 bg-rose-500/15 text-rose-300"
                            : user.role === "moderator" || user.role === "admin"
                              ? "border border-indigo-500/40 bg-indigo-500/15 text-indigo-300"
                              : "border border-emerald-500/40 bg-emerald-500/15 text-emerald-300"
                        }`}
                      >
                        {user.isSuspended
                          ? "SUSPENDED"
                          : user.role === "moderator"
                            ? "MOD"
                            : user.role.toUpperCase()}
                      </span>
                    </Link>
                    <button
                      type="button"
                      onClick={() => void handleSignOut()}
                      className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-2.5 py-1 text-xs font-semibold text-rose-300"
                    >
                      {dict.nav.signOut}
                    </button>
                  </div>
                  <Link
                    href="/profile"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex min-h-[44px] items-center justify-center rounded-xl border border-slate-700 bg-[#0d1322] text-sm font-semibold text-slate-200 hover:border-cyan-500 hover:text-cyan-300"
                  >
                    {dict.profilePage.title}
                  </Link>
                  <MessagesNavBadge
                    locale={locale}
                    active={isMessagesActive}
                    variant="mobile"
                    onClick={() => setMobileMenuOpen(false)}
                  />
                  <Link
                    href="/catalog/submit"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex min-h-[44px] items-center justify-center rounded-xl bg-cyan-500 text-sm font-semibold text-slate-950 shadow-[0_0_20px_rgba(6,182,212,0.25)]"
                  >
                    + {dict.nav.submitResource}
                  </Link>
                </div>
              ) : (
                <div className="mt-3 grid grid-cols-2 gap-2.5 border-t border-slate-800 pt-3">
                  <Link
                    href="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex min-h-[44px] items-center justify-center rounded-xl border border-slate-700 bg-[#070b14] text-sm font-medium text-slate-200"
                  >
                    {dict.nav.signIn}
                  </Link>
                  <Link
                    href="/register"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex min-h-[44px] items-center justify-center rounded-xl bg-cyan-500 text-sm font-semibold text-slate-950"
                  >
                    {dict.nav.signUp}
                  </Link>
                </div>
              )}
            </nav>
          </div>
        )}
      </header>

      {/* Mobile Bottom Quick Navigation Bar (< sm) — authenticated users only */}
      {user && (
        <nav
          aria-label="Mobile Quick Bar"
          className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 items-end border-t border-slate-800/90 bg-[#070b14]/95 px-1 pb-[calc(0.375rem+env(safe-area-inset-bottom))] pt-1.5 backdrop-blur-md sm:hidden"
        >
          <Link
            href="/"
            className={`flex min-h-[52px] flex-col items-center justify-center gap-0.5 rounded-lg py-1 text-[10px] font-medium transition-colors ${
              isHomeActive ? "text-cyan-400 font-semibold" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              className="h-4 w-4"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"
              />
            </svg>
            <span className="max-w-[62px] truncate">{dict.nav.home}</span>
          </Link>

          <Link
            href="/catalog"
            className={`flex min-h-[52px] flex-col items-center justify-center gap-0.5 rounded-lg py-1 text-[10px] font-medium transition-colors ${
              isCatalogActive ? "text-cyan-400 font-semibold" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              className="h-4 w-4"
            >
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
            </svg>
            <span className="max-w-[62px] truncate">{dict.nav.catalog}</span>
          </Link>

          <Link
            href="/forum"
            className={`flex min-h-[52px] flex-col items-center justify-center gap-0.5 rounded-lg py-1 text-[10px] font-medium transition-colors ${
              isForumActive ? "text-cyan-400 font-semibold" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              className="h-4 w-4"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
              />
            </svg>
            <span className="max-w-[62px] truncate">{dict.nav.forum}</span>
          </Link>

          <Link
            href="/catalog/submit"
            aria-label={dict.nav.contribute}
            className="flex flex-col items-center justify-center gap-0.5"
          >
            <span
              className={`-mt-6 inline-flex h-12 w-12 items-center justify-center rounded-full shadow-[0_6px_18px_rgba(6,182,212,0.35)] ring-4 ring-[#070b14] transition-colors ${
                isSubmitActive
                  ? "bg-cyan-400 text-slate-950"
                  : "bg-cyan-500 text-slate-950"
              }`}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="h-5 w-5"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" />
              </svg>
            </span>
            <span
              className={`text-[10px] font-medium ${
                isSubmitActive ? "text-cyan-400" : "text-slate-400"
              }`}
            >
              {dict.nav.contribute}
            </span>
          </Link>

          <Link
            href="/profile"
            className={`flex min-h-[52px] flex-col items-center justify-center gap-0.5 rounded-lg py-1 text-[10px] font-medium transition-colors ${
              isProfileActive || isAuthActive
                ? "text-cyan-400 font-semibold"
                : "text-emerald-400 hover:text-emerald-300"
            }`}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              className="h-4 w-4"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"
              />
              <circle cx="12" cy="7" r="4" />
            </svg>
            <span className="max-w-[62px] truncate">
              @{user.username}
            </span>
          </Link>
        </nav>
      )}
      <SignOutErrorBanner dict={dict} />
    </>
  );
}
