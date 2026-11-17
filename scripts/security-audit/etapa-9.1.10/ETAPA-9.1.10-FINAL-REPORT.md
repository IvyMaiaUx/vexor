# ETAPA 9.1.10 — RELATÓRIO FINAL DA AUDITORIA PÓS-DEPLOY

- **Data:** 2026-11-13
- **Projeto:** Vexor (`zcjudcbckcxwnfnrjfte`, `us-east-1`, PostgreSQL `17.11`)
- **Classificação Final:** **APROVADA COM RESSALVAS**

## Respostas objetivas às 13 questões obrigatórias

1. **As 12 tabelas estão estruturalmente corretas?**
   **Sim (`VERIFIED_REMOTE`).** Todas as 12 tabelas (`audit_logs`, `bookmarks`, `categories`, `notifications`, `posts`, `profiles`, `reports`, `resources`, `tags`, `topic_tags`, `topics`, `votes`), 9 ENUMs, colunas, constraints e índices conferem com as 4 migrations oficiais.
2. **Todas as RLS estão habilitadas conforme esperado?**
   **Sim (`VERIFIED_REMOTE`).** `pg_class.relrowsecurity = true` nas 12 tabelas de `public`, além de `storage.buckets` e `storage.objects`.
3. **As policies estão corretas?**
   **Sim (`VERIFIED_REMOTE` na definição em `pg_policies`).** Todas as expressões `USING` e `WITH CHECK` conferem com as migrations auditadas (`profiles` restrito ao próprio usuário ou moderador; `resources`/`topics`/`posts` respeitando status e autoria; `votes` bloqueando auto-voto; `bookmarks` e `notifications` restritos ao dono; `reports` restrito ao relator/moderador; `audit_logs` apenas `SELECT` para admin). A validação sob escrita real no remoto é `NOT_VERIFIED_WITHOUT_WRITE_TEST`.
4. **Os GRANTs e REVOKEs estão corretos?**
   **Sim (`VERIFIED_REMOTE`).** `anon` não tem acesso a `public.profiles` nem a `audit_logs`; `authenticated` tem `UPDATE`/`INSERT` restritos por coluna (`pg_attribute.attacl`), sem acesso de escrita a `role`, `is_suspended`, `is_locked`, `is_pinned` ou `audit_logs`.
5. **A view `public_profiles` está segura?**
   **Sim (`VERIFIED_REMOTE`).** Expõe apenas 10 colunas públicas, filtra `NOT is_suspended OR is_moderator()`, possui `security_invoker=false, security_barrier=true`, `owner=postgres` e `SELECT` apenas para `anon` e `authenticated`. O alerta `security_definer_view` do Advisor decorre dessa arquitetura intencional.
6. **As 15 funções/RPCs estão protegidas?**
   **Sim (`VERIFIED_REMOTE`).** Todas possuem `owner=postgres` e `search_path=""`. As 8 RPCs mutáveis (`admin_set_user_role`, `admin_set_user_suspension`, `moderate_resource`, `moderate_topic`, `moderate_post`, `resolve_report`, `resubmit_resource`, `set_accepted_post`) têm `EXECUTE` revogado de `PUBLIC`/`anon`, exigem `auth.uid()` e verificam `is_admin()`/`is_moderator()`/`is_active_member()`. `write_audit_log` está revogada de `PUBLIC`, `anon` e `authenticated`.
7. **Os triggers estão habilitados?**
   **Sim (`VERIFIED_REMOTE`).** Todos os 14 triggers de domínio (`on_auth_user_created` em `auth.users`, `audit_logs_no_truncate`, `audit_logs_no_update_delete`, `profiles_protect_last_admin_delete`, `categories_after_change`, `posts_after_insert`, `votes_after_change`, `resources_before_insert_slug`, `topic_tags_before_insert` e os `*_set_updated_at`) estão com `enabled_state = 'O'`.
8. **`audit_logs` permanece append-only?**
   **Sim (`VERIFIED_REMOTE` estruturalmente; `NOT_VERIFIED_WITHOUT_WRITE_TEST` em escrita remota).** Sem `audit_logs_actor_id_fkey` (Alternativa C preservada), `authenticated` só possui `SELECT`, sem policies de escrita, com triggers `BEFORE UPDATE OR DELETE` e `BEFORE TRUNCATE` habilitados, e `write_audit_log` restrita.
9. **O bucket `avatars` possui as restrições esperadas?**
   **Sim (`VERIFIED_REMOTE`).** Bucket `avatars` com `public = true`, `file_size_limit = 2097152` (2 MB), `allowed_mime_types = ["image/png", "image/jpeg", "image/webp"]` (SVG bloqueado) e policies de `INSERT`/`UPDATE`/`DELETE` restritas à pasta `auth.uid()` de membro ativo.
