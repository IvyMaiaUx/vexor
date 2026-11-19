# CORREÇÃO AUD-SEC-02 — HIERARQUIA DE MODERAÇÃO E CONCORRÊNCIA

## Problema Original
`issue_user_warning` e `revoke_user_warning` bloqueavam apenas `moderator` contra `admin`, permitindo que um moderador advertisse ou revogasse outro moderador, e `revoke_user_warning` não bloqueava auto-revogação nem travava `profiles` do alvo.

## Correção Aplicada em `PROPOSED-SOCIAL-MIGRATION-REVISION-2.sql`
1. **Ordem de locks compatível com `20261113143000_security_hardening.sql`:**
   - `pg_advisory_xact_lock(6216471958360507469)`
   - Lock do perfil chamador (`FOR SHARE NOWAIT`) + revalidação de `role` e `not is_suspended`
   - Lock do alvo (`FOR UPDATE NOWAIT` em `profiles` para `issue_user_warning`; `FOR UPDATE OF w NOWAIT` em `user_warnings` seguido de `FOR SHARE NOWAIT` em `profiles` para `revoke_user_warning`)
2. **Hierarquia `admin > moderator > member`:**
   - Em ambas as funções: `if v_target_role in ('admin', 'moderator') and v_caller_role <> 'admin' then raise exception ... using errcode = '42501'; end if;`
3. **Anti-auto-revogação e validação de report:**
   - `revoke_user_warning` bloqueia `v_target_id = v_caller_id` (`42501`).
   - `issue_user_warning` valida existência de `p_report_id` quando informado (`FOR SHARE NOWAIT`, `P0002` se ausente).
