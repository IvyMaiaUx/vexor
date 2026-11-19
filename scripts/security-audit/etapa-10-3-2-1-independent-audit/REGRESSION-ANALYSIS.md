# ANÁLISE DAS REGRESSÕES — ETAPA 10.3.2.1

## 1. `scripts/test-supabase-infra-etapa9-1.mjs` (Exit 1)
- **Sintoma:** Falha no passo `[7/7]` (`scripts/test-supabase-infra-etapa9-1.mjs:102`): `Exatamente 3 migrações existentes (encontrado: 5)`.
- **Classificação:** **Teste desatualizado.**
- **Justificativa técnica:** O script verifica `fs.readdirSync("supabase/migrations").length === 3`, regra válida apenas na Etapa 9.1. Posteriormente foram adicionadas `20261113143000_security_hardening.sql` e `20261116114600_research_submissions.sql`. As 3 migrations originais permanecem preservadas (checks `[1/7]`..`[6/7]` e nomes `files[0..2]` passaram).
- **Correção adequada (não aplicada nesta etapa):** Atualizar a lista esperada de migrations oficiais para `>= 3` com verificação nominal das migrations imutáveis.

## 2. `scripts/test-research-backend-etapa9-7-2a.mjs` (Exit 1)
- **Sintoma:** Falha no check `07` (`scripts/test-research-backend-etapa9-7-2a.mjs:239`): `Expected values to be strictly equal: 500 !== 200`.
- **Classificação:** **Teste desatualizado (NÃO é dependência do Supabase remoto).**
- **Justificativa técnica:** O relatório da Fase A (`REGRESSION-RESULTS.md`) atribuiu incorretamente esta falha à migration pendente no Supabase remoto. Pela inspeção direta de `test-research-backend-etapa9-7-2a.mjs:80-125` e `236-243`, o teste utiliza `createMockSupabase` (mock local em memória, sem rede), cuja implementação de `from(table)` exige `assert.equal(table, "profiles")` e espera `res.body.isTestMockData === true`. Como os handlers de Research evoluíram na Fase 2B2 para consultar `sb.from("research_submissions")`, o `assert.equal(table, "profiles")` lança `AssertionError`, capturado pelo handler e retornado como HTTP `500`.
- **Correção adequada (não aplicada nesta etapa):** Atualizar o mock de `test-research-backend-etapa9-7-2a.mjs` (ou aposentá-lo em favor da suíte `test-research-integration-etapa9-7-2b2.mjs`).

## 3. Demais Verificações
- `npx tsc --noEmit`: **PASS (exit 0)**
- `npx eslint src --max-warnings=0`: **PASS (exit 0)**
- `test-catalog-integration-etapa9-3.mjs`, `test-forum-integration-etapa9-4.mjs`, `test-notifications-reports-etapa9-5.mjs`, `test-admin-supabase-etapa9-6.mjs`, `test-access-control-etapa10-2.mjs`: **PASS (exit 0)**.