10. **A integração com Auth está estruturalmente correta?**
    **Sim (`VERIFIED_REMOTE`).** `profiles_id_fkey` referencia `auth.users(id) ON DELETE CASCADE` e o trigger `on_auth_user_created` (`handle_new_user()`) está habilitado em `auth.users`.
11. **Quais propriedades não puderam ser comprovadas?**
    Testes de execução que exigem escrita no remoto (`NOT_VERIFIED_WITHOUT_WRITE_TEST`): disparo efetivo de triggers em `INSERT`/`UPDATE`/`DELETE`/`TRUNCATE`, execução real de RPCs e upload real no bucket `avatars`.
12. **Existem vulnerabilidades ou pendências?**
    **Nenhuma vulnerabilidade crítica encontrada.** Apenas avisos esperados/não bloqueantes do Supabase Advisor (`security_definer_view` intencional em `public_profiles`, avisos de `SECURITY DEFINER` em RPCs/helpers autenticados, e recomendações de performance `INFO`/`WARN` para índices de FKs e múltiplas policies permissivas).
13. **O banco está pronto para iniciar a integração real?**
    **Sim**, do ponto de vista estrutural e de segurança de schema/RLS/GRANTs/Storage/Auth, mantendo o registro de que testes funcionais autenticados deverão ocorrer na etapa própria de integração.

## Artefatos produzidos

- [ENVIRONMENT-AUDIT.md](file:///c:/Users/Ivy%20Maia/Desktop/cybersec-community-platform/scripts/security-audit/etapa-9.1.10/ENVIRONMENT-AUDIT.md)
- [SCHEMA-AND-CONSTRAINTS-AUDIT.md](file:///c:/Users/Ivy%20Maia/Desktop/cybersec-community-platform/scripts/security-audit/etapa-9.1.10/SCHEMA-AND-CONSTRAINTS-AUDIT.md)
- [RLS-POLICIES-AUDIT.md](file:///c:/Users/Ivy%20Maia/Desktop/cybersec-community-platform/scripts/security-audit/etapa-9.1.10/RLS-POLICIES-AUDIT.md)
- [GRANTS-AND-PRIVILEGES-AUDIT.md](file:///c:/Users/Ivy%20Maia/Desktop/cybersec-community-platform/scripts/security-audit/etapa-9.1.10/GRANTS-AND-PRIVILEGES-AUDIT.md)
- [PUBLIC-PROFILES-VIEW-AUDIT.md](file:///c:/Users/Ivy%20Maia/Desktop/cybersec-community-platform/scripts/security-audit/etapa-9.1.10/PUBLIC-PROFILES-VIEW-AUDIT.md)
- [FUNCTIONS-AND-RPCS-AUDIT.md](file:///c:/Users/Ivy%20Maia/Desktop/cybersec-community-platform/scripts/security-audit/etapa-9.1.10/FUNCTIONS-AND-RPCS-AUDIT.md)
- [TRIGGERS-AUDIT.md](file:///c:/Users/Ivy%20Maia/Desktop/cybersec-community-platform/scripts/security-audit/etapa-9.1.10/TRIGGERS-AUDIT.md)
- [AUDIT-LOGS-AUDIT.md](file:///c:/Users/Ivy%20Maia/Desktop/cybersec-community-platform/scripts/security-audit/etapa-9.1.10/AUDIT-LOGS-AUDIT.md)
- [STORAGE-SECURITY-AUDIT.md](file:///c:/Users/Ivy%20Maia/Desktop/cybersec-community-platform/scripts/security-audit/etapa-9.1.10/STORAGE-SECURITY-AUDIT.md)
- [AUTH-INTEGRATION-AUDIT.md](file:///c:/Users/Ivy%20Maia/Desktop/cybersec-community-platform/scripts/security-audit/etapa-9.1.10/AUTH-INTEGRATION-AUDIT.md)
- [FINDINGS-AND-RECOMMENDATIONS.md](file:///c:/Users/Ivy%20Maia/Desktop/cybersec-community-platform/scripts/security-audit/etapa-9.1.10/FINDINGS-AND-RECOMMENDATIONS.md)
- [ETAPA-9.1.10-FINAL-REPORT.md](file:///c:/Users/Ivy%20Maia/Desktop/cybersec-community-platform/scripts/security-audit/etapa-9.1.10/ETAPA-9.1.10-FINAL-REPORT.md)
- [VALIDATION-RESULTS.json](file:///c:/Users/Ivy%20Maia/Desktop/cybersec-community-platform/scripts/security-audit/etapa-9.1.10/VALIDATION-RESULTS.json)
