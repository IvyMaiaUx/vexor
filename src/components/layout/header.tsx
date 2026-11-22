"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { SignOutErrorBanner } from "@/components/auth/sign-out-error-banner";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";
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
            {user ? (
              <NotificationBell locale={locale} />
            ) : (
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-cyan-500 px-4 text-sm font-semibold text-slate-950 shadow-[0_0_20px_rgba(6,182,212,0.25)] transition-colors hover:bg-cyan-400 active:scale-95"
              >
                {dict.nav.signIn}
              </Link>
            )}

            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-expanded={mobileMenuOpen}
              aria-label={
                mobileMenuOpen
                  ? locale === "pt-BR"
                    ? "Fechar menu"
                    : "Close menu"
                  : locale === "pt-BR"
                    ? "Abrir menu"
                    : "Open menu"
              }
              className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-800 bg-[#0d1322] text-slate-200 transition-colors hover:border-cyan-500/40 hover:text-cyan-300 active:scale-95"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="h-[22px] w-[22px]"
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
                    d="M4 7h16M4 12h16M4 17h16"
                  />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile & Tablet Drawer (< lg) */}
        {mobileMenuOpen && (
          <div className="max-h-[calc(100vh-4rem)] overflow-y-auto border-t border-slate-800/80 bg-[#070b14]/98 px-4 pb-24 pt-4 shadow-2xl lg:hidden">
            <nav aria-label="Menu" className="flex flex-col">
              <p className="mb-1 font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-400">
                MENU
              </p>

              {user ? (
                <>
                  <Link
                    href="/catalog/bookmarks"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex min-h-[52px] items-center gap-3 border-b border-slate-800/70 px-1 text-base font-medium transition-colors ${
                      pathname === "/catalog/bookmarks"
                        ? "text-cyan-400"
                        : "text-slate-100 hover:text-cyan-300"
                    }`}
                  >
                    <span className="text-cyan-400" aria-hidden="true">
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-[22px] w-[22px]"
                      >
                        <path d="M6 3h12v18l-6-4-6 4z" />
                      </svg>
                    </span>
                    <span className="flex-1">{dict.nav.bookmarks}</span>
                    <span className="text-slate-400" aria-hidden="true">
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-[18px] w-[18px]"
                      >
                        <path d="M9 6l6 6-6 6" />
                      </svg>
                    </span>
                  </Link>

                  <Link
                    href="/catalog"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex min-h-[52px] items-center gap-3 border-b border-slate-800/70 px-1 text-base font-medium text-slate-100 transition-colors hover:text-cyan-300"
                  >
                    <span className="text-cyan-400" aria-hidden="true">
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-[22px] w-[22px]"
                      >
                        <path d="M12 3l9 5-9 5-9-5zM3 13l9 5 9-5" />
                      </svg>
                    </span>
                    <span className="flex-1">{dict.nav.categories}</span>
                    <span className="text-slate-400" aria-hidden="true">
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-[18px] w-[18px]"
                      >
                        <path d="M9 6l6 6-6 6" />
                      </svg>
                    </span>
                  </Link>

                  <Link
                    href="/cybercrime-research"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex min-h-[52px] items-center gap-3 border-b border-slate-800/70 px-1 text-base font-medium transition-colors ${
                      isResearchActive
                        ? "text-cyan-400"
                        : "text-slate-100 hover:text-cyan-300"
                    }`}
                  >
                    <span className="text-cyan-400" aria-hidden="true">
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-[22px] w-[22px]"
                      >
                        <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" />
                      </svg>
                    </span>
                    <span className="flex-1">
                      {dict.cybercrimeResearchPage.title}
                    </span>
                    <span className="text-slate-400" aria-hidden="true">
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-[18px] w-[18px]"
                      >
                        <path d="M9 6l6 6-6 6" />
                      </svg>
                    </span>
                  </Link>

                  <MessagesNavBadge
                    locale={locale}
                    active={isMessagesActive}
                    variant="mobile"
                    onClick={() => setMobileMenuOpen(false)}
                  />
                </>
              ) : (
                <Link
                  href="/"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex min-h-[52px] items-center justify-between border-b border-slate-800/70 px-1 text-base font-medium transition-colors ${
                    isHomeActive ? "text-cyan-400" : "text-slate-100"
                  }`}
                >
                  <span>{dict.nav.home}</span>
                  <span className="text-slate-400" aria-hidden="true">
                    →
                  </span>
                </Link>
              )}

              {/* Language Switcher inside Menu */}
              <div className="mt-4 flex items-center justify-between rounded-2xl border border-slate-800 bg-[#0d1322] px-4 py-3">
                <span className="text-sm font-medium text-slate-200">
                  {dict.nav.languageLabel}
                </span>
                <div
                  role="group"
                  aria-label={dict.nav.languageLabel}
                  className="flex items-center gap-1.5"
                >
                  <button
                    type="button"
                    onClick={() => onLocaleChange("pt-BR")}
                    aria-pressed={locale === "pt-BR"}
                    className={`min-h-[44px] rounded-full border px-3.5 font-mono text-xs font-semibold transition-colors ${
                      locale === "pt-BR"
                        ? "border-cyan-500/50 bg-cyan-500/15 text-cyan-300"
                        : "border-slate-800 bg-[#070b14] text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    PT-BR
                  </button>
                  <button
                    type="button"
                    onClick={() => onLocaleChange("en")}
                    aria-pressed={locale === "en"}
                    className={`min-h-[44px] rounded-full border px-3.5 font-mono text-xs font-semibold transition-colors ${
                      locale === "en"
                        ? "border-cyan-500/50 bg-cyan-500/15 text-cyan-300"
                        : "border-slate-800 bg-[#070b14] text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    EN
                  </button>
                </div>
              </div>

              {user ? (
                <div className="mt-3 flex flex-col gap-3 rounded-2xl border border-slate-800 bg-[#0d1322] p-4">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-cyan-500/30 bg-[#070b14] font-mono text-sm font-bold text-cyan-300">
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
                        (user.displayName || user.username || "V")
                          .slice(0, 1)
                          .toUpperCase()
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-mono text-sm font-semibold text-emerald-400">
                        @{user.username}
                      </div>
                      <span
                        className={`mt-1 inline-flex items-center rounded-md px-2 py-0.5 font-mono text-[10px] font-semibold uppercase ${
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
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Link
                      href="/profile"
                      onClick={() => setMobileMenuOpen(false)}
                      className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-xl border border-slate-700 bg-[#070b14] px-4 text-sm font-semibold text-slate-100 transition-colors hover:border-cyan-500/50 hover:text-cyan-300"
                    >
                      {dict.profilePage.title}
                    </Link>
                    <button
                      type="button"
                      onClick={() => void handleSignOut()}
                      className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-rose-500/35 bg-rose-500/10 px-4 text-sm font-semibold text-rose-300 transition-colors hover:bg-rose-500/20"
                    >
                      {dict.nav.signOut}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-4 grid grid-cols-2 gap-2.5">
                  <Link
                    href="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex min-h-[44px] items-center justify-center rounded-xl border border-slate-700 bg-[#0d1322] text-sm font-medium text-slate-200"
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

      {/* Mobile Bottom Navigation Bar (< lg) — authenticated users only */}
      {user && (
        <MobileBottomNav
          username={user.username}
          dict={dict}
          isHomeActive={isHomeActive}
          isCatalogActive={isCatalogActive}
          isSubmitActive={isSubmitActive}
          isForumActive={isForumActive}
          isProfileActive={isProfileActive}
        />
      )}
      <SignOutErrorBanner dict={dict} />
    </>
  );
}
