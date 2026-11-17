# Etapa 9.1.16.2.2 — Cobertura dos Testes de Segurança (`AUD-01`)

**Arquivo atualizado:** `scripts/test-password-recovery-etapa9-1-16.mjs`  
**Tipo real dos testes:** Testes unitários e de integração com **mocks offline** de `authClient` e `NextRequest` (e testes de renderização SSR estática em `scripts/test-recovery-ui-etapa9-1-16-2.mjs`). **Não são testes E2E contra instância real do Supabase.**

---

## 1. Matriz de Casos Cobertos

### 1.1 Validação de `exp` (`isValidFutureExpClaim` e `validateRecoverySession`)
- `exp` válido no futuro (`fixedNowSec + 1`, `fixedNowSec + 60`) → **aceito (`"valid"`)**
- `exp` ausente (propriedade omitida) → **rejeitado (`"invalid"`)**
- `exp` `undefined` → **rejeitado (`"invalid"`)**
- `exp` `null` → **rejeitado (`"invalid"`)**
- `exp` string numérica (`String(fixedNowSec + 300)`) → **rejeitado (`"invalid"`)**
- `exp` string inválida (`"invalid-date"`) → **rejeitado (`"invalid"`)**
- `exp` zero (`0`) → **rejeitado (`"invalid"`)**
- `exp` negativo (`-3600`, `-100`) → **rejeitado (`"invalid"`)**
- `exp` decimal (`fixedNowSec + 60.25`, `fixedNowSec + 60.5`) → **rejeitado (`"invalid"`)**
- `exp` `NaN` → **rejeitado (`"invalid"`)**
- `exp` infinito (`Infinity`, `-Infinity`) → **rejeitado (`"invalid"`)**
- `exp` expirado (`fixedNowSec - 1`, `pastExp`) → **rejeitado (`"invalid"`)**
- `exp` exatamente igual ao instante atual (`fixedNowSec` com `nowMs = fixedNowSec * 1000`) → **rejeitado (`"invalid"`)**

### 1.2 Validação de `amr` (`hasRecoveryAmrClaim` e `validateRecoverySession`)
- `amr: [{ method: "recovery" }]` → **aceito**
- `amr: ["recovery"]` → **aceito**
- `amr: [{ method: "password" }]` → **rejeitado**
- `amr: ["password"]` → **rejeitado**
- `amr` ausente (`{ sub, exp }`) → **rejeitado**
- `amr` vazio (`[]`) → **rejeitado**
- `amr` em formato inválido (`"recovery"`, `[null, { method: 123 }]`, `["my-recovery-fake"]`) → **rejeitado**
- `amr` misto (`[{ method: "password" }, { method: "recovery" }]` e `["password", "recovery"]`) → **aceito**
- `amr` após renovação simulada com claim preservada → **permanece `"valid"`**
- `amr` após renovação simulada sem claim de recovery (`[{ method: "token_refresh" }]`) → **rejeitado (`"invalid"`)**

### 1.3 Identidade e Tratamento de Erros
- `sub` igual ao usuário → **aceito**
- `sub` divergente (`"u2"` vs `"u1"`) → **rejeitado (`"invalid"`)**
- `sub` ausente ou string vazia (`""`) → **rejeitado (`"invalid"`)**
- Usuário ausente (`user: null`) → **rejeitado (`"invalid"`)**
- Erro ao obter `claims` (`401 bad_jwt`) → **rejeitado (`"invalid"`)**
- Erro ao obter `user` (`401 session_not_found`) → **rejeitado (`"invalid"`)**
- Erro de rede ao obter `user` / `claims` → **retorna `"network_error"`** (sem conceder acesso)
