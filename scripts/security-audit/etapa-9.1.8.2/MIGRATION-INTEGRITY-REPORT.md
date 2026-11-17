# VEXOR — ETAPA 9.1.8.2: INTEGRIDADE DAS MIGRATIONS (FASE B)

Todos os hashes SHA-256 foram recalculados nesta etapa e conferidos contra os valores aprovados:

| Arquivo | SHA-256 Observado | Status |
| :--- | :--- | :--- |
| `supabase/migrations/20261110000001_schema.sql` | `24763C8E77E5643EFA3214093071760539D65C3A8834E5837CBC70698C7BEE75` | **Íntegro (Match exato)** |
| `supabase/migrations/20261110000002_functions_triggers.sql` | `89D8F4C6A456ABD523EC660C932AE24F63B10AF3D46C199A2B39D898E5A00D77` | **Íntegro (Match exato)** |
| `supabase/migrations/20261110000003_rls_and_grants.sql` | `10E8487AB58DA75BAC0A7AEE21DA968EA69FB93F284BB879A7DE96347467F030` | **Íntegro (Match exato)** |
| `supabase/migrations/20261113143000_security_hardening.sql` | `A8ABA292389CB485F79DD6563D1F57E49FAE7542F2267E5B880AAC90337EB336` | **Íntegro (Match exato)** |
| `supabase/seed.sql` | `E2B814A6E64FD18DEF920792959CE8ABF8463B0A500CDE4FD9F60D875092F3B9` | **Íntegro (Match exato)** |
| `scripts/security-audit/etapa-9.1.7/20261113143000_security_hardening.rollback.sql` | `5B7327A4AB982997EBAD779F6ED3F5D6BF48405B98388513E39EA685B2428405` | **Íntegro (Match exato)** |

- **Ordem cronológica:** `20261110000001` < `20261110000002` < `20261110000003` < `20261113143000`.
- **Duplicações / arquivos inesperados:** nenhum.
- **Separação migrations × seed:** confirmada.
