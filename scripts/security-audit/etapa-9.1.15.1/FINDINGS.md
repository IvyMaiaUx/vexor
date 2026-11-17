# ETAPA 9.1.15.1 — FINDINGS (ACHADOS DE AUDITORIA)

| ID | Severidade | Arquivo / Localização | Impede Aprovação? |
| :--- | :--- | :--- | :---: |
| `FINDING-01` | Média | `src/app/cybercrime-research/` e `src/proxy.ts` | Não (etapa focada em sessão/perfil/admin; recomendado reforço futuro) |
| `FINDING-02` | Baixa | `src/app/admin/layout.tsx` | Não |
| `FINDING-03` | Informativa | `src/features/admin/services/admin-service.ts` | Não |
| `FINDING-04` | Baixa | `src/features/auth/use-auth-store.ts` (`signOut`) | Não |
| `FINDING-05` | Baixa / Informativa | `scripts/test-session-auth-etapa9-1-15.mjs` | Não |
| `FINDING-06` | Ambiental (Pendente) | `.next` / `npx next build --webpack` | **Sim para aprovação definitiva do build** |

---

## Detalhamento

### `FINDING-01` — Rotas `/cybercrime-research/*` protegidas apenas no cliente
- **Severidade:** Média
- **Arquivo:** `src/features/cybercrime-research/components/research-access-guard.tsx`, `src/proxy.ts`
- **Descrição técnica:** Embora `/admin/*` possua proteção server-side (`proxy.ts` + Server Component layouts), `/cybercrime-research/*` ainda depende apenas de `ResearchAccessGuard` no cliente (`useAuthStore`).
- **Impacto:** O shell HTML/JSX da página pode ser servido a um visitante anônimo (embora dados reais no Supabase continuem protegidos por RLS).
- **Recomendação:** Adicionar proteção server-side equivalente em `proxy.ts` ou Server Component layout de `/cybercrime-research` quando a integração backend dessa área for concluída.
- **Impede aprovação da 9.1.15?** Não.

### `FINDING-02` — Redirect fixo `?next=%2Fadmin` no `AdminLayout`
- **Severidade:** Baixa
- **Arquivo:** `src/app/admin/layout.tsx`
- **Descrição técnica:** `AdminLayout` redireciona para `/login?next=%2Fadmin` caso `proxy.ts` não tenha interceptado antes (ex.: sub-rotas como `/admin/moderation`).
- **Impacto:** Segurança preservada (acesso bloqueado no servidor); perda apenas do sub-caminho no parâmetro `next` nesse fallback.
- **Recomendação:** Manter `proxy.ts` como primeira barreira (que preserva o `pathname` exato).
- **Impede aprovação da 9.1.15?** Não.

### `FINDING-03` — Serviços administrativos ainda em mock sem rotas/Server Actions reais
- **Severidade:** Informativa
- **Arquivo:** `src/features/admin/services/admin-service.ts`
- **Descrição técnica:** Busca em `src/` confirmou ausência de Server Actions (`"use server"`) e de rotas `/api/admin/*`. As mutações administrativas atuais ainda operam em memória/mock.
- **Recomendação:** Toda futura API ou Server Action administrativa deve invocar `requireServerAuthorization("moderator" | "admin")`.
- **Impede aprovação da 9.1.15?** Não.

### `FINDING-04` — `signOut()` em `useAuthStore` é fire-and-forget sem aviso visual em erro de rede
- **Severidade:** Baixa
- **Arquivo:** `src/features/auth/use-auth-store.ts`, `src/features/auth/session-sync.ts`
- **Descrição técnica:** `signOut()` chama `void performConsistentSignOut(...)` e limpa `localStorage` imediatamente; se `POST /api/auth/logout` e `supabase.auth.signOut()` falharem simultaneamente por queda de rede, o usuário aparece deslogado localmente, mas cookies SSR podem persistir até expiração.
- **Recomendação:** Expor estado opcional de erro/retentativa ou redirecionar após `await performConsistentSignOut()` quando apropriado.
- **Impede aprovação da 9.1.15?** Não.

### `FINDING-05` — Lacunas parciais de cobertura em `test-session-auth-etapa9-1-15.mjs`
- **Severidade:** Baixa / Informativa
- **Arquivo:** `scripts/test-session-auth-etapa9-1-15.mjs`
- **Descrição técnica:** Testes 12 e 14 usam asserções regex sobre `logout/route.ts` e `admin/layout.tsx`; `AuthSessionSync` não possui teste DOM/React automatizado; não há teste ao vivo no Supabase remoto.
- **Recomendação:** Adicionar testes de invocação direta dos handlers/layouts e testes de componente para `AuthSessionSync` + validação manual ao vivo em ambiente staging/local fora do sandbox.
- **Impede aprovação da 9.1.15?** Não.

### `FINDING-06` — `EPERM: operation not permitted, mkdir` no diretório `.next` durante `next build`
- **Severidade:** Ambiental (Pendência de Build)
- **Arquivo/Diretório:** `.next`
- **Evidência reproduzível:** `Get-Acl .next` mostra `DESKTOP-G3BH48T\CodexSandboxUsers` com apenas `ReadAndExecute, Synchronize` (sem `Write`), causando `EPERM` em `mkdir` durante o build no sandbox Windows.
- **Impede aprovação definitiva?** **Impede aprovação definitiva sem ressalvas** até que `npx next build --webpack` seja executado com `exit code 0` fora do sandbox restrito.
