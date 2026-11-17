"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useMemo, useState } from "react";
import { siteConfig, type SupportedLocale } from "@/config/site";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { registerWithSupabase } from "@/features/auth/register-service";
import { useAuthStore } from "@/features/auth/use-auth-store";
import {
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

  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
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

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isSubmitting) {
      return;
    }

    setSubmitError(null);

    const input: RegisterInput = {
      email,
      username,
      displayName,
      password,
      confirmPassword,
      preferredLanguage,
      ethicsAccepted,
    };

    const validation = validateRegistrationInput(input, [], dict);
    if (!validation.valid) {
      setFieldErrors(validation.errors);
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

  const usernameValidLive = username.trim().length > 0 && isValidUsername(username);

  return (
    <div className="flex min-h-screen flex-col">
      <Header locale={locale} onLocaleChange={setLocale} dict={dict} />

      <main className="flex flex-1 items-center justify-center bg-cyber-grid py-8 sm:py-16">
        <div className="mx-auto w-full max-w-lg px-4 sm:px-6">
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
                {dict.auth.registerEyebrow}
              </span>
              <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-50 sm:text-3xl">
                {dict.auth.registerTitle}
              </h1>
              <p className="mt-2 text-xs leading-relaxed text-slate-400 sm:text-sm">
                {dict.auth.registerSubtitle}
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
            ) : confirmationPending ? (
              <div className="mt-6 space-y-4 rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-5 text-center">
                <span className="text-3xl" aria-hidden="true">
                  ✉️
                </span>
                <h2 className="text-base font-bold text-emerald-200">
                  {isPt
                    ? "Verifique seu e-mail para confirmar o cadastro"
                    : "Check your email to confirm your registration"}
                </h2>
                <p className="text-xs leading-relaxed text-emerald-100/90 sm:text-sm">
                  {isPt
                    ? "Se o endereço informado estiver elegível para criação de conta, enviamos um link de confirmação para sua caixa de entrada. Caso não encontre em alguns minutos, verifique também a pasta de spam ou lixo eletrônico."
                    : "If the provided address is eligible for account creation, we have sent a confirmation link to your inbox. If you do not see it within a few minutes, please also check your spam or junk folder."}
                </p>
                <div className="pt-2">
                  <Link
                    href="/login"
                    className="inline-flex rounded-xl bg-cyan-500 px-5 py-2.5 text-xs font-semibold text-slate-950 hover:bg-cyan-400"
                  >
                    {dict.auth.signInLink} →
                  </Link>
                </div>
              </div>
            ) : (
              <form
                onSubmit={handleSubmit}
                noValidate
                className="mt-6 space-y-4"
              >
                {/* Email */}
                <div>
                  <label
                    htmlFor="reg-email"
                    className="block text-xs font-medium text-slate-200"
                  >
                    {dict.auth.emailLabel}
                  </label>
                  <input
                    id="reg-email"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={dict.auth.emailPlaceholder}
                    className="mt-1.5 w-full rounded-xl border border-slate-800 bg-[#070b14] px-3.5 py-2.5 text-base text-slate-100 placeholder:text-slate-500 focus:border-cyan-500/60 focus:outline-none sm:text-sm"
                  />
                  {fieldErrors.email && (
                    <p className="mt-1 text-xs font-medium text-rose-400">
                      {fieldErrors.email}
                    </p>
                  )}
                </div>

                {/* Username (Regex ^[a-z0-9_]{3,30}$) */}
                <div>
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="reg-username"
                      className="block text-xs font-medium text-slate-200"
                    >
                      {dict.auth.usernameLabel}
                    </label>
                    {username.trim().length > 0 && (
                      <span
                        className={`font-mono text-[10px] ${
                          usernameValidLive
                            ? "text-emerald-400"
                            : "text-amber-400"
                        }`}
                      >
                        {usernameValidLive
                          ? "✓ ^[a-z0-9_]{3,30}$"
                          : "3..30 [a-z0-9_]"}
                      </span>
                    )}
                  </div>
                  <input
                    id="reg-username"
                    type="text"
                    required
                    maxLength={30}
                    autoComplete="username"
                    value={username}
                    onChange={(e) =>
                      setUsername(e.target.value.toLowerCase().replace(/\s+/g, "_"))
                    }
                    placeholder={dict.auth.usernamePlaceholder}
                    className="mt-1.5 w-full rounded-xl border border-slate-800 bg-[#070b14] px-3.5 py-2.5 font-mono text-base text-slate-100 placeholder:text-slate-500 focus:border-cyan-500/60 focus:outline-none sm:text-sm"
                  />
                  <p className="mt-1 text-[11px] text-slate-500">
                    {dict.auth.usernameHint}
                  </p>
                  {fieldErrors.username && (
                    <p className="mt-1 text-xs font-medium text-rose-400">
                      {fieldErrors.username}
                    </p>
                  )}
                </div>

                {/* Display Name & Preferred Language */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="reg-display-name"
                      className="block text-xs font-medium text-slate-200"
                    >
                      {dict.auth.displayNameLabel}
                    </label>
                    <input
                      id="reg-display-name"
                      type="text"
                      required
                      maxLength={60}
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder={dict.auth.displayNamePlaceholder}
                      className="mt-1.5 w-full rounded-xl border border-slate-800 bg-[#070b14] px-3.5 py-2.5 text-base text-slate-100 placeholder:text-slate-500 focus:border-cyan-500/60 focus:outline-none sm:text-sm"
                    />
                    {fieldErrors.displayName && (
                      <p className="mt-1 text-xs font-medium text-rose-400">
                        {fieldErrors.displayName}
                      </p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="reg-language"
                      className="block text-xs font-medium text-slate-200"
                    >
                      {dict.auth.preferredLanguageLabel}
                    </label>
                    <select
                      id="reg-language"
                      value={preferredLanguage}
                      onChange={(e) =>
                        setPreferredLanguage(e.target.value as SupportedLocale)
                      }
                      className="mt-1.5 w-full rounded-xl border border-slate-800 bg-[#070b14] px-3.5 py-2.5 text-base text-slate-100 focus:border-cyan-500/60 focus:outline-none sm:text-sm"
                    >
                      <option value="pt-BR">Português (pt-BR)</option>
                      <option value="en">English (en)</option>
                    </select>
                  </div>
                </div>

                {/* Passwords */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="reg-password"
                      className="block text-xs font-medium text-slate-200"
                    >
                      {dict.auth.passwordLabel}
                    </label>
                    <input
                      id="reg-password"
                      type="password"
                      required
                      autoComplete="new-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={dict.auth.passwordPlaceholder}
                      className="mt-1.5 w-full rounded-xl border border-slate-800 bg-[#070b14] px-3.5 py-2.5 text-base text-slate-100 placeholder:text-slate-500 focus:border-cyan-500/60 focus:outline-none sm:text-sm"
                    />
                    {fieldErrors.password && (
                      <p className="mt-1 text-xs font-medium text-rose-400">
                        {fieldErrors.password}
                      </p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="reg-confirm-password"
                      className="block text-xs font-medium text-slate-200"
                    >
                      {dict.auth.confirmPasswordLabel}
                    </label>
                    <input
                      id="reg-confirm-password"
                      type="password"
                      required
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder={dict.auth.confirmPasswordPlaceholder}
                      className="mt-1.5 w-full rounded-xl border border-slate-800 bg-[#070b14] px-3.5 py-2.5 text-base text-slate-100 placeholder:text-slate-500 focus:border-cyan-500/60 focus:outline-none sm:text-sm"
                    />
                    {fieldErrors.confirmPassword && (
                      <p className="mt-1 text-xs font-medium text-rose-400">
                        {fieldErrors.confirmPassword}
                      </p>
                    )}
                  </div>
                </div>

                {/* Ethical Use & Defensive Security Commitment */}
                <div className="rounded-xl border border-slate-800 bg-[#070b14] p-3.5">
                  <label className="flex cursor-pointer items-start gap-3">
                    <input
                      type="checkbox"
                      checked={ethicsAccepted}
                      onChange={(e) => setEthicsAccepted(e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-cyan-400"
                    />
                    <span className="text-xs leading-relaxed text-slate-300">
                      {dict.auth.ethicsCheckboxLabel}
                    </span>
                  </label>
                  {fieldErrors.ethicsAccepted && (
                    <p className="mt-2 text-xs font-medium text-rose-400">
                      {fieldErrors.ethicsAccepted}
                    </p>
                  )}
                </div>

                {submitError && (
                  <div className="rounded-xl border border-rose-500/40 bg-rose-950/30 p-3 text-xs text-rose-300">
                    {submitError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full rounded-xl bg-cyan-500 py-2.5 text-sm font-semibold text-slate-950 shadow-[0_0_25px_rgba(6,182,212,0.25)] transition-colors hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting
                    ? isPt
                      ? "Criando conta..."
                      : "Creating account..."
                    : dict.auth.signUpButton}
                </button>
              </form>
            )}

            <div className="mt-6 border-t border-slate-800 pt-5 text-center text-xs text-slate-400">
              {dict.auth.hasAccountPrompt}{" "}
              <Link
                href="/login"
                className="font-semibold text-cyan-400 hover:text-cyan-300"
              >
                {dict.auth.signInLink} →
              </Link>
            </div>
          </div>
        </div>
      </main>

      <Footer locale={locale} dict={dict} />
    </div>
  );
}
