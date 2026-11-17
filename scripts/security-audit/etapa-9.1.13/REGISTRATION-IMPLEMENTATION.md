# Etapa 9.1.13 — Registration Implementation

- **Data:** 2026-11-13
- **Arquivos criados/modificados:**
  - `src/features/auth/register-service.ts` (criado)
  - `src/features/auth/validation.ts` (modificado)
  - `src/lib/i18n/dictionaries.ts` (modificado)
  - `src/app/register/page.tsx` (modificado)

## 1. Fluxo de cadastro

1. `src/app/register/page.tsx` coleta `email`, `username`, `displayName`, `preferredLanguage`, `password`, `confirmPassword` e `ethicsAccepted`.
2. `validateRegistrationInput()` valida formato de e-mail, `username` (`^[a-z0-9_]{3,30}$`), `displayName` obrigatório (`1..60` caracteres), senha `>= 8` caracteres, confirmação idêntica e aceite ético.
3. O estado `isSubmitting` bloqueia envios duplicados enquanto `registerWithSupabase()` executa `supabase.auth.signUp()`.
4. `registerWithSupabase()` envia `email`, `password`, `options.emailRedirectTo` (`/auth/callback?next=...`) e `options.data` (`username`, `display_name`, `preferred_locale`).

## 2. Tratamento de erros

- Erros de rede, rate limit (`429`), senha fraca ou falhas genéricas retornam códigos estruturados sem expor mensagens internas ou credenciais.
- O sistema simulado (`useAuthStore`, `DEMO_PROFILES`, `/login`, `/forgot-password`, `/reset-password`) permaneceu preservado.
