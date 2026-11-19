# RELATÓRIO FINAL — ETAPA 10.3.2.4 (CRIAÇÃO DA REVISÃO 3 EXPERIMENTAL)

## 1. Classificação Final
**APROVADA COM RESSALVAS** — `AUD-REV2-01` (`MEDIUM`) e `AUD-REV2-02` (`LOW`) corrigidos na Revisão 3, 200/200 mensagens concorrentes persistidas com 0 deadlocks `40P01`, e todas as regressões aprovadas com exit code `0`. Permanece apenas a limitação ambiental de PostgreSQL 17.11 (validado estaticamente; testes runtime em PG 18 local) e Realtime pendente para a Fase B.

## 2. Hashes SHA-256
- **Revisão 2 preservada:** `D6976DA11FDCA907577CA5FE5161849FBE254C26CB5FC66502A86D901AB970F3`
- **Revisão 3 (`PROPOSED-SOCIAL-MIGRATION-REVISION-3.sql`):** `B6D625AB6284F48886F030D96AA0142A54380A92D0EA039433724AB8BCC59FBE`

## 3. Resumo das Correções e Evidências
- **`AUD-REV2-01` (Deadlock em `send_direct_message`):**
  - *Antes:* `FOR SHARE NOWAIT` + `UPDATE direct_conversations` gerava deadlock `40P01` (reproduzido na Etapa 10.3.2.3).
  - *Depois:* `FOR NO KEY UPDATE` + `greatest(last_message_at, now())`.
  - *Teste de 100 execuções concorrentes (2 conexões `psql` paralelas):* **`200/200` mensagens persistidas**, **`0` deadlocks `40P01`**, `last_message_at_consistent = t`.
- **`AUD-REV2-02` (Denúncia de DMs):**
  - Adicionado filtro `dm.status = 'published'::public.content_status` em `report_direct_message`, retornando `P0002` uniforme para `hidden`/`deleted`/inexistente e `42501` para externo/suspenso, sem snapshots órfãos.
- **Regressões:** `tsc`, `eslint` e todos os 7 scripts `test-*.mjs` passaram (`exit 0`).

## 4. Garantia de Preservação e Parada Obrigatória
- `src/`, `supabase/migrations/`, `PROPOSED-SOCIAL-MIGRATION.sql`, `PROPOSED-SOCIAL-MIGRATION-REVISION-2.sql` e Supabase remoto (`zcjudcbckcxwnfnrjfte`) permaneceram **intocados**.
- Banco temporário `vexor_etapa10_3_2_4` removido e cluster `.pg_test_cluster` encerrado.
- Aguardando autorização expressa antes de qualquer auditoria final, promoção para `supabase/migrations/` ou início da Fase B.
