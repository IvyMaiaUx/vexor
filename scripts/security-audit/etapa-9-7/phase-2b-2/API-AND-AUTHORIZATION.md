# VEXOR — Etapa 9.7 (Fase 2B.2) — API, Autenticação e Autorização

**Data:** 2026-11-16  

---

## 1. Endpoints Implementados (`/api/research/**`)

| Endpoint | Método | Guard (`requireServerAuthorization`) | Operação |
|---|---|---|---|
| `/api/research` | `GET` | `active_member` | Lista submissões autorizadas via RLS com filtros (`query`, `domain`, `severity`, `tlp`, `categoryId`, `scope`, `sortBy`) e paginação (`MAX_PAGE_SIZE = 50`). |
| `/api/research` | `POST` | `active_member` | Valida payload e insere nas 16 colunas permitidas em `research_submissions`. |
| `/api/research/[id]` | `GET` | `active_member` | Retorna `{ item, recipients }` ou `404` uniforme se inexistente ou bloqueado pela RLS. |
| `/api/research/[id]` | `PATCH` | `active_member` | Atualiza submissão própria ainda em `pending`. |
| `/api/research/[id]/resubmit` | `POST` | `active_member` | Reenvia submissão `rejected` via RPC `public.resubmit_research`. |
| `/api/research/[id]/recipients` | `POST` | `moderator` | Concede/atualiza destinatário TLP via RPC `public.grant_research_recipient` (bloqueia autoconcessão com `403`). |
| `/api/research/[id]/recipients/[userId]` | `DELETE` | `moderator` | Revoga destinatário TLP via RPC `public.revoke_research_recipient`. |
| `/api/research/categories` | `GET` | `active_member` | Lista categorias ativas com `scope in ('research', 'both')`. |

Todos os Route Handlers declaram `export const dynamic = "force-dynamic"` e `Cache-Control: no-store`, utilizam `createClient()` SSR por requisição e **não utilizam `service_role`**.

---

## 2. Padronização de Respostas HTTP (`mapResearchPgError`)

- `400`: UUID inválido, payload malformado, mass assignment ou parâmetros inválidos (`23514`, `23503`, `23502`, `22P02`).
- `401`: sessão não autenticada (`requireServerAuthorization`).
- `403`: usuário suspenso, papel insuficiente (`moderator` exigido em destinatários), autoconcessão ou `42501`.
- `404`: `P0002` ou registro ausente/restrito pela RLS (resposta uniforme sem enumeração).
- `409`: `SQLSTATE 55P03` (`lock_conflict`) ou `23505` (`duplicate_conflict`).
- `422`: `SQLSTATE 22023` em transições de estado inválidas, TLP `CLEAR`/`GREEN` em `recipients` ou falta de justificativa em `AMBER+`/`RED`.
- `500` / `503`: erro interno ou indisponibilidade de conexão, sem exposição de mensagens internas do PostgreSQL e sem fallback para dados simulados.
