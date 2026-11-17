"use client";

import Image from "next/image";
import Link from "next/link";
import { type FormEvent, useMemo, useState } from "react";
import { siteConfig } from "@/config/site";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { requestPasswordRecovery } from "@/features/auth/recovery-service";
import { EMAIL_REGEX } from "@/features/auth/validation";
import { useCatalogStore } from "@/features/catalog/use-catalog-store";
import { getDictionary } from "@/lib/i18n/dictionaries";

export default function ForgotPasswordPage() {
  const { locale, setLocale } = useCatalogStore();
  const dict = useMemo(() => getDictionary(locale), [locale]);

  const [email, setEmail] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isSubmitting) {
      return;
    }
    setErrorMessage(null);

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

      setIsSubmitted(true);
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

            {isSubmitted ? (
              /* Success / Anti-enumeration view */
              <div className="mt-6 space-y-5">
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-5 text-center">
                  <span className="text-3xl" aria-hidden="true">
                    ✉️
                  </span>
                  <p className="mt-2 text-xs leading-relaxed text-emerald-200 sm:text-sm">
                    {dict.auth.forgotPasswordPage.antiEnumerationNotice}
                  </p>
                </div>

                <div className="pt-2 text-center">
                  <Link
                    href="/login"
                    className="font-mono text-xs text-slate-400 hover:text-cyan-300 hover:underline"
                  >
                    ← {dict.auth.forgotPasswordPage.backToLogin}
                  </Link>
                </div>
              </div>
            ) : (
              /* Recovery Request Form */
              <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
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
                  <div className="rounded-xl border border-rose-500/40 bg-rose-950/30 p-3 text-xs text-rose-300">
                    {errorMessage}
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
