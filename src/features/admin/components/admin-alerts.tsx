"use client";

import React from "react";
import Link from "next/link";
import type { AdminStats } from "../types";
import { useI18n } from "@/lib/i18n/context";

interface AdminAlertsProps {
  stats: AdminStats | null;
}

export function AdminAlerts({ stats }: AdminAlertsProps) {
  const { dict } = useI18n();

  const openReports = stats?.openReports ?? 0;
  const pendingResources = stats?.pendingResources ?? 0;
  const pendingResearch = stats?.pendingResearch ?? 0;
  const suspendedUsers = stats?.suspendedUsers ?? 0;

  const hasPendingItems =
    openReports > 0 || pendingResources > 0 || pendingResearch > 0;

  return (
    <section aria-label={dict.adminPanel.dashboard.alertsTitle} className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold tracking-wider text-slate-300 uppercase">
          {dict.adminPanel.dashboard.alertsTitle}
        </h2>
        <span className="font-mono text-xs text-slate-500">
          Prioridades Operacionais
        </span>
      </div>

      <div className="flex flex-col gap-2.5">
        {/* Alerta 1: Denúncias Abertas */}
        {openReports > 0 && (
          <div className="flex flex-col items-start justify-between gap-3 rounded-xl border border-rose-500/40 bg-rose-500/10 p-3.5 sm:flex-row sm:items-center">
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-rose-500/20 text-base">
                🚨
              </span>
              <p className="text-xs font-medium text-rose-200">
                {dict.adminPanel.alerts.urgentReports(openReports)}
              </p>
            </div>
            <Link
              href="/admin/reports"
              className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-rose-500 px-3 py-1.5 text-xs font-semibold text-slate-950 transition-colors hover:bg-rose-400"
            >
              <span>Tratar Denúncias</span>
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        )}

        {/* Alerta 2: Recursos Pendentes do Catálogo */}
        {pendingResources > 0 && (
          <div className="flex flex-col items-start justify-between gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3.5 sm:flex-row sm:items-center">
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/20 text-base">
                📚
              </span>
              <p className="text-xs font-medium text-amber-200">
                {dict.adminPanel.alerts.pendingResources(pendingResources)}
              </p>
            </div>
            <Link
              href="/admin/catalog"
              className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-amber-400 px-3 py-1.5 text-xs font-semibold text-slate-950 transition-colors hover:bg-amber-300"
            >
              <span>Revisar Catálogo</span>
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        )}

        {/* Alerta 3: Pesquisas DFIR Pendentes */}
        {pendingResearch > 0 && (
          <div className="flex flex-col items-start justify-between gap-3 rounded-xl border border-indigo-500/40 bg-indigo-500/10 p-3.5 sm:flex-row sm:items-center">
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-500/20 text-base">
                🔬
              </span>
              <p className="text-xs font-medium text-indigo-200">
                {dict.adminPanel.alerts.pendingResearch(pendingResearch)}
              </p>
            </div>
            <Link
              href="/admin/research"
              className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-indigo-500 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-indigo-400"
            >
              <span>Revisar Pesquisas</span>
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        )}

        {/* Alerta 4: Suspensões de Contas */}
        {suspendedUsers > 0 && (
          <div className="flex flex-col items-start justify-between gap-3 rounded-xl border border-slate-800 bg-[#0c1220] p-3.5 sm:flex-row sm:items-center">
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-base text-slate-300">
                ⚠️
              </span>
              <p className="text-xs font-medium text-slate-300">
                {dict.adminPanel.alerts.recentSuspensions(suspendedUsers)}
              </p>
            </div>
            <Link
              href="/admin/users"
              className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-cyan-400 hover:text-cyan-300 hover:underline"
            >
              <span>Gerenciar Contas</span>
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        )}

        {/* Caso não haja pendências */}
        {!hasPendingItems && (
          <div className="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-xs text-emerald-300">
            <span className="text-base">✅</span>
            <span>{dict.adminPanel.alerts.systemHealthy}</span>
          </div>
        )}
      </div>
    </section>
  );
}
