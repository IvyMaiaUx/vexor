# VALIDAÇÃO PRÉ-APLICAÇÃO — ETAPA 10.3.4

- **Data e hora:** `2026-11-18T14:15:50-03:00`
- **Projeto Supabase:** `Vexor` (`zcjudcbckcxwnfnrjfte`, `production`)
- **PostgreSQL remoto:** `17.11` (Supabase Free — **PITR desabilitado**, sem garantia de backup automático ponto a ponto)
- **Migration alvo:** `supabase/migrations/20261117234500_social_community.sql`
  - **Tamanho:** `41554` bytes
  - **SHA-256:** `1E20A3451482472A4B1993F68C39C07378F61BF71CE67553D99923EB22BA6029`
  - **Equivalência com Revisão 3 (`B6D625AB6284F48886F030D96AA0142A54380A92D0EA039433724AB8BCC59FBE`):** `SQL_EQUIVALENT=TRUE`
- **Histórico remoto pré-aplicação (`npx supabase migration list --remote`, `exit 0`):**
  - Aplicadas (5): `20261110000001`, `20261110000002`, `20261110000003`, `20261113143000`, `20261116114600`.
  - Pendente (1): `20261117234500` (`"remote":""`).
- **Dry-run (`npx supabase db push --remote --dry-run --skip-vault`, `exit 0`):**
  - Confirmou exatamente 1 migration pendente (`20261117234500_social_community.sql`), `dryRun: true`, nada aplicado.
- **Compatibilidade CLI (`v3.1.0`):** Flags `--remote`, `--yes` e `--skip-vault` confirmadas via `npx supabase db push --help`.
