# Etapa 9.1.10 — Audit Logs Audit (Fase H)

- **Data:** 2026-11-13
- **Método:** Consulta read-only em `information_schema.columns`, `pg_constraint`, `pg_class.relacl`, `pg_policies`, `pg_trigger` e `pg_proc`.
- **Status:** `VERIFIED_REMOTE` (comportamento de escrita: `NOT_VERIFIED_WITHOUT_WRITE_TEST` nesta etapa)

## 1. Estrutura e Alternativa C

- **Colunas (7):** `id` (`bigint` PK), `actor_id` (`uuid`, nullable), `action` (`text`), `entity_type` (`text`), `entity_id` (`uuid`, nullable), `metadata` (`jsonb`), `created_at` (`timestamptz`).
- **Constraints:** exclusivamente `audit_logs_pkey` (`PRIMARY KEY (id)`).
- **FK `audit_logs_actor_id_fkey`:** **Ausente**, preservando a **Alternativa C** aprovada para manter o histórico de `actor_id` após eventual exclusão de conta.

## 2. Imutabilidade (Append-Only) e Privacidade

- **RLS:** habilitada (`relrowsecurity = true`).
- **Policy:** apenas `audit_logs_select_admin` (`SELECT` para `authenticated` quando `is_admin()`).
- **GRANTs (`relacl`):** `authenticated` possui exclusivamente `SELECT` (`r`); `anon` não possui nenhum privilégio.
- **Triggers de bloqueio:** `audit_logs_no_truncate` (`BEFORE TRUNCATE`) e `audit_logs_no_update_delete` (`BEFORE DELETE OR UPDATE`), ambos habilitados (`O`).
- **Função `write_audit_log`:** `SECURITY DEFINER`, `search_path = ""`, `EXECUTE` revogado de `PUBLIC`, `anon` e `authenticated` (acessível apenas internamente por `SECURITY DEFINER` e `service_role`), utilizando `auth.uid()` para registrar `actor_id`.
- **Contagem atual no remoto:** `0` registros.
