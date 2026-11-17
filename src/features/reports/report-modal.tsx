"use client";

import { type FormEvent, useRef, useState } from "react";
import type { SupportedLocale } from "@/config/site";
import { useAuthStore } from "@/features/auth/use-auth-store";
import {
  type ReportReason,
  type ReportTargetType,
  submitContentReport,
  VALID_REPORT_REASONS,
} from "./report-service";

interface ReportButtonProps {
  targetType: ReportTargetType;
  targetId: string;
  locale: SupportedLocale;
  className?: string;
}

function getReasonLabel(
  reason: ReportReason,
  locale: SupportedLocale
): string {
  if (locale === "pt-BR") {
    switch (reason) {
      case "spam":
        return "Spam ou autopromoção excessiva";
      case "malicious_content":
        return "Conteúdo malicioso / malware / phishing";
      case "personal_data":
        return "Exposição de dados pessoais (PII/doxxing)";
      case "harassment":
        return "Assédio ou discurso abusivo";
      case "unauthorized_attack":
        return "Ataque não autorizado / abuso";
      case "copyright":
        return "Violação de direitos autorais";
      case "other":
        return "Outro motivo";
    }
  }
  switch (reason) {
    case "spam":
      return "Spam or excessive self-promotion";
    case "malicious_content":
      return "Malicious content / malware / phishing";
    case "personal_data":
      return "Personal data exposure (PII/doxxing)";
    case "harassment":
      return "Harassment or abusive behavior";
    case "unauthorized_attack":
      return "Unauthorized attack / abuse";
    case "copyright":
      return "Copyright infringement";
    case "other":
      return "Other";
  }
}

export function ReportButton({
  targetType,
  targetId,
  locale,
  className = "",
}: ReportButtonProps) {
  const { user, isActiveMember } = useAuthStore();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ReportReason>("spam");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const inFlightRef = useRef(false);

  if (!user || !isActiveMember) {
    return null;
  }

  const handleOpen = () => {
    setOpen(true);
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (inFlightRef.current) return;

    inFlightRef.current = true;
    setSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await submitContentReport({
        targetType,
        targetId,
        reason,
        details,
      });

      if (res.status === "error") {
        if (res.errorCode === "duplicate") {
          setErrorMessage(
            locale === "pt-BR"
              ? "Você já possui uma denúncia em aberto para este item."
              : "You already have an open report for this item."
          );
        } else {
          setErrorMessage(res.message);
        }
        return;
      }

      setSuccessMessage(
        locale === "pt-BR"
          ? "Denúncia registrada com segurança. Nossa equipe de moderação irá analisar."
          : "Report submitted safely. Our moderation team will review it."
      );
      setDetails("");
    } finally {
      inFlightRef.current = false;
      setSubmitting(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className={`inline-flex items-center gap-1 rounded-lg border border-slate-800 bg-[#070b14] px-2.5 py-1 font-mono text-[11px] text-slate-400 transition-colors hover:border-rose-500/40 hover:text-rose-300 ${className}`}
      >
        <span aria-hidden="true">⚑</span>
        <span>{locale === "pt-BR" ? "Denunciar" : "Report"}</span>
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={locale === "pt-BR" ? "Denunciar conteúdo" : "Report content"}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
        >
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-[#0d1322] p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-base font-bold text-slate-100">
                {locale === "pt-BR" ? "Denunciar conteúdo" : "Report content"}
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={locale === "pt-BR" ? "Fechar" : "Close"}
                className="rounded-lg px-2 py-1 text-xs text-slate-400 hover:bg-slate-800 hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            {successMessage ? (
              <div className="mt-4 space-y-4">
                <p className="rounded-xl border border-emerald-500/40 bg-emerald-950/25 p-3 text-xs text-emerald-200">
                  ✓ {successMessage}
                </p>
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="rounded-xl bg-cyan-500 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-cyan-400"
                  >
                    {locale === "pt-BR" ? "Fechar" : "Close"}
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                <div>
                  <label className="block font-mono text-xs uppercase text-slate-400">
                    {locale === "pt-BR" ? "Motivo" : "Reason"} *
                  </label>
                  <select
                    value={reason}
                    onChange={(e) => setReason(e.target.value as ReportReason)}
                    required
                    className="mt-1.5 w-full rounded-xl border border-slate-800 bg-[#070b14] px-3 py-2.5 text-sm text-slate-100 focus:border-cyan-500 focus:outline-none"
                  >
                    {VALID_REPORT_REASONS.map((r) => (
                      <option key={r} value={r}>
                        {getReasonLabel(r, locale)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <label className="block font-mono text-xs uppercase text-slate-400">
                      {locale === "pt-BR"
                        ? "Detalhes adicionais (opcional)"
                        : "Additional details (optional)"}
                    </label>
                    <span className="font-mono text-[11px] text-slate-500">
                      {details.length}/1000
                    </span>
                  </div>
                  <textarea
                    rows={4}
                    maxLength={1000}
                    value={details}
                    onChange={(e) => setDetails(e.target.value)}
                    placeholder={
                      locale === "pt-BR"
                        ? "Descreva brevemente o contexto da denúncia..."
                        : "Briefly describe the context of your report..."
                    }
                    className="mt-1.5 w-full rounded-xl border border-slate-800 bg-[#070b14] p-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none"
                  />
                </div>

                {errorMessage && (
                  <p className="rounded-xl border border-rose-500/40 bg-rose-950/25 px-3 py-2 text-xs text-rose-200">
                    {errorMessage}
                  </p>
                )}

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="rounded-xl border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-300 hover:text-slate-100"
                  >
                    {locale === "pt-BR" ? "Cancelar" : "Cancel"}
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="rounded-xl bg-rose-500 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-400 disabled:opacity-50"
                  >
                    {submitting
                      ? "..."
                      : locale === "pt-BR"
                        ? "Enviar denúncia"
                        : "Submit report"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
