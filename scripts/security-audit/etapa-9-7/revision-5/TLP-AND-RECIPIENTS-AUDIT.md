# VEXOR — Etapa 9.7 (Revisão 5) — Auditoria de TLP 2.0 e Destinatários

**Data:** 2026-11-16  
**Artefato auditado:** `scripts/security-audit/etapa-9-7/revision-4/PROPOSED-MIGRATION-REVISION-4.sql` (linhas 97-113, 304-367, 566-740).

---

## 1. Matriz TLP 2.0 e Ciclo de Vida

- **`CLEAR` e `GREEN` (`status = 'approved'`):** legíveis por qualquer `is_active_member()` autenticado. `grant_research_recipient` bloqueia concessões explícitas para `CLEAR` e `GREEN` (`22023`, linhas 621-623).
- **`AMBER`, `AMBER+` e `RED` (`status = 'approved'`):** legíveis apenas por autor ativo (`author_id = auth.uid()`), `is_moderator()`, ou destinatário ativo presente em `public.research_recipients`.
- **Mudança de status (`approved -> archived`):** `research_select` exige `status = 'approved'` para destinatários (linha 312). Ao arquivar, todos os destinatários perdem leitura imediata via RLS, preservando o histórico forense na tabela `research_recipients`.
- **Rejeição e `pending`:** `grant_research_recipient` exige `v_status = 'approved'` (linhas 618-620), impedindo concessão em pesquisas não aprovadas.
- **Concessão, atualização e revogação:**
  - Autoconcessão (`p_user_id = auth.uid()`) bloqueada (`42501`, linha 590).
  - Destinatário validado pós-lock com `FOR SHARE NOWAIT` (`P0002` se inexistente; `22023` se suspenso ou `role IS NULL`, linhas 628-638).
  - Justificativa obrigatória (`5..500` chars) para `AMBER+` e `RED` (linhas 593-595, 624-626).
  - Idempotência na repetição sem mudança, preservação de `granted_by`/`created_at` originais e registro em `updated_by`/`updated_at` com evento `research.recipient_updated` (linhas 640-678).
  - Revogação via `DELETE ... RETURNING` registrando `research.recipient_revoked` somente quando `FOUND` (linhas 722-738).

---

## 2. Achados

| ID | Severidade | Trecho | Descrição / Impacto | Recomendação |
|---|---|---|---|---|
| **TLP-01** | `INFORMATIONAL` | Linhas 433-435 (`moderate_research`) | Na transição `rejected -> archived`, `rejection_reason` é limpo para `NULL` na tabela `research_submissions`, permanecendo registrado apenas em `audit_logs`. | Comportamento aceitável e já documentado; confirmar em UI administrativa que histórico de rejeição vem de `audit_logs`. |
| **TLP-02** | `INFORMATIONAL` | Linhas 566-680 (`grant_research_recipient`) | Caso exista concessão em `research_recipients` e futuramente seja criada uma RPC de reclassificação de TLP (`AMBER -> CLEAR`), será necessário revisar se os registros de `research_recipients` devem ser revogados explicitamente. | Documentar como requisito para eventual RPC futura de reclassificação de TLP. |
