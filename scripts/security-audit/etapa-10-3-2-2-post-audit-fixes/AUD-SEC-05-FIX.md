# CORREÇÃO AUD-SEC-05 — NOMENCLATURA E COBERTURA DE TESTES

## 1. Alinhamento de Nomenclatura Real do SQL
Os objetos reais em `PROPOSED-SOCIAL-MIGRATION.sql` e `PROPOSED-SOCIAL-MIGRATION-REVISION-2.sql` são:
- Votação em tópicos: tabela `public.topic_votes` + trigger `topic_votes_after_change` / função `public.on_topic_vote_changed()` (não `toggle_topic_vote`).
- Snapshots de DM denunciada: tabela `public.reported_message_snapshots` (não `dm_report_snapshots`).
- Menções: função `public.notify_mentions(text, uuid, uuid, uuid)` (não `notify_topic_mentions`).
- Bloqueio bilateral: checagem direta em `public.user_blocks` (não função separada `is_blocked_between`).

## 2. Novos Testes Runtime e de Concorrência Adicionados
Em [run-revision-2-tests.sql](file:///c:/Users/Ivy%20Maia/Desktop/cybersec-community-platform/scripts/security-audit/etapa-10-3-2-2-post-audit-fixes/run-revision-2-tests.sql) e na execução paralela em PostgreSQL 18:
- **Imutabilidade runtime com role de aplicação:** tentativas explícitas de `UPDATE` e `DELETE` em `reported_message_snapshots` como `authenticated` (`moderator`) rejeitadas com `42501` (`insufficient_privilege`).
- **Colisão `NOWAIT` controlada (`55P03`):** transação 1 mantém `FOR UPDATE` em `direct_conversations`; transação 2 chama `send_direct_message` e captura `lock_not_available` (`55P03`); após `ROLLBACK` da transação 1, nova chamada a `send_direct_message` executa e conclui com `COMMIT`.
- **Diferenciação explícita:**
  - *Testes runtime SQL:* blocos `DO` em `run-revision-2-tests.sql` e `run-isolated-pg-tests.sql` sob roles `anon`/`authenticated`.
  - *Testes de concorrência:* jobs `psql` paralelos em conexões TCP independentes (`report_direct_message`, `55P03`, rebaixamento concorrente).
  - *Testes de integração/mock:* `scripts/test-*.mjs` (`9.1`, `9.3`–`9.7-2a`, `10.2`).
  - *Análise estática:* verificação PG 17.11, `tsc --noEmit` e `eslint`.
