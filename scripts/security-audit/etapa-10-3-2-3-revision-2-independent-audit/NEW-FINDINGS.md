# NOVOS ACHADOS DA AUDITORIA — ETAPA 10.3.2.3

## Resumo
- **CRITICAL:** 0
- **HIGH:** 0
- **MEDIUM:** 1 (`AUD-REV2-01`)
- **LOW:** 1 (`AUD-REV2-02`)
- **INFORMATIONAL:** 2 (`AUD-REV2-03`, `AUD-REV2-04`)

---

### 1. `AUD-REV2-01` — Lock-upgrade deadlock (`40P01`) em `send_direct_message`
- **Gravidade:** `MEDIUM` (Defeito de concorrência confirmado)
- **Arquivo / Linha:** `PROPOSED-SOCIAL-MIGRATION-REVISION-2.sql`, linhas `717` e `759` (`public.send_direct_message`).
- **Objeto SQL:** `public.send_direct_message(uuid, text)` / `public.direct_conversations`.
- **Cenário de exploração/falha:** Dois participantes da mesma conversa enviam mensagens simultaneamente. Ambos adquirem `FOR SHARE NOWAIT` na mesma linha de `direct_conversations` (L717, compatível entre si) e em seguida ambos executam `UPDATE public.direct_conversations SET last_message_at = now()` (L759), exigindo upgrade para `FOR NO KEY UPDATE` e causando deadlock `40P01`.
- **Impacto:** Aborto esporádico de uma das transações com SQLSTATE `40P01` em conversas ativas com troca simultânea de mensagens (sem corrupção de dados nem escalada de privilégio).
- **Evidência reproduzível:** Reproduzido em `vexor_etapa10_3_2_3` (`ERRO: impasse detectado`, `Processo 15368 espera por ShareLock em transação 7862; bloqueado pelo processo 21472`).
- **Correção recomendada:** Alterar `FOR SHARE NOWAIT` na linha `717` para `FOR NO KEY UPDATE NOWAIT` (ou `FOR UPDATE NOWAIT`), serializando atualizações de `last_message_at` na mesma conversa sem upgrade de lock.
- **Teste de validação:** Executar 2 conexões paralelas chamando `send_direct_message` na mesma `conversation_id` simultaneamente; nenhuma deve sofrer `40P01`.

### 2. `AUD-REV2-02` — `report_direct_message` não verifica `dm.status = 'published'`
- **Gravidade:** `LOW` (Melhoria recomendada)
- **Arquivo / Linha:** `PROPOSED-SOCIAL-MIGRATION-REVISION-2.sql`, linhas `802–806`.
- **Correção recomendada:** Validar `dm.status = 'published'::public.content_status` (ou permitir apenas mensagens não removidas) antes de criar snapshot.

### 3. `AUD-REV2-03` — Validação runtime pendente em PostgreSQL 17.11
- **Gravidade:** `INFORMATIONAL` (Limitação ambiental)
- **Detalhes:** Compatibilidade confirmada estaticamente; ambiente local possui apenas PostgreSQL 18.

### 4. `AUD-REV2-04` — Mapeamento de `23505` em `report_direct_message` na Fase B
- **Gravidade:** `INFORMATIONAL` (Requisito de integração)
- **Detalhes:** Garantir tradução de `23505` para HTTP `409 Conflict` em `report-service.ts`.
