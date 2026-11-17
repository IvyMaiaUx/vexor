"use client";

import Image from "next/image";
import Link from "next/link";
import { type FormEvent, useMemo, useState } from "react";
import { siteConfig } from "@/config/site";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import {
  MIN_PASSWORD_LENGTH,
  requestPasswordRecovery,
  updatePasswordAfterOtpVerification,
  verifyRecoveryOtp,
} from "@/features/auth/recovery-service";
import { useAuthStore } from "@/features/auth/use-auth-store";
import { EMAIL_REGEX } from "@/features/auth/validation";
import { useCatalogStore } from "@/features/catalog/use-catalog-store";
import { getDictionary } from "@/lib/i18n/dictionaries";

type RecoveryStep = "request" | "verify" | "updated";

export default function ForgotPasswordPage() {
  const { locale, setLocale } = useCatalogStore();
  const refreshSession = useAuthStore((s) => s.refreshSession);
  const dict = useMemo(() => getDictionary(locale), [locale]);

  const [step, setStep] = useState<RecoveryStep>("request");
  const [email, setEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpVerified, setOtpVerified] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [resendNotice, setResendNotice] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRequestSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isSubmitting) {
      return;
    }
    setErrorMessage(null);
    setResendNotice(null);

    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !EMAIL_REGEX.test(trimmedEmail)) {
      setErrorMessage(dict.auth.errors.invalidEmail);
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await requestPasswordRecovery({ email: trimmedEmail });

      if (result.status === "error") {
        const errorMap = {
          invalid_email: dict.auth.errors.invalidEmail,
          rate_limited: dict.auth.errors.rateLimited,
          network_error: dict.auth.errors.networkError,
        } as const;
        setErrorMessage(errorMap[result.errorCode]);
        return;
      }

      setEmail(trimmedEmail);
      setOtpVerified(false);
      setStep("verify");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendCode = async () => {
    if (isSubmitting) {
      return;
    }
    setErrorMessage(null);
    setResendNotice(null);

    setIsSubmitting(true);
    try {
      const result = await requestPasswordRecovery({ email });
      if (result.status === "error") {
        const errorMap = {
          invalid_email: dict.auth.errors.invalidEmail,
          rate_limited: dict.auth.errors.rateLimited,
          network_error: dict.auth.errors.networkError,
        } as const;
        setErrorMessage(errorMap[result.errorCode]);
        return;
      }

      setOtpVerified(false);
      setOtpCode("");
      setResendNotice(dict.auth.forgotPasswordPage.antiEnumerationNotice);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyAndResetSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isSubmitting) {
      return;
    }
    setErrorMessage(null);
    setResendNotice(null);

    const normalizedOtp = otpCode.trim().replace(/\s+/g, "");
    if (!otpVerified && !/^\d{6,8}$/.test(normalizedOtp)) {
      setErrorMessage(dict.auth.forgotPasswordPage.invalidOtpError);
      return;
    }

    if (!newPassword || newPassword.length < MIN_PASSWORD_LENGTH) {
      setErrorMessage(dict.auth.errors.passwordLength);
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage(dict.auth.errors.passwordMismatch);
      return;
    }

    setIsSubmitting(true);
    try {
      if (!otpVerified) {
        const verifyResult = await verifyRecoveryOtp({
          email,
          token: normalizedOtp,
        });

        if (verifyResult.status === "error") {
          const verifyErrorMap = {
            invalid_email: dict.auth.errors.invalidEmail,
            invalid_code: dict.auth.forgotPasswordPage.invalidOtpError,
            code_expired: dict.auth.forgotPasswordPage.expiredOtpError,
            rate_limited: dict.auth.errors.rateLimited,
            network_error: dict.auth.errors.networkError,
          } as const;
          setErrorMessage(verifyErrorMap[verifyResult.errorCode]);
          return;
        }

        setOtpVerified(true);
      }

      const updateResult = await updatePasswordAfterOtpVerification({
        newPassword,
        confirmPassword,
      });

      if (updateResult.status === "error") {
        if (updateResult.errorCode === "session_invalid") {
          setOtpVerified(false);
          setErrorMessage(dict.auth.errors.recoverySessionInvalid);
          return;
        }

        const updateErrorMap = {
          password_too_short: dict.auth.errors.passwordLength,
          password_mismatch: dict.auth.errors.passwordMismatch,
          weak_password: dict.auth.errors.weakPassword,
          same_password: dict.auth.errors.samePassword,
          rate_limited: dict.auth.errors.rateLimited,
          network_error: dict.auth.errors.networkError,
          update_failed: dict.auth.errors.passwordUpdateFailed,
        } as const;
        setErrorMessage(updateErrorMap[updateResult.errorCode]);
        return;
      }

      setOtpCode("");
      setNewPassword("");
      setConfirmPassword("");
      await refreshSession();
      setStep("updated");
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
                {dict.auth.forgotPasswordPage.eyebrow}
              </span>

              <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-50 sm:text-3xl">
                {dict.auth.forgotPasswordPage.title}
              </h1>

              <p className="mt-2 text-xs leading-relaxed text-slate-400 sm:text-sm">
                {dict.auth.forgotPasswordPage.subtitle}
              </p>
            </div>

            {step === "updated" ? (
              <div className="mt-6 space-y-5">
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-5 text-center">
                  <span className="text-3xl" aria-hidden="true">
                    ✅
                  </span>
                  <h2 className="mt-2 text-lg font-semibold text-emerald-300">
                    {dict.auth.resetPasswordPage.successTitle}
                  </h2>
                  <p className="mt-1.5 text-xs leading-relaxed text-emerald-200/90 sm:text-sm">
                    {dict.auth.resetPasswordPage.successMessage}
                  </p>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <Link
                    href="/login"
                    className="flex-1 rounded-xl bg-cyan-500 py-3 text-center text-sm font-semibold text-slate-950 shadow-[0_0_20px_rgba(6,182,212,0.3)] transition-colors hover:bg-cyan-400"
                  >
                    {dict.auth.resetPasswordPage.backToLogin}
                  </Link>
                  <Link
                    href="/catalog"
                    className="flex-1 rounded-xl border border-slate-700 bg-slate-900/70 py-3 text-center text-sm font-semibold text-slate-200 transition-colors hover:border-cyan-500/40 hover:text-cyan-200"
                  >
                    {dict.auth.resetPasswordPage.continueToCatalog}
                  </Link>
                </div>
              </div>
            ) : step === "verify" ? (
              <div className="mt-6 space-y-5">
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-4 text-center">
                  <p className="text-xs leading-relaxed text-emerald-200 sm:text-sm">
                    {resendNotice ?? dict.auth.forgotPasswordPage.antiEnumerationNotice}
                  </p>
                  <p className="mt-1.5 font-mono text-[11px] text-emerald-300/80">
                    {email}
                  </p>
                </div>

                <form
                  onSubmit={handleVerifyAndResetSubmit}
                  noValidate
                  className="space-y-4"
                >
                  {!otpVerified && (
                    <div>
                      <label
                        htmlFor="recovery-otp"
                        className="block text-xs font-medium text-slate-200"
                      >
                        {dict.auth.forgotPasswordPage.otpLabel}
                      </label>
                      <input
                        id="recovery-otp"
                        type="text"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        maxLength={8}
                        value={otpCode}
                        onChange={(e) =>
                          setOtpCode(e.target.value.replace(/\D/g, ""))
                        }
                        placeholder={dict.auth.forgotPasswordPage.otpPlaceholder}
                        className="mt-1.5 w-full rounded-xl border border-slate-800 bg-[#070b14] px-3.5 py-2.5 text-center font-mono text-lg tracking-[0.35em] text-slate-100 placeholder:tracking-normal placeholder:text-slate-600 focus:border-cyan-500/60 focus:outline-none"
                      />
                      <p className="mt-1 text-xs text-slate-500">
                        {dict.auth.forgotPasswordPage.otpHint}
                      </p>
                    </div>
                  )}

                  <div>
                    <div className="flex items-center justify-between">
                      <label
                        htmlFor="recovery-new-password"
                        className="block text-xs font-medium text-slate-200"
                      >
                        {dict.auth.resetPasswordPage.newPasswordLabel}
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        className="font-mono text-[11px] text-cyan-400 hover:underline"
                      >
                        {showPassword
                          ? dict.auth.resetPasswordPage.hidePassword
                          : dict.auth.resetPasswordPage.showPassword}
                      </button>
                    </div>
                    <input
                      id="recovery-new-password"
                      type={showPassword ? "text" : "password"}
                      required
                      autoComplete="new-password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder={
                        dict.auth.resetPasswordPage.newPasswordPlaceholder
                      }
                      className="mt-1.5 w-full rounded-xl border border-slate-800 bg-[#070b14] px-3.5 py-2.5 text-base text-slate-100 placeholder:text-slate-500 focus:border-cyan-500/60 focus:outline-none sm:text-sm"
                    />
                    <p className="mt-1 text-xs text-slate-500">
                      {dict.auth.resetPasswordPage.newPasswordHint}
                    </p>
                  </div>

                  <div>
                    <label
                      htmlFor="recovery-confirm-password"
                      className="block text-xs font-medium text-slate-200"
                    >
                      {dict.auth.resetPasswordPage.confirmPasswordLabel}
                    </label>
                    <input
                      id="recovery-confirm-password"
                      type={showPassword ? "text" : "password"}
                      required
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder={
                        dict.auth.resetPasswordPage.confirmPasswordPlaceholder
                      }
                      className="mt-1.5 w-full rounded-xl border border-slate-800 bg-[#070b14] px-3.5 py-2.5 text-base text-slate-100 placeholder:text-slate-500 focus:border-cyan-500/60 focus:outline-none sm:text-sm"
                    />
                  </div>

                  {errorMessage && (
                    <div className="rounded-xl border border-rose-500/40 bg-rose-950/30 p-3">
                      <p className="text-xs text-rose-400">{errorMessage}</p>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full rounded-xl bg-cyan-500 py-3 text-sm font-semibold text-slate-950 shadow-[0_0_20px_rgba(6,182,212,0.3)] transition-colors hover:bg-cyan-400 disabled:opacity-50"
                  >
                    {isSubmitting
                      ? dict.auth.forgotPasswordPage.verifyingAndResettingButton
                      : dict.auth.forgotPasswordPage.verifyAndResetButton}
                  </button>
                </form>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={handleResendCode}
                    className="font-mono text-cyan-400 hover:underline disabled:opacity-50"
                  >
                    {dict.auth.forgotPasswordPage.resendCodeButton}
                  </button>
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => {
                      setStep("request");
                      setErrorMessage(null);
                      setResendNotice(null);
                      setOtpCode("");
                      setOtpVerified(false);
                    }}
                    className="font-mono text-slate-400 hover:text-cyan-300 hover:underline disabled:opacity-50"
                  >
                    {dict.auth.forgotPasswordPage.changeEmailButton}
                  </button>
                </div>

                <div className="pt-1 text-center">
                  <Link
                    href="/login"
                    className="font-mono text-xs text-slate-400 hover:text-cyan-300 hover:underline"
                  >
                    ← {dict.auth.forgotPasswordPage.backToLogin}
                  </Link>
                </div>
              </div>
            ) : (
              <form
                onSubmit={handleRequestSubmit}
                noValidate
                className="mt-6 space-y-4"
              >
                <div>
                  <label
                    htmlFor="recovery-email"
                    className="block text-xs font-medium text-slate-200"
                  >
                    {dict.auth.forgotPasswordPage.emailLabel}
                  </label>
                  <input
                    id="recovery-email"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={dict.auth.forgotPasswordPage.emailPlaceholder}
                    className="mt-1.5 w-full rounded-xl border border-slate-800 bg-[#070b14] px-3.5 py-2.5 text-base text-slate-100 placeholder:text-slate-500 focus:border-cyan-500/60 focus:outline-none sm:text-sm"
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    {dict.auth.forgotPasswordPage.emailHint}
                  </p>
                </div>

                {errorMessage && (
                  <div className="rounded-xl border border-rose-500/40 bg-rose-950/30 p-3">
                    <p className="text-xs text-rose-400">{errorMessage}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full rounded-xl bg-cyan-500 py-3 text-sm font-semibold text-slate-950 shadow-[0_0_20px_rgba(6,182,212,0.3)] transition-colors hover:bg-cyan-400 disabled:opacity-50"
                >
                  {isSubmitting
                    ? dict.auth.forgotPasswordPage.submittingButton
                    : dict.auth.forgotPasswordPage.submitButton}
                </button>

                <div className="pt-2 text-center">
                  <Link
                    href="/login"
                    className="font-mono text-xs text-slate-400 hover:text-cyan-300 hover:underline"
                  >
                    ← {dict.auth.forgotPasswordPage.backToLogin}
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
