# Etapa 9.1.16.2.2 — Validação Estrita de `exp` (`AUD-01A`)

**Arquivo:** `src/features/auth/recovery-service.ts`  
**Funções:** `isValidFutureExpClaim(exp, nowMs)` e `validateRecoverySession(authClient, options)`

---

## 1. Problema Anterior

Na implementação anterior, `validateRecoverySession()` verificava:
```ts
if (typeof claims.exp === "number" && claims.exp * 1000 <= Date.now()) {
  return "invalid";
}
```
Caso `claims.exp` estivesse ausente (`undefined`), `null`, ou em formato não numérico, a condição `typeof claims.exp === "number"` avaliava para `false` e a validação **não rejeitava** o token por expiração. Além disso, não havia rejeição explícita para decimais, `NaN`, `Infinity`, `0` ou negativos antes da multiplicação.

---

## 2. Solução Implementada (*Fail-Closed*)

A função `isValidFutureExpClaim(exp: unknown, nowMs: number = Date.now())` aplica as seguintes regras sem coerção implícita (`Number()` não é utilizado):

1. `typeof exp !== "number"` → **rejeita** (`undefined`, `null`, `"1750000060"`, `"invalid"`, objetos, booleanos).
2. `!Number.isFinite(exp)` → **rejeita** (`NaN`, `Infinity`, `-Infinity`).
3. `!Number.isInteger(exp) || exp <= 0` → **rejeita** (`0`, negativos, decimais como `1750000060.5`).
4. `!Number.isFinite(nowMs)` ou `!Number.isFinite(exp * 1000)` → **rejeita**.
5. `exp * 1000 > nowMs` → **exige instante estritamente futuro** (se `exp * 1000 === nowMs`, **rejeita**).

### Relógio e Testabilidade
- Em produção, utiliza `Date.now()` (em milissegundos), comparado contra `exp * 1000` (já que a claim JWT `exp` é expressa em segundos Unix).
- Em testes determinísticos, `validateRecoverySession(authClient, { nowMs })` aceita `nowMs` opcional para testar exatamente a fronteira `exp * 1000 === nowMs` sem depender de `sleep` nem flakiness temporal.
- Nenhuma margem de tolerância (*clock skew*) foi adicionada, mantendo a política *fail-closed* estrita.

---

## 3. Validação Complementar de Identidade (`sub`)

Também foi corrigido o comportamento permissivo caso `claims.sub` estivesse ausente:
```ts
if (typeof claims.sub !== "string" || !claims.sub || claims.sub !== userData.user.id) {
  return "invalid";
}
```

---

## 4. Origem da Evidência

- **Comprovado por código:** `src/features/auth/recovery-service.ts` (`isValidFutureExpClaim` e `validateRecoverySession`).
- **Comprovado por testes automatizados (mocks offline):** `scripts/test-password-recovery-etapa9-1-16.mjs` (seções `3i` e `3k`).
