"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useMemo, useState } from "react";
import { siteConfig } from "@/config/site";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { loginWithSupabase } from "@/features/auth/login-service";
import { DEMO_PROFILES, useAuthStore } from "@/features/auth/use-auth-store";
import { type AuthUserProfile, EMAIL_REGEX } from "@/features/auth/validation";
import { useCatalogStore } from "@/features/catalog/use-catalog-store";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getSafeRedirectPath } from "@/lib/security/redirect";

export default function LoginPage() {
  const router = useRouter();
  const { locale, setLocale } = useCatalogStore();
  const { user, setAuthenticatedSession, signInWithProfile, signOut } =
    useAuthStore();

  const dict = useMemo(() => getDictionary(locale), [locale]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const getRequestedNextPath = (): string | null => {
    if (typeof window === "undefined") {
      return null;
    }
    const params = new URLSearchParams(window.location.search);
    return params.get("next");
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isSubmitting) {
      return;
    }
    setErrorMessage(null);

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !EMAIL_REGEX.test(normalizedEmail)) {
      setErrorMessage(dict.auth.errors.invalidEmail);
      return;
    }

    if (password.length < 8) {
      setErrorMessage(dict.auth.errors.passwordLength);
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await loginWithSupabase({
        email: normalizedEmail,
        password,
        nextPath: getRequestedNextPath(),
      });

      if (result.status === "error") {
        const errorMap = {
          invalid_email: dict.auth.errors.invalidEmail,
          password_too_short: dict.auth.errors.passwordLength,
          invalid_credentials: dict.auth.errors.invalidCredentials,
          rate_limited: dict.auth.errors.rateLimited,
          network_error: dict.auth.errors.networkError,
          profile_missing: dict.auth.errors.profileMissing,
        } as const;
        setErrorMessage(errorMap[result.errorCode]);
        return;
      }

      setAuthenticatedSession(result.profile);

      if (result.status === "suspended") {
        setErrorMessage(dict.auth.errors.accountSuspended);
        router.refresh();
        return;
      }

      router.push(result.safeRedirectPath);
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDemoSignIn = (profile: AuthUserProfile) => {
    signInWithProfile(profile);
    router.push(getSafeRedirectPath(getRequestedNextPath(), "/catalog"));
  };

  return (
    <div className="flex min-h-screen flex-col">
      <Header locale={locale} onLocaleChange={setLocale} dict={dict} />

      <main className="flex flex-1 items-center justify-center bg-cyber-grid py-8 sm:py-16">
        <div className="mx-auto w-full max-w-md px-4 sm:px-6">
          {/* Card Container */}
          <div className="rounded-2xl border border-slate-800/90 bg-[#0d1322]/95 p-5 shadow-[0_0_50px_rgba(6,182,212,0.08)] sm:p-8">
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
                {dict.auth.loginEyebrow}
              </span>
              <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-50 sm:text-3xl">
                {dict.auth.loginTitle}
              </h1>
              <p className="mt-2 text-xs leading-relaxed text-slate-400 sm:text-sm">
                {dict.auth.loginSubtitle}
              </p>
            </div>

            {user ? (
              <div className="mt-6 rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-5 text-center">
                <p className="font-mono text-xs font-semibold uppercase text-emerald-300">
                  {dict.auth.alreadySignedInTitle}
                </p>
                <p className="mt-2 text-sm text-slate-300">
                  {dict.auth.alreadySignedInBody(user.username)}
                </p>
                <div className="mt-5 flex flex-col gap-2.5 sm:flex-row">
                  <Link
                    href="/catalog"
                    className="flex-1 rounded-xl bg-cyan-500 px-4 py-2.5 text-center text-xs font-semibold text-slate-950 hover:bg-cyan-400"
                  >
                    {dict.auth.continueToApp} →
                  </Link>
                  <button
                    type="button"
                    onClick={signOut}
                    className="rounded-xl border border-slate-700 bg-[#070b14] px-4 py-2.5 text-xs font-medium text-rose-300 hover:border-rose-500/40"
                  >
                    {dict.nav.signOut}
                  </button>
                </div>
              </div>
            ) : (
              <>
                <form
                  onSubmit={handleSubmit}
                  noValidate
                  className="mt-6 space-y-4"
                >
                  <div>
                    <label
                      htmlFor="login-email"
                      className="block text-xs font-medium text-slate-200"
                    >
                      {dict.auth.emailLabel}
                    </label>
                    <input
                      id="login-email"
                      type="email"
                      required
                      disabled={isSubmitting}
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={dict.auth.emailPlaceholder}
                      className="mt-1.5 w-full rounded-xl border border-slate-800 bg-[#070b14] px-3.5 py-2.5 text-base text-slate-100 placeholder:text-slate-500 focus:border-cyan-500/60 focus:outline-none disabled:opacity-60 sm:text-sm"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between">
                      <label
                        htmlFor="login-password"
                        className="block text-xs font-medium text-slate-200"
                      >
                        {dict.auth.passwordLabel}
                      </label>
                      <Link
                        href="/forgot-password"
                        className="font-mono text-xs text-cyan-400 transition-colors hover:text-cyan-300 hover:underline"
                      >
                        {dict.auth.forgotPasswordLink}
                      </Link>
                    </div>
                    <input
                      id="login-password"
                      type="password"
                      required
                      disabled={isSubmitting}
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={dict.auth.passwordPlaceholder}
                      className="mt-1.5 w-full rounded-xl border border-slate-800 bg-[#070b14] px-3.5 py-2.5 text-base text-slate-100 placeholder:text-slate-500 focus:border-cyan-500/60 focus:outline-none disabled:opacity-60 sm:text-sm"
                    />
                  </div>

                  {errorMessage && (
                    <div className="rounded-xl border border-rose-500/40 bg-rose-950/30 p-3 text-xs text-rose-300">
                      {errorMessage}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full rounded-xl bg-cyan-500 py-2.5 text-sm font-semibold text-slate-950 shadow-[0_0_25px_rgba(6,182,212,0.25)] transition-colors hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSubmitting
                      ? dict.auth.signingInButton
                      : dict.auth.signInButton}
                  </button>
                </form>

                {/* Quick Role Simulator for Pre-Supabase Verification */}
                <div className="mt-6 rounded-xl border border-indigo-500/25 bg-[#070b14]/90 p-4">
                  <p className="font-mono text-[11px] font-semibold uppercase tracking-wider text-indigo-300">
                    ⚡ {dict.auth.demoAccountsTitle}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-400">
                    {dict.auth.demoAccountsSubtitle}
                  </p>
                  <div className="mt-3 flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const profile = DEMO_PROFILES.find((p) => p.username === "sec_analyst_br");
                        if (profile) handleDemoSignIn(profile);
                      }}
                      className="flex items-center justify-between rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-left text-xs font-medium text-emerald-200 transition-colors hover:bg-emerald-500/20"
                    >
                      <span>{dict.auth.demoMemberBtn}</span>
                      <span className="font-mono text-[10px] uppercase text-emerald-300">
                        MEMBER
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const profile = DEMO_PROFILES.find((p) => p.username === "mod_sentinel");
                        if (profile) handleDemoSignIn(profile);
                      }}
                      className="flex items-center justify-between rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-3 py-2 text-left text-xs font-medium text-indigo-200 transition-colors hover:bg-indigo-500/20"
                    >
                      <span>{dict.auth.demoModeratorBtn}</span>
                      <span className="font-mono text-[10px] uppercase text-indigo-300">
                        MOD
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const profile = DEMO_PROFILES.find((p) => p.username === "root_admin");
                        if (profile) handleDemoSignIn(profile);
                      }}
                      className="flex items-center justify-between rounded-lg border border-purple-500/30 bg-purple-500/10 px-3 py-2 text-left text-xs font-medium text-purple-200 transition-colors hover:bg-purple-500/20"
                    >
                      <span>{dict.auth.demoAdminBtn}</span>
                      <span className="font-mono text-[10px] uppercase text-purple-300">
                        ADMIN
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const profile = DEMO_PROFILES.find((p) => p.username === "suspended_user");
                        if (profile) handleDemoSignIn(profile);
                      }}
                      className="flex items-center justify-between rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-left text-xs font-medium text-rose-200 transition-colors hover:bg-rose-500/20"
                    >
                      <span>{dict.auth.demoSuspendedBtn}</span>
                      <span className="font-mono text-[10px] uppercase text-rose-300">
                        SUSPENDED
                      </span>
                    </button>
                  </div>
                </div>
              </>
            )}

            <div className="mt-6 border-t border-slate-800 pt-5 text-center text-xs text-slate-400">
              {dict.auth.noAccountPrompt}{" "}
              <Link
                href="/register"
                className="font-semibold text-cyan-400 hover:text-cyan-300"
              >
                {dict.auth.createAccountLink} →
              </Link>
            </div>
          </div>
        </div>
      </main>

      <Footer locale={locale} dict={dict} />
    </div>
  );
}
