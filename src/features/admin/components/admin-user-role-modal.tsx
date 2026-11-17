"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  adminDataProvider,
  type AdminUser,
  type DbUserRole,
} from "@/features/admin";
import { mapAdminUserServiceError } from "@/features/admin/utils/user-error-mapper";
import { useAuthStore } from "@/features/auth/use-auth-store";
import { useI18n } from "@/lib/i18n/context";

interface AdminUserRoleModalProps {
  user: AdminUser | null;
  activeAdminsCount: number;
  onClose: () => void;
  onSuccess: () => void;
}

const ROLE_OPTIONS: readonly DbUserRole[] = ["member", "moderator", "admin"];

export function AdminUserRoleModal({
  user,
  activeAdminsCount,
  onClose,
  onSuccess,
}: AdminUserRoleModalProps) {
  const { dict } = useI18n();
  const currentUser = useAuthStore((s) => s.user);
  const t = dict.adminPanel.usersPage;
  const rm = t.roleModal;

  const [selectedRole, setSelectedRole] = useState<DbUserRole | "">("");
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

  const isSelf = currentUser.id === user.id;
  const isLastActiveAdmin =
    user.role === "admin" && !user.isSuspended && activeAdminsCount <= 1;

  const handleReviewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting || success) return;

    if (!selectedRole || selectedRole === user.role) {
      setError(rm.sameRoleError);
      return;
    }

    if (isSelf && selectedRole !== "admin") {
      setError(rm.selfDemoteWarning);
      return;
    }

    if (isLastActiveAdmin && selectedRole !== "admin") {
      setError(rm.lastAdminWarning);
      return;
    }

    setError(null);
    setConfirming(true);
  };

  const handleConfirmApply = async () => {
    if (submitGuardRef.current || submitting || success || !selectedRole) return;
    submitGuardRef.current = true;
    setSubmitting(true);
    setError(null);

    try {
      const res = await adminDataProvider.users.updateUserRole(
        currentUser,
        user.id,
        selectedRole
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
      aria-labelledby="role-modal-title"
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
            <span className="font-mono text-[11px] uppercase tracking-wider text-violet-400">
              {rm.eyebrow}
            </span>
            <h2 id="role-modal-title" className="mt-1 text-lg font-bold text-white">
              {rm.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            aria-label={rm.closeAriaLabel}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-800 bg-[#070b14] text-slate-400 transition-colors hover:border-slate-700 hover:text-white disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
          >
            ✕
          </button>
        </div>

        {/* Selected User & Current Role */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800/90 bg-[#070b14] p-3.5 text-xs">
          <div className="min-w-0">
            <span className="font-semibold text-white">{user.displayName}</span>
            <span className="ml-2 font-mono text-slate-400">@{user.username}</span>
          </div>
          <div className="flex items-center gap-2 font-mono">
            <span className="text-slate-400">{rm.currentRoleLabel}</span>
            <span className="rounded-full border border-cyan-500/40 bg-cyan-500/15 px-2.5 py-0.5 text-[11px] font-semibold text-cyan-300">
              {t.roleLabels[user.role] ?? user.role}
            </span>
          </div>
        </div>

        <p className="mt-3 text-xs leading-relaxed text-slate-300">{rm.desc}</p>

        {isSelf && (
          <div className="mt-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-200">
            {rm.selfDemoteWarning}
          </div>
        )}

        {isLastActiveAdmin && (
          <div className="mt-3 rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-xs text-rose-200">
            {rm.lastAdminWarning}
          </div>
        )}

        {success ? (
          <div className="mt-4 space-y-4">
            <div
              role="status"
              className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-xs font-medium text-emerald-200"
            >
              {rm.successMessage}
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
        ) : confirming && selectedRole ? (
          <div className="mt-4 space-y-4">
            <div className="rounded-xl border border-violet-500/40 bg-violet-500/10 p-4 space-y-2">
              <h3 className="text-sm font-semibold text-violet-200">
                {rm.confirmStepTitle}
              </h3>
              <p className="text-xs text-slate-200">
                {rm.confirmStepDesc(
                  user.username,
                  t.roleLabels[user.role] ?? user.role,
                  t.roleLabels[selectedRole] ?? selectedRole
                )}
              </p>
              <div className="flex items-center gap-2 pt-1 font-mono text-xs">
                <span className="text-slate-400">{rm.targetRoleLabel}</span>
                <span className="rounded border border-violet-400/50 bg-violet-500/20 px-2 py-0.5 font-semibold text-violet-200">
                  {t.roleLabels[selectedRole] ?? selectedRole}
                </span>
              </div>
            </div>

            {selectedRole === "admin" && user.role !== "admin" && (
              <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-200">
                {rm.warningAdmin}
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
                onClick={() => setConfirming(false)}
                disabled={submitting}
                className="rounded-xl border border-slate-700 bg-[#0c1220] px-4 py-2 text-xs font-medium text-slate-300 hover:text-white disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
              >
                {rm.backBtn}
              </button>
              <button
                type="button"
                onClick={() => void handleConfirmApply()}
                disabled={submitting}
                className="rounded-xl border border-violet-500/50 bg-violet-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
              >
                {submitting ? rm.processingBtn : rm.confirmActionBtn}
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleReviewSubmit} className="mt-4 space-y-4">
            <fieldset className="space-y-2">
              <legend className="text-xs font-semibold text-slate-200">
                {rm.newRoleLabel}
              </legend>
              <div className="grid grid-cols-1 gap-2">
                {ROLE_OPTIONS.map((roleOption) => {
                  const isCurrent = user.role === roleOption;
                  const isBlocked =
                    isCurrent ||
                    (isSelf && roleOption !== "admin") ||
                    (isLastActiveAdmin && roleOption !== "admin");
                  const isSelected = selectedRole === roleOption;

                  return (
                    <label
                      key={roleOption}
                      className={`flex items-start gap-3 rounded-xl border p-3 transition-colors ${
                        isSelected
                          ? "border-violet-500/70 bg-violet-500/10"
                          : "border-slate-800 bg-[#070b14] hover:border-slate-700"
                      } ${isBlocked ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
                    >
                      <input
                        type="radio"
                        name="targetRole"
                        value={roleOption}
                        checked={isSelected}
                        disabled={isBlocked || submitting}
                        onChange={() => {
                          setSelectedRole(roleOption);
                          setError(null);
                        }}
                        className="mt-0.5 text-violet-500 focus:ring-violet-400"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-semibold text-white">
                            {t.roleLabels[roleOption] ?? roleOption}
                          </span>
                          {isCurrent && (
                            <span className="rounded border border-slate-700 bg-slate-800 px-1.5 py-0.5 font-mono text-[10px] text-slate-300">
                              {rm.currentBadge}
                            </span>
                          )}
                          {isSelf && roleOption !== "admin" && (
                            <span className="rounded border border-rose-500/40 bg-rose-500/15 px-1.5 py-0.5 font-mono text-[10px] text-rose-300">
                              {rm.selfProtectedBadge}
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
                          {rm.roleDescriptions[roleOption]}
                        </p>
                      </div>
                    </label>
                  );
                })}
              </div>
            </fieldset>

            {selectedRole && selectedRole !== user.role && (
              <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-[#070b14] px-3.5 py-2.5 text-xs">
                <span className="text-slate-400">{rm.targetRoleLabel}</span>
                <span className="font-mono font-semibold text-violet-300">
                  {t.roleLabels[selectedRole] ?? selectedRole}
                </span>
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
                {rm.cancelBtn}
              </button>
              <button
                type="submit"
                disabled={
                  submitting || !selectedRole || selectedRole === user.role
                }
                className="rounded-xl border border-violet-500/50 bg-violet-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
              >
                {rm.confirmBtn}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
