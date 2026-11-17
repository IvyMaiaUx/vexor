# Etapa 9.1.11 — Auth Flows Audit

- **Data:** 2026-11-13
- **Arquivos analisados:** `src/features/auth/use-auth-store.ts`, `src/features/auth/validation.ts`, `src/app/login/page.tsx`, `src/app/register/page.tsx`, `src/app/forgot-password/page.tsx`, `src/app/reset-password/page.tsx`, `src/components/layout/header.tsx`.

## Matriz dos 10 fluxos

| Fluxo | Arquivos envolvidos | Interface existe? | Integração Supabase existe? | Estado atual | O que falta |
|---|---|---|---|---|---|
| 1. Cadastro | `src/app/register/page.tsx`, `src/features/auth/validation.ts`, `src/features/auth/use-auth-store.ts` | Sim | Não | **Simulado** (`localStorage`) | Chamar `supabase.auth.signUp()` passando `username`, `display_name`, `preferred_locale` em `options.data` para o trigger `handle_new_user()`, alinhar `displayName` max 60 chars (atualmente 80 em `validation.ts`) e remover `localStorage`. |
| 2. Login | `src/app/login/page.tsx`, `src/features/auth/use-auth-store.ts` | Sim | Não | **Simulado** (`localStorage` + 4 botões `DEMO_PROFILES`) | Integrar `supabase.auth.signInWithPassword()`, definir suporte real a login por e-mail (ou lookup seguro caso mantenha `@username`), remover `DEMO_PROFILES` de produção e checar `is_suspended`. |
| 3. Logout | `src/components/layout/header.tsx`, `src/features/profile/profile-tabs.tsx`, `src/features/admin/components/admin-guard.tsx`, `src/app/login/page.tsx`, `src/app/register/page.tsx` | Sim | Não | **Simulado** (remove chave `localStorage`) | Chamar `await supabase.auth.signOut()`, limpar estado client-side e executar `router.refresh()`. |
| 4. Recuperação de senha | `src/app/forgot-password/page.tsx` | Sim | Não | **Simulado** (`setTimeout` + link direto `/reset-password?email=...`) | Chamar `supabase.auth.resetPasswordForEmail(email, { redirectTo })`, remover card de simulação de link direto e manter resposta anti-enumeração. |
| 5. Redefinição de senha | `src/app/reset-password/page.tsx` | Sim | Não | **Simulado** (`setTimeout`) | Validar sessão de recuperação (via `/auth/callback` / `exchangeCodeForSession` ou `verifyOtp`) e chamar `supabase.auth.updateUser({ password })`. |
| 6. Confirmação de e-mail | Nenhum | Não | Não | **Ausente** | Criar Route Handler `/auth/callback` (ou `/auth/confirm`) e página/estado de aviso para confirmação de e-mail após cadastro. |
| 7. Persistência de sessão | `src/features/auth/use-auth-store.ts`, `src/proxy.ts` | Parcial | Apenas em `src/proxy.ts` | **Simulado no frontend** (`localStorage`) | Substituir `localStorage` por `onAuthStateChange` + sessão inicial hidratada pelo servidor (`createClient()` em Server Components / Context Provider). |
| 8. Redirecionamento após login | `src/app/login/page.tsx`, `src/app/register/page.tsx` | Sim | Parcial | **Funciona no mock** (`getSafeRedirectTarget()` valida `next.startsWith("/") && !next.startsWith("//")`) | Preservar `getSafeRedirectTarget()` (reforçando contra `\\` e caracteres de controle) aliado a `router.refresh()` após `signInWithPassword`. |
| 9. Redirecionamento após logout | `src/components/layout/header.tsx`, etc. | Parcial | Não | **Incompleto** (apenas limpa `localStorage`, sem redirecionar de rotas privadas) | Redirecionar para `/` ou `/login` quando o usuário sair estando em rota privada e executar `router.refresh()`. |
| 10. Exibição do usuário autenticado | `src/components/layout/header.tsx`, `src/app/profile/page.tsx`, `src/app/admin/layout.tsx` | Sim | Não | **Simulado** (`useAuthStore`) | Carregar usuário (`auth.getUser()`) + perfil real de `public.profiles` no servidor e sincronizar com Provider/store no cliente. |
