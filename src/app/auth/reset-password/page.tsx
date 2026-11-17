"use client";

import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, type FormEvent, useEffect, useMemo, useState } from "react";
import { siteConfig } from "@/config/site";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import {
  MIN_PASSWORD_LENGTH,
  type RecoverySessionStatus,
  updatePasswordWithSupabase,
  validateRecoverySession,
} from "@/features/auth/recovery-service";
import { useAuthStore } from "@/features/auth/use-auth-store";
import { useCatalogStore } from "@/features/catalog/use-catalog-store";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { createClient } from "@/lib/supabase/client";

function calculateStrength(pwd: string): {
  score: number;
  hasLength: boolean;
  hasNumber: boolean;
  hasSpecial: boolean;
} {
  const hasLength = pwd.length >= MIN_PASSWORD_LENGTH;
  const hasNumber = /\d/.test(pwd);
  const hasSpecial = /[^A-Za-z0-9]/.test(pwd);
  const hasUpperLower = /[A-Z]/.test(pwd) && /[a-z]/.test(pwd);

  let score = 0;
  if (pwd.length > 0) score = 1;
  if (hasLength) score = 2;
  if (hasLength && hasNumber && hasUpperLower) score = 3;
  if (hasLength && hasNumber && hasSpecial && hasUpperLower) score = 4;

  return { score, hasLength, hasNumber, hasSpecial };
}

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const callbackError = searchParams?.get("error");

  const { locale, setLocale } = useCatalogStore();
  const { refreshSession } = useAuthStore();
  const dict = useMemo(() => getDictionary(locale), [locale]);

  const [sessionStatus, setSessionStatus] = useState<
    "checking" | RecoverySessionStatus
  >(callbackError === "recovery_link_invalid" ? "invalid" : "checking");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (callbackError === "recovery_link_invalid") {
      return;
    }

    let active = true;
    void validateRecoverySession().then((status) => {
      if (active) {
        setSessionStatus(status);
      }
    });

    let unsubscribe: (() => void) | undefined;
    try {
      const supabase = createClient();
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((event) => {
        if (!active) return;
        if (
          event === "PASSWORD_RECOVERY" ||
          event === "SIGNED_IN" ||
          event === "TOKEN_REFRESHED"
        ) {
          void validateRecoverySession().then((status) => {
            if (active) setSessionStatus(status);
          });
        } else if (event === "SIGNED_OUT") {
          setSessionStatus("invalid");
        }
      });
      unsubscribe = () => subscription.unsubscribe();
    } catch {
      // Ignore if public env vars are missing in isolated test contexts
    }

    return () => {
      active = false;
      unsubscribe?.();
    };
  }, [callbackError]);

  const strength = useMemo(() => calculateStrength(password), [password]);

  const strengthLabel = useMemo(() => {
    switch (strength.score) {
      case 1:
        return dict.auth.resetPasswordPage.strengthLabels.weak;
      case 2:
        return dict.auth.resetPasswordPage.strengthLabels.fair;
      case 3:
        return dict.auth.resetPasswordPage.strengthLabels.good;
      case 4:
        return dict.auth.resetPasswordPage.strengthLabels.strong;
      default:
        return "";
    }
  }, [strength.score, dict]);

  const strengthColor = useMemo(() => {
    switch (strength.score) {
      case 1:
        return "bg-rose-500 text-rose-400";
      case 2:
        return "bg-amber-500 text-amber-400";
      case 3:
        return "bg-cyan-500 text-cyan-400";
      case 4:
        return "bg-emerald-500 text-emerald-400";
      default:
        return "bg-slate-700 text-slate-500";
    }
  }, [strength.score]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isSubmitting || sessionStatus !== "valid") {
      return;
    }
    setErrorMessage(null);

    if (password.length < MIN_PASSWORD_LENGTH) {
      setErrorMessage(dict.auth.errors.passwordLength);
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage(dict.auth.errors.passwordMismatch);
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await updatePasswordWithSupabase({
        newPassword: password,
        confirmPassword,
      });

      if (result.status === "error") {
        if (result.errorCode === "session_invalid") {
          setSessionStatus("invalid");
          setErrorMessage(dict.auth.errors.recoverySessionInvalid);
          return;
        }

        const errorMap = {
          password_too_short: dict.auth.errors.passwordLength,
          password_mismatch: dict.auth.errors.passwordMismatch,
          weak_password: dict.auth.errors.weakPassword,
          same_password: dict.auth.errors.samePassword,
          rate_limited: dict.auth.errors.rateLimited,
          network_error: dict.auth.errors.networkError,
          update_failed: dict.auth.errors.passwordUpdateFailed,
        } as const;

        setErrorMessage(errorMap[result.errorCode]);
        return;
      }

      setPassword("");
      setConfirmPassword("");
      await refreshSession();
      setIsSuccess(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#070b14] text-slate-100 antialiased selection:bg-cyan-500/30 selection:text-cyan-200">
      <Header locale={locale} onLocaleChange={setLocale} dict={dict} />

      <main className="flex flex-1 items-center justify-center bg-cyber-grid py-10 sm:py-16">
        <div className="mx-auto w-full max-w-md px-4 sm:px-6">
          <div className="rounded-2xl border border-slate-800/90 bg-[#0d1322]/95 p-6 shadow-[0_0_50px_rgba(6,182,212,0.08)] sm:p-8">
            <div className="text-center">
              <div className="mx-auto mb-3 flex justify-center">
                <Image
                  src={siteConfig.logoIconPath}
                  alt={siteConfig.name}
                  width={56}
                  height={56}
                  className="h-14 w-14 object-contain drop-shadow-[0_0_18px_rgba(34,211,238,0.35)]"
                />
              </div>

              <span className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 font-mono text-[11px] font-semibold uppercase tracking-widest text-cyan-300">
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                {dict.auth.resetPasswordPage.eyebrow}
              </span>

              <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-50 sm:text-3xl">
                {dict.auth.resetPasswordPage.title}
              </h1>

              <p className="mt-2 text-xs leading-relaxed text-slate-400 sm:text-sm">
                {dict.auth.resetPasswordPage.subtitle}
              </p>
            </div>

            {isSuccess ? (
              <div className="mt-6 space-y-5 text-center">
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-5">
                  <span className="text-3xl" aria-hidden="true">
                    ✓
                  </span>
                  <h2 className="mt-2 text-base font-bold text-emerald-200">
                    {dict.auth.resetPasswordPage.successTitle}
                  </h2>
                  <p className="mt-1 text-xs leading-relaxed text-emerald-300/80">
                    {dict.auth.resetPasswordPage.successMessage}
                  </p>
                </div>

                <div className="flex flex-col gap-2.5 pt-2 sm:flex-row">
                  <Link
                    href="/catalog"
                    className="inline-flex flex-1 items-center justify-center rounded-xl bg-cyan-500 py-3 text-sm font-semibold text-slate-950 shadow-[0_0_20px_rgba(6,182,212,0.3)] transition-colors hover:bg-cyan-400"
                  >
                    {dict.auth.resetPasswordPage.continueToCatalog} →
                  </Link>
                  <Link
                    href="/login"
                    className="inline-flex flex-1 items-center justify-center rounded-xl border border-slate-700 bg-[#070b14] py-3 text-sm font-medium text-slate-200 transition-colors hover:border-cyan-500/40"
                  >
                    {dict.auth.resetPasswordPage.backToLogin}
                  </Link>
                </div>
              </div>
            ) : sessionStatus === "checking" ? (
              <div className="mt-8 flex flex-col items-center justify-center gap-3 py-6 text-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-500/30 border-t-cyan-400" />
                <p className="font-mono text-xs text-slate-400">
                  {dict.auth.resetPasswordPage.verifyingSession}
                </p>
              </div>
            ) : sessionStatus === "network_error" ? (
              <div className="mt-6 space-y-5 text-center">
                <div
                  role="alert"
                  className="rounded-xl border border-amber-500/40 bg-amber-950/30 p-4 text-xs leading-relaxed text-amber-200"
                >
                  {dict.auth.errors.networkError}
                </div>
                <div className="pt-2">
                  <Link
                    href="/login"
                    className="font-mono text-xs text-slate-400 hover:text-cyan-300 hover:underline"
                  >
                    ← {dict.auth.resetPasswordPage.backToLogin}
                  </Link>
                </div>
              </div>
            ) : sessionStatus === "invalid" ? (
              <div className="mt-6 space-y-5 text-center">
                <div
                  role="alert"
                  className="rounded-xl border border-rose-500/40 bg-rose-950/30 p-5 text-left"
                >
                  <h2 className="text-sm font-semibold text-rose-200">
                    {dict.auth.resetPasswordPage.invalidSessionTitle}
                  </h2>
                  <p className="mt-1.5 text-xs leading-relaxed text-rose-300/90">
                    {dict.auth.resetPasswordPage.invalidSessionMessage}
                  </p>
                </div>

                <div className="flex flex-col gap-2.5 pt-2">
                  <Link
                    href="/forgot-password"
                    className="inline-flex w-full items-center justify-center rounded-xl bg-cyan-500 py-3 text-sm font-semibold text-slate-950 shadow-[0_0_20px_rgba(6,182,212,0.3)] transition-colors hover:bg-cyan-400"
                  >
                    {dict.auth.resetPasswordPage.requestNewLink} →
                  </Link>
                  <Link
                    href="/login"
                    className="font-mono text-xs text-slate-400 hover:text-cyan-300 hover:underline"
                  >
                    ← {dict.auth.resetPasswordPage.backToLogin}
                  </Link>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
                {/* New Password */}
                <div>
                  <label
                    htmlFor="new-password"
                    className="block text-xs font-medium text-slate-200"
                  >
                    {dict.auth.resetPasswordPage.newPasswordLabel}
                  </label>
                  <div className="relative mt-1.5">
                    <input
                      id="new-password"
                      type={showPassword ? "text" : "password"}
                      required
                      disabled={isSubmitting}
                      autoComplete="new-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={
                        dict.auth.resetPasswordPage.newPasswordPlaceholder
                      }
                      className="w-full rounded-xl border border-slate-800 bg-[#070b14] px-3.5 py-2.5 pr-24 text-base text-slate-100 placeholder:text-slate-500 focus:border-cyan-500/60 focus:outline-none disabled:opacity-60 sm:text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      aria-label={
                        showPassword
                          ? dict.auth.resetPasswordPage.hidePassword
                          : dict.auth.resetPasswordPage.showPassword
                      }
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md px-2 py-1 font-mono text-[11px] text-cyan-400 hover:bg-cyan-500/10 hover:text-cyan-300"
                    >
                      {showPassword
                        ? dict.auth.resetPasswordPage.hidePassword
                        : dict.auth.resetPasswordPage.showPassword}
                    </button>
                  </div>

                  {/* Password Strength Indicator */}
                  {password.length > 0 && (
                    <div className="mt-2 space-y-1.5">
                      <div className="flex items-center justify-between font-mono text-xs">
                        <span className="text-slate-400">
                          {dict.auth.resetPasswordPage.strengthTitle}
                        </span>
                        <span className={strengthColor.split(" ")[1]}>
                          {strengthLabel}
                        </span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                        <div
                          className={`h-full transition-all duration-300 ${
                            strengthColor.split(" ")[0]
                          }`}
                          style={{ width: `${(strength.score / 4) * 100}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Requirements checklist */}
                  <ul className="mt-2.5 space-y-1 font-mono text-[11px] text-slate-400">
                    <li className="flex items-center gap-1.5">
                      <span
                        className={
                          strength.hasLength
                            ? "text-emerald-400"
                            : "text-slate-600"
                        }
                      >
                        {strength.hasLength ? "✓" : "○"}
                      </span>
                      <span>
                        {dict.auth.resetPasswordPage.requirements.minChars}
                      </span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <span
                        className={
                          strength.hasNumber
                            ? "text-emerald-400"
                            : "text-slate-600"
                        }
                      >
                        {strength.hasNumber ? "✓" : "○"}
                      </span>
                      <span>
                        {dict.auth.resetPasswordPage.requirements.hasNumber}
                      </span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <span
                        className={
                          strength.hasSpecial
                            ? "text-emerald-400"
                            : "text-slate-600"
                        }
                      >
                        {strength.hasSpecial ? "✓" : "○"}
                      </span>
                      <span>
                        {dict.auth.resetPasswordPage.requirements.hasSpecial}
                      </span>
                    </li>
                  </ul>
                </div>

                {/* Confirm Password */}
                <div>
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="confirm-password"
                      className="block text-xs font-medium text-slate-200"
                    >
                      {dict.auth.resetPasswordPage.confirmPasswordLabel}
                    </label>
                    {confirmPassword.length > 0 && (
                      <span
                        className={`font-mono text-[11px] ${
                          password === confirmPassword
                            ? "text-emerald-400"
                            : "text-rose-400"
                        }`}
                      >
                        {password === confirmPassword
                          ? dict.auth.resetPasswordPage.passwordsMatch
                          : dict.auth.resetPasswordPage.passwordsDoNotMatch}
                      </span>
                    )}
                  </div>
                  <div className="relative mt-1.5">
                    <input
                      id="confirm-password"
                      type={showConfirmPassword ? "text" : "password"}
                      required
                      disabled={isSubmitting}
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder={
                        dict.auth.resetPasswordPage.confirmPasswordPlaceholder
                      }
                      className="w-full rounded-xl border border-slate-800 bg-[#070b14] px-3.5 py-2.5 pr-24 text-base text-slate-100 placeholder:text-slate-500 focus:border-cyan-500/60 focus:outline-none disabled:opacity-60 sm:text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((prev) => !prev)}
                      aria-label={
                        showConfirmPassword
                          ? dict.auth.resetPasswordPage.hidePassword
                          : dict.auth.resetPasswordPage.showPassword
                      }
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md px-2 py-1 font-mono text-[11px] text-cyan-400 hover:bg-cyan-500/10 hover:text-cyan-300"
                    >
                      {showConfirmPassword
                        ? dict.auth.resetPasswordPage.hidePassword
                        : dict.auth.resetPasswordPage.showPassword}
                    </button>
                  </div>
                </div>

                {errorMessage && (
                  <div
                    role="alert"
                    className="rounded-xl border border-rose-500/40 bg-rose-950/30 p-3 text-xs text-rose-300"
                  >
                    {errorMessage}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full rounded-xl bg-cyan-500 py-3 text-sm font-semibold text-slate-950 shadow-[0_0_20px_rgba(6,182,212,0.3)] transition-colors hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSubmitting
                    ? dict.auth.resetPasswordPage.submittingButton
                    : dict.auth.resetPasswordPage.submitButton}
                </button>

                <div className="pt-2 text-center">
                  <Link
                    href="/login"
                    className="font-mono text-xs text-slate-400 hover:text-cyan-300 hover:underline"
                  >
                    ← {dict.auth.resetPasswordPage.backToLogin}
                  </Link>
                </div>
              </form>
            )}
          </div>
        </div>
      </main>

      <Footer locale={locale} dict={dict} />
    </div>
  );
}

export default function AuthResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#070b14]">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-500/30 border-t-cyan-400" />
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}
