# Etapa 9.1.10 — Public Profiles View Audit (Fase E)

- **Data:** 2026-11-13
- **Método:** Consulta read-only em `pg_class` (`reloptions`, `relowner`), `pg_get_viewdef` e `pg_class.relacl`.
- **Status:** `VERIFIED_REMOTE`

## 1. Propriedades verificadas no banco remoto

- **Nome:** `public.public_profiles`
- **Owner:** `postgres`
- **Opções (`reloptions`):** `["security_invoker=false", "security_barrier=true"]`
- **Grants:** `SELECT` para `anon` e `authenticated`; demais privilégios revogados de `PUBLIC`, `anon` e `authenticated`.
- **Colunas expostas (10):** `id`, `username`, `display_name`, `avatar_url`, `bio`, `interests`, `github_url`, `linkedin_url`, `preferred_locale`, `created_at`.
- **Colunas sensíveis ausentes:** `role`, `is_suspended`, `updated_at` (não expostas).
- **Filtro `WHERE`:** `WHERE NOT is_suspended OR (SELECT is_moderator() AS is_moderator)`.

## 2. Alerta do Supabase Advisor (`security_definer_view`)

O comando `npx supabase db advisors --remote` reporta `security_definer_view` (`level: ERROR`) para `public.public_profiles` porque `security_invoker=false` faz a view rodar com as permissões do owner (`postgres`) em vez do chamador.
- **Avaliação técnica:** Esse comportamento é **intencional e necessário** na arquitetura V2 (Etapas 9.1.6–9.1.7): `anon` não tem `SELECT` em `public.profiles` e `authenticated` só lê o próprio perfil em `public.profiles`, de modo que `public_profiles` precisa de `security_invoker=false` + `security_barrier=true` para expor apenas as 10 colunas públicas de perfis não suspensos sem vazar `role` nem `is_suspended`.
