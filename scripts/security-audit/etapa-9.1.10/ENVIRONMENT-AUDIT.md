# Etapa 9.1.10 — Environment Audit (Fase A)

- **Data:** 2026-11-13
- **Status:** `VERIFIED_REMOTE`

## 1. Identificação do ambiente remoto

- **Project Reference:** `zcjudcbckcxwnfnrjfte` (`linked: true`)
- **Nome:** `Vexor`
- **Região:** `us-east-1`
- **Status do projeto:** `ACTIVE_HEALTHY`
- **Banco de dados:** `postgres`
- **Versão PostgreSQL remota:** `PostgreSQL 17.11 on aarch64-unknown-linux-gnu, compiled by gcc (GCC) 15.2.0, 64-bit` (`17.11.0.019`)
- **Supabase CLI local:** `3.1.0`

## 2. Histórico de migrations remotas (`supabase_migrations.schema_migrations`)

Consultado diretamente no remoto via `npx supabase db query --remote --read-only` e confirmado via `npx supabase migration list --linked`:

| Versão | Nome | Estado |
|---|---|---|
| `20261110000001` | `schema` | Sincronizada (`VERIFIED_REMOTE`) |
| `20261110000002` | `functions_triggers` | Sincronizada (`VERIFIED_REMOTE`) |
| `20261110000003` | `rls_and_grants` | Sincronizada (`VERIFIED_REMOTE`) |
| `20261113143000` | `security_hardening` | Sincronizada (`VERIFIED_REMOTE`) |

- **Migrations adicionais inesperadas:** Nenhuma (exatamente 4/4).
- **Observação de método:** Todas as consultas SQL remotas foram executadas com `--read-only` (`BEGIN READ ONLY`).
