# VEXOR — ETAPA 9.1.6.1: PRIVILÉGIOS DE `INSERT` E TESTES VÁLIDOS EM `public.audit_logs`

**Banco isolado:** `vexor_audit_9161` (`127.0.0.1:5433`, PostgreSQL `18.6`).  
**Evidência:** `scripts/security-audit/etapa-9.1.6.1/TEST-EXECUTION-RESULTS.json`.

---

## 1. Estrutura Real de `public.audit_logs` (`information_schema.columns`)

1. `id` (`bigint`, `nullable=NO`)
2. `actor_id` (`uuid`, `nullable=YES`)
3. `action` (`text`, `nullable=NO`)
4. `entity_type` (`text`, `nullable=NO`)
5. `entity_id` (`uuid`, `nullable=YES`)
6. `metadata` (`jsonb`, `nullable=NO`)
7. `created_at` (`timestamp with time zone`, `nullable=NO`)

*(Nota: o teste anterior da Etapa 9.1.6 havia retornado `42703` por utilizar nomes incorretos `target_type`/`target_id`, não podendo servir como prova de bloqueio de `INSERT`.)*

---

## 2. Privilégios Efetivos Verificados em Catálogo

- **`has_table_privilege`:**
  - `anon`: `SELECT=false`, `INSERT=false`, `UPDATE=false`, `DELETE=false`.
  - `authenticated`: `SELECT=true`, `INSERT=false`, `UPDATE=false`, `DELETE=false`.
- **`information_schema.table_privileges`:** apenas `authenticated:SELECT`.
- **`pg_policies`:** apenas `audit_logs_select_admin` (`SELECT` para `authenticated`). Não existe política permissiva de `INSERT`, `UPDATE` ou `DELETE`.

---

## 3. Testes Válidos de `INSERT` Direto com Colunas Reais

| Papel / Contexto | Comando Executado (colunas reais) | SQLSTATE | Mensagem | Linhas Inseridas |
| :--- | :--- | :--- | :--- | :--- |
| `authenticated` (usuário comum `U_MEM`) | `INSERT INTO public.audit_logs (actor_id, action, entity_type, entity_id, metadata) VALUES (...)` | **`42501`** | `ERRO:  42501: permissão negada para tabela audit_logs` | `0` (`count_before=0`, `count_after=0`) |
| `anon` | `INSERT INTO public.audit_logs (actor_id, action, entity_type, entity_id, metadata) VALUES (...)` | **`42501`** | `ERRO:  42501: permissão negada para tabela audit_logs` | `0` (`count_before=0`, `count_after=0`) |

**Conclusão:** A ressalva do teste malformado da Etapa 9.1.6 está integralmente esclarecida e o bloqueio de `INSERT` direto para `anon` e `authenticated` está comprovado com `SQLSTATE 42501`.
