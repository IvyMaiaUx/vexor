"use client";

import { useEffect } from "react";
import type { AnalysisLabGuide } from "../types";

interface LabGuideModalProps {
  guide: AnalysisLabGuide | null;
  isOpen: boolean;
  onClose: () => void;
  isPt: boolean;
}

export function LabGuideModal({
  guide,
  isOpen,
  onClose,
  isPt,
}: LabGuideModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !guide) return null;

  const title = isPt ? guide.title_pt : guide.title_en;
  const summary = isPt ? guide.summary_pt : guide.summary_en;
  const methodology = isPt ? guide.methodology_pt : guide.methodology_en;
  const opsecRules = isPt ? guide.opsecRules_pt : guide.opsecRules_en;
  const warning = isPt ? guide.safetyWarning_pt : guide.safetyWarning_en;

  const levelBadge = {
    beginner: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
    intermediate: "border-cyan-500/40 bg-cyan-500/10 text-cyan-300",
    advanced: "border-rose-500/40 bg-rose-500/10 text-rose-300",
  }[guide.level];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="lab-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Card */}
      <div className="relative z-10 my-8 w-full max-w-3xl rounded-3xl border border-slate-800 bg-[#0b101d] p-6 shadow-2xl max-h-[90vh] overflow-y-auto sm:p-8">
        <div className="flex items-start justify-between gap-4 border-b border-slate-800/80 pb-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`rounded-md border px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider ${levelBadge}`}
              >
                Nível: {guide.level}
              </span>
              <span className="rounded-md border border-slate-700 bg-slate-800 px-2 py-0.5 font-mono text-[10px] text-slate-300">
                {guide.category}
              </span>
            </div>
            <h2 id="lab-modal-title" className="text-xl font-bold text-slate-100 sm:text-2xl">
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

        <div className="mt-6 space-y-6 text-sm text-slate-300">
          {/* OPSEC Rules (Must-know security practices) */}
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5">
            <h3 className="font-mono text-xs uppercase tracking-wider text-amber-300">
              🛡️ {isPt ? "Regras Obrigatórias de OPSEC & Isolamento" : "Mandatory OPSEC Isolation Rules"}
            </h3>
            <ul className="mt-3 space-y-2 text-xs text-amber-200/90">
              {opsecRules.map((rule, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-amber-400 font-bold shrink-0">!</span>
                  <span>{rule}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Methodology */}
          <div className="rounded-2xl border border-slate-800 bg-[#070b14] p-5">
            <h3 className="font-mono text-xs uppercase tracking-wider text-cyan-400">
              {isPt ? "Roteiro Metodológico" : "Methodology Workflow"}
            </h3>
            <div className="mt-3 font-sans text-xs sm:text-sm text-slate-200 leading-relaxed whitespace-pre-line">
              {methodology}
            </div>
          </div>

          {/* Tooling Required */}
          <div className="rounded-2xl border border-slate-800 bg-[#070b14] p-5">
            <h3 className="font-mono text-xs uppercase tracking-wider text-indigo-400">
              {isPt ? "Ferramental Recomendado" : "Recommended Tooling"}
            </h3>
            <div className="mt-3 space-y-2">
              {guide.tools.map((tool) => (
                <div
                  key={tool.name}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 rounded-xl border border-slate-800/80 bg-slate-900/40 p-3 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-slate-100">{tool.name}</span>
                    {tool.isSandboxedOnly && (
                      <span className="rounded bg-rose-950/80 border border-rose-800/60 px-1.5 py-0.2 font-mono text-[9px] text-rose-300">
                        Apenas VM / Sandbox
                      </span>
                    )}
                  </div>
                  <span className="text-slate-400">{tool.purpose}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Legal and Safety Warning */}
          <div className="rounded-2xl border border-rose-950/50 bg-rose-950/20 p-4 text-[11px] leading-relaxed text-rose-300/90">
            <strong>{isPt ? "Aviso de Segurança:" : "Security Disclaimer:"}</strong> {warning}
          </div>
        </div>

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
