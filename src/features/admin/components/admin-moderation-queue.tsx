"use client";

import React, { useEffect, useState } from "react";
import type { FeaturedResourceItem } from "@/config/site";
import type { ForumTopic } from "@/features/forum/types";
import type { Report, ResearchSubmission } from "../types";
import { adminService } from "../services/admin-service";
import { useAuthStore } from "@/features/auth/use-auth-store";
import { useI18n } from "@/lib/i18n/context";
import { AdminReportModal } from "./admin-report-modal";

type QueueTab = "all" | "catalog" | "reports" | "forum" | "research";

export function AdminModerationQueue() {
  const { dict } = useI18n();
  const user = useAuthStore((s) => s.user);

  const [activeTab, setActiveTab] = useState<QueueTab>("all");
  const [loading, setLoading] = useState(true);

  // Data collections
  const [pendingResources, setPendingResources] = useState<FeaturedResourceItem[]>([]);
  const [openReports, setOpenReports] = useState<Report[]>([]);
  const [flaggedTopics, setFlaggedTopics] = useState<ForumTopic[]>([]);
  const [researchList, setResearchList] = useState<ResearchSubmission[]>([]);

  // Action state
  const [reloadKey, setReloadKey] = useState(0);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [rejectionModal, setRejectionModal] = useState<{
    type: "resource" | "research";
    id: string;
    title: string;
  } | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  useEffect(() => {
    let mounted = true;
    Promise.all([
      adminService.getPendingResources(),
      adminService.getReports({ status: "all" }),
      adminService.getForumTopicsForModeration(),
      adminService.getResearchSubmissions(),
    ])
      .then(([resList, repList, topList, resSubList]) => {
        if (mounted) {
          setPendingResources(resList);
          setOpenReports(
            repList.filter((r) => r.status === "open" || r.status === "reviewing")
          );
          setFlaggedTopics(topList.filter((t) => t.isPinned || t.isLocked));
          setResearchList(
            resSubList.filter(
              (r) => r.status === "pending" || r.status === "revision_requested"
            )
          );
          setLoading(false);
        }
      })
      .catch(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [reloadKey]);

  // Actions for catalog resources
  const handleApproveResource = async (slug: string) => {
    if (!user) return;
    const res = await adminService.moderateResource(user, slug, "approved");
    if (res.success) {
      setActionMessage("Recurso aprovado e publicado com sucesso.");
      setReloadKey((k) => k + 1);
    }
  };

  const handleConfirmRejection = async () => {
    if (!user || !rejectionModal) return;
    if (rejectionReason.trim().length < 5) return;

    if (rejectionModal.type === "resource") {
      const res = await adminService.moderateResource(
        user,
        rejectionModal.id,
        "rejected",
        rejectionReason
      );
      if (res.success) {
        setActionMessage("Recurso rejeitado com justificativa gravada.");
        setRejectionModal(null);
        setRejectionReason("");
        setReloadKey((k) => k + 1);
      }
    } else if (rejectionModal.type === "research") {
      const res = await adminService.moderateResearch(
        user,
        rejectionModal.id,
        "rejected",
        rejectionReason
      );
      if (res.success) {
        setActionMessage("Pesquisa rejeitada com parecer técnico arquivado.");
        setRejectionModal(null);
        setRejectionReason("");
        setReloadKey((k) => k + 1);
      }
    }
  };

  // Actions for Research
  const handleApproveResearch = async (id: string) => {
    if (!user) return;
    const res = await adminService.moderateResearch(user, id, "approved");
    if (res.success) {
      setActionMessage("Pesquisa aprovada para publicação na comunidade.");
      setReloadKey((k) => k + 1);
    }
  };

  // Compute counts
  const countCatalog = pendingResources.length;
  const countReports = openReports.length;
  const countResearch = researchList.length;
  const countTopics = flaggedTopics.length;
  const countTotal = countCatalog + countReports + countResearch + countTopics;

  return (
    <section aria-label={dict.adminPanel.dashboard.queueTitle} className="space-y-4">
      {/* Header */}
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-sm font-semibold tracking-wider text-slate-300 uppercase">
            {dict.adminPanel.dashboard.queueTitle}
          </h2>
          <p className="text-xs text-slate-400">
            Triagem unificada de recursos, relatórios, tópicos e inteligência técnica.
          </p>
        </div>

        {/* Action toast */}
        {actionMessage && (
          <div className="flex items-center gap-2 rounded-xl border border-cyan-500/40 bg-cyan-500/10 px-3 py-1.5 font-mono text-xs text-cyan-300">
            <span>✓</span>
            <span>{actionMessage}</span>
            <button
              type="button"
              onClick={() => setActionMessage(null)}
              className="ml-2 text-slate-400 hover:text-white"
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-800/80 pb-3">
        <button
          type="button"
          onClick={() => setActiveTab("all")}
          className={`flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-medium transition-colors ${
            activeTab === "all"
              ? "border border-cyan-500/40 bg-cyan-500/15 text-cyan-300"
              : "border border-slate-800 bg-[#0c1220] text-slate-400 hover:text-slate-200"
          }`}
        >
          <span>{dict.adminPanel.queue.tabs.all}</span>
          {countTotal > 0 && (
            <span className="rounded-full bg-cyan-500/20 px-1.5 py-0.2 font-mono text-[10px] text-cyan-300">
              {countTotal}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("reports")}
          className={`flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-medium transition-colors ${
            activeTab === "reports"
              ? "border border-rose-500/40 bg-rose-500/15 text-rose-300"
              : "border border-slate-800 bg-[#0c1220] text-slate-400 hover:text-slate-200"
          }`}
        >
          <span>🚨 {dict.adminPanel.queue.tabs.reports}</span>
          {countReports > 0 && (
            <span className="rounded-full bg-rose-500/20 px-1.5 py-0.2 font-mono text-[10px] text-rose-300">
              {countReports}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("catalog")}
          className={`flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-medium transition-colors ${
            activeTab === "catalog"
              ? "border border-amber-500/40 bg-amber-500/15 text-amber-300"
              : "border border-slate-800 bg-[#0c1220] text-slate-400 hover:text-slate-200"
          }`}
        >
          <span>📚 {dict.adminPanel.queue.tabs.catalog}</span>
          {countCatalog > 0 && (
            <span className="rounded-full bg-amber-500/20 px-1.5 py-0.2 font-mono text-[10px] text-amber-300">
              {countCatalog}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("forum")}
          className={`flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-medium transition-colors ${
            activeTab === "forum"
              ? "border border-cyan-500/40 bg-cyan-500/15 text-cyan-300"
              : "border border-slate-800 bg-[#0c1220] text-slate-400 hover:text-slate-200"
          }`}
        >
          <span>💬 {dict.adminPanel.queue.tabs.forum}</span>
          {countTopics > 0 && (
            <span className="rounded-full bg-cyan-500/20 px-1.5 py-0.2 font-mono text-[10px] text-cyan-300">
              {countTopics}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("research")}
          className={`flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-medium transition-colors ${
            activeTab === "research"
              ? "border border-indigo-500/40 bg-indigo-500/15 text-indigo-300"
              : "border border-slate-800 bg-[#0c1220] text-slate-400 hover:text-slate-200"
          }`}
        >
          <span>🔬 {dict.adminPanel.queue.tabs.research}</span>
          {countResearch > 0 && (
            <span className="rounded-full bg-indigo-500/20 px-1.5 py-0.2 font-mono text-[10px] text-indigo-300">
              {countResearch}
            </span>
          )}
        </button>
      </div>

      {/* Queue Items List */}
      <div className="space-y-3">
        {loading ? (
          <div className="rounded-2xl border border-slate-800 bg-[#0c1220]/50 p-8 text-center text-xs text-slate-400">
            Carregando itens da fila de moderação...
          </div>
        ) : (
          <>
            {/* 1. Denúncias em Aberto */}
            {(activeTab === "all" || activeTab === "reports") &&
              openReports.map((report) => (
                <div
                  key={report.id}
                  className="rounded-2xl border border-rose-500/30 bg-[#0c1220]/90 p-4 transition-all hover:border-rose-500/50"
                >
                  <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-md border border-rose-500/40 bg-rose-500/15 px-2 py-0.5 font-mono text-[10px] font-bold text-rose-300 uppercase">
                          DENÚNCIA · {report.reason.replace("_", " ")}
                        </span>
                        <span className="font-mono text-xs text-slate-400">
                          #{report.id} · Alvo: <span className="text-slate-200">{report.targetType}</span>
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-slate-100">
                        {report.targetTitle || `Conteúdo denunciado (${report.targetId})`}
                      </h3>
                      {report.details && (
                        <p className="text-xs text-slate-300">
                          <strong className="text-slate-400">Alegação:</strong> &ldquo;{report.details}&rdquo;
                        </p>
                      )}
                      <div className="flex items-center gap-3 font-mono text-[11px] text-slate-400">
                        <span>Denunciante: <span className="text-slate-300">Identidade protegida</span></span>
                        <span>•</span>
                        <span>{new Date(report.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-2 pt-2 sm:pt-0">
                      <button
                        type="button"
                        onClick={() => setSelectedReport(report)}
                        className="inline-flex min-h-[38px] items-center justify-center rounded-xl bg-rose-500 px-4 py-2 text-xs font-semibold text-slate-950 shadow-[0_0_15px_rgba(244,63,94,0.25)] hover:bg-rose-400"
                      >
                        {dict.adminPanel.queue.actionResolve}
                      </button>
                    </div>
                  </div>
                </div>
              ))}

            {/* 2. Recursos do Catálogo Pendentes */}
            {(activeTab === "all" || activeTab === "catalog") &&
              pendingResources.map((res) => (
                <div
                  key={res.slug}
                  className="rounded-2xl border border-amber-500/30 bg-[#0c1220]/90 p-4 transition-all hover:border-amber-500/50"
                >
                  <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-md border border-amber-500/40 bg-amber-500/15 px-2 py-0.5 font-mono text-[10px] font-bold text-amber-300 uppercase">
                          CATÁLOGO PENDENTE
                        </span>
                        <span className="rounded bg-slate-800 px-2 py-0.5 font-mono text-[10px] text-slate-400">
                          {res.categorySlug}
                        </span>
                        <span className="rounded bg-slate-800 px-2 py-0.5 font-mono text-[10px] text-slate-400">
                          {res.type}
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-slate-100">{res.name}</h3>
                      <p className="line-clamp-2 text-xs text-slate-300">{res.description_pt || res.description_en}</p>
                      <div className="flex items-center gap-3 font-mono text-[11px] text-slate-400">
                        <span>URL Oficial: <a href={res.url} target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">{res.url}</a></span>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-2 pt-2 sm:pt-0">
                      <button
                        type="button"
                        onClick={() => handleApproveResource(res.slug)}
                        className="inline-flex min-h-[38px] items-center justify-center rounded-xl bg-emerald-500 px-3.5 py-2 text-xs font-semibold text-slate-950 hover:bg-emerald-400"
                      >
                        ✓ {dict.adminPanel.queue.actionApprove}
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setRejectionModal({
                            type: "resource",
                            id: res.slug,
                            title: res.name,
                          })
                        }
                        className="inline-flex min-h-[38px] items-center justify-center rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-300 hover:bg-rose-500/20"
                      >
                        ✕ {dict.adminPanel.queue.actionReject}
                      </button>
                    </div>
                  </div>
                </div>
              ))}

            {/* 3. Cybercrime Research Submissions */}
            {(activeTab === "all" || activeTab === "research") &&
              researchList.map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl border border-indigo-500/30 bg-[#0c1220]/90 p-4 transition-all hover:border-indigo-500/50"
                >
                  <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-md border border-indigo-500/40 bg-indigo-500/15 px-2 py-0.5 font-mono text-[10px] font-bold text-indigo-300 uppercase">
                          DFIR RESEARCH · TLP {item.tlp}
                        </span>
                        <span className="rounded bg-slate-800 px-2 py-0.5 font-mono text-[10px] text-slate-400">
                          {item.domain}
                        </span>
                        <span className="rounded bg-rose-500/10 text-rose-300 border border-rose-500/20 px-2 py-0.5 font-mono text-[10px]">
                          {item.severity.toUpperCase()}
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-slate-100">{item.title_pt}</h3>
                      <p className="line-clamp-2 text-xs text-slate-300">{item.summary_pt}</p>
                      <div className="flex items-center gap-3 font-mono text-[11px] text-slate-400">
                        <span>Pesquisador: <span className="text-cyan-300">@{item.author}</span></span>
                        <span>•</span>
                        <span>Técnicas: {item.attackTechniques.join(", ")}</span>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-2 pt-2 sm:pt-0">
                      <button
                        type="button"
                        onClick={() => handleApproveResearch(item.id)}
                        className="inline-flex min-h-[38px] items-center justify-center rounded-xl bg-indigo-500 px-3.5 py-2 text-xs font-semibold text-white hover:bg-indigo-400"
                      >
                        ✓ {dict.adminPanel.queue.actionApprove}
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setRejectionModal({
                            type: "research",
                            id: item.id,
                            title: item.title_pt,
                          })
                        }
                        className="inline-flex min-h-[38px] items-center justify-center rounded-xl border border-slate-700 bg-[#070b14] px-3 py-2 text-xs font-semibold text-slate-300 hover:text-white"
                      >
                        ✕ {dict.adminPanel.queue.actionReject}
                      </button>
                    </div>
                  </div>
                </div>
              ))}

            {/* 4. Tópicos do Fórum (Fixados ou Sinalizados) */}
            {(activeTab === "all" || activeTab === "forum") &&
              flaggedTopics.map((top) => (
                <div
                  key={top.id}
                  className="rounded-2xl border border-slate-800 bg-[#0c1220]/90 p-4 transition-all hover:border-cyan-500/40"
                >
                  <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-md border border-cyan-500/40 bg-cyan-500/15 px-2 py-0.5 font-mono text-[10px] font-bold text-cyan-300 uppercase">
                          FÓRUM · {top.isPinned ? "FIXADO" : "TRANCADO"}
                        </span>
                        <span className="rounded bg-slate-800 px-2 py-0.5 font-mono text-[10px] text-slate-400">
                          {top.categorySlug}
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-slate-100">{top.title_pt}</h3>
                      <p className="line-clamp-2 text-xs text-slate-300">{top.body_pt}</p>
                      <div className="flex items-center gap-3 font-mono text-[11px] text-slate-400">
                        <span>
                          Autor: <span className="text-cyan-300">@{top.authorUsername}</span>
                        </span>
                        <span>•</span>
                        <span>{new Date(top.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

            {/* Empty state */}
            {countTotal === 0 && (
              <div className="rounded-2xl border border-slate-800/80 bg-[#0c1220]/50 p-12 text-center">
                <span className="text-3xl">🎉</span>
                <p className="mt-2 text-sm font-semibold text-slate-200">
                  {dict.adminPanel.queue.emptyState}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Todas as submissões e denúncias foram moderadas e arquivadas.
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal de Tratamento de Denúncias */}
      {selectedReport && (
        <AdminReportModal
          report={selectedReport}
          onClose={() => setSelectedReport(null)}
          onSuccess={() => {
            setActionMessage("Denúncia resolvida com justificativa registrada.");
            setReloadKey((k) => k + 1);
          }}
        />
      )}

      {/* Modal de Rejeição com Justificativa Obrigatória */}
      {rejectionModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setRejectionModal(null)}
            aria-hidden="true"
          />
          <div className="relative z-10 w-full max-w-md rounded-2xl border border-slate-800 bg-[#0c1220] p-6 shadow-2xl">
            <h3 className="text-base font-bold text-slate-100">
              Rejeitar: {rejectionModal.title}
            </h3>
            <p className="mt-1 text-xs text-slate-400">
              A política de governança do Vexor exige uma justificativa técnica clara para toda rejeição.
            </p>

            <div className="mt-4">
              <label className="block text-xs font-semibold text-slate-300">
                Justificativa Técnica (Obrigatória) *
              </label>
              <textarea
                rows={4}
                required
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Informe o motivo da não aprovação (ex: link quebrado, documentação insuficiente, risco de segurança)..."
                className="mt-1.5 w-full rounded-xl border border-slate-700 bg-[#070b14] p-3 text-xs text-slate-200 focus:border-cyan-500 focus:outline-none"
              />
              <span className="mt-1 block font-mono text-[10px] text-slate-400">
                Mínimo 5 caracteres.
              </span>
            </div>

            <div className="mt-5 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setRejectionModal(null)}
                className="rounded-xl border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={rejectionReason.trim().length < 5}
                onClick={handleConfirmRejection}
                className="rounded-xl bg-rose-500 px-5 py-2 text-xs font-semibold text-slate-950 hover:bg-rose-400 disabled:opacity-50"
              >
                Confirmar Rejeição
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
