# VEXOR — Etapa 9.7 (Fase 1.1) — Plano de Testes de Segurança e Regressão (`revision-1`)

**Data:** 2026-11-15  

---

## 1. Matriz de Testes de Segurança Obrigatórios (Seção 4)

| # | Cenário | Resultado Esperado |
|---|---|---|
| 01 | **Usuário `anon`** tenta `SELECT`/`INSERT`/`UPDATE` ou chamar `/api/research` | Negação (`401` na API; sem privilégios no banco; redirect `/login` no SSR). |
| 02 | **Member ativo** lista pesquisas e cria submissão válida | Lê apenas `approved` + próprias; cria com `author_id = auth.uid()` e `status = 'pending'`. |
| 03 | **Member suspenso** tenta ler, criar, editar ou reenviar | Bloqueado (`403` na API; `is_active_member() = false` no RLS e nas RPCs -> 0 linhas / `42501`). |
| 04 | **Moderator ativo** lista fila e modera (`approved` / `rejected` / `archived`) | Permitido via `moderate_research`; gera `audit_logs` (`from`/`to`) e notificação para autor ativo. |
| 05 | **Moderator suspenso** tenta acessar ou moderar | Bloqueado (`403` / `42501` em `is_moderator()` e revalidação pós-lock). |
| 06 | **Admin ativo** acessa pesquisa, modera e consulta auditoria | Permitido (`is_moderator()` e `is_admin()`). |
| 07 | **Autor tentando alterar autoria (`author_id`)** no `INSERT`, `UPDATE` ou RPC | Bloqueado por column `GRANT`, `research_protect_fields()` (`42501`) e assinatura de `resubmit_research`. |
| 08 | **Autor tentando aprovar a própria pesquisa** via `UPDATE` ou `moderate_research` | `UPDATE` não possui grant em `status` e `WITH CHECK` exige `status = 'pending'`; `moderate_research` retorna `42501`. |
| 09 | **Autor tentando modificar `status`** diretamente | Coluna `status` sem `GRANT INSERT`/`UPDATE` -> erro de permissão no PostgreSQL. |
| 10 | **Usuário tentando acessar pesquisa privada (`pending`/`rejected`/`archived`) de outro** | RLS `research_select` oculta a linha (`0` resultados / `404`). |
| 11 | **Tentativa de enumeração por UUID** em `/api/research/[id]` | UUIDs inexistentes ou não autorizados retornam uniformemente `404` sem vazar existência; UUIDs malformados retornam `400`. |
| 12 | **Moderador concorrente com suspensão** (admin suspende moderador durante moderação) | Revalidação pós-lock (`SELECT ... FROM profiles FOR SHARE NOWAIT`) detecta `is_suspended = true` e aborta com `42501`. |
| 13 | **Duas decisões simultâneas de moderação** na mesma pesquisa | Lock `FOR UPDATE` serializa; a segunda transação lê o novo estado e falha se decisão for redundante ou registra transição sequencial consistente. |
| 14 | **Reenvio concorrente** (`resubmit_research` x `moderate_research` ou duplo clique) | `FOR UPDATE` serializa; apenas estado `'rejected'` pode ser reenviado; segunda tentativa falha com `22023`. |
| 15 | **Falha na criação da notificação** dentro de `moderate_research` | Rollback atômico completo: status da pesquisa e `audit_logs` não persistem parcialmente. |
| 16 | **Preservação de denúncias e auditoria após arquivamento** (`status = 'archived'`) | `reports` (`ON DELETE RESTRICT`), `notifications` e `audit_logs` permanecem íntegros e consultáveis. |

---

## 2. Testes de Regressão da Fila Administrativa (Item L)

Ao integrar `research_submissions` na Etapa 9.7 (Fase 3), executar obrigatoriamente:
- `scripts/test-admin-supabase-etapa9-6.mjs` (todos os 31 cenários existentes de `resources`, `topics`, `posts`, `reports`, `users` e `audit` devem continuar passando sem alteração de contrato).
- Novo bloco de regressão comprovando que `moderate_resource`, `moderate_topic`, `moderate_post` e `resolve_report` mantêm exatamente suas assinaturas e comportamentos.
