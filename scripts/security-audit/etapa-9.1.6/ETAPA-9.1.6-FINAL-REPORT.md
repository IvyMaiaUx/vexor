# VEXOR — ETAPA 9.1.6: RELATÓRIO FINAL DA CONSOLIDAÇÃO E PROPOSTA DE MIGRATION

**Classificação Final:** **APROVADA**  
**Recomendação:** Aprovar a proposta consolidada (`PROPOSED-SECURITY-MIGRATION.sql` e `PROPOSED-SECURITY-ROLLBACK.sql`) para futura etapa controlada de aplicação (não executada nesta etapa).

---

## 1. Resumo Executivo e Escopo

- **Todas as correções aprovadas consolidadas** em [PROPOSED-SECURITY-MIGRATION.sql](file:///c:/Users/Ivy%20Maia/Desktop/cybersec-community-platform/scripts/security-audit/etapa-9.1.6/PROPOSED-SECURITY-MIGRATION.sql):
  - **V1/V3:** `admin_set_user_role`, `admin_set_user_suspension`, `protect_last_admin_delete` e trigger `profiles_protect_last_admin_delete` com `pg_advisory_xact_lock(6216471958360507469)`.
  - **V4:** `moderate_resource`, `moderate_topic`, `moderate_post`, `resolve_report` com `FOR UPDATE` no alvo + revalidação pós-lock `FOR SHARE NOWAIT` em `public.profiles`.
  - **Revalidação complementar:** `resubmit_resource` e `set_accepted_post` com `FOR UPDATE` no alvo + `FOR SHARE NOWAIT` em `public.profiles` (`v_is_mod` calculado pós-lock).
  - **V2:** `REVOKE SELECT ON public.profiles FROM anon`, policy `profiles_select_own_or_mod` e view `public.public_profiles` (`security_invoker = false, security_barrier = true`, omitindo `role` e `is_suspended`).
  - **V5 (Alternativa C aprovada):** `DROP CONSTRAINT IF EXISTS audit_logs_actor_id_fkey`, preservando `actor_id` histórico e tabela 100% append-only.
- **Rollback completo** em [PROPOSED-SECURITY-ROLLBACK.sql](file:///c:/Users/Ivy%20Maia/Desktop/cybersec-community-platform/scripts/security-audit/etapa-9.1.6/PROPOSED-SECURITY-ROLLBACK.sql), restaurando as 8 RPCs originais, trigger, view, policy/grants e `audit_logs_actor_id_fkey` (`NOT VALID` quando houver registros históricos órfãos).
- **Supabase remoto não acessado;** `vexor_audit`, `supabase/migrations/`, `supabase/seed.sql` e `src/` permaneceram inalterados.

---

## 2. Resultados dos Testes em Ambiente Isolado (`vexor_audit_916`)

Extraído de `TEST-EXECUTION-RESULTS.json` e `ROLLBACK-EXECUTION-RESULTS.json`:
- **Idempotência da migration:** 1ª aplicação `exit_code = 0`; 2ª aplicação `exit_code = 0`.
- **Autorização (8.1):** `anon` e `member` bloqueados com `42501` em RPCs admin/mod; membros/moderadores/admins suspensos bloqueados com `42501`; moderador e admin ativos concluíram sem erro.
- **Privacidade (8.2):** `anon` bloqueado em `public.profiles` (`42501`); `anon` lê `5` perfis ativos em `public.public_profiles` (10 colunas, `exposes_role_or_suspended = false`); `member` vê apenas `1` linha em `public.profiles` e `moderator` vê `6`.
- **Último administrador (8.3):** auto-rebaixamento e auto-suspensão retornam `42501`; rebaixamento mútuo concorrente serializado (`Lock|advisory`) com `42501` na segunda sessão; `DELETE` direto em `public.profiles` e `ON DELETE CASCADE` via `auth.users` retornam `42501`, preservando o administrador ativo (`active_admin_preserved = true`).
- **Concorrência (8.4):** rebaixamento durante `moderate_topic`, suspensão durante `set_accepted_post`, e suspensão durante `resubmit_resource` bloqueados no lock (`Lock|transactionid`) e rejeitados pós-lock com `42501`; exclusão concorrente em `set_accepted_post` retornou `55P03`; duas sessões concorrentes em `set_accepted_post` serializaram sem erro.
- **`audit_logs` (8.5):** log criado por RPC autorizada preservado após `DELETE FROM auth.users` do ator (`logs_preserved_after_actor_delete = 1`), `LEFT JOIN` retornou `topic.accepted_post_changed|DELETED_USER`, chamada direta a `write_audit_log` bloqueada (`42501`), e `UPDATE`/`DELETE` bloqueados pelo trigger (`42501`). (Nota: a tentativa de `INSERT` direto de teste usou nomes de coluna legados `target_type`/`target_id`, retornando `42703`; a tabela continua sem política/privilégio de `INSERT` para `authenticated`.)
- **Rollback (8.6):** `exit_code = 0`; `triggers`, `policies`, `views` e `profile_privs` sem diferenças residuais frente ao baseline limpo; as 8 RPCs restauradas retornaram à definição original (diferença apenas de formatação/normalização em `md5(pg_get_functiondef)` por `CREATE OR REPLACE` com corpo em maiúsculas); registro histórico órfão preservado (`orphan_logs_preserved_after_rollback = 1`) com `audit_logs_actor_id_fkey|validated=false`.

---

## 3. Regressão Frontend e Qualidade

- `npx tsc --noEmit`: `exit_code = 0`
- `npm run lint`: `exit_code = 0` (`0` erros, `2` warnings pré-existentes em `scripts/security-audit/run-all-tests.mjs`)
- `npx next build --webpack`: `exit_code = 0` (`28/28` rotas geradas)

---

## 4. Riscos e Pendências Restantes

1. **Consultas futuras da UI em `audit_logs`:** devem usar `LEFT JOIN` com `public.profiles` / `public.public_profiles` para exibir eventos de atores excluídos (Alternativa C).
2. **Aplicação futura:** aguarda autorização explícita do responsável pelo projeto para mover/versionar a migration em `supabase/migrations/` e aplicá-la nos ambientes-alvo.
