# Etapa 9.1.17.1 — Auditoria das Policies RLS e Grants

**Migrations inspecionadas (READ-ONLY):**
- `supabase/migrations/20261110000001_schema.sql`
- `supabase/migrations/20261110000003_rls_and_grants.sql`
- `supabase/migrations/20261113143000_security_hardening.sql`

---

## 1. Policies e Grants Verificados

| Alvo | Regra no Banco | Compatibilidade com `profile-service.ts` |
| :--- | :--- | :--- |
| `public.profiles` (`SELECT` anon) | `REVOKE SELECT ON public.profiles FROM anon` | Compatível (`readPublicProfileByUsername` usa `public_profiles`). |
| `public.profiles` (`SELECT` auth) | `profiles_select_own_or_mod`: `id = auth.uid() OR is_moderator()` | Compatível (`readOwnProfile` filtra `id = user.id`). |
| `public.profiles` (`GRANT UPDATE`) | Apenas `username, display_name, avatar_url, bio, interests, github_url, linkedin_url, preferred_locale` | Compatível: allowlist de `updateOwnProfile()` coincide exatamente com essas 8 colunas. |
| `public.profiles` (`UPDATE` RLS) | `profiles_update_own`: `id = auth.uid() AND is_active_member()` | Compatível: bloqueia terceiros e usuários suspensos no banco; `updateOwnProfile` trata `42501`/row `null` como `rls_denied`. |
| `public.public_profiles` (`SELECT`) | `security_invoker = false, security_barrier = true`, omite `role` e `is_suspended`, oculta suspensos para não-moderadores; `GRANT SELECT` para `anon, authenticated` | Compatível: `readPublicProfileByUsername` consulta apenas as 10 colunas da view. |

## 2. Observação

- A autoridade final permanece no PostgreSQL/Supabase (RLS + column-level `GRANT UPDATE`).
- **Ressalva:** A execução efetiva das policies no PostgreSQL remoto não foi testada E2E nesta auditoria (ver `TEST-RESULTS.md`).
