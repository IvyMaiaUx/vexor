# VEXOR — Etapa 9.5: Compatibilidade com Schema, RLS e Triggers

## 1. Tabela `public.notifications`

- **Colunas:** `id`, `user_id`, `type` (`topic_reply | solution_accepted | resource_approved | resource_rejected`), `actor_id`, `topic_id`, `post_id`, `resource_id`, `read_at`, `created_at`.
- **Permissões do cliente `authenticated`:** `SELECT` (próprias), `UPDATE (read_at)` (próprias, `is_active_member()`), `DELETE` (próprias, `is_active_member()`).
- **Resolução de links na UI:**
  - `topic_id` + `post_id` -> `/forum/${topic_id}#post-${post_id}`
  - `topic_id` -> `/forum/${topic_id}`
  - `resource_id` -> resolvido via `public.resources` (`slug`, `status = 'approved'`) para `/catalog/${slug}`, ou `/catalog` se não disponível publicamente.
  - Nenhum link externo arbitrário é gerado.
- **Ator (`actor_id`):** Hidratado exclusivamente via `public.public_profiles` (`username`, `display_name`, `avatar_url`).

---

## 2. Tabela `public.reports`

- **Colunas concedidas para `INSERT`:** `(topic_id, post_id, resource_id, profile_id, reason, details)`.
- **Colunas geradas/protegidas pelo servidor:** `id`, `reporter_id` (`DEFAULT auth.uid()`), `status` (`DEFAULT 'open'`), `handled_by`, `handled_at`, `resolution_note`, `created_at`.
- **Enum `report_reason`:** `'spam' | 'malicious_content' | 'personal_data' | 'harassment' | 'unauthorized_attack' | 'copyright' | 'other'`.
- **Enum `report_status`:** `'open' | 'reviewing' | 'resolved' | 'dismissed'` (não existe `pending`).
- **Constraints:**
  - `reports_one_target`: `num_nonnulls(topic_id, post_id, resource_id, profile_id) = 1`.
  - `reports_details_len`: `details` <= 1000 chars.
  - Índices únicos de deduplicação (`reports_dedupe_*`) para `(reporter_id, target)` onde `status in ('open', 'reviewing')` -> código `23505`.
- **Política de leitura (`reports_select`):** permite ao usuário autenticado listar apenas as próprias denúncias (`reporter_id = auth.uid()`), sem expor `handled_by` ou `resolution_note` de moderação interna na resposta pública.
