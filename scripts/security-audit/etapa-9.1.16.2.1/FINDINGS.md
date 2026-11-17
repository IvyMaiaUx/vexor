# Etapa 9.1.16.2.1 — Consolidação de Achados da Auditoria

| ID | Severidade | Título | Situação | Referência |
| :--- | :--- | :--- | :--- | :--- |
| **AUD-01** | `BAIXO` | Comportamento da claim `amr` em `TOKEN_REFRESHED`, Custom Access Token Hooks e omissão defensiva de `exp` | Observação arquitetural | `AMR-CLAIM-ANALYSIS.md`, `TOKEN-REFRESH-ANALYSIS.md` |
| **AUD-02** | `MÉDIO` | Cobertura da UI React limitada a renderização estática SSR (`renderToStaticMarkup`), sem execução de `useEffect`, `onAuthStateChange` ou eventos de formulário | Ressalva aberta | `REACT-TEST-COVERAGE.md` |
| **AUD-03** | `INFORMATIVO` | Endpoint GoTrue `/user` permite `updateUser({ password })` direto para usuário já autenticado (comportamento padrão de self-service do Supabase Auth) | Documentado | `PASSWORD-UPDATE-BYPASS-ANALYSIS.md` |
| **AUD-04** | `INFORMATIVO` | Validação realizada apenas com mocks offline; `next build` não executado devido à restrição ambiental de ACL em `.next` | Restrição ambiental | `REGRESSION-RESULTS.md` |

---

## Detalhamento dos Achados

### `AUD-01` (`BAIXO`) — Ciclo de vida da claim `amr` e checagem defensiva de `exp`
- `validateRecoverySession()` em `src/features/auth/recovery-service.ts` suporta corretamente `AMREntry[]` e `string[]`, além de validar `claims.sub === user.id`.
- Entretanto:
  1. Caso um Custom Access Token Hook no Supabase sobrescreva `amr` durante `TOKEN_REFRESHED` (trocando `"recovery"` por `"token_refresh"`), a sessão de recuperação válida será invalidada durante um refresh.
  2. Uma sessão de recuperação não finalizada que ainda possua refresh token válido retém `amr: recovery` após `TOKEN_REFRESHED` até expirar ou sofrer logout/troca de senha.
  3. A verificação `typeof claims.exp === "number" ? claims.exp * 1000 > Date.now() : true` aceita tokens que omitam `exp` (em JWTs reais do GoTrue `exp` está sempre presente, mas rejeitar ausência de `exp` seria mais defensivo).

### `AUD-02` (`MÉDIO`) — Testes de UI React restritos a SSR estático
- `scripts/test-recovery-ui-etapa9-1-16-2.mjs` comprova que `AuthResetPasswordPage` oculta o formulário nos estados iniciais `"checking"` e `"invalid"` (`?error=recovery_link_invalid`), mas usa `ReactDOMServer.renderToStaticMarkup` porque `jsdom` e `@testing-library/react` não estão instalados no projeto.
- Por consequência, `useEffect`, `onAuthStateChange`, transições `"checking" -> "valid"`, submissão de formulário, guarda `isSubmitting` e atualização de sessão pós-troca de senha na UI não são exercitados em DOM real ou simulado.

### `AUD-03` (`INFORMATIVO`) — `updateUser({ password })` direto no SDK
- `updatePasswordWithSupabase()` bloqueia corretamente qualquer sessão sem `amr: recovery`.
- Chamadas diretas a `supabase.auth.updateUser({ password })` no console do navegador por um usuário já autenticado atingem o endpoint `/user` do GoTrue, que por padrão permite ao próprio usuário autenticado alterar sua senha (self-service), a menos que reautenticação/MFA seja exigida na configuração do Supabase Auth. Não há bypass não autenticado nem entre usuários distintos.

### `AUD-04` (`INFORMATIVO`) — Escopo de verificação offline e build `.next`
- As suítes executadas rodam com mocks offline (sem execução E2E contra instância real do Supabase Auth).
- Conforme regra da auditoria e restrição pré-existente de ACL no diretório `.next` no Windows, `next build` não foi executado nesta etapa.
