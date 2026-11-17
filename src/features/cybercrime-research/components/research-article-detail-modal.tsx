"use client";

import { useEffect } from "react";
import type { ResearchArticle } from "../types";

interface ResearchArticleDetailModalProps {
  article: ResearchArticle | null;
  isOpen: boolean;
  onClose: () => void;
  isPt: boolean;
}

export function ResearchArticleDetailModal({
  article,
  isOpen,
  onClose,
  isPt,
}: ResearchArticleDetailModalProps) {
  // ESC key listener
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !article) return null;

  const title = isPt ? article.title_pt : article.title_en;
  const summary = isPt ? article.summary_pt : article.summary_en;
  const body = isPt ? article.body_pt : article.body_en;

  const severityColor = {
    critical: "border-rose-500/40 bg-rose-500/15 text-rose-300",
    high: "border-amber-500/40 bg-amber-500/15 text-amber-300",
    medium: "border-cyan-500/40 bg-cyan-500/15 text-cyan-300",
    info: "border-slate-700 bg-slate-800 text-slate-300",
  }[article.severity];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="article-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Card */}
      <div className="relative z-10 my-8 w-full max-w-4xl rounded-3xl border border-slate-800 bg-[#0b101d] p-6 shadow-2xl max-h-[90vh] overflow-y-auto sm:p-8">
        {/* Header bar */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-800/80 pb-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`rounded-md border px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider ${severityColor}`}
              >
                {article.severity}
              </span>
              <span className="rounded-md border border-slate-700 bg-[#070b14] px-2 py-0.5 font-mono text-[10px] text-slate-300">
                TLP:{article.tlp}
              </span>
              <span className="rounded-md border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 font-mono text-[10px] text-cyan-300">
                ~{article.readTimeMinutes} min de leitura
              </span>
              {article.isDemonstrative && (
                <span className="rounded-md border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 font-mono text-[10px] text-amber-300">
                  {isPt ? "Conteúdo Demonstrativo" : "Demonstrative Content"}
                </span>
              )}
            </div>

            <h2
              id="article-modal-title"
              className="text-xl font-bold text-slate-100 sm:text-2xl"
            >
              {title}
            </h2>

            <div className="flex flex-wrap items-center gap-2 font-mono text-xs text-slate-400">
              <span>Por:</span>
              <span className="font-semibold text-slate-200">@{article.author}</span>
              {article.authorSpecialty && (
                <span className="rounded bg-slate-800/80 px-1.5 py-0.5 text-[10px] text-cyan-300">
                  {article.authorSpecialty}
                </span>
              )}
              <span>•</span>
              <span>{article.publishedAt}</span>
            </div>
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

        {/* Content Body */}
        <div className="mt-6 space-y-6 text-sm text-slate-300">
          {/* Executive Summary */}
          <div className="rounded-2xl border border-slate-800/80 bg-[#070b14]/70 p-4 sm:p-5">
            <h3 className="font-mono text-xs uppercase tracking-wider text-cyan-400">
              {isPt ? "Resumo do Relatório" : "Executive Summary"}
            </h3>
            <p className="mt-2 text-xs sm:text-sm leading-relaxed text-slate-300">
              {summary}
            </p>
          </div>

          {/* Full Text Render (Pure text blocks without dangerous HTML) */}
          <div className="space-y-4 rounded-2xl border border-slate-800/60 bg-[#070b14]/40 p-4 sm:p-6 text-xs sm:text-sm leading-relaxed">
            <h3 className="font-mono text-xs uppercase tracking-wider text-slate-400">
              {isPt ? "Conteúdo Completo da Pesquisa" : "Full Research Content"}
            </h3>
            <div className="whitespace-pre-line font-sans text-slate-200 space-y-3">
              {body}
            </div>
          </div>

          {/* Technical Indicators: MITRE ATT&CK & CVEs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-slate-800 bg-[#070b14] p-4">
              <span className="font-mono text-xs uppercase tracking-wider text-indigo-400">
                Táticas & Técnicas (MITRE ATT&CK)
              </span>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {article.attackTechniques.map((tech) => (
                  <span
                    key={tech}
                    className="rounded border border-indigo-500/30 bg-indigo-500/10 px-2 py-0.5 font-mono text-[11px] text-indigo-300"
                  >
                    {tech}
                  </span>
                ))}
              </div>
            </div>

            {article.cves && article.cves.length > 0 && (
              <div className="rounded-2xl border border-slate-800 bg-[#070b14] p-4">
                <span className="font-mono text-xs uppercase tracking-wider text-rose-400">
                  CVEs Vinculadas
                </span>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {article.cves.map((cve) => (
                    <span
                      key={cve}
                      className="rounded border border-rose-500/30 bg-rose-500/10 px-2 py-0.5 font-mono text-[11px] text-rose-300"
                    >
                      {cve}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* References & Sources */}
          {article.references && article.references.length > 0 && (
            <div className="rounded-2xl border border-slate-800 bg-[#070b14] p-4">
              <span className="font-mono text-xs uppercase tracking-wider text-slate-400">
                {isPt ? "Fontes & Referências Documentadas" : "Documented Sources & References"}
              </span>
              <ul className="mt-2.5 space-y-1.5 text-xs text-slate-400">
                {article.references.map((ref, idx) => (
                  <li key={`${ref.title}-${idx}`} className="flex items-center gap-2">
                    <span className="text-cyan-400">🔗</span>
                    {ref.url ? (
                      <a
                        href={ref.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-cyan-300 hover:underline"
                      >
                        {ref.title}
                      </a>
                    ) : (
                      <span>{ref.title}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Ethical Research Disclaimer Note */}
          <div className="rounded-2xl border border-cyan-900/50 bg-cyan-950/20 p-4 text-[11px] leading-relaxed text-cyan-200/80">
            <strong>{isPt ? "Princípio Ético Vexor:" : "Vexor Ethical Charter:"}</strong>{" "}
            {isPt
              ? "Esta publicação foi elaborada exclusivamente para capacitação técnica, pesquisa defensiva e compreensão dos mecanismos de cibercrime. O Vexor proíbe terminantemente a utilização destas técnicas para ataques contra sistemas alheios."
              : "This report was produced strictly for technical skill-building, defensive intelligence, and threat comprehension. Vexor strictly prohibits using these methodologies against unauthorized third-party infrastructure."}
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
