# VEXOR — ETAPA 9.1.6: REVISÃO GLOBAL DE SEGURANÇA DA MIGRATION

Revisão cruzada dos 10 critérios de segurança sobre `PROPOSED-SECURITY-MIGRATION.sql` em conjunto com as migrations originais (`01`, `02`, `03`):

1. **`SECURITY DEFINER` e `search_path`:** todas as 9 funções alteradas/criadas (`admin_set_user_role`, `admin_set_user_suspension`, `protect_last_admin_delete`, `moderate_resource`, `moderate_topic`, `moderate_post`, `resolve_report`, `resubmit_resource`, `set_accepted_post`) utilizam `SECURITY DEFINER` com `SET search_path = ''` e referências totalmente qualificadas (`public.*`, `auth.uid()`).
2. **Eliminação de validação pré-lock exclusiva:** todas as RPCs privilegiadas agora revalidam `role` e/ou `is_suspended` após a aquisição dos locks necessários (`pg_advisory_xact_lock` e/ou `FOR UPDATE` no alvo).
3. **Caminhos alternativos contra o último administrador:** cobertos por `admin_set_user_role` (rebaixamento), `admin_set_user_suspension` (suspensão), e `profiles_protect_last_admin_delete` (exclusão direta em `public.profiles` e exclusão indireta via `ON DELETE CASCADE` a partir de `auth.users`).
4. **Coerência de triggers e cascatas:** `on_auth_user_created` e `profiles_protect_last_admin_delete` operam em conjunto com `ON DELETE CASCADE`; `audit_logs_no_update_delete` e `audit_logs_no_truncate` permanecem intactos.
5. **Grants e revokes explícitos:** todas as 8 RPCs têm `REVOKE ALL ... FROM PUBLIC, anon; GRANT EXECUTE ... TO authenticated;`; `protect_last_admin_delete()` e `write_audit_log(...)` permanecem revogadas de `PUBLIC, anon, authenticated`.
6. **Policies RLS:** `profiles_select_public` removida; `profiles_select_own_or_mod` restringe leitura direta da tabela base `public.profiles` ao próprio usuário ou moderadores/admins ativos.
7. **Views sem colunas privadas:** `public.public_profiles` projeta apenas 10 colunas públicas (excluindo `role` e `is_suspended`) com `security_invoker = false` e `security_barrier = true`.
8. **Auditoria sem falsificação de identidade:** `write_audit_log` lê exclusivamente `auth.uid()` e não aceita `actor_id` por parâmetro; clientes não possuem `INSERT` direto em `audit_logs`.
9. **Consistência `anon` / `authenticated` / `service_role`:** `anon` lê apenas `public.public_profiles` (perfis não suspensos) e recebe `42501` em `public.profiles` e nas RPCs privilegiadas; `authenticated` respeita RLS e RPCs com revalidação pós-lock.
10. **Compatibilidade funcional:** `tsc --noEmit`, `npm run lint` e `npx next build --webpack` executados para verificar ausência de regressão na aplicação.
