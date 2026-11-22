"use client";

import Link from "next/link";
import type { Dictionary } from "@/lib/i18n/dictionaries";

interface MobileBottomNavProps {
  username: string;
  dict: Dictionary;
  isHomeActive: boolean;
  isCatalogActive: boolean;
  isSubmitActive: boolean;
  isForumActive: boolean;
  isProfileActive: boolean;
}

export function MobileBottomNav({
  username,
  dict,
  isHomeActive,
  isCatalogActive,
  isSubmitActive,
  isForumActive,
  isProfileActive,
}: MobileBottomNavProps) {
  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-40 flex h-[74px] items-end justify-around border-t border-slate-800/90 bg-[#070b14]/95 px-1 pb-[calc(0.5rem+env(safe-area-inset-bottom))] backdrop-blur-md lg:hidden"
    >
      {/* 1. Início */}
      <Link
        href="/"
        aria-current={isHomeActive ? "page" : undefined}
        className={`flex min-h-[52px] flex-1 flex-col items-center justify-center gap-1 rounded-lg px-1 text-[11px] font-medium transition-colors ${
          isHomeActive
            ? "text-cyan-400"
            : "text-slate-400 hover:text-slate-200"
        }`}
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-[22px] w-[22px]"
        >
          <path d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />
        </svg>
        <span className="max-w-[68px] truncate">{dict.nav.home}</span>
      </Link>

      {/* 2. Catálogo */}
      <Link
        href="/catalog"
        aria-current={isCatalogActive ? "page" : undefined}
        className={`flex min-h-[52px] flex-1 flex-col items-center justify-center gap-1 rounded-lg px-1 text-[11px] font-medium transition-colors ${
          isCatalogActive
            ? "text-cyan-400"
            : "text-slate-400 hover:text-slate-200"
        }`}
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-[22px] w-[22px]"
        >
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
        <span className="max-w-[68px] truncate">{dict.nav.catalog}</span>
      </Link>

      {/* 3. Contribuir (Central Floating FAB) */}
      <Link
        href="/catalog/submit"
        aria-current={isSubmitActive ? "page" : undefined}
        className="flex min-h-[52px] flex-1 flex-col items-center justify-center gap-1 px-1 text-[11px] font-medium transition-colors"
      >
        <span
          className={`-mt-6 flex h-[52px] w-[52px] items-center justify-center rounded-full bg-cyan-400 text-slate-950 shadow-[0_0_0_5px_#070b14,0_6px_18px_rgba(34,211,238,0.35)] transition-transform active:scale-95 ${
            isSubmitActive ? "ring-2 ring-cyan-200/70" : ""
          }`}
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-6 w-6"
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
        </span>
        <span
          className={`max-w-[68px] truncate ${
            isSubmitActive ? "text-cyan-400" : "text-slate-400"
          }`}
        >
          {dict.nav.contribute}
        </span>
      </Link>

      {/* 4. Fórum */}
      <Link
        href="/forum"
        aria-current={isForumActive ? "page" : undefined}
        className={`flex min-h-[52px] flex-1 flex-col items-center justify-center gap-1 rounded-lg px-1 text-[11px] font-medium transition-colors ${
          isForumActive
            ? "text-cyan-400"
            : "text-slate-400 hover:text-slate-200"
        }`}
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-[22px] w-[22px]"
        >
          <path d="M21 12a8 8 0 0 1-11.5 7.2L4 20l1-4.5A8 8 0 1 1 21 12z" />
        </svg>
        <span className="max-w-[68px] truncate">{dict.nav.forum}</span>
      </Link>

      {/* 5. @usuário (Perfil) */}
      <Link
        href="/profile"
        aria-current={isProfileActive ? "page" : undefined}
        className={`flex min-h-[52px] flex-1 flex-col items-center justify-center gap-1 rounded-lg px-1 text-[11px] font-medium transition-colors ${
          isProfileActive
            ? "text-cyan-400"
            : "text-slate-400 hover:text-slate-200"
        }`}
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-[22px] w-[22px]"
        >
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21a8 8 0 0 1 16 0" />
        </svg>
        <span className="max-w-[70px] truncate font-mono text-emerald-400">
          @{username}
        </span>
      </Link>
    </nav>
  );
}
