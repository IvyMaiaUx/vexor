# PLANO DE TESTES — ETAPA 10.3.2 (FASE A)

## 1. Testes SQL Isolados (`run-isolated-pg-tests.sql`)
- **Bloco 1 (`AUD-02`):** Verificar bloqueio de `SELECT` (`42501`) para `anon` em `topics`, `posts` e `resources`.
- **Bloco 2 (`AUD-06`, `AUD-07`):** Validar rejeição de `title` `NULL`, `< 5` e `> 200` chars; validar aceitação nos limites `5` e `200`; validar paginação keyset `(created_at, id)` com 5 tópicos de timestamp idêntico em páginas de 2 (`2 + 2 + 1 = 5`, sem duplicação ou perda).
- **Bloco 3 (`AUD-03`):** Validar `topic_votes`, toggle UP/un-UP/UP sem rollback de notificação, consistência de `vote_count` e ausência de auto-notificação.
- **Bloco 4 (`AUD-01`, `AUD-05`):** Validar `is_dm_participant(uuid)` sem recursão `42P17`, isolamento de participante vs usuário externo vs sem sessão vs conversa inexistente, snapshot imutável `dm_report_snapshots` e bloqueio bilateral (`user_blocks`).
- **Bloco 5 (`AUD-04`, `AUD-08`, `AUD-10`):** Validar hierarquia de advertência (`moderator` não adverte `moderator`/`admin`), `dedupe_key`, revogação auditável e menções com limite de 10 e filtro de `user_blocks`.

## 2. Testes de Concorrência Paralela e Usuário Suspenso
- **DM simultânea:** Duas conexões `psql` paralelas (`22222222` <-> `33333333`) chamando `get_or_create_dm_conversation` ao mesmo tempo devem retornar o mesmo `conversation_id` sem erro de unicidade.
- **Votos simultâneos:** Duas conexões `psql` paralelas votando no mesmo tópico devem resultar em `topics.vote_count = count(topic_votes)` exato (`2|2`).
- **Usuário suspenso (`is_suspended = true`):** Bloqueado em `topic_votes` (`42501`) e em `get_or_create_dm_conversation`.

## 3. Regressões da Aplicação
- `npx tsc --noEmit`
- `npx eslint src --max-warnings=0`
- Scripts `Etapa 9.1`..`9.7` e `Etapa 10.2` em `scripts/test-*.mjs`.
