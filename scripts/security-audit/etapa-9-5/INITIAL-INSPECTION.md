# VEXOR — Etapa 9.5: Inspeção Inicial de Notificações e Denúncias

## 1. Arquivos Inspecionados

- **Migrations:**
  - `supabase/migrations/20261110000001_schema.sql` (`notifications`, `reports`, enums `notification_type`, `report_reason`, `report_status`, constraints e índices únicos de deduplicação)
  - `supabase/migrations/20261110000002_functions_triggers.sql` (`on_post_created`, `moderate_resource`, `set_accepted_post`)
  - `supabase/migrations/20261110000003_rls_and_grants.sql` (`GRANT` e policies RLS de `notifications` e `reports`)
  - `supabase/migrations/20261113143000_security_hardening.sql` (`set_accepted_post` endurecida e `public.public_profiles`)
- **Tipos:**
  - `src/types/database.types.ts` (`notifications`, `reports`, `notification_type`, `report_reason`, `report_status`)
- **Aplicação Atual:**
  - `src/components/layout/header.tsx` (não possuía menu de notificações)
  - `src/app/forum/[id]/page.tsx`, `src/app/catalog/[slug]/page.tsx`, `src/app/profile/[username]/page.tsx` (locais para botão/formulário de denúncia)
  - `src/features/admin/services/reports-service.ts` e `src/app/admin/reports/page.tsx` (simulação administrativa — preservada intacta para etapa específica do painel admin)

---

## 2. Respostas às 10 Perguntas de Diagnóstico

1. **Quem pode criar notificações?** Apenas código `SECURITY DEFINER` no PostgreSQL (triggers/RPCs). Clientes (`anon`, `authenticated`) não possuem `GRANT INSERT` nem policy `FOR INSERT`.
2. **Quem pode visualizar notificações?** Apenas o destinatário autenticado (`notifications_select_own`: `user_id = auth.uid()`).
3. **Como marcar uma notificação como lida?** Atualizando exclusivamente a coluna `read_at` (`GRANT UPDATE (read_at) ON public.notifications TO authenticated` + `notifications_update_own`).
4. **Existem operações de exclusão?** Sim para `notifications` (`notifications_delete_own` para próprio usuário ativo). Não para `reports` (sem `GRANT DELETE` ou `UPDATE` para `authenticated`).
5. **Quais eventos geram notificações automaticamente?** `topic_reply` (`on_post_created`), `solution_accepted` (`set_accepted_post`) e `resource_approved` / `resource_rejected` (`moderate_resource`).
6. **Quem pode criar denúncias?** Membros autenticados ativos (`reports_insert`: `reporter_id = auth.uid()`, `is_active_member()`, `status = 'open'`).
7. **Quais tipos de conteúdo podem ser denunciados?** Tópico (`topic_id`), resposta (`post_id`), recurso (`resource_id`) ou perfil (`profile_id`), exigindo exatamente um alvo (`num_nonnulls(...) = 1`).
8. **Como o banco protege a identidade do denunciante?** `reports_select` restringe leitura a `reporter_id = auth.uid() OR is_moderator()`. Usuários comuns nunca veem denúncias de terceiros.
9. **Quem pode visualizar e resolver denúncias?** O próprio denunciante vê apenas suas denúncias; moderadores/admins veem e resolvem via RPC `resolve_report` (`SECURITY DEFINER`).
10. **Quais operações são impossíveis com as permissões existentes?** Inserir notificações pelo cliente, alterar campos além de `read_at` em `notifications`, acessar notificações/denúncias de terceiros, alterar `status`/`reporter_id`/`handled_*` de `reports` pelo cliente ou duplicar denúncia aberta/em revisão no mesmo alvo (`23505`).
