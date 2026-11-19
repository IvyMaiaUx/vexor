# RELATÓRIO FINAL — ETAPA 10.3.2.2 (CORREÇÕES PÓS-AUDITORIA)

## 1. Classificação Final
**APROVADA COM RESSALVAS** — todas as correções (`AUD-SEC-01` a `AUD-SEC-05`), testes de concorrência, testes de imutabilidade e todas as 7 suítes de regressão passaram com exit code `0`. Permanece apenas a limitação ambiental documentada de validação runtime em PostgreSQL 18 (análise estática compatível com PG 17.11) e Realtime pendente para a Fase B.

## 2. Hashes SHA-256
- **Original preservado (`PROPOSED-SOCIAL-MIGRATION.sql`):** `35031D14AACE6B27E5568C0339266ABB9A1821C9C10B26D1E96642EA382E496B`
- **Revisão 2 (`PROPOSED-SOCIAL-MIGRATION-REVISION-2.sql`):** `D6976DA11FDCA907577CA5FE5161849FBE254C26CB5FC66502A86D901AB970F3`

## 3. Resumo das Correções e Evidências
- **`AUD-SEC-01`:** `reports.message_id` + `reports_dm_message_id_pair` + `reports_dedupe_direct_message_active` + checagem pré-snapshot em `report_direct_message`. Testado em concorrência paralela (`snapshots|reports = 1|1`, `23505` na duplicata, histórico pós-resolução preservado).
- **`AUD-SEC-02`:** Hierarquia `admin > moderator > member`, anti-auto-revogação e trava consistente em `issue_user_warning` e `revoke_user_warning`. Testado inclusive com rebaixamento concorrente pós-lock (`42501`).
- **`AUD-SEC-03`:** Filtro `status = 'published'` em `direct_messages_select` e RPC `mark_dm_conversation_read(uuid)` com erro uniforme `42501`.
- **`AUD-SEC-04`:** Índice parcial `direct_messages_sender_recent_idx` + lock por remetente em `send_direct_message`, comprovado com `EXPLAIN (ANALYZE, BUFFERS)` (`Index Only Scan`, `0.715 ms`) e rate limit `42901`.
- **`AUD-SEC-05`:** Nomenclatura documental alinhada, testes explícitos de `UPDATE`/`DELETE` em `reported_message_snapshots` (`42501`) e colisão `NOWAIT` (`55P03`) + retry pós-rollback.
- **Regressões:** `tsc`, `eslint` e todos os 7 scripts (`9.1`, `9.3`, `9.4`, `9.5`, `9.6`, `9.7-2a`, `10.2`) aprovados com exit `0`.

## 4. Garantia de Preservação e Parada Obrigatória
- `src/`: **intocado**
- `supabase/migrations/`: **intocado**
- `PROPOSED-SOCIAL-MIGRATION.sql`: **intocado**
- Supabase remoto (`zcjudcbckcxwnfnrjfte`): **intocado**

Aguardando autorização expressa antes de nova auditoria independente sobre a Revisão 2, promoção para `supabase/migrations/` ou início da Fase B.
