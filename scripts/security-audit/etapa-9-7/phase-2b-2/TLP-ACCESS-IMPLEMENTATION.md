# VEXOR — Etapa 9.7 (Fase 2B.2) — Implementação do Controle de Acesso TLP 2.0

**Data:** 2026-11-16  

---

## 1. Autoridade Final na RLS (Sem Busca Privilegiada)

- Todas as consultas em `research-repository.ts` utilizam o cliente Supabase autenticado da requisição (`anon` key + sessão do usuário), nunca `service_role`.
- A listagem (`GET /api/research`) e o detalhe (`GET /api/research/[id]`) nunca buscam pesquisas restritas com privilégios administrativos para filtrar no frontend: a RLS (`research_select` e `research_recipients_select`) filtra no PostgreSQL antes do retorno.
- Quando `GET /api/research/[id]` recebe `null` do banco (seja por UUID inexistente ou por pesquisa `AMBER`/`AMBER+`/`RED`/`pending` sem autorização), o handler retorna **`404` uniforme**, impedindo enumeração.

---

## 2. Gerenciamento de Destinatários (`AMBER`, `AMBER+`, `RED`)

- Concessão e revogação ocorrem **exclusivamente** via RPCs `public.grant_research_recipient` (`POST /api/research/[id]/recipients`) e `public.revoke_research_recipient` (`DELETE /api/research/[id]/recipients/[userId]`), protegidas por `requireServerAuthorization("moderator")`.
- Autoconcessão (`userId === actorId`) é bloqueada antes da RPC (`403 self_grant_forbidden`) e também no PostgreSQL (`42501`).
- Justificativa entre `5` e `500` caracteres é validada no servidor e exigida na RPC para `AMBER+` e `RED`.
- A UI administrativa (`AdminModerationDetailModal`) e o detalhe da biblioteca (`library/page.tsx`) exibem destinatários somente quando retornados pela consulta autenticada submetida à RLS (`research_recipients_select`).
