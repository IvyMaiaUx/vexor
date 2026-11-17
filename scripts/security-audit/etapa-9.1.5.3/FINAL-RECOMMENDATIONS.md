# VEXOR — ETAPA 9.1.5.3: RECOMENDAÇÕES FINAIS

Antes de iniciar o planejamento e redação da migration corretiva definitiva, recomenda-se:

1. **Aprovar formalmente a Alternativa C para `public.audit_logs`:** confirmar que `actor_id` permanecerá sem chave estrangeira (`audit_logs_actor_id_fkey` removida), mantendo `audit_logs` 100% append-only e garantindo que consultas na aplicação que exibam autor de auditoria utilizem `LEFT JOIN` com `public.profiles` / `public.public_profiles`.
2. **Incorporar `PROPOSED-SECURITY-BARRIER.sql` e `PROPOSED-RPC-REVALIDATION.sql` na especificação da migration definitiva:** ambos foram validados no ambiente isolado `vexor_audit_9153`, corrigindo a proteção contra predicate pushdown em `public_profiles` (`security_barrier = true`, `security_invoker = false`) e a revalidação pós-lock em `set_accepted_post` e `resubmit_resource` (`FOR SHARE NOWAIT`).
3. **Completar o script de rollback da futura migration definitiva:** incluir a restauração original de `public.set_accepted_post` e `public.resubmit_resource` além das 6 RPCs já cobertas por `PROPOSED-ROLLBACK-COMPLETE.sql`.
4. **Manter a honestidade técnica na documentação dos casos `T02`/`T04`:** registrar que a proteção contra auto-remoção do último admin ocorre via guarda explícita de auto-rebaixamento/auto-suspensão (`42501: admins cannot demote/suspend themselves`) nas RPCs, enquanto `v_other_admin = 0` é alcançado diretamente pelo trigger `BEFORE DELETE` (`profiles_protect_last_admin_delete` -> `42501: cannot delete the last active admin`).
5. **Preservar os ambientes e evidências atuais até a próxima etapa autorizada:** não alterar `vexor_audit`, `supabase/migrations/`, `supabase/seed.sql` nem acessar o Supabase remoto até autorização explícita do responsável pelo projeto.
