"use client";

import Image from "next/image";
import Link from "next/link";
import { siteConfig, type SupportedLocale } from "@/config/site";
import { useAuthStore } from "@/features/auth/use-auth-store";
import type { Dictionary } from "@/lib/i18n/dictionaries";

interface FooterProps {
  locale: SupportedLocale;
  dict: Dictionary;
}

export function Footer({ locale, dict }: FooterProps) {
  const user = useAuthStore((s) => s.user);

  return (
    <footer
      className={`border-t border-slate-800/80 bg-[#050811] ${
        user ? "pb-[calc(4.5rem+env(safe-area-inset-bottom))] sm:pb-0" : ""
      }`}
    >
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          {/* Brand + Description */}
          <div className="lg:col-span-5">
            <div className="flex items-center gap-3">
              <Image
                src={siteConfig.logoHorizontalPath}
                alt={siteConfig.name}
                width={136}
                height={58}
                className="h-9 w-auto object-contain drop-shadow-[0_0_12px_rgba(34,211,238,0.22)]"
              />
              <span className="rounded border border-slate-800 bg-slate-900 px-2 py-0.5 font-mono text-[10px] text-slate-400">
                {locale}
              </span>
            </div>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-slate-400">
              {dict.footer.description}
            </p>
          </div>

          {/* Navigation Links */}
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-2 lg:col-span-3">
            <div>
              <h3 className="font-mono text-xs font-semibold uppercase tracking-wider text-slate-200">
                {dict.footer.navigationTitle}
              </h3>
              <ul className="mt-3 space-y-2 text-sm text-slate-400">
                <li>
                  <Link
                    href="/"
                    className="transition-colors hover:text-cyan-400"
                  >
                    {dict.nav.home}
                  </Link>
                </li>
                {user && (
                  <>
                    <li>
                      <Link
                        href="/catalog"
                        className="transition-colors hover:text-cyan-400"
                      >
                        {dict.nav.catalog}
                      </Link>
                    </li>
                    <li>
                      <Link
                        href="/catalog/bookmarks"
                        className="transition-colors hover:text-cyan-400"
                      >
                        {dict.nav.bookmarks}
                      </Link>
                    </li>
                    <li>
                      <Link
                        href="/#categories"
                        className="transition-colors hover:text-cyan-400"
                      >
                        {dict.nav.categories}
                      </Link>
                    </li>
                    <li>
                      <Link
                        href="/forum"
                        className="transition-colors hover:text-cyan-400"
                      >
                        {dict.nav.forum}
                      </Link>
                    </li>
                    <li>
                      <Link
                        href="/cybercrime-research"
                        className="transition-colors hover:text-cyan-400"
                      >
                        {dict.cybercrimeResearchPage.title}
                      </Link>
                    </li>
                  </>
                )}
              </ul>
            </div>

            <div>
              <h3 className="font-mono text-xs font-semibold uppercase tracking-wider text-slate-200">
                {dict.footer.communityTitle}
              </h3>
              <ul className="mt-3 space-y-2 text-sm text-slate-400">
                <li>
                  <Link
                    href="/login"
                    className="transition-colors hover:text-cyan-400"
                  >
                    {dict.nav.signIn}
                  </Link>
                </li>
                <li>
                  <Link
                    href="/register"
                    className="transition-colors hover:text-cyan-400"
                  >
                    {dict.nav.signUp}
                  </Link>
                </li>
                {user && (
                  <li>
                    <Link
                      href="/catalog/submit"
                      className="transition-colors hover:text-cyan-400"
                    >
                      {dict.nav.submitResource}
                    </Link>
                  </li>
                )}
                <li>
                  <a
                    href={siteConfig.githubRepoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="transition-colors hover:text-cyan-400"
                  >
                    GitHub (Open Source)
                  </a>
                </li>
              </ul>
            </div>
          </div>

          {/* Defensive Security & Ethical Notice */}
          <div className="lg:col-span-4">
            <div className="rounded-xl border border-cyan-500/20 bg-[#0d1322]/90 p-4">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-cyan-300">
                <span className="h-2 w-2 rounded-full bg-cyan-400" />
                {dict.footer.ethicsTitle}
              </div>
              <p className="mt-2 text-xs leading-relaxed text-slate-400">
                {dict.footer.ethicsBody}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-slate-800/70 pt-6 text-xs text-slate-500 sm:flex-row">
          <p>{dict.footer.rights}</p>
        </div>
      </div>
    </footer>
  );
}
