# Etapa 9.1.10 — Findings and Recommendations

- **Data:** 2026-11-13
- **Fonte:** `npx supabase db advisors --remote --type all --level info` + inspeção direta dos catálogos PostgreSQL (`--read-only`).

## 1. Achados de Segurança (Advisors & Catálogo)

1. **`security_definer_view` (`ERROR` no Advisor) em `public.public_profiles` — Falso positivo arquitetural (Intencional):**
   - `public_profiles` usa `security_invoker = false, security_barrier = true` propositalmente para permitir leitura pública das 10 colunas não sensíveis de perfis não suspensos sem conceder `SELECT` direto na tabela `public.profiles` para `anon`.
   - **Recomendação:** Manter como está; documentado.
2. **`anon_security_definer_function_executable` / `authenticated_security_definer_function_executable` (`WARN` no Advisor):**
   - `admin_set_user_role`, `admin_set_user_suspension`, `moderate_resource`, `moderate_topic`, `moderate_post`, `resolve_report`, `resubmit_resource`, `set_accepted_post`: `anon` já está bloqueado (`anon_exec = false`); `authenticated` é necessário para que admins/moderadores/donos chamem via RPC, com validação interna obrigatória de `auth.uid()`, `is_admin()`, `is_moderator()` ou `is_active_member()`.
   - `current_user_role()`, `is_active_member()`, `is_admin()`, `is_moderator()`, `topic_has_replies(uuid)`: funções auxiliares read-only usadas por RLS e views.
   - `rls_auto_enable()`: função gerenciada pelo Supabase que retorna `event_trigger` (não invocável via `/rest/v1/rpc`).
3. **Sem vulnerabilidades críticas ou privilégios excessivos identificados.**

## 2. Achados de Performance (Não bloqueantes)

- **`unindexed_foreign_keys` (`INFO`, 7 ocorrências):** `notifications_actor_id_fkey`, `notifications_post_id_fkey`, `notifications_resource_id_fkey`, `notifications_topic_id_fkey`, `reports_handled_by_fkey`, `resources_reviewed_by_fkey`, `topics_accepted_post_fk`. Avaliar criação de índices em etapa futura conforme crescimento do volume de dados.
- **`multiple_permissive_policies` (`WARN`, 5 ocorrências):** políticas separadas de dono vs moderador/admin para `authenticated` em `posts` (`DELETE`), `resources` (`DELETE`, `UPDATE`) e `topics` (`DELETE`, `UPDATE`). Funcionalmente corretas; podem ser consolidadas no futuro apenas se houver necessidade de otimização de plano.
- **`unused_index` (`INFO`, 24 ocorrências):** esperado porque o banco possui `0` linhas e ainda não recebeu tráfego de aplicação.

## 3. Itens `NOT_VERIFIED_WITHOUT_WRITE_TEST` nesta etapa

- Disparo real de triggers em `INSERT`/`UPDATE`/`DELETE`/`TRUNCATE` no banco remoto (ex.: criação de perfil em `auth.users`, bloqueio de mutação em `audit_logs`, proteção do último admin).
- Testes funcionais end-to-end de upload no bucket `avatars` (validação de MIME/2 MB em runtime) e chamadas RPC autenticadas no projeto remoto.
