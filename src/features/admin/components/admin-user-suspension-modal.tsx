"use client";

import React, { useEffect, useRef, useState } from "react";
import { adminDataProvider, type AdminUser } from "@/features/admin";
import { mapAdminUserServiceError } from "@/features/admin/utils/user-error-mapper";
import { useAuthStore } from "@/features/auth/use-auth-store";
import { useI18n } from "@/lib/i18n/context";

interface AdminUserSuspensionModalProps {
  user: AdminUser | null;
  activeAdminsCount: number;
  onClose: () => void;
  onSuccess: () => void;
}

export function AdminUserSuspensionModal({
  user,
  activeAdminsCount,
  onClose,
  onSuccess,
}: AdminUserSuspensionModalProps) {
  const { dict } = useI18n();
  const currentUser = useAuthStore((s) => s.user);
  const t = dict.adminPanel.usersPage;
  const sm = t.suspensionModal;

  const [reason, setReason] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const submitGuardRef = useRef(false);

  useEffect(() => {
    if (!user) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !submitting) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [user, submitting, onClose]);

  if (!user || !currentUser) return null;

  const isSuspending = !user.isSuspended;
  const isSelf = currentUser.id === user.id;
  const isLastActiveAdmin =
    isSuspending && user.role === "admin" && activeAdminsCount <= 1;
  const trimmedReason = reason.trim();

  const handleReviewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting || success) return;

    if (isSelf && isSuspending) {
      setError(sm.selfSuspendWarning);
      return;
    }

    if (isLastActiveAdmin) {
      setError(sm.lastAdminWarning);
      return;
    }

    if (isSuspending && trimmedReason.length < 5) {
      setError(sm.reasonTooShortError);
      return;
    }

    setError(null);
    setConfirming(true);
  };

  const handleConfirmApply = async () => {
    if (submitGuardRef.current || submitting || success) return;
    submitGuardRef.current = true;
    setSubmitting(true);
    setError(null);

    try {
      const res = await adminDataProvider.users.updateUserSuspension(
        currentUser,
        user.id,
        isSuspending,
        isSuspending ? trimmedReason : undefined
      );
      if (res.success) {
        setSuccess(true);
        setConfirming(false);
        onSuccess();
      } else {
        setConfirming(false);
        setError(mapAdminUserServiceError(res.error, t.errorMessages));
      }
    } catch {
      setConfirming(false);
      setError(t.errorMessages.generic);
    } finally {
      setSubmitting(false);
      submitGuardRef.current = false;
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="suspension-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-4"
    >
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm"
        onClick={() => {
          if (!submitting) onClose();
        }}
        aria-hidden="true"
      />

      <div className="relative z-10 w-full max-w-lg rounded-2xl border border-slate-800 bg-[#091020] p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <span
              className={`font-mono text-[11px] uppercase tracking-wider ${
                isSuspending ? "text-rose-400" : "text-emerald-400"
              }`}
            >
              {isSuspending ? sm.suspendEyebrow : sm.unsuspendEyebrow}
            </span>
            <h2
              id="suspension-modal-title"
              className="mt-1 text-lg font-bold text-white"
            >
              {isSuspending ? sm.suspendTitle : sm.unsuspendTitle}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            aria-label={sm.closeAriaLabel}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-800 bg-[#070b14] text-slate-400 transition-colors hover:border-slate-700 hover:text-white disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
          >
            ✕
          </button>
        </div>

        {/* User summary */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800/90 bg-[#070b14] p-3.5 text-xs">
          <div className="min-w-0">
            <span className="font-semibold text-white">{user.displayName}</span>
            <span className="ml-2 font-mono text-slate-400">@{user.username}</span>
          </div>
          <div className="flex items-center gap-2 font-mono">
            <span className="text-slate-400">{sm.statusLabel}</span>
            <span
              className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${
                user.isSuspended
                  ? "border-rose-500/40 bg-rose-500/15 text-rose-300"
                  : "border-emerald-500/40 bg-emerald-500/15 text-emerald-300"
              }`}
            >
              {user.isSuspended ? t.statusSuspended : t.statusActive}
            </span>
          </div>
        </div>

        <p className="mt-3 text-xs leading-relaxed text-slate-300">
          {isSuspending ? sm.suspendDesc : sm.unsuspendDesc}
        </p>

        {isSelf && isSuspending && (
          <div className="mt-3 rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-xs text-rose-200">
            {sm.selfSuspendWarning}
          </div>
        )}

        {isLastActiveAdmin && (
          <div className="mt-3 rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-xs text-rose-200">
            {sm.lastAdminWarning}
          </div>
        )}

        {success ? (
          <div className="mt-4 space-y-4">
            <div
              role="status"
              className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-xs font-medium text-emerald-200"
            >
              {isSuspending ? sm.suspendSuccessMessage : sm.unsuspendSuccessMessage}
            </div>
            <div className="flex justify-end border-t border-slate-800 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-slate-700 bg-[#0c1220] px-4 py-2 text-xs font-semibold text-white hover:border-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
              >
                {t.detailsModal.closeBtn}
              </button>
            </div>
          </div>
        ) : confirming ? (
          <div className="mt-4 space-y-4">
            <div
              className={`rounded-xl border p-4 space-y-2 ${
                isSuspending
                  ? "border-rose-500/40 bg-rose-500/10"
                  : "border-emerald-500/40 bg-emerald-500/10"
              }`}
            >
              <h3 className="text-sm font-semibold text-white">
                {sm.confirmStepTitle}
              </h3>
              <p className="text-xs text-slate-200">
                {isSuspending
                  ? sm.confirmSuspendDesc(user.username)
                  : sm.confirmUnsuspendDesc(user.username)}
              </p>
              {isSuspending && (
                <p className="rounded-lg border border-slate-800 bg-[#070b14] p-2.5 text-xs text-slate-300">
                  <strong className="text-rose-300">
                    {t.auditHistory.reasonLabel}:{" "}
                  </strong>
                  {trimmedReason}
                </p>
              )}
            </div>

            {error && (
              <div
                role="alert"
                className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-xs text-rose-200"
              >
                {error}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-end gap-3 border-t border-slate-800 pt-4">
              <button
                type="button"
                onClick={() => setConfirming(false)}
                disabled={submitting}
                className="rounded-xl border border-slate-700 bg-[#0c1220] px-4 py-2 text-xs font-medium text-slate-300 hover:text-white disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
              >
                {sm.backBtn}
              </button>
              <button
                type="button"
                onClick={() => void handleConfirmApply()}
                disabled={submitting}
                className={`rounded-xl border px-4 py-2 text-xs font-semibold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus-visible:ring-2 ${
                  isSuspending
                    ? "border-rose-500/50 bg-rose-600 hover:bg-rose-500 focus-visible:ring-rose-400"
                    : "border-emerald-500/50 bg-emerald-600 hover:bg-emerald-500 focus-visible:ring-emerald-400"
                }`}
              >
                {submitting ? sm.processingBtn : sm.confirmActionBtn}
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleReviewSubmit} className="mt-4 space-y-4">
            {isSuspending && (
              <div>
                <label
                  htmlFor="suspension-reason-input"
                  className="block text-xs font-semibold text-slate-200"
                >
                  {sm.reasonLabel}
                </label>
                <textarea
                  id="suspension-reason-input"
                  rows={3}
                  value={reason}
                  onChange={(e) => {
                    setReason(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder={sm.reasonPlaceholder}
                  disabled={submitting || isSelf || isLastActiveAdmin}
                  className="mt-1.5 w-full rounded-xl border border-slate-800 bg-[#070b14] p-3 text-xs text-slate-100 placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 disabled:opacity-50"
                />
                <p className="mt-1 text-[11px] text-slate-400">
                  {sm.reasonHint}
                </p>
              </div>
            )}

            {error && (
              <div
                role="alert"
                className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-xs text-rose-200"
              >
                {error}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-end gap-3 border-t border-slate-800 pt-4">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="rounded-xl border border-slate-700 bg-[#0c1220] px-4 py-2 text-xs font-medium text-slate-300 hover:text-white disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
              >
                {sm.cancelBtn}
              </button>
              <button
                type="submit"
                disabled={submitting || (isSelf && isSuspending) || isLastActiveAdmin}
                className={`rounded-xl border px-4 py-2 text-xs font-semibold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus-visible:ring-2 ${
                  isSuspending
                    ? "border-rose-500/50 bg-rose-600 hover:bg-rose-500 focus-visible:ring-rose-400"
                    : "border-emerald-500/50 bg-emerald-600 hover:bg-emerald-500 focus-visible:ring-emerald-400"
                }`}
              >
                {sm.confirmBtn}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
