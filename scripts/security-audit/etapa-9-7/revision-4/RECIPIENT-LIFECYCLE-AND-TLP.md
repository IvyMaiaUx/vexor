# VEXOR — Etapa 9.7 (Revisão 4) — Ciclo de Vida de Destinatários e TLP 2.0

**Data:** 2026-11-16  

---

## 1. Regras de Gestão de Destinatários (`grant_research_recipient` / `revoke_research_recipient`)

1. **Quem pode gerenciar:** apenas `moderator` ou `admin` ativos (`public.is_moderator()` pré-lock + revalidação pós-lock V4).
2. **Proibição de autoconcessão:** `p_user_id = auth.uid()` é bloqueado com `42501`.
3. **Destinatário válido e ativo:** `SELECT p.role, p.is_suspended ... WHERE p.id = p_user_id FOR SHARE NOWAIT` deve existir (`P0002` se inexistente) e estar ativo (`v_target_susp IS DISTINCT FROM false OR v_target_role IS NULL` → `22023`).
4. **Pesquisa aprovada obrigatória:** concessão permitida **somente** quando `v_status = 'approved'` (`22023` para `pending`, `rejected` ou `archived`).
5. **Bloqueio para TLP `CLEAR` e `GREEN`:** concessões para `tlp IN ('CLEAR', 'GREEN')` são rejeitadas (`22023`), pois esses níveis já são acessíveis a todos os membros ativos aprovados.
6. **Justificativa:**
   - Para `AMBER+` e `RED`: obrigatória (`char_length(v_clean_just) between 5 and 500`, senão `22023`).
   - Para `AMBER`: opcional; se fornecida, deve ter entre `5` e `500` caracteres (enforced por `CHECK` e pela RPC).

---

## 2. Idempotência e Preservação de Histórico (Sem Sobrescrita Silenciosa)

Na Revisão 3, `ON CONFLICT DO UPDATE` sobrescrevia silenciosamente `granted_by` e `justification` e sempre gravava `'research.recipient_granted'`.

Na Revisão 4, a tabela `public.research_recipients` ganha colunas explícitas de rastreabilidade de atualização:
- `granted_by uuid references public.profiles (id) on delete set null` *(preservado como concedente original)*
- `created_at timestamptz not null default now()` *(preservado como data da concessão original)*
- `updated_by uuid references public.profiles (id) on delete set null`
- `updated_at timestamptz`

Fluxo em `grant_research_recipient`:
1. Lock na linha existente (`SELECT granted_by, justification INTO v_existing_by, v_existing_just FROM public.research_recipients WHERE research_id = p_research_id AND user_id = p_user_id FOR UPDATE;`).
2. **Não existe (`NOT FOUND`):** insere com `granted_by = auth.uid()`, `justification = v_clean_just`, e grava auditoria **`research.recipient_granted`**.
3. **Já existe e `v_existing_just IS NOT DISTINCT FROM v_clean_just`:** operação **idempotente** (retorna sem alterar `granted_by`/`created_at` e sem duplicar auditoria).
4. **Já existe e `v_existing_just IS DISTINCT FROM v_clean_just`:** atualiza apenas `justification = v_clean_just`, `updated_by = auth.uid()`, `updated_at = now()`, preservando `granted_by` e `created_at` originais, e grava auditoria **`research.recipient_updated`** com `previous_justification`, `new_justification`, `original_granted_by` e `updated_by`.

Fluxo em `revoke_research_recipient`:
1. `DELETE FROM public.research_recipients WHERE research_id = p_research_id AND user_id = p_user_id RETURNING granted_by, justification INTO ...`
2. Se `NOT FOUND`: **idempotente** (retorna sem erro e sem evento falso na auditoria).
3. Se removida: grava auditoria **`research.recipient_revoked`** com `recipient_id`, `previous_granted_by` e `previous_justification`.

---

## 3. Mudança de Status ou de TLP da Pesquisa

- **Quando a pesquisa deixa de estar `approved` (`approved -> archived`):**
  - A policy `research_select` exige `status = 'approved'` para destinatários. Portanto, no instante em que a pesquisa é arquivada, **todos os destinatários perdem imediatamente o acesso de leitura** via RLS.
  - **Decisão:** NÃO deletar linhas de `research_recipients` ao arquivar, pois preservar os registros mantém o histórico forense completo de quem teve acesso antes do arquivamento (e eventuais novas concessões ficam bloqueadas porque `grant_research_recipient` exige `status = 'approved'`).
- **Quando há mudança de TLP:**
  - Pesquisas `approved` não são editáveis pelo autor (`research_update_own_pending` exige `status = 'pending'`). Se uma pesquisa `pending` ou `rejected` (em `resubmit_research`) muda de TLP antes da aprovação, ainda não existem destinatários concedidos (pois concessão exige `status = 'approved'`).
  - Caso uma futura RPC de reclassificação de TLP em pesquisas aprovadas venha a existir, ela deverá registrar a mudança em `audit_logs` e avaliar a revogação explícita caso a classificação passe de restrita (`AMBER`/`AMBER+`/`RED`) para aberta (`CLEAR`/`GREEN`).
