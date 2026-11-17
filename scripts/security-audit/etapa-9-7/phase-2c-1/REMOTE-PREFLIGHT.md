# VEXOR — Etapa 9.7 (Fase 2C.1) — Pré-verificação Remota (Somente Leitura)

**Data:** 2026-11-16  
**Status:** Verificação somente leitura concluída; **nenhuma escrita ou migration foi executada**.

---

## 1. Projeto Vinculado Confirmado

| Campo | Esperado | Observado (`npx supabase projects list`) |
|---|---|---|
| **Nome** | `Vexor` | `Vexor` (`linked: true`) |
| **Project Reference** | `zcjudcbckcxwnfnrjfte` | `zcjudcbckcxwnfnrjfte` |
| **Região** | `us-east-1` | `us-east-1` (`East US (North Virginia)`) |
| **PostgreSQL** | `17.11` | `17.11.0.019` (`postgres_engine: "17"`) |
| **Status** | Ativo | `ACTIVE_HEALTHY` |

---

## 2. Histórico de Migrations (`npx supabase migration list`)

| Versão | Local | Remoto | Situação |
|---|---|---|---|
| `20261110000001` | Presente | Aplicada | Sincronizada |
| `20261110000002` | Presente | Aplicada | Sincronizada |
| `20261110000003` | Presente | Aplicada | Sincronizada |
| `20261113143000` | Presente | Aplicada | Sincronizada |
| `20261116114600` | Presente | **Pendente** | Aguardando aprovação (Fase 2C.2) |

---

## 3. Estado Atual de Tabelas Remotas (`npx supabase inspect db table-stats --linked`)

Comando executado com sucesso (exit code `0`). Tabelas observadas em `public`:
- `public.resources`, `public.reports`, `public.topics`, `public.profiles` (`estimated_row_count: 1`), `public.audit_logs`, `public.posts`, `public.bookmarks`, `public.categories` (`estimated_row_count: 0`), `public.notifications`, `public.tags`, `public.votes`, `public.topic_tags`.
- **Conflitos:** `public.research_submissions` e `public.research_recipients` **não** existem no banco remoto.

### Itens Explicitamente Registrados como Não Verificados via Leitura Direta
- Listagem direta de linhas de `public.categories`, ENUMs (`pg_enum`) e policies individuais (`pg_policies`) não foi consultada via SQL remoto direto (não há `psql` conectado ao pooler remoto neste ambiente sem credenciais de banco, e não solicitamos credenciais nem usamos `service_role`). A ausência de conflito baseia-se no histórico exato das 4 migrations oficiais remotas e no inventário de `inspect db table-stats --linked`.
