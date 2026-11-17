"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/features/auth/use-auth-store";
import { useI18n } from "@/lib/i18n/context";

interface AdminGuardProps {
  children: React.ReactNode;
  /** Se verdadeiro, exige papel de 'admin' estrito (ex: gerenciamento de usuários e auditoria) */
  requireAdmin?: boolean;
}

export function AdminGuard({ children, requireAdmin = false }: AdminGuardProps) {
  const pathname = usePathname();
  const { dict } = useI18n();
  const user = useAuthStore((s) => s.user);
  const isLoading = useAuthStore((s) => s.isLoading);
  const isModerator = useAuthStore((s) => s.isModerator);
  const isAdmin = useAuthStore((s) => s.isAdmin);
  const signOut = useAuthStore((s) => s.signOut);

  if (isLoading && !user) {
    return (
      <div className="mx-auto flex min-h-[50vh] max-w-2xl items-center justify-center px-4 py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-500/30 border-t-cyan-400" />
      </div>
    );
  }

  // 1. Não autenticado
  if (!user) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center px-4 py-16 text-center">
        <div className="relative mb-6 flex h-20 w-20 items-center justify-center rounded-2xl border border-amber-500/30 bg-amber-500/10 text-3xl shadow-[0_0_30px_rgba(245,158,11,0.2)]">
          🔐
        </div>
        <span className="font-mono text-xs uppercase tracking-wider text-amber-400">
          ACESSO RESTRITO · AUTENTICAÇÃO NECESSÁRIA
        </span>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-100 sm:text-3xl">
          {dict.adminPanel.accessDenied.loginRequiredTitle}
        </h1>
        <p className="mt-3 max-w-lg text-sm text-slate-400">
          {dict.adminPanel.accessDenied.loginRequiredSubtitle}
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href={`/login?next=${encodeURIComponent(pathname || "/admin")}`}
            className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-cyan-500 px-6 py-2.5 text-sm font-semibold text-slate-950 shadow-[0_0_20px_rgba(6,182,212,0.25)] transition-all hover:bg-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400"
          >
            {dict.adminPanel.accessDenied.loginButton}
          </Link>
          <Link
            href="/"
            className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-slate-700 bg-[#0d1322] px-6 py-2.5 text-sm font-semibold text-slate-200 transition-colors hover:border-slate-600 hover:text-white"
          >
            {dict.adminPanel.accessDenied.backHomeButton}
          </Link>
        </div>

        {/* Security Notice */}
        <div className="mt-10 rounded-xl border border-slate-800/80 bg-[#080d1a] p-4 text-left">
          <p className="font-mono text-xs text-slate-400">
            ℹ️ {dict.adminPanel.accessDenied.securityNotice}
          </p>
        </div>
      </div>
    );
  }

  // 2. Conta Suspensa
  if (user.isSuspended) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center px-4 py-16 text-center">
        <div className="relative mb-6 flex h-20 w-20 items-center justify-center rounded-2xl border border-rose-500/30 bg-rose-500/10 text-3xl shadow-[0_0_30px_rgba(244,63,94,0.2)]">
          ⚠️
        </div>
        <span className="font-mono text-xs uppercase tracking-wider text-rose-400">
          ACESSO BLOQUEADO · CONTA SUSPENSA
        </span>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-100 sm:text-3xl">
          {dict.adminPanel.accessDenied.suspendedTitle}
        </h1>
        <p className="mt-3 max-w-lg text-sm text-slate-400">
          {dict.adminPanel.accessDenied.suspendedSubtitle}
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={signOut}
            className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-rose-500/40 bg-rose-500/10 px-6 py-2.5 text-sm font-semibold text-rose-300 transition-colors hover:bg-rose-500/20"
          >
            {dict.adminPanel.accessDenied.loginButton}
          </button>
          <Link
            href="/"
            className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-slate-700 bg-[#0d1322] px-6 py-2.5 text-sm font-semibold text-slate-200 transition-colors hover:border-slate-600 hover:text-white"
          >
            {dict.adminPanel.accessDenied.backHomeButton}
          </Link>
        </div>

        <div className="mt-10 rounded-xl border border-slate-800/80 bg-[#080d1a] p-4 text-left">
          <p className="font-mono text-xs text-slate-400">
            ℹ️ {dict.adminPanel.accessDenied.securityNotice}
          </p>
        </div>
      </div>
    );
  }

  // 3. Usuário com papel comum (member) sem privilégios de moderação/administração
  if (!isModerator && !isAdmin) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center px-4 py-16 text-center">
        <div className="relative mb-6 flex h-20 w-20 items-center justify-center rounded-2xl border border-rose-500/30 bg-rose-500/10 text-3xl shadow-[0_0_30px_rgba(244,63,94,0.2)]">
          🛡️🚫
        </div>
        <span className="font-mono text-xs uppercase tracking-wider text-rose-400">
          ACESSO BLOQUEADO · PERMISSÃO INSUFICIENTE (RBAC)
        </span>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-100 sm:text-3xl">
          {dict.adminPanel.accessDenied.memberTitle}
        </h1>
        <p className="mt-3 max-w-lg text-sm text-slate-400">
          {dict.adminPanel.accessDenied.memberSubtitle}
        </p>

        <div className="mt-4 flex items-center justify-center gap-2 font-mono text-xs text-slate-400">
          <span>Identidade atual:</span>
          <span className="rounded bg-slate-800 px-2 py-0.5 text-cyan-300">
            @{user.username}
          </span>
          <span className="rounded border border-slate-700 bg-slate-900 px-2 py-0.5 text-slate-400 uppercase">
            {user.role}
          </span>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/"
            className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-cyan-500 px-6 py-2.5 text-sm font-semibold text-slate-950 shadow-[0_0_20px_rgba(6,182,212,0.25)] transition-all hover:bg-cyan-400"
          >
            {dict.adminPanel.accessDenied.backHomeButton}
          </Link>
          <button
            type="button"
            onClick={signOut}
            className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-slate-700 bg-[#0d1322] px-6 py-2.5 text-sm font-semibold text-slate-200 transition-colors hover:border-slate-600 hover:text-white"
          >
            {dict.adminPanel.accessDenied.loginButton}
          </button>
        </div>

        {/* Security Notice */}
        <div className="mt-10 rounded-xl border border-slate-800/80 bg-[#080d1a] p-4 text-left">
          <p className="font-mono text-xs text-slate-400">
            ℹ️ {dict.adminPanel.accessDenied.securityNotice}
          </p>
        </div>
      </div>
    );
  }

  // 4. Se a seção exigir explicitamente papel 'admin' (exclusivo para root_admin) e o usuário for apenas 'moderator'
  if (requireAdmin && !isAdmin) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center px-4 py-16 text-center">
        <div className="relative mb-6 flex h-20 w-20 items-center justify-center rounded-2xl border border-amber-500/30 bg-amber-500/10 text-3xl shadow-[0_0_30px_rgba(245,158,11,0.2)]">
          ⚡
        </div>
        <span className="font-mono text-xs uppercase tracking-wider text-amber-400">
          ACESSO RESTRITO · EXCLUSIVO PARA ADMINISTRADOR ROOT
        </span>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-100 sm:text-3xl">
          Acesso Exclusivo para Administradores
        </h1>
        <p className="mt-3 max-w-lg text-sm text-slate-400">
          Esta área específica requer privilégios de Administrador de Sistema (Root). Sua conta está autenticada como Moderador ({user.username}). Funções como alteração de papéis, suspensões permanentes e auditoria irrestrita são restritas por política de separação de deveres.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/admin"
            className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-cyan-500 px-6 py-2.5 text-sm font-semibold text-slate-950 shadow-[0_0_20px_rgba(6,182,212,0.25)] transition-all hover:bg-cyan-400"
          >
            Voltar ao Painel Geral
          </Link>
        </div>

        <div className="mt-10 rounded-xl border border-slate-800/80 bg-[#080d1a] p-4 text-left">
          <p className="font-mono text-xs text-slate-400">
            ℹ️ {dict.adminPanel.accessDenied.securityNotice}
          </p>
        </div>
      </div>
    );
  }

  // Acesso concedido
  return <>{children}</>;
}
