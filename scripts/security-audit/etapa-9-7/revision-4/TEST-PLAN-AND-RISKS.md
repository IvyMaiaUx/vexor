# VEXOR — Etapa 9.7 (Revisão 4) — Plano de Testes SQL e Riscos Residuais

**Data:** 2026-11-16  
**Aviso obrigatório:** Nenhum comando SQL foi executado nesta Revisão 4. Todos os testes abaixo são **exclusivamente planejados** para execução na Fase 2B em banco isolado.

---

## 1. Testes Realmente Executados vs. Planejados

- **Testes realmente executados nesta Revisão 4:** Nenhum (`0` execuções SQL).
- **Testes apenas planejados:** 18 cenários SQL abaixo.

---

## 2. Plano Detalhado de Testes SQL (Somente Planejados)

| ID | Cenário | Ação Planejada | Resultado Esperado |
|---|---|---|---|
| **T01** | RLS sem recursão | `SELECT` em `research_submissions` (`AMBER`/`RED`) como autor, destinatário, membro comum e moderador; `SELECT` em `research_recipients` como autor | Sem erro `42P17` (infinite recursion); autor e destinatário/moderador recebem apenas as linhas autorizadas |
| **T02** | Todos os níveis TLP | Testar `CLEAR`, `GREEN`, `AMBER`, `AMBER+`, `RED` em `approved` e `pending` | `CLEAR`/`GREEN` `approved` legíveis por membro ativo; `AMBER`/`AMBER+`/`RED` apenas autor, moderador ou destinatário |
| **T03** | Papéis (autor, destinatário, membro, mod, admin) | Matriz cruzada de `SELECT`/`INSERT`/`UPDATE`/`DELETE` entre os 5 papéis | Somente autor ativo edita `pending`; nenhum cliente faz `DELETE`; moderador/admin lê tudo |
| **T04** | Perfil suspenso e perfil inexistente | Testar `is_suspended = true` e `auth.uid()` sem linha em `profiles` em RLS e nas 4 RPCs | `0` linhas em `SELECT` e `42501` nas RPCs/escritas |
| **T05** | Autoconcessão | Moderador/admin chama `grant_research_recipient(id, auth.uid(), 'justif')` | Rejeitado com `42501` |
| **T06** | Concessão duplicada (idempotência) | Chamar `grant_research_recipient` duas vezes com os mesmos parâmetros e justificativa | Segunda chamada não sobrescreve `granted_by`/`created_at` e não duplica `audit_logs` |
| **T07** | Atualização de justificativa | Chamar `grant_research_recipient` com nova justificativa para destinatário existente | Preserva `granted_by`/`created_at`, preenche `updated_by`/`updated_at` e grava `research.recipient_updated` |
| **T08** | Revogação | Chamar `revoke_research_recipient` para destinatário existente e depois repetir | 1ª remove e grava `research.recipient_revoked`; 2ª é idempotente; destinatário perde leitura imediata |
| **T09** | Mudança de TLP | Tentar `grant_research_recipient` em `CLEAR`/`GREEN`; testar mudança de TLP antes da aprovação | `CLEAR`/`GREEN` rejeitados com `22023` |
| **T10** | Mudança de status (`approved -> archived`) | Arquivar pesquisa com destinatários ativos; tentar conceder novo destinatário em pesquisa `pending`/`rejected`/`archived` | Destinatários existentes perdem leitura via RLS; novas concessões falham com `22023` |
| **T11** | Concorrência moderação × alteração de papel | Sessão B rebaixa moderador A (`admin_set_user_role`) antes de A completar `moderate_research` | Sessão A falha na revalidação pós-lock com `42501` |
| **T12** | `SQLSTATE 55P03` | Sessão B mantém `FOR UPDATE` em `profiles` enquanto Sessão A chama `moderate_research` / `resubmit_research` / `grant_research_recipient` / `revoke_research_recipient` | Sessão A falha imediatamente com `SQLSTATE 55P03` (`lock_not_available`) |
| **T13** | Auditoria | Conferir eventos `research.*`, `from`/`to`, `actor_id`, `recipient_id` e tentar `UPDATE`/`DELETE` em `audit_logs` | Todos os eventos presentes; mutação em `audit_logs` bloqueada com `42501` |
| **T14** | Notificações | Moderar pesquisa para autor ativo, autor suspenso, autor `NULL` (excluído) e auto-moderação | Notifica apenas autor ativo diferente de `auth.uid()`; demais casos não falham nem criam ruído |
| **T15** | Tentativas de alterar campos administrativos | `authenticated` executa `UPDATE` direto em `status`, `reviewed_by`, `reviewed_at`, `published_at`, `rejection_reason`, `author_id`, `slug` | Bloqueado por `GRANT` e pelo trigger `research_protect_fields()` (`42501`) |
| **T16** | Arrays e JSONB inválidos | Testar `NULL` em array, array 2D, duplicata, CVE/ATT&CK inválido, chave extra em `source_references`, URL `http://`, `isExternal` não booleano | Todos rejeitados (`23514` / `22023`) |
| **T17** | Denúncias e enumeração de pesquisas privadas | Membro denuncia pesquisa legível, tenta duplicata, tenta denunciar pesquisa `RED` sem acesso ou UUID inexistente | 1ª denúncia aceita; duplicata falha com `23505`; `RED` sem acesso e UUID inexistente falham uniformemente com `42501` |
| **T18** | Rollback transacional | Forçar erro após `write_audit_log` ou `notifications` na mesma transação | Toda a operação (status, auditoria e notificação) sofre rollback integral |

---

## 3. Riscos Residuais

1. **Execução futura do seed após `ALTER TYPE`:** manter o seed de categorias `'research'` em transação posterior à migration de estrutura para evitar erro de uso de novo valor de enum na mesma transação.
2. **Mapeamento de `55P03` na API:** Route Handlers deverão mapear `SQLSTATE 55P03` para HTTP `409 Conflict` na Fase 2B.
3. **Painel administrativo:** integrar `entity_type = 'research'` e os eventos `research.recipient_*` nos filtros de auditoria na Fase 2B/2C.
