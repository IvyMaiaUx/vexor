"use client";

import React, { useEffect, useState } from "react";
import {
  adminDataProvider,
  type AdminAuditEntry,
  type AdminUser,
} from "@/features/admin";
import { useI18n } from "@/lib/i18n/context";

interface AdminUserDetailModalProps {
  userId: string | null;
  currentAdminId?: string;
  activeAdminsCount?: number;
  onClose: () => void;
  onOpenRoleModal?: (user: AdminUser) => void;
  onOpenSuspensionModal?: (user: AdminUser) => void;
}

function getSafeExternalUrl(url?: string): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol === "https:" || parsed.protocol === "http:") {
      return parsed.toString();
    }
    return null;
  } catch {
    return null;
  }
}

export function AdminUserDetailModal({
  userId,
  currentAdminId,
  activeAdminsCount = 1,
  onClose,
  onOpenRoleModal,
  onOpenSuspensionModal,
}: AdminUserDetailModalProps) {
  const { dict, locale } = useI18n();
  const t = dict.adminPanel.usersPage;

  const [user, setUser] = useState<AdminUser | null>(null);
  const [recentEvents, setRecentEvents] = useState<AdminAuditEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!userId) return;
    let active = true;

    Promise.resolve()
      .then(async () => {
        if (active) {
          setLoading(true);
          setNotFound(false);
        }
        const fetched = await adminDataProvider.users.getUserById(userId);
        if (!active) return;

        if (!fetched) {
          setUser(null);
          setRecentEvents([]);
          setNotFound(true);
          setLoading(false);
          return;
        }

        const auditRes = await adminDataProvider.audit.listAuditEntries(
          { entityType: "profile", entityId: fetched.id },
          { page: 1, pageSize: 5 }
        );
        if (!active) return;

        setUser(fetched);
        setRecentEvents(auditRes.items);
        setNotFound(false);
        setLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setUser(null);
        setRecentEvents([]);
        setNotFound(true);
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [userId, onClose]);

  if (!userId) return null;

  const dateFormatter = new Intl.DateTimeFormat(locale, {
    dateStyle: "long",
  });
  const dateTimeFormatter = new Intl.DateTimeFormat(locale, {
    dateStyle: "short",
    timeStyle: "short",
  });

  const roleBadgeStyles: Record<string, string> = {
    admin: "border-violet-500/40 bg-violet-500/15 text-violet-300",
    moderator: "border-cyan-500/40 bg-cyan-500/15 text-cyan-300",
    member: "border-slate-700 bg-slate-800/90 text-slate-300",
  };

  const isSelf = Boolean(user && currentAdminId && user.id === currentAdminId);
  const isLastActiveAdmin = Boolean(
    user && user.role === "admin" && !user.isSuspended && activeAdminsCount <= 1
  );
  const canChangeRole = Boolean(onOpenRoleModal) && !isSelf && !isLastActiveAdmin;
  const canToggleSuspension =
    Boolean(onOpenSuspensionModal) &&
    !(isSelf && !user?.isSuspended) &&
    !(isLastActiveAdmin && !user?.isSuspended);
  const safeGithub = getSafeExternalUrl(user?.githubUrl);
  const safeLinkedin = getSafeExternalUrl(user?.linkedinUrl);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="user-detail-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
    >
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative z-10 w-full max-w-2xl rounded-2xl border border-slate-800 bg-[#091020] p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <span className="font-mono text-[11px] uppercase tracking-wider text-cyan-400">
              {t.demoBadge}
            </span>
            <h2
              id="user-detail-modal-title"
              className="mt-1 text-lg font-bold text-white"
            >
              {t.detailsModal.title}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label={t.detailsModal.closeBtn}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-800 bg-[#070b14] text-slate-400 transition-colors hover:border-slate-700 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
          >
            ✕
          </button>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center gap-3 py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
            <p className="font-mono text-xs text-slate-400">
              {t.detailsModal.loadingMessage}
            </p>
          </div>
        ) : notFound || !user ? (
          <div className="space-y-3 py-10 text-center">
            <h3 className="text-base font-semibold text-rose-300">
              {t.detailsModal.notFoundTitle}
            </h3>
            <p className="text-xs text-slate-400">
              {t.detailsModal.notFoundMessage}
            </p>
          </div>
        ) : (
          <div className="mt-5 space-y-5">
            {/* Identity Summary */}
            <div className="flex flex-col gap-4 rounded-xl border border-slate-800/90 bg-[#070b14] p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-cyan-500/30 bg-cyan-500/10 font-mono text-lg font-bold text-cyan-300">
                  {user.displayName.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-base font-bold text-white break-words">
                      {user.displayName}
                    </span>
                    {isSelf && (
                      <span className="rounded border border-cyan-500/40 bg-cyan-500/15 px-1.5 py-0.5 font-mono text-[10px] text-cyan-300">
                        {t.selfBadge}
                      </span>
                    )}
                  </div>
                  <p className="font-mono text-xs text-slate-400">
                    @{user.username}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <span
                  className={`rounded-full border px-2.5 py-0.5 font-mono text-[11px] font-semibold ${
                    roleBadgeStyles[user.role] ?? roleBadgeStyles.member
                  }`}
                >
                  {t.roleLabels[user.role] ?? user.role}
                </span>
                <span
                  className={`rounded-full border px-2.5 py-0.5 font-mono text-[11px] font-semibold ${
                    user.isSuspended
                      ? "border-rose-500/40 bg-rose-500/15 text-rose-300"
                      : "border-emerald-500/40 bg-emerald-500/15 text-emerald-300"
                  }`}
                >
                  {user.isSuspended ? t.statusSuspended : t.statusActive}
                </span>
              </div>
            </div>

            {/* Metadata Dates */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-800/80 bg-[#0c1220] p-3.5">
                <span className="block text-[11px] text-slate-400">
                  {t.detailsModal.joinedLabel}
                </span>
                <time
                  dateTime={user.createdAt}
                  className="mt-1 block font-mono text-xs text-slate-200"
                >
                  {dateFormatter.format(new Date(user.createdAt))}
                </time>
              </div>
              <div className="rounded-xl border border-slate-800/80 bg-[#0c1220] p-3.5">
                <span className="block text-[11px] text-slate-400">
                  {t.detailsModal.lastActivityLabel}
                </span>
                <span className="mt-1 block font-mono text-xs text-slate-200">
                  {user.lastActivityAt
                    ? dateTimeFormatter.format(new Date(user.lastActivityAt))
                    : t.noActivity}
                </span>
              </div>
            </div>

            {/* Bio & Interests */}
            <div className="space-y-3 rounded-xl border border-slate-800/80 bg-[#0c1220] p-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                {t.detailsModal.publicInfoTitle}
              </h3>
              <p className="text-xs leading-relaxed text-slate-300">
                {user.bio?.trim() ? user.bio : t.detailsModal.bioEmpty}
              </p>

              <div className="flex flex-wrap gap-1.5 pt-1">
                {user.interests.length > 0 ? (
                  user.interests.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-md border border-slate-700 bg-[#070b14] px-2 py-0.5 font-mono text-[11px] text-sky-300"
                    >
                      {tag}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-slate-500">
                    {t.detailsModal.interestsEmpty}
                  </span>
                )}
              </div>

              <div className="border-t border-slate-800/80 pt-3">
                <span className="block text-[11px] font-medium text-slate-400">
                  {t.detailsModal.publicLinksTitle}
                </span>
                {safeGithub || safeLinkedin ? (
                  <div className="mt-1.5 flex flex-wrap gap-3 text-xs">
                    {safeGithub && (
                      <a
                        href={safeGithub}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-cyan-400 hover:underline"
                      >
                        GitHub ↗
                      </a>
                    )}
                    {safeLinkedin && (
                      <a
                        href={safeLinkedin}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-sky-400 hover:underline"
                      >
                        LinkedIn ↗
                      </a>
                    )}
                  </div>
                ) : (
                  <p className="mt-1 text-xs text-slate-500">
                    {t.detailsModal.noPublicLinks}
                  </p>
                )}
              </div>
            </div>

            {/* Demonstrative Activity */}
            <div className="space-y-2.5 rounded-xl border border-slate-800/80 bg-[#0c1220] p-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                {t.detailsModal.activityTitle}
              </h3>
              {recentEvents.length === 0 ? (
                <p className="text-xs text-slate-500">
                  {t.detailsModal.noRecentActivity}
                </p>
              ) : (
                <ul className="space-y-2">
                  {recentEvents.map((ev) => {
                    const actionLabel =
                      t.auditHistory.actions[ev.action] ?? ev.action;
                    const fromRole =
                      typeof ev.metadata?.from === "string" ? ev.metadata.from : null;
                    const toRole =
                      typeof ev.metadata?.to === "string" ? ev.metadata.to : null;
                    const reason =
                      ev.action === "user.suspended" &&
                      typeof ev.metadata?.reason === "string"
                        ? ev.metadata.reason
                        : null;

                    return (
                      <li
                        key={ev.id}
                        className="space-y-1 rounded-lg border border-slate-800 bg-[#070b14] px-3 py-2 text-xs"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="font-medium text-cyan-300">
                            {actionLabel}
                          </span>
                          <time
                            dateTime={ev.createdAt}
                            className="font-mono text-[11px] text-slate-400"
                          >
                            {dateTimeFormatter.format(new Date(ev.createdAt))}
                          </time>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                          <span>
                            {t.auditHistory.actorLabel}: @{ev.actorUsername}
                          </span>
                          {fromRole && toRole && (
                            <span className="font-mono text-violet-300">
                              ({t.auditHistory.roleTransition(fromRole, toRole)})
                            </span>
                          )}
                        </div>
                        {reason && (
                          <p className="text-[11px] text-rose-200/90">
                            {t.auditHistory.reasonLabel}: {reason}
                          </p>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {/* Demonstrative Admin Actions */}
            <div className="space-y-3 rounded-xl border border-slate-800 bg-[#070b14] p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-semibold text-slate-200">
                  {t.demoActions.title}
                </span>
                <span className="rounded border border-violet-500/40 bg-violet-500/15 px-2 py-0.5 font-mono text-[10px] uppercase text-violet-300">
                  {t.demoActions.badge}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                {isSelf
                  ? t.demoActions.selfProtected
                  : isLastActiveAdmin
                    ? t.demoActions.lastAdminProtected
                    : t.demoActions.notice}
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={!canChangeRole}
                  onClick={() => {
                    if (user && onOpenRoleModal) {
                      onClose();
                      onOpenRoleModal(user);
                    }
                  }}
                  className="rounded-lg border border-violet-500/40 bg-violet-500/15 px-3 py-1.5 text-xs font-medium text-violet-200 transition-colors hover:bg-violet-500/25 disabled:cursor-not-allowed disabled:opacity-45 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
                >
                  {t.changeRoleBtn}
                </button>
                <button
                  type="button"
                  disabled={!canToggleSuspension}
                  onClick={() => {
                    if (user && onOpenSuspensionModal) {
                      onClose();
                      onOpenSuspensionModal(user);
                    }
                  }}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-45 focus:outline-none focus-visible:ring-2 ${
                    user.isSuspended
                      ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-200 hover:bg-emerald-500/25 focus-visible:ring-emerald-400"
                      : "border-rose-500/40 bg-rose-500/15 text-rose-200 hover:bg-rose-500/25 focus-visible:ring-rose-400"
                  }`}
                >
                  {user.isSuspended ? t.unsuspendBtn : t.suspendBtn}
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="mt-5 flex justify-end border-t border-slate-800 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-700 bg-[#0c1220] px-4 py-2 text-xs font-semibold text-slate-200 transition-colors hover:border-slate-600 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
          >
            {t.detailsModal.closeBtn}
          </button>
        </div>
      </div>
    </div>
  );
}
