# VEXOR — ETAPA 9.1.6.1: TESTES DA CHAVE ESTRANGEIRA `NOT VALID` NO ROLLBACK

**Artefato avaliado:** `scripts/security-audit/etapa-9.1.6/PROPOSED-SECURITY-ROLLBACK.sql`.  
**Evidência:** `scripts/security-audit/etapa-9.1.6.1/TEST-EXECUTION-RESULTS.json` (`rollback_and_not_valid_fk`).

---

## Resultados Verificados em `vexor_audit_9161`

1. **Estado da FK pós-rollback:** `audit_logs_actor_id_fkey|convalidated=false` (`NOT VALID` confirmado).
2. **Preservação de registros históricos órfãos:** `orphan_rows_preserved_after_rollback = 1` (nenhum registro histórico removido durante o rollback).
3. **Rejeição de novos `INSERT`s com referência inexistente:**
   - Executado `INSERT INTO public.audit_logs (actor_id, action, entity_type, entity_id, metadata) VALUES ('91619999-9999-9999-9999-999999999999', ...)` como superuser (contornando privilégios de tabela para testar diretamente a restrição FK).
   - Resultado: **`SQLSTATE 23503`** (`inserção ou atualização em tabela "audit_logs" viola restrição de chave estrangeira "audit_logs_actor_id_fkey"`).
4. **Comportamento em `UPDATE` tentando introduzir referência inválida:**
   - Executado `UPDATE public.audit_logs SET actor_id = '91619999-9999-9999-9999-999999999999' WHERE actor_id = U_ADM2`.
   - Resultado: bloqueado ainda na camada `BEFORE UPDATE` pelo trigger `audit_logs_no_update_delete` com **`SQLSTATE 42501`** (`audit_logs is append-only`), impedindo qualquer mutação em `audit_logs`.
