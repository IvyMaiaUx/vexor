# Comparação do Estado Remoto — Etapa 9.1.18.6.1 vs. Etapa 9.1.18.6

Consultas executadas exclusivamente com `npx supabase db query --remote --read-only` no projeto `Vexor` (`zcjudcbckcxwnfnrjfte`).

| Indicador | Etapa 9.1.18.6 | Etapa 9.1.18.6.1 | Diferença |
|---|---|---|---|
| Projeto vinculado | `Vexor` (`zcjudcbckcxwnfnrjfte`) | `Vexor` (`zcjudcbckcxwnfnrjfte`) | Nenhuma |
| Migrations aplicadas | 4/4 sincronizadas | 4/4 sincronizadas | Nenhuma |
| Total de usuários (`auth.users`) | 1 | 1 | Nenhuma |
| Usuários confirmados | 1 | 1 | Nenhuma |
| Total de perfis (`public.profiles`) | 1 | 1 | Nenhuma |
| Usuários sem perfil | 0 | 0 | Nenhuma |
| Distribuição de `role` / `is_suspended` | 1 `admin`, `is_suspended = false` | 1 `admin`, `is_suspended = false` | Nenhuma |
| Registros em `public.audit_logs` | — | 0 | Baseline confirmado |

**Conclusão:** O estado remoto permanece 100% íntegro e inalterado entre as duas etapas, confirmando ausência de qualquer escrita não autorizada.
