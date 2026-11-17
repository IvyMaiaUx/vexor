# VEXOR — ETAPA 9.1.6.1: RELATÓRIO DE AUDITORIA INDEPENDENTE DA PROPOSTA DE MIGRATION

**Classificação Final:** **APROVADA**  
**Banco Temporário Utilizado:** `vexor_audit_9161` (`127.0.0.1:5433`, PostgreSQL `18.6`) — removido ao final (`REMAINING_DBS=vexor_audit`), cluster parado.  
**Restrições Respeitadas:** `PROPOSED-SECURITY-MIGRATION.sql`, `PROPOSED-SECURITY-ROLLBACK.sql`, `vexor_audit`, `supabase/migrations/`, `supabase/seed.sql`, `src/` e o Supabase remoto permaneceram intactos.

---

## 1. Esclarecimento da Ressalva de `audit_logs` (Prioridade Máxima)

- O teste anterior (`42703`) usou nomes de colunas inexistentes (`target_type`, `target_id`).
- Na Etapa 9.1.6.1, executaram-se testes válidos usando as colunas reais (`actor_id, action, entity_type, entity_id, metadata`):
  - `authenticated` (usuário comum): **`SQLSTATE 42501`** (`permissão negada para tabela audit_logs`), `0` linhas inseridas.
  - `anon`: **`SQLSTATE 42501`** (`permissão negada para tabela audit_logs`), `0` linhas inseridas.
  - `has_table_privilege`: `INSERT=false, UPDATE=false, DELETE=false` para `anon` e `authenticated`.
  - `has_function_privilege` em `public.write_audit_log`: `EXECUTE=false` para `public`, `anon` e `authenticated`.

## 2. Síntese dos Demais Eixos Auditados

- **Integridade de ator e `append-only`:** exclusão de `U_ADM2` preservou `1` registro histórico, `LEFT JOIN` retornou `topic.pin|DELETED_USER`, `UPDATE` e `DELETE` foram bloqueados com `SQLSTATE 42501`.
- **FK `NOT VALID` no rollback:** `audit_logs_actor_id_fkey|convalidated=false`, `1` registro órfão preservado, novo `INSERT` com ator inexistente rejeitado com **`SQLSTATE 23503`**, e `UPDATE` bloqueado pelo trigger `append-only` (**`SQLSTATE 42501`**).
- **Concorrência:** hierarquia de locks consistente sem inversão ou deadlock; `set_accepted_post` com moderador rebaixado durante lock retornou **`SQLSTATE 42501`**.
- **Rollback:** `exit_code = 0`, equivalência semântica confirmada para todas as 8 RPCs frente a `20261110000002_functions_triggers.sql`.
