# Etapa 9.1.13 — Implementation Plan

- **Data:** 2026-11-13
- **Objetivo:** Integrar o fluxo de cadastro (`/register`) ao Supabase Auth (`signUp()`), mantendo intactos o login simulado, logout simulado, recuperação de senha simulada, `DEMO_PROFILES`, `useAuthStore` e guards.

## 1. Diagnóstico prévio confirmado

- `handle_new_user()` (`supabase/migrations/20261110000002_functions_triggers.sql`) lê `raw_user_meta_data ->> 'username'` (`^[a-z0-9_]{3,30}$`, com fallback `user_<12hex>`) e `raw_user_meta_data ->> 'display_name'` (`left(btrim(...), 60)`), inserindo em `public.profiles` com `role = 'member'` padrão.
- `validateRegistrationInput()` em `src/features/auth/validation.ts` permitia `displayName` opcional até `80` caracteres e checava duplicidade contra `DEMO_PROFILES`/`localStorage`.
- `src/app/register/page.tsx` usava `registerUser()` em `localStorage` e tinha `maxLength={80}` no campo de nome de exibição.

## 2. Alterações planejadas

1. **Ajustar `src/features/auth/validation.ts`:**
   - Tornar `displayName` obrigatório (`1` a `60` caracteres), alinhado à constraint `profiles_display_name_len` do PostgreSQL.
   - Remover checagem de e-mail/username contra `DEMO_PROFILES`/`localStorage` na validação de cadastro.
2. **Criar `src/features/auth/register-service.ts`:**
   - Encapsular `registerWithSupabase()` usando `createClient()` (`src/lib/supabase/client.ts`), `getSafeRedirectPath()` (`src/lib/security/redirect.ts`), `supabase.auth.signUp()` com `emailRedirectTo` apontando para `/auth/callback` e metadados `{ username, display_name, preferred_locale }`.
   - Tratar erros de rede, respostas com `session: null` (confirmação de e-mail pendente), respostas com `session` e tratamento anti-enumeração para e-mail já cadastrado.
3. **Atualizar `src/app/register/page.tsx`:**
   - Integrar com `registerWithSupabase()`, adicionar estado `isSubmitting` (prevenindo envio duplicado), `required` e `maxLength={60}` no `displayName`, e tela de confirmação orientando o usuário a verificar caixa de entrada e spam.
4. **Criar suíte de testes `scripts/test-register-etapa9-1-13.mjs`:**
   - Cobrir todos os 12 cenários obrigatórios sem criar usuários no Supabase remoto.
