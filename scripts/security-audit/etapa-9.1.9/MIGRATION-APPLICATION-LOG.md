# Etapa 9.1.9 — Migration Application Log

- **Data:** 2026-11-13
- **Projeto:** Vexor (`zcjudcbckcxwnfnrjfte`, `us-east-1`, `production`)
- **Comando executado:** `npx supabase db push --remote --yes`
- **Exit Code:** `0`

## 1. Ordem cronológica de aplicação

1. `Applying migration 20261110000001_schema.sql...`
2. `Applying migration 20261110000002_functions_triggers.sql...`
3. `Applying migration 20261110000003_rls_and_grants.sql...`
4. `Applying migration 20261113143000_security_hardening.sql...`

## 2. Resultado estruturado retornado pela CLI

- `upToDate`: `false`
- `dryRun`: `false`
- `migrations`:
  - `20261110000001_schema.sql`
  - `20261110000002_functions_triggers.sql`
  - `20261110000003_rls_and_grants.sql`
  - `20261113143000_security_hardening.sql`
- `seeds`: `[]` (nenhum seed executado)
- `roles`: `[]`
- `message`: `Finished supabase db push.`
- `target`: `linked`, `project_ref: zcjudcbckcxwnfnrjfte`, `project_name: Vexor`, `environment: production`

## 3. Confirmação pós-aplicação no histórico remoto

Comando executado: `npx supabase migration list --linked` (`exit_code = 0`).

As 4 migrations passaram a apresentar timestamps correspondentes entre `local` e `remote`:
- `20261110000001` — sincronizada
- `20261110000002` — sincronizada
- `20261110000003` — sincronizada
- `20261113143000` — sincronizada

## 4. Conformidade com as restrições

- `supabase/seed.sql` **não** foi executado.
- Nenhum rollback foi executado.
- `migration repair` **não** foi executado.
- Nenhuma migration foi modificada ou adicionada.
