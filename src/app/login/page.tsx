"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useMemo, useState } from "react";
import { siteConfig } from "@/config/site";
import { loginWithSupabase } from "@/features/auth/login-service";
import { useAuthStore } from "@/features/auth/use-auth-store";
import { EMAIL_REGEX, USERNAME_REGEX } from "@/features/auth/validation";
import { useCatalogStore } from "@/features/catalog/use-catalog-store";
import { getDictionary } from "@/lib/i18n/dictionaries";

export default function LoginPage() {
  const router = useRouter();
  const { locale } = useCatalogStore();
  const { user, setAuthenticatedSession, signOut } = useAuthStore();

  const dict = useMemo(() => getDictionary(locale), [locale]);
  const isPt = locale === "pt-BR";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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

    const normalizedIdentifier = email.trim().toLowerCase();
    const isValidEmail = EMAIL_REGEX.test(normalizedIdentifier);
    const isValidUsername = USERNAME_REGEX.test(
      normalizedIdentifier.replace(/^@+/, ""),
    );
    const invalidIdentifierMessage = isPt
      ? "Informe um e-mail válido ou @usuário."
      : "Enter a valid email or @username.";

    if (!normalizedIdentifier || (!isValidEmail && !isValidUsername)) {
      setErrorMessage(invalidIdentifierMessage);
      return;
    }

    if (password.length < 8) {
      setErrorMessage(dict.auth.errors.passwordLength);
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await loginWithSupabase({
        email: normalizedIdentifier,
        password,
        nextPath: getRequestedNextPath(),
      });

      if (result.status === "error") {
        const errorMap = {
          invalid_email: invalidIdentifierMessage,
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

  return (
    <div className="flex min-h-screen flex-col bg-[#070b14]">
      {/* Minimal Auth Header with official Vexor logo + Criar conta */}
      <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-[#070b14]/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
          <Link
            href="/"
            className="flex items-center rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
          >
            <Image
              src={siteConfig.logoHorizontalPath}
              alt={siteConfig.name}
              width={150}
              height={64}
              priority
              className="h-9 w-auto shrink-0 object-contain drop-shadow-[0_0_14px_rgba(34,211,238,0.28)] sm:h-10"
            />
          </Link>
          <Link
            href="/register"
            className="inline-flex min-h-[44px] items-center px-2 text-sm font-semibold text-cyan-400 transition-colors hover:text-cyan-300"
          >
            {dict.nav.signUp}
          </Link>
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center bg-cyber-grid px-4 py-8 sm:py-14">
        <div className="w-full max-w-md">
          <div className="text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-cyan-500/35 bg-cyan-500/10 px-3 py-1 font-mono text-[11px] font-semibold uppercase tracking-widest text-cyan-300">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
              {dict.auth.loginEyebrow}
            </span>
            <h1 className="mt-3.5 text-2xl font-bold tracking-tight text-slate-50 sm:text-3xl">
              {dict.auth.loginTitle}
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">
              {dict.auth.loginSubtitle}
            </p>
          </div>

          {user ? (
            <div className="mt-6 rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-6 text-center">
              <p className="font-mono text-xs font-semibold uppercase text-emerald-300">
                {dict.auth.alreadySignedInTitle}
              </p>
              <p className="mt-2 text-sm text-slate-300">
                {dict.auth.alreadySignedInBody(user.username)}
              </p>
              <div className="mt-5 flex flex-col gap-2.5 sm:flex-row">
                <Link
                  href="/"
                  className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-xl bg-cyan-500 px-4 text-sm font-semibold text-slate-950 hover:bg-cyan-400"
                >
                  {dict.auth.continueToApp} →
                </Link>
                <button
                  type="button"
                  onClick={signOut}
                  className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-slate-700 bg-[#0d1322] px-4 text-sm font-medium text-rose-300 hover:border-rose-500/40"
                >
                  {dict.nav.signOut}
                </button>
              </div>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              noValidate
              className="mt-6 space-y-4 sm:rounded-2xl sm:border sm:border-slate-800/90 sm:bg-[#0d1322]/90 sm:p-7"
            >
              <div>
                <label
                  htmlFor="login-email"
                  className="block text-sm font-medium text-slate-200"
                >
                  {isPt ? "E-mail ou @usuário" : "Email or @username"}
                </label>
                <input
                  id="login-email"
                  type="text"
                  required
                  autoComplete="username"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={
                    isPt
                      ? "voce@exemplo.com ou @usuario"
                      : "you@example.com or @username"
                  }
                  className="mt-1.5 block min-h-[50px] w-full rounded-xl border border-slate-800 bg-[#0d1322] px-3.5 text-[15px] text-slate-100 placeholder:text-slate-500 focus:border-cyan-500/60 focus:outline-none sm:bg-[#070b14] sm:text-sm"
                />
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="login-password"
                    className="text-sm font-medium text-slate-200"
                  >
                    {dict.auth.passwordLabel}
                  </label>
                  <Link
                    href="/forgot-password"
                    className="inline-flex min-h-[44px] items-center text-sm font-semibold text-cyan-400 transition-colors hover:text-cyan-300"
                  >
                    {dict.auth.forgotPasswordLink}
                  </Link>
                </div>
                <div className="flex items-center rounded-xl border border-slate-800 bg-[#0d1322] focus-within:border-cyan-500/60 sm:bg-[#070b14]">
                  <input
                    id="login-password"
                    type={showPassword ? "text" : "password"}
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={isPt ? "Sua senha" : "Your password"}
                    className="min-h-[50px] min-w-0 flex-1 bg-transparent px-3.5 text-[15px] text-slate-100 placeholder:text-slate-500 focus:outline-none sm:text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={
                      showPassword
                        ? isPt
                          ? "Ocultar senha"
                          : "Hide password"
                        : isPt
                          ? "Mostrar senha"
                          : "Show password"
                    }
                    className="inline-flex h-11 w-11 shrink-0 items-center justify-center text-slate-400 hover:text-slate-200"
                  >
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-5 w-5"
                    >
                      {showPassword ? (
                        <>
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-6 0-10-8-10-8a18.45 18.45 0 0 1 5.06-5.94" />
                          <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c6 0 10 8 10 8a18.5 18.5 0 0 1-2.16 3.19" />
                          <path d="M1 1l22 22" />
                        </>
                      ) : (
                        <>
                          <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" />
                          <circle cx="12" cy="12" r="3" />
                        </>
                      )}
                    </svg>
                  </button>
                </div>
              </div>

              {errorMessage && (
                <p
                  role="alert"
                  className="rounded-xl border border-rose-500/40 bg-rose-950/30 px-3.5 py-2.5 text-xs font-medium text-rose-200"
                >
                  {errorMessage}
                </p>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex min-h-[52px] w-full items-center justify-center rounded-xl bg-cyan-500 px-5 text-base font-bold text-slate-950 shadow-[0_0_20px_rgba(6,182,212,0.25)] transition-colors hover:bg-cyan-400 disabled:opacity-50"
              >
                {isSubmitting
                  ? isPt
                    ? "Entrando..."
                    : "Signing in..."
                  : dict.nav.signIn}
              </button>

              <p className="pt-1 text-center text-sm text-slate-400">
                {isPt ? "Ainda não faz parte?" : "New to Vexor?"}{" "}
                <Link
                  href="/register"
                  className="inline-flex min-h-[44px] items-center font-semibold text-cyan-400 hover:text-cyan-300"
                >
                  {isPt ? "Criar conta grátis →" : "Create free account →"}
                </Link>
              </p>
            </form>
          )}
        </div>
      </main>

      {/* Single-line Ethical Use Footer */}
      <footer className="px-4 pb-5 pt-2 text-center text-xs text-slate-500">
        {isPt
          ? "Uso ético e defensivo · Conteúdo para fins educacionais e pesquisa autorizada."
          : "Ethical & defensive use · Content for educational and authorized research purposes."}
      </footer>
    </div>
  );
}
