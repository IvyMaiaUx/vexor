# VEXOR — Etapa 9.7 (Fase 2B.2) — Resultados de Testes (`test-research-integration-etapa9-7-2b2.mjs`)

**Data:** 2026-11-16  
**Comando executado:** `node scripts/test-research-integration-etapa9-7-2b2.mjs`  
**Resultado:** **PASS: 11/11 scenarios passed** (código de saída `0`).

> **Nota metodológica:** Os testes abaixo validam os handlers, validações, mapeamento de erros (`55P03` → `409`), denúncias, notificações e ausência de fallback em memória usando mocks controlados do cliente Supabase. **Não** substituem a validação de RLS real no PostgreSQL remoto (já validada localmente na Fase 2A com `20/20` cenários no PostgreSQL 18.6).

---

## 1. Cenários Executados

| # | Cenário | Resultado |
|---|---|---|
| 01 | Usuário não autenticado recebe `401` nos endpoints de research | **PASS** |
| 02 | Membro suspenso recebe `403` em todas as operações de research | **PASS** |
| 03 | Membro ativo cria e edita submissão `pending` via repositório Supabase | **PASS** |
| 04 | Reenvio chama a RPC `resubmit_research` com parâmetros validados | **PASS** |
| 05 | Resposta `404` uniforme para pesquisa restrita/privada ou UUID inexistente (`400` para UUID inválido) | **PASS** |
| 06 | Gerenciamento de destinatários exige `moderator`/`admin`, bloqueia autoconcessão (`403`) e chama RPCs oficiais | **PASS** |
| 07 | `SQLSTATE 55P03` mapeado para HTTP `409 Conflict` sem vazar detalhes internos do PostgreSQL | **PASS** |
| 08 | Moderação administrativa suporta `approve`/`reject`/`archive` via RPC `moderate_research` (motivo obrigatório `>= 5` chars em rejeição) | **PASS** |
| 09 | Falha de rede/banco retorna `503`/`500` sem fallback silencioso para dados simulados | **PASS** |
| 10 | Denúncias (`research_id`) e notificações (`research_approved` + rota interna) integradas | **PASS** |
| 11 | Verificações estáticas: zero `service_role`, zero `mock-research-adapter` em produção, `Cache-Control: no-store` em todos os Route Handlers | **PASS** |

---

## 2. Testes Pendentes do Banco Remoto

- Execução ponta-a-ponta contra o projeto Supabase remoto após aplicação controlada da migration `20261116114600_research_submissions.sql` e seed de categorias `'research'`.
