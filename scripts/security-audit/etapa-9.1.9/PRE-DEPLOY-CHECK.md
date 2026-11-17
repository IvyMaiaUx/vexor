# Etapa 9.1.9 — Pre-Deploy Check

- **Data:** 2026-11-13
- **Projeto:** Vexor (`zcjudcbckcxwnfnrjfte`)
- **Região:** `us-east-1`
- **Banco remoto:** PostgreSQL `17.11.0.019`
- **Plano / Backup:** O responsável pelo projeto decidiu permanecer no plano **Free** e dispensar backup automático. **Risco registrado:** não há backup automático ou PITR gerenciado na plataforma; qualquer recuperação exigirá procedimento manual.

## 1. Verificação de vínculo e ambiente

- `LINKED_REF`: `zcjudcbckcxwnfnrjfte` (`Vexor`, ambiente `production`).
- Ambiente local utilizado apenas para execução da CLI Supabase (`npx supabase`) contra o projeto vinculado.

## 2. Verificação de integridade (SHA-256) antes da aplicação

| Ordem | Arquivo de Migration | SHA-256 Verificado | Status |
|---|---|---|---|
| 1 | `supabase/migrations/20261110000001_schema.sql` | `24763C8E77E5643EFA3214093071760539D65C3A8834E5837CBC70698C7BEE75` | Íntegro (conferido com 9.1.8.2) |
| 2 | `supabase/migrations/20261110000002_functions_triggers.sql` | `89D8F4C6A456ABD523EC660C932AE24F63B10AF3D46C199A2B39D898E5A00D77` | Íntegro (conferido com 9.1.8.2) |
| 3 | `supabase/migrations/20261110000003_rls_and_grants.sql` | `10E8487AB58DA75BAC0A7AEE21DA968EA69FB93F284BB879A7DE96347467F030` | Íntegro (conferido com 9.1.8.2) |
| 4 | `supabase/migrations/20261113143000_security_hardening.sql` | `A8ABA292389CB485F79DD6563D1F57E49FAE7542F2267E5B880AAC90337EB336` | Íntegro (conferido com 9.1.8.2) |

## 3. Estado prévio das migrations remotas

Comando executado: `npx supabase migration list --linked` (`exit_code = 0`).

Todas as 4 migrations constavam como locais pendentes (`remote: ""`):
- `20261110000001`
- `20261110000002`
- `20261110000003`
- `20261113143000`

## 4. Conclusão do Pre-Deploy Check

Pré-requisitos atendidos para aplicação controlada sem execução de `seed.sql`, sem `migration repair` e sem alterações nos arquivos de migration.
