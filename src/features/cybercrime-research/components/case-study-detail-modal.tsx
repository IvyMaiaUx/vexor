"use client";

import { useEffect, useState } from "react";
import type { CaseStudy } from "../types";

interface CaseStudyDetailModalProps {
  caseStudy: CaseStudy | null;
  isOpen: boolean;
  onClose: () => void;
  isPt: boolean;
}

export function CaseStudyDetailModal({
  caseStudy,
  isOpen,
  onClose,
  isPt,
}: CaseStudyDetailModalProps) {
  const [copiedIoc, setCopiedIoc] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !caseStudy) return null;

  const title = isPt ? caseStudy.title_pt : caseStudy.title_en;
  const summary = isPt ? caseStudy.summary_pt : caseStudy.summary_en;
  const context = isPt ? caseStudy.context_pt : caseStudy.context_en;
  const initialVector = isPt ? caseStudy.initialVector_pt : caseStudy.initialVector_en;
  const lateralMovement = isPt ? caseStudy.lateralMovement_pt : caseStudy.lateralMovement_en;
  const impact = isPt ? caseStudy.impact_pt : caseStudy.impact_en;
  const mitigations = isPt ? caseStudy.mitigations_pt : caseStudy.mitigations_en;
  const sector = isPt ? caseStudy.targetSector_pt : caseStudy.targetSector_en;

  const copyIoc = (val: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(val);
      setCopiedIoc(val);
      setTimeout(() => setCopiedIoc(null), 2000);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="case-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Container */}
      <div className="relative z-10 my-8 w-full max-w-4xl rounded-3xl border border-slate-800 bg-[#0b101d] p-6 shadow-2xl max-h-[90vh] overflow-y-auto sm:p-8">
        {/* Header bar */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-800/80 pb-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-md border border-rose-500/40 bg-rose-500/10 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-rose-300">
                {caseStudy.threatActor}
              </span>
              <span className="rounded-md border border-indigo-500/40 bg-indigo-500/10 px-2 py-0.5 font-mono text-[10px] text-indigo-300">
                {sector}
              </span>
              <span className="rounded-md border border-slate-700 bg-slate-800 px-2 py-0.5 font-mono text-[10px] text-slate-300">
                {caseStudy.date}
              </span>
              {caseStudy.isDemonstrative && (
                <span className="rounded-md border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 font-mono text-[10px] text-amber-300">
                  {isPt ? "Estudo Forense Demonstrativo" : "Demonstrative Case"}
                </span>
              )}
            </div>

            <h2
              id="case-modal-title"
              className="text-xl font-bold text-slate-100 sm:text-2xl"
            >
              {title}
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed">{summary}</p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-800 bg-slate-900/60 p-2 text-slate-400 hover:border-slate-700 hover:text-white transition-colors"
            aria-label="Fechar modal"
          >
            ✕
          </button>
        </div>

        {/* Content sections */}
        <div className="mt-6 space-y-6 text-sm text-slate-300">
          {/* Incident Context */}
          <div className="rounded-2xl border border-slate-800 bg-[#070b14] p-5">
            <h3 className="font-mono text-xs uppercase tracking-wider text-cyan-400">
              {isPt ? "1. Contexto do Incidente" : "1. Incident Context"}
            </h3>
            <p className="mt-2 text-xs sm:text-sm leading-relaxed text-slate-300">
              {context}
            </p>
          </div>

          {/* Chronological Attack Timeline */}
          <div className="rounded-2xl border border-slate-800 bg-[#070b14] p-5">
            <h3 className="font-mono text-xs uppercase tracking-wider text-indigo-400">
              {isPt ? "2. Cronologia da Intrusão" : "2. Attack Timeline"}
            </h3>
            <div className="mt-4 space-y-4 border-l-2 border-indigo-500/30 pl-4 sm:pl-6">
              {caseStudy.timeline.map((entry, idx) => (
                <div key={`${entry.phase}-${idx}`} className="relative space-y-1">
                  <div className="absolute -left-[23px] sm:-left-[31px] top-1.5 h-3 w-3 rounded-full border-2 border-indigo-400 bg-[#070b14]" />
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-slate-200 text-xs sm:text-sm">
                      {entry.phase}
                    </span>
                    <span className="font-mono text-[11px] text-indigo-300">
                      {entry.date}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {isPt ? entry.description_pt : entry.description_en}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Initial Vector & Lateral Movement Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-slate-800 bg-[#070b14] p-4">
              <span className="font-mono text-xs uppercase tracking-wider text-amber-400">
                {isPt ? "3. Vetor de Entrada Inicial" : "3. Initial Access Vector"}
              </span>
              <p className="mt-2 text-xs text-slate-300 leading-relaxed">
                {initialVector}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-[#070b14] p-4">
              <span className="font-mono text-xs uppercase tracking-wider text-cyan-400">
                {isPt ? "4. Movimentação Lateral & Escalação" : "4. Lateral Movement & Escalation"}
              </span>
              <p className="mt-2 text-xs text-slate-300 leading-relaxed">
                {lateralMovement}
              </p>
            </div>
          </div>

          {/* Impact Assessment */}
          <div className="rounded-2xl border border-rose-950/40 bg-rose-950/10 p-5 border-l-4 border-l-rose-500">
            <span className="font-mono text-xs uppercase tracking-wider text-rose-300">
              {isPt ? "5. Impacto e Consequências" : "5. Impact & Fallout"}
            </span>
            <p className="mt-2 text-xs sm:text-sm text-rose-200/90 leading-relaxed">
              {impact}
            </p>
          </div>

          {/* Indicators of Compromise (IoCs) */}
          <div className="rounded-2xl border border-slate-800 bg-[#070b14] p-5">
            <h3 className="font-mono text-xs uppercase tracking-wider text-emerald-400">
              {isPt ? "6. Indicadores de Comprometimento (IoCs)" : "6. Indicators of Compromise (IoCs)"}
            </h3>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-left font-mono text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400">
                    <th className="pb-2">Tipo</th>
                    <th className="pb-2">Valor</th>
                    <th className="pb-2">Notas</th>
                    <th className="pb-2 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {caseStudy.iocs.map((ioc) => (
                    <tr key={ioc.value} className="hover:bg-slate-800/30">
                      <td className="py-2 text-cyan-400 font-semibold uppercase">{ioc.type}</td>
                      <td className="py-2 text-slate-200 break-all">{ioc.value}</td>
                      <td className="py-2 text-slate-400 text-[11px]">{ioc.notes || "—"}</td>
                      <td className="py-2 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => copyIoc(ioc.value)}
                          className="rounded border border-slate-700 bg-slate-800 px-2 py-0.5 text-[10px] text-slate-300 hover:border-slate-500"
                        >
                          {copiedIoc === ioc.value ? "✓ Copiado" : "Copiar"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* MITRE ATT&CK TTPs & Actionable Mitigations */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-slate-800 bg-[#070b14] p-4">
              <span className="font-mono text-xs uppercase tracking-wider text-indigo-400">
                TTPs Mapeadas
              </span>
              <div className="mt-3 space-y-1.5">
                {caseStudy.ttps.map((ttp) => (
                  <div key={ttp.id} className="flex items-center justify-between text-xs">
                    <span className="font-mono font-bold text-indigo-300">{ttp.id}</span>
                    <span className="text-slate-300 truncate max-w-[180px]">{ttp.name}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-[#070b14] p-4">
              <span className="font-mono text-xs uppercase tracking-wider text-cyan-400">
                {isPt ? "Lições & Medidas Mitigatórias" : "Mitigation Checklist"}
              </span>
              <ul className="mt-3 space-y-2 text-xs text-slate-300">
                {mitigations.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-emerald-400 shrink-0">✓</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="mt-6 flex justify-end border-t border-slate-800/80 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-700 bg-slate-800 px-5 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition-colors"
          >
            {isPt ? "Fechar" : "Close"}
          </button>
        </div>
      </div>
    </div>
  );
}
