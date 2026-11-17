# VEXOR — ETAPA 9.1.6: INVENTÁRIO E BASELINE

## 1. Hashes SHA-256 das Migrations Originais e Seed (Inalterados)

| Arquivo | SHA-256 |
| :--- | :--- |
| `supabase/migrations/20261110000001_schema.sql` | `24763C8E77E5643EFA3214093071760539D65C3A8834E5837CBC70698C7BEE75` |
| `supabase/migrations/20261110000002_functions_triggers.sql` | `89D8F4C6A456ABD523EC660C932AE24F63B10AF3D46C199A2B39D898E5A00D77` |
| `supabase/migrations/20261110000003_rls_and_grants.sql` | `10E8487AB58DA75BAC0A7AEE21DA968EA69FB93F284BB879A7DE96347467F030` |
| `supabase/seed.sql` | `E2B814A6E64FD18DEF920792959CE8ABF8463B0A500CDE4FD9F60D875092F3B9` |

---

## 2. Objetos Afetados e Evolução Entre Estados

| Objeto | Baseline Original (Migrations 01–03) | Experimental 9.1.5 (`vexor_audit`) | Estado Final Proposto (9.1.6) |
| :--- | :--- | :--- | :--- |
| `admin_set_user_role` | Sem advisory lock; sem revalidação do chamador; sem proteção do último admin. | Advisory lock `6216471958360507469` + revalidação pós-lock + guarda do último admin. | Idêntico à 9.1.5 + grants explícitos consolidados. |
| `admin_set_user_suspension` | Sem advisory lock; sem revalidação do chamador; sem proteção do último admin. | Advisory lock `6216471958360507469` + revalidação pós-lock + guarda do último admin. | Idêntico à 9.1.5 + grants explícitos consolidados. |
| `protect_last_admin_delete` / trigger | Inexistente. | Criado (`BEFORE DELETE ON public.profiles`). | Consolidado com `REVOKE ALL` para `PUBLIC, anon, authenticated`. |
| `moderate_resource`, `moderate_topic`, `moderate_post`, `resolve_report` | `UPDATE` direto; sem `FOR UPDATE` explícito prévio nem revalidação pós-lock. | `FOR UPDATE` no alvo + revalidação `FOR SHARE NOWAIT` em `profiles`. | Consolidado + grants explícitos. |
| `resubmit_resource` | `UPDATE` direto sem revalidação pós-lock. | **Não alterado na 9.1.5.** | `FOR UPDATE` em `resources` + `FOR SHARE NOWAIT` em `profiles`. |
| `set_accepted_post` | `v_is_mod` avaliado no `DECLARE` antes de qualquer lock. | **Não alterado na 9.1.5.** | `FOR UPDATE` em `topics` + `FOR SHARE NOWAIT` em `profiles` + `v_is_mod` pós-lock. |
| `public.profiles` (SELECT/RLS) | `GRANT SELECT` para `anon, authenticated`; policy `profiles_select_public` (`USING (true)`). | `REVOKE SELECT FROM anon`; policy `profiles_select_own_or_mod`. | Consolidado. |
| `public.public_profiles` (View) | Inexistente. | `WITH (security_invoker = false)` (sem `security_barrier`). | `WITH (security_invoker = false, security_barrier = true)`, sem `role`/`is_suspended`. |
| `public.audit_logs` (FK) | `audit_logs_actor_id_fkey` (`ON DELETE SET NULL`), conflitante com trigger append-only. | FK removida experimentalmente. | Remoção formal da FK (**Alternativa C aprovada**). |
