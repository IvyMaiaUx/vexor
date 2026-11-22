"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useMemo, useState } from "react";
import { siteConfig, type SupportedLocale } from "@/config/site";
import { registerWithSupabase } from "@/features/auth/register-service";
import { useAuthStore } from "@/features/auth/use-auth-store";
import {
  EMAIL_REGEX,
  isValidUsername,
  type RegisterInput,
  validateRegistrationInput,
} from "@/features/auth/validation";
import { useCatalogStore } from "@/features/catalog/use-catalog-store";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getSafeRedirectPath } from "@/lib/security/redirect";

export default function RegisterPage() {
  const router = useRouter();
  const { locale, setLocale } = useCatalogStore();
  const { user, signOut } = useAuthStore();

  const dict = useMemo(() => getDictionary(locale), [locale]);
  const isPt = locale === "pt-BR";

  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [preferredLanguage, setPreferredLanguage] =
    useState<SupportedLocale>(locale);
  const [ethicsAccepted, setEthicsAccepted] = useState(false);

  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<keyof RegisterInput, string>>
  >({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [confirmationPending, setConfirmationPending] = useState(false);

  const getNextParam = (): string | null => {
    if (typeof window === "undefined") {
      return null;
    }
    return new URLSearchParams(window.location.search).get("next");
  };

  const hasMinLen = password.length >= 8;
  const hasLettersAndNumbers =
    /[a-zA-Z]/.test(password) && /\d/.test(password);
  // TODO(backend): validar disponibilidade real de username via RPC pública quando existir
  const usernameFormatValid =
    username.trim().length > 0 && isValidUsername(username);

  const handleContinueStep1 = () => {
    const nextErrors: Partial<Record<keyof RegisterInput, string>> = {};
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !EMAIL_REGEX.test(normalizedEmail)) {
      nextErrors.email = dict.auth.errors.invalidEmail;
    }
    if (!hasMinLen) {
      nextErrors.password = dict.auth.errors.passwordLength;
    }
    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      return;
    }
    setFieldErrors({});
    setStep(2);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (step === 1) {
      handleContinueStep1();
      return;
    }
    if (isSubmitting) {
      return;
    }

    setSubmitError(null);

    const input: RegisterInput = {
      email,
      username,
      displayName,
      password,
      confirmPassword: password,
      preferredLanguage,
      ethicsAccepted,
    };

    const validation = validateRegistrationInput(input, [], dict);
    if (!validation.valid) {
      setFieldErrors(validation.errors);
      if (validation.errors.email || validation.errors.password) {
        setStep(1);
      }
      return;
    }

    setFieldErrors({});
    setIsSubmitting(true);

    try {
      const result = await registerWithSupabase({
        email,
        username,
        displayName,
        password,
        preferredLanguage,
        nextPath: getSafeRedirectPath(getNextParam(), "/catalog"),
      });

      if (result.status === "confirmation_required") {
        setConfirmationPending(true);
        return;
      }

      if (result.status === "authenticated") {
        router.push(result.safeRedirectPath);
        router.refresh();
        return;
      }

      const errorMessages = {
        weak_password: dict.auth.errors.passwordLength,
        rate_limited: isPt
          ? "Muitas tentativas de cadastro em sequência. Aguarde alguns minutos e tente novamente."
          : "Too many sign-up attempts in a row. Please wait a few minutes and try again.",
        network_error: isPt
          ? "Falha de comunicação com o serviço de autenticação. Verifique sua conexão e tente novamente."
          : "Unable to reach the authentication service. Check your connection and try again.",
        signup_failed: isPt
          ? "Não foi possível concluir o cadastro agora. Revise os dados informados e tente novamente."
          : "Unable to complete registration right now. Please review your details and try again.",
      };
      setSubmitError(errorMessages[result.errorCode]);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#070b14]">
      {/* Minimal Auth Header with official Vexor logo + Entrar */}
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
            href="/login"
            className="inline-flex min-h-[44px] items-center px-2 text-sm font-semibold text-cyan-400 transition-colors hover:text-cyan-300"
          >
            {dict.nav.signIn}
          </Link>
        </div>
      </header>

      <main className="flex flex-1 flex-col bg-cyber-grid pb-28 pt-6 sm:items-center sm:justify-center sm:pb-14 sm:pt-12">
        <div className="mx-auto w-full max-w-md px-4 sm:px-6">
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-400">
            {dict.auth.registerEyebrow}
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-50 sm:text-3xl">
            {step === 1
              ? dict.auth.registerTitle
              : isPt
                ? "Seu perfil"
                : "Your profile"}
          </h1>
          {step === 1 && (
            <p className="mt-1.5 text-sm leading-relaxed text-slate-400">
              {dict.auth.registerSubtitle}
            </p>
          )}

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
          ) : confirmationPending ? (
            <div className="mt-6 space-y-4 rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-6 text-center">
              <span className="text-3xl" aria-hidden="true">
                ✉️
              </span>
              <h2 className="text-base font-bold text-emerald-200">
                {isPt
                  ? "Verifique seu e-mail para confirmar o cadastro"
                  : "Check your email to confirm your registration"}
              </h2>
              <p className="text-sm text-slate-300">
                {isPt
                  ? `Enviamos um link de confirmação para ${email.trim().toLowerCase()}.`
                  : `We sent a confirmation link to ${email.trim().toLowerCase()}.`}
              </p>
              <Link
                href="/login"
                className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-cyan-500 px-5 text-sm font-semibold text-slate-950 hover:bg-cyan-400"
              >
                {dict.nav.signIn} →
              </Link>
            </div>
          ) : (
            <>
              {/* 2-Step Progress Bar */}
              <div className="mt-4">
                <div
                  className="flex gap-1.5"
                  role="progressbar"
                  aria-valuenow={step}
                  aria-valuemin={1}
                  aria-valuemax={2}
                  aria-label={isPt ? `Etapa ${step} de 2` : `Step ${step} of 2`}
                >
                  <span className="h-1 flex-1 rounded-full bg-cyan-400" />
                  <span
                    className={`h-1 flex-1 rounded-full transition-colors ${
                      step === 2 ? "bg-cyan-400" : "bg-slate-800"
                    }`}
                  />
                </div>
                <p className="mt-1.5 text-xs text-slate-400">
                  {isPt ? `Etapa ${step} de 2` : `Step ${step} of 2`}
                </p>
              </div>

              <form
                onSubmit={handleSubmit}
                noValidate
                className="mt-4 space-y-4 sm:rounded-2xl sm:border sm:border-slate-800/90 sm:bg-[#0d1322]/90 sm:p-6"
              >
                {step === 1 ? (
                  <>
                    <div>
                      <label
                        htmlFor="register-email"
                        className="block text-sm font-medium text-slate-200"
                      >
                        {dict.auth.emailLabel}
                      </label>
                      <input
                        id="register-email"
                        type="email"
                        required
                        autoComplete="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder={dict.auth.emailPlaceholder}
                        className="mt-1.5 block min-h-[50px] w-full rounded-xl border border-slate-800 bg-[#0d1322] px-3.5 text-[15px] text-slate-100 placeholder:text-slate-500 focus:border-cyan-500/60 focus:outline-none sm:bg-[#070b14] sm:text-sm"
                      />
                      {fieldErrors.email && (
                        <p className="mt-1 text-xs text-rose-400">
                          {fieldErrors.email}
                        </p>
                      )}
                    </div>

                    <div>
                      <label
                        htmlFor="register-password"
                        className="block text-sm font-medium text-slate-200"
                      >
                        {dict.auth.passwordLabel}
                      </label>
                      <div className="mt-1.5 flex items-center rounded-xl border border-slate-800 bg-[#0d1322] focus-within:border-cyan-500/60 sm:bg-[#070b14]">
                        <input
                          id="register-password"
                          type={showPassword ? "text" : "password"}
                          required
                          autoComplete="new-password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder={
                            isPt
                              ? "Mínimo de 8 caracteres"
                              : "Minimum 8 characters"
                          }
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
                      {fieldErrors.password && (
                        <p className="mt-1 text-xs text-rose-400">
                          {fieldErrors.password}
                        </p>
                      )}
                    </div>

                    {/* Password Checklist */}
                    <div className="grid gap-1.5 text-xs">
                      <span
                        className={`inline-flex items-center gap-2 ${
                          hasMinLen ? "text-emerald-400" : "text-slate-400"
                        }`}
                      >
                        <span aria-hidden="true">✓</span>
                        <span>
                          {isPt
                            ? "8 ou mais caracteres"
                            : "8 or more characters"}
                        </span>
                      </span>
                      <span
                        className={`inline-flex items-center gap-2 ${
                          hasLettersAndNumbers
                            ? "text-emerald-400"
                            : "text-slate-400"
                        }`}
                      >
                        <span aria-hidden="true">✓</span>
                        <span>
                          {isPt ? "Letras e números" : "Letters and numbers"}
                        </span>
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label
                        htmlFor="register-username"
                        className="block text-sm font-medium text-slate-200"
                      >
                        {isPt ? "Nome de usuário" : "Username"}
                      </label>
                      <div
                        className={`mt-1.5 flex items-center rounded-xl border bg-[#0d1322] sm:bg-[#070b14] ${
                          usernameFormatValid
                            ? "border-emerald-500/50"
                            : "border-slate-800 focus-within:border-cyan-500/60"
                        }`}
                      >
                        <input
                          id="register-username"
                          type="text"
                          required
                          autoComplete="username"
                          value={username}
                          onChange={(e) =>
                            setUsername(e.target.value.toLowerCase())
                          }
                          placeholder="blue_defender_01"
                          className="min-h-[50px] min-w-0 flex-1 bg-transparent px-3.5 font-mono text-[15px] text-slate-100 placeholder:text-slate-500 focus:outline-none sm:text-sm"
                        />
                        {usernameFormatValid && (
                          <span
                            className="pr-3.5 text-emerald-400"
                            aria-hidden="true"
                          >
                            ✓
                          </span>
                        )}
                      </div>
                      <p
                        className={`mt-1.5 text-xs ${
                          fieldErrors.username
                            ? "text-rose-400"
                            : usernameFormatValid
                              ? "text-emerald-400"
                              : "text-slate-400"
                        }`}
                      >
                        {fieldErrors.username
                          ? fieldErrors.username
                          : usernameFormatValid
                            ? isPt
                              ? "Disponível · 3 a 30 caracteres: letras minúsculas, números e _"
                              : "Available · 3 to 30 chars: lowercase letters, numbers, and _"
                            : isPt
                              ? "3 a 30 caracteres: letras minúsculas, números e _"
                              : "3 to 30 chars: lowercase letters, numbers, and _"}
                      </p>
                    </div>

                    <div>
                      <label
                        htmlFor="register-display-name"
                        className="block text-sm font-medium text-slate-200"
                      >
                        {isPt
                          ? "Nome de exibição (opcional)"
                          : "Display name (optional)"}
                      </label>
                      <input
                        id="register-display-name"
                        type="text"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="Ex.: Ana Silva (SOC Analyst)"
                        className="mt-1.5 block min-h-[50px] w-full rounded-xl border border-slate-800 bg-[#0d1322] px-3.5 text-[15px] text-slate-100 placeholder:text-slate-500 focus:border-cyan-500/60 focus:outline-none sm:bg-[#070b14] sm:text-sm"
                      />
                    </div>

                    <div>
                      <p className="mb-1.5 text-sm font-medium text-slate-200">
                        {isPt ? "Idioma da interface" : "Interface language"}
                      </p>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setPreferredLanguage("pt-BR");
                            setLocale("pt-BR");
                          }}
                          aria-pressed={preferredLanguage === "pt-BR"}
                          className={`inline-flex min-h-[44px] flex-1 items-center justify-center rounded-full border text-sm font-medium transition-colors ${
                            preferredLanguage === "pt-BR"
                              ? "border-cyan-500/60 bg-cyan-500/15 text-cyan-300"
                              : "border-slate-800 bg-[#0d1322] text-slate-300"
                          }`}
                        >
                          Português (PT-BR)
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setPreferredLanguage("en");
                            setLocale("en");
                          }}
                          aria-pressed={preferredLanguage === "en"}
                          className={`inline-flex min-h-[44px] flex-1 items-center justify-center rounded-full border text-sm font-medium transition-colors ${
                            preferredLanguage === "en"
                              ? "border-cyan-500/60 bg-cyan-500/15 text-cyan-300"
                              : "border-slate-800 bg-[#0d1322] text-slate-300"
                          }`}
                        >
                          English
                        </button>
                      </div>
                    </div>

                    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-800 bg-[#0d1322]/90 p-3.5 text-sm leading-relaxed text-slate-200 sm:bg-[#070b14]">
                      <input
                        type="checkbox"
                        checked={ethicsAccepted}
                        onChange={(e) => setEthicsAccepted(e.target.checked)}
                        className="mt-0.5 h-6 w-6 shrink-0 rounded border-slate-700 bg-[#070b14] accent-cyan-400"
                      />
                      <span>
                        {isPt
                          ? "Comprometo-me com as diretrizes éticas da plataforma: usar o conhecimento só para defesa cibernética, aprendizado e testes autorizados."
                          : "I commit to the platform ethical guidelines: using knowledge solely for cyber defense, learning, and authorized testing."}
                      </span>
                    </label>
                    {fieldErrors.ethicsAccepted && (
                      <p className="text-xs text-rose-400">
                        {fieldErrors.ethicsAccepted}
                      </p>
                    )}
                  </>
                )}

                {submitError && (
                  <p
                    role="alert"
                    className="rounded-xl border border-rose-500/40 bg-rose-950/30 px-3.5 py-2.5 text-xs font-medium text-rose-200"
                  >
                    {submitError}
                  </p>
                )}

                {/* Fixed Bottom CTA Bar on mobile, inline on desktop */}
                <div className="fixed inset-x-0 bottom-0 z-30 flex items-center gap-2.5 border-t border-slate-800/90 bg-[#070b14]/95 px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur-md sm:static sm:mt-4 sm:border-0 sm:bg-transparent sm:p-0">
                  {step === 2 && (
                    <button
                      type="button"
                      onClick={() => {
                        setFieldErrors({});
                        setStep(1);
                      }}
                      className="inline-flex min-h-[48px] items-center justify-center rounded-xl border border-slate-700 bg-[#0d1322] px-5 text-sm font-medium text-slate-200 hover:border-cyan-500/40"
                    >
                      {isPt ? "Voltar" : "Back"}
                    </button>
                  )}

                  {step === 1 ? (
                    <button
                      type="button"
                      onClick={handleContinueStep1}
                      className="inline-flex min-h-[48px] flex-1 items-center justify-center rounded-xl bg-cyan-500 px-5 text-sm font-bold text-slate-950 shadow-[0_0_20px_rgba(6,182,212,0.25)] transition-colors hover:bg-cyan-400"
                    >
                      {isPt ? "Continuar" : "Continue"}
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="inline-flex min-h-[48px] flex-1 items-center justify-center rounded-xl bg-cyan-500 px-5 text-sm font-bold text-slate-950 shadow-[0_0_20px_rgba(6,182,212,0.25)] transition-colors hover:bg-cyan-400 disabled:opacity-50"
                    >
                      {isSubmitting
                        ? isPt
                          ? "Criando conta..."
                          : "Creating account..."
                        : isPt
                          ? "Criar conta de membro"
                          : "Create member account"}
                    </button>
                  )}
                </div>
              </form>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
