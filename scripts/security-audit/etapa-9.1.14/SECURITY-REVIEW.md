# ETAPA 9.1.14 — Security Review

- **Data:** 2026-11-13

## Controles Verificados

1. **Zero armazenamento de senha:** Nenhuma senha é salva em `localStorage`, `sessionStorage` ou cookies manuais.
2. **Ausência de chave privilegiada:** Nenhuma chave `service_role` existe no frontend; apenas variáveis públicas `NEXT_PUBLIC_*` são usadas pelo `createClient()`.
3. **Confiança exclusiva no servidor:** `role` e `is_suspended` vêm exclusivamente de `getAuthenticatedSessionContext()` (`getUser()` + `public.profiles`).
4. **Anti-enumeração:** Erros de credenciais inválidas ou conta não confirmada retornam mensagem genérica (`dict.auth.errors.invalidCredentials`) sem confirmar existência do e-mail.
5. **Prevenção de open redirect:** Todos os destinos `next` são validados por `getSafeRedirectPath()` (`src/lib/security/redirect.ts`).
6. **Bloqueio de conta suspensa:** Contas com `is_suspended = true` recebem `status: "suspended"` e não são redirecionadas a rotas protegidas.
7. **Sem fallback silencioso:** Falhas no Supabase Auth nunca autenticam perfis fictícios automaticamente.
8. **Escopo preservado:** Nenhuma alteração em recuperação de senha, MFA, migrations, RLS, `.env.local` ou Supabase remoto.
