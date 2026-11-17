# Etapa 9.1.13 — Email Confirmation Implementation

- **Data:** 2026-11-13

## 1. Integração com `/auth/callback`

- `registerWithSupabase()` constrói `emailRedirectTo` como `${origin}/auth/callback?next=${encodeURIComponent(safeNext)}`, validando `nextPath` previamente via `getSafeRedirectPath()` (`src/lib/security/redirect.ts`).
- Ao clicar no link enviado pelo Supabase Auth, o usuário é direcionado para `GET /auth/callback` (`src/app/auth/callback/route.ts`), que executa `exchangeCodeForSession(code)` no servidor e redireciona apenas para destinos internos seguros (ou `/login?error=auth_callback_failed` em falha).

## 2. Comportamento da UI pós-cadastro

- Quando `signUp()` retorna `session: null` (ou `identities: []`), `src/app/register/page.tsx` **não** autentica o usuário automaticamente e exibe o painel de confirmação pendente orientando a verificar a **caixa de entrada** e a **pasta de spam/lixo eletrônico**.
- Caso o projeto Supabase esteja configurado sem confirmação obrigatória (`session !== null`), o usuário é redirecionado para `safeRedirectPath` com `router.refresh()`.

## 3. Procedimento manual futuro (quando autorizado)

Para testar o fluxo completo com e-mail real após autorização:
1. Confirmar no painel Supabase Auth que *Confirm email* está habilitado e que a URL de site / Redirect URLs incluem `http://localhost:3000/auth/callback` (ou domínio de produção).
2. Cadastrar um usuário de teste dedicado em `/register`, abrir o link recebido no e-mail e verificar a troca de sessão em `/auth/callback` e a linha criada em `public.profiles`.
