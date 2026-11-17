# Etapa 9.1.9 — RLS and Privileges Validation

- **Data:** 2026-11-13
- **Projeto:** Vexor (`zcjudcbckcxwnfnrjfte`)

## 1. Escopo e método de verificação

As migrations `20261110000003_rls_and_grants.sql` e `20261113143000_security_hardening.sql` — previamente auditadas e validadas em PostgreSQL isolado nas Etapas 9.1.6, 9.1.6.1 e 9.1.7 — foram aplicadas integralmente no banco remoto via `npx supabase db push --remote --yes` (`exit_code = 0`).

## 2. Evidências obtidas após a aplicação remota

- **View `public_profiles`:** Confirmada via `npx supabase gen types typescript --linked` em `src/types/database.types.ts` (linhas 727-765) sem colunas sensíveis (`role`, `is_suspended`, `updated_at`), e referenciada pelas relações públicas de `posts`, `resources`, `topics` e `votes`.
- **Tabela `audit_logs`:** Confirmada sem `audit_logs_actor_id_fkey` (`Relationships: []` em `src/types/database.types.ts`, linha 70).
- **RPCs de segurança e moderação:** Todas as 15 funções públicas (`admin_set_user_role`, `admin_set_user_suspension`, `moderate_post`, `moderate_resource`, `moderate_topic`, `resolve_report`, `resubmit_resource`, `set_accepted_post`, `write_audit_log`, etc.) constam no schema remoto exposto pelo `gen types typescript --linked`.

## 3. Limitação de verificação direta via SQL no ambiente remoto

Por ausência de cliente `psql` com acesso direto ao catálogo remoto ou Docker para `db dump` no ambiente atual:
- Não foi executada consulta SQL direta em `pg_policies`, `pg_class.relrowsecurity`, `pg_class.reloptions` (`security_invoker`, `security_barrier`) ou `has_table_privilege` / `has_function_privilege` no host remoto para verificar `REVOKE`/`GRANT` e imutabilidade de `audit_logs` diretamente nos catálogos remotos.
- Essas garantias permanecem respaldadas pela aplicação atômica sem erros (`exit_code = 0`) das migrations `20261110000003_rls_and_grants.sql` e `20261113143000_security_hardening.sql` com hashes SHA-256 verificados.
- Caso se deseje auditoria direta dos catálogos remotos (`pg_policies`, `pg_trigger`, `reloptions`, `information_schema.role_table_grants`), recomenda-se executar consulta read-only via SQL Editor do Supabase Dashboard ou cliente PostgreSQL autorizado em etapa posterior.
