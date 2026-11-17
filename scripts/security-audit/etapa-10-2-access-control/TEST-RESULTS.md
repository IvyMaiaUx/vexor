# VEXOR — Etapa 10.2: Resultados de Testes

| Comando | Status | Observações |
| :--- | :--- | :--- |
| `node scripts/test-access-control-etapa10-2.mjs` | **PASSOU (exit 0)** | Cobre os 17 cenários + limpeza do rodapé + ausência do Simulador de Perfis em `/login` (`Simulador`, `MODO PRÉ-SUPABASE`, `sec_analyst_br`, `mod_sentinel`, `root_admin`, `suspended_user`). |
| `node scripts/test-login-etapa9-1-14.mjs` | **PASSOU (exit 0)** | Regressão completa de login real (`loginWithSupabase`), `GET /api/auth/session` e verificação de remoção de `DEMO_PROFILES` / `signInWithProfile` em `login/page.tsx` e `use-auth-store.ts`. |
| `node scripts/test-open-redirect-etapa-admin-01-1.mjs` | **PASSOU (exit 0)** | 38 vetores de Open Redirect bloqueados, 6 caminhos internos preservados, 9 casos de callback validados. |
| `node scripts/test-session-auth-etapa9-1-15.mjs` | **PASSOU (exit 0)** | Regressão completa de sessão, perfil, autorização, layouts server-side, `POST /api/auth/logout`, `SignOutErrorBanner` e preservação de rotas públicas/protegidas (atualizado Teste 16 para refletir `/catalog` e `/forum` protegidos na Etapa 10.2). |
| `npx tsc --noEmit` | **PASSOU (exit 0)** | Tipagem TypeScript sem erros em todo o projeto. |
| `npx eslint --config eslint.config.mjs src/lib/supabase/auth.ts src/proxy.ts src/components/layout/header.tsx src/components/layout/footer.tsx src/app/page.tsx` | **PASSOU (exit 0)** | Sem erros nem warnings de lint nos arquivos alterados. |
| `npx next build --webpack` | **BLOQUEADO POR AMBIENTE (EPERM)** | Falhou com `EPERM: operation not permitted, mkdir` dentro de `.next\server\app\...` no Windows (com `next start` local em execução sobre `.next`). |

> **Nota de Escopo:** Todos os testes desta etapa contra handlers de API e serviços de autenticação foram executados **offline com mocks isolados** de cliente Supabase; **não** foram executados testes remotos de RLS nem alterações no Supabase remoto.
