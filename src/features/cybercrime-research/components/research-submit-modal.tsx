"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuthStore } from "@/features/auth/use-auth-store";
import { useActivityStore } from "@/features/activity/use-activity-store";
import { researchService } from "../services/research-service";
import type {
  ResearchDomain,
  ResearchSeverity,
  ResearchSubmissionDetail,
  ResearchTlp,
} from "../types";

interface ResearchSubmitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitted?: () => void;
  isPt: boolean;
  initialSubmission?: ResearchSubmissionDetail | null;
}

export function ResearchSubmitModal({
  isOpen,
  onClose,
  onSubmitted,
  isPt,
  initialSubmission,
}: ResearchSubmitModalProps) {
  const { user } = useAuthStore();
  const { recordActivity } = useActivityStore();

  const [categories, setCategories] = useState<
    Array<{ id: string; slug: string; namePt: string; nameEn: string }>
  >([]);
  const [categoryId, setCategoryId] = useState("");
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [body, setBody] = useState("");
  const [domain, setDomain] = useState<ResearchDomain>("malware");
  const [severity, setSeverity] = useState<ResearchSeverity>("medium");
  const [tlp, setTlp] = useState<ResearchTlp>("CLEAR");
  const [cvesRaw, setCvesRaw] = useState("");
  const [techniquesRaw, setTechniquesRaw] = useState("T1059, T1027");
  const [readTime, setReadTime] = useState(10);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    void researchService.listResearchCategories().then((res) => {
      if (!active) return;
      if (res.success && res.data?.items) {
        setCategories(res.data.items);
        if (!initialSubmission && res.data.items.length > 0) {
          setCategoryId((prev) => prev || res.data!.items[0].id);
        }
      } else if (!res.success) {
        setErrorMessage(
          res.error ??
            (isPt
              ? "Não foi possível carregar as categorias de pesquisa."
              : "Unable to load research categories.")
        );
      }
    });
    return () => {
      active = false;
    };
  }, [isOpen, initialSubmission, isPt]);

  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    void Promise.resolve().then(() => {
      if (!active) return;
      if (initialSubmission) {
        setCategoryId(initialSubmission.categoryId);
        setTitle(initialSubmission.titlePt);
        setSummary(initialSubmission.summaryPt);
        setBody(initialSubmission.bodyPt);
        setDomain(initialSubmission.domain);
        setSeverity(initialSubmission.severity);
        setTlp(initialSubmission.tlp);
        setCvesRaw(initialSubmission.cves.join(", "));
        setTechniquesRaw(initialSubmission.attackTechniques.join(", "));
        setReadTime(initialSubmission.readTimeMinutes);
      } else {
        setTitle("");
        setSummary("");
        setBody("");
        setDomain("malware");
        setSeverity("medium");
        setTlp("CLEAR");
        setCvesRaw("");
        setTechniquesRaw("T1059, T1027");
        setReadTime(10);
      }
      setErrorMessage("");
      setSuccessMessage("");
    });
    return () => {
      active = false;
    };
  }, [isOpen, initialSubmission]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    if (!user) {
      setErrorMessage(isPt ? "Você deve estar autenticado para enviar uma pesquisa." : "You must be signed in to submit research.");
      return;
    }

    if (user.isSuspended) {
      setErrorMessage(isPt ? "Contas suspensas não possuem permissão para submeter novos conteúdos." : "Suspended accounts cannot submit new content.");
      return;
    }

    setIsSubmitting(true);

    const cves = cvesRaw
      .split(",")
      .map((c) => c.trim().toUpperCase())
      .filter((c) => c.startsWith("CVE-"));

    const attackTechniques = techniquesRaw
      .split(",")
      .map((t) => t.trim().toUpperCase())
      .filter((t) => t.startsWith("T"));

    const payload = {
      categoryId,
      titlePt: title,
      summaryPt: summary,
      bodyPt: body.trim() || summary,
      domain,
      severity,
      tlp,
      cves,
      attackTechniques,
      readTimeMinutes: Number(readTime) || 10,
    };

    let result: { success: boolean; id?: string; error?: string };
    if (initialSubmission?.status === "rejected") {
      result = await researchService.resubmitResearch(initialSubmission.id, payload, user);
    } else if (initialSubmission?.status === "pending") {
      const upd = await researchService.updatePendingSubmission(initialSubmission.id, payload);
      result = { success: upd.success, id: initialSubmission.id, error: upd.error };
    } else {
      result = await researchService.submitResearch(
        {
          categoryId,
          title_pt: title,
          summary_pt: summary,
          body_pt: body.trim() || summary,
          domain,
          severity,
          tlp,
          cves,
          attackTechniques,
          readTimeMinutes: Number(readTime) || 10,
        },
        user
      );
    }

    setIsSubmitting(false);

    if (!result.success) {
      setErrorMessage(result.error || (isPt ? "Erro ao submeter pesquisa." : "Error submitting research."));
      return;
    }

    // Record activity in user timeline
    recordActivity({
      category: "contributions",
      title_pt: "Submeteu uma análise de cibercrime para moderação",
      title_en: "Submitted a cybercrime research paper for review",
      detail_pt: `${title} · ${domain.toUpperCase()}`,
      detail_en: `${title} · ${domain.toUpperCase()}`,
      link: "/my-contributions",
      badgeLabel: isPt ? "Pesquisa" : "Research",
      icon: "🔬",
      targetKey: `research:${result.id}`,
    });

    setSuccessMessage(
      isPt
        ? "Pesquisa submetida com sucesso! Ela foi direcionada à fila de moderação e ficará pendente de análise técnica antes da publicação."
        : "Research report submitted successfully! It is now pending review in the moderation queue."
    );

    if (onSubmitted) {
      onSubmitted();
    }

    setTimeout(() => {
      onClose();
      setTitle("");
      setSummary("");
      setSuccessMessage("");
    }, 2000);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="submit-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
    >
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative z-10 my-8 w-full max-w-2xl rounded-3xl border border-slate-800 bg-[#0b101d] p-6 shadow-2xl max-h-[90vh] overflow-y-auto sm:p-8">
        <div className="flex items-start justify-between gap-4 border-b border-slate-800/80 pb-4">
          <div>
            <h2 id="submit-modal-title" className="text-xl font-bold text-slate-100">
              {isPt ? "Submeter Análise Técnica de Cibercrime" : "Submit Cybercrime Technical Research"}
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              {isPt
                ? "Submissões entram com status pendente e passam por revisão de segurança e metodologia antes de serem publicadas."
                : "Submissions enter as pending and are peer-reviewed for safety and methodology before publishing."}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-800 bg-slate-900/60 p-2 text-slate-400 hover:text-white"
          >
            ✕
          </button>
        </div>

        {/* Gate: If not authenticated */}
        {!user ? (
          <div className="my-8 rounded-2xl border border-cyan-800/60 bg-cyan-950/20 p-6 text-center space-y-4">
            <span className="text-3xl">🔒</span>
            <h3 className="text-sm font-bold text-slate-100">
              {isPt ? "Autenticação Obrigatória" : "Authentication Required"}
            </h3>
            <p className="text-xs text-slate-300 max-w-md mx-auto">
              {isPt
                ? "Para preservar a integridade da pesquisa e prevenir spam, apenas membros autenticados podem submeter relatórios técnicos."
                : "To protect community research from spam, only authenticated members may submit technical analysis."}
            </p>
            <Link
              href="/login"
              className="inline-block rounded-xl bg-cyan-500 px-5 py-2 text-xs font-semibold text-slate-950 hover:bg-cyan-400"
            >
              {isPt ? "Entrar na Conta" : "Sign In"}
            </Link>
          </div>
        ) : user.isSuspended ? (
          /* Gate: If suspended */
          <div className="my-8 rounded-2xl border border-rose-800/60 bg-rose-950/20 p-6 text-center space-y-3">
            <span className="text-3xl">⛔</span>
            <h3 className="text-sm font-bold text-rose-300">
              {isPt ? "Conta sob Restrição / Suspensão" : "Account Suspended"}
            </h3>
            <p className="text-xs text-slate-300 max-w-md mx-auto">
              {isPt
                ? "Sua conta encontra-se atualmente suspensa preventivamente. Você não pode submeter conteúdos novos ou reenvios."
                : "Your account is currently under suspension. You cannot submit new content or resubmissions."}
            </p>
          </div>
        ) : (
          /* Submission Form */
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {errorMessage && (
              <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-xs text-rose-300">
                {errorMessage}
              </div>
            )}
            {successMessage && (
              <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3 text-xs text-emerald-300">
                {successMessage}
              </div>
            )}

            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-1">
                {isPt ? "Categoria *" : "Category *"}
              </label>
              <select
                required
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-[#070b14] px-3 py-2 text-xs text-slate-200 focus:border-cyan-500/60 focus:outline-none"
              >
                {categories.length === 0 ? (
                  <option value="">{isPt ? "Carregando categorias..." : "Loading categories..."}</option>
                ) : (
                  categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {isPt ? cat.namePt : cat.nameEn}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-1">
                {isPt ? "Título da Pesquisa *" : "Research Title *"}
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={isPt ? "Ex: Desmontagem do Loader X e Técnicas de Evasão..." : "Ex: Dissecting Loader X and Evasion Techniques..."}
                className="w-full rounded-xl border border-slate-800 bg-[#070b14] px-4 py-2.5 text-xs text-slate-100 placeholder:text-slate-500 focus:border-cyan-500/60 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-1">
                  {isPt ? "Domínio *" : "Domain *"}
                </label>
                <select
                  value={domain}
                  onChange={(e) => setDomain(e.target.value as ResearchDomain)}
                  className="w-full rounded-xl border border-slate-800 bg-[#070b14] px-3 py-2 text-xs text-slate-200 focus:border-cyan-500/60 focus:outline-none"
                >
                  <option value="malware">Malware</option>
                  <option value="ransomware">Ransomware</option>
                  <option value="apt">APT & Espionagem</option>
                  <option value="darkweb">Dark Web & Vazamentos</option>
                  <option value="fraud">Fraudes Financeiras</option>
                  <option value="botnets">Botnets</option>
                  <option value="identity">Identidade & Acesso</option>
                  <option value="legal">Aspectos Legais</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-1">
                  {isPt ? "Severidade *" : "Severity *"}
                </label>
                <select
                  value={severity}
                  onChange={(e) =>
                    setSeverity(
                      e.target.value as "critical" | "high" | "medium" | "info"
                    )
                  }
                  className="w-full rounded-xl border border-slate-800 bg-[#070b14] px-3 py-2 text-xs text-slate-200 focus:border-cyan-500/60 focus:outline-none"
                >
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="info">Info</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-1">
                  {isPt ? "Protocolo TLP *" : "TLP Protocol *"}
                </label>
                <select
                  value={tlp}
                  onChange={(e) => setTlp(e.target.value as ResearchTlp)}
                  className="w-full rounded-xl border border-slate-800 bg-[#070b14] px-3 py-2 text-xs text-slate-200 focus:border-cyan-500/60 focus:outline-none"
                >
                  <option value="CLEAR">TLP:CLEAR (Público)</option>
                  <option value="GREEN">TLP:GREEN (Comunidade)</option>
                  <option value="AMBER">TLP:AMBER (Restrito)</option>
                  <option value="AMBER+">TLP:AMBER+ (Restrito Estrito)</option>
                  <option value="RED">TLP:RED (Destinatários Individuais)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-1">
                {isPt ? "Resumo Técnico Executivo (Mínimo 20 caracteres) *" : "Executive Summary (Min 20 chars) *"}
              </label>
              <textarea
                required
                rows={3}
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder={isPt ? "Descreva os achados, metodologia de análise e relevância defensiva..." : "Describe findings, analysis methodology, and defensive relevance..."}
                className="w-full rounded-xl border border-slate-800 bg-[#070b14] p-3 text-xs text-slate-100 placeholder:text-slate-500 focus:border-cyan-500/60 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-1">
                {isPt ? "Corpo Técnico da Análise (Mínimo 20 caracteres) *" : "Technical Analysis Body (Min 20 chars) *"}
              </label>
              <textarea
                required
                rows={5}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder={isPt ? "Detalhe indicadores, TTPs, análise técnica e recomendações defensivas..." : "Detail indicators, TTPs, technical analysis, and defensive recommendations..."}
                className="w-full rounded-xl border border-slate-800 bg-[#070b14] p-3 text-xs text-slate-100 placeholder:text-slate-500 focus:border-cyan-500/60 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-1">
                  {isPt ? "Técnicas ATT&CK (separadas por vírgula)" : "ATT&CK Techniques (comma-separated)"}
                </label>
                <input
                  type="text"
                  value={techniquesRaw}
                  onChange={(e) => setTechniquesRaw(e.target.value)}
                  placeholder="T1059, T1055, T1027"
                  className="w-full rounded-xl border border-slate-800 bg-[#070b14] px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:border-cyan-500/60 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-1">
                  {isPt ? "CVEs Relacionadas (opcional)" : "Related CVEs (optional)"}
                </label>
                <input
                  type="text"
                  value={cvesRaw}
                  onChange={(e) => setCvesRaw(e.target.value)}
                  placeholder="CVE-2026-1932, CVE-2025-4911"
                  className="w-full rounded-xl border border-slate-800 bg-[#070b14] px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:border-cyan-500/60 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-1">
                {isPt ? "Tempo Estimado de Leitura (minutos)" : "Estimated Read Time (minutes)"}
              </label>
              <input
                type="number"
                min={1}
                max={120}
                value={readTime}
                onChange={(e) => setReadTime(Number(e.target.value))}
                className="w-32 rounded-xl border border-slate-800 bg-[#070b14] px-3 py-2 text-xs text-slate-100 focus:border-cyan-500/60 focus:outline-none"
              />
            </div>

            <div className="pt-3 border-t border-slate-800/80 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700"
              >
                {isPt ? "Cancelar" : "Cancel"}
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-xl bg-cyan-500 px-5 py-2 text-xs font-semibold text-slate-950 hover:bg-cyan-400 disabled:opacity-50"
              >
                {isSubmitting
                  ? isPt ? "Enviando..." : "Submitting..."
                  : isPt ? "Enviar para Moderação" : "Submit for Moderation"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
