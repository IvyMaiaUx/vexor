# VEXOR — Etapa 9.7 (Revisão 2) — Relatório Final (`FINAL-REPORT.md`)

**Status:** Revisão de especificação das RPCs concluída (`revision-2`, somente planejamento e documentação).  
**Data:** 2026-11-15  

---

## 1. Escopo e Restrições Cumpridas

- Revisão exclusiva dos documentos de planejamento em `scripts/security-audit/etapa-9-7/revision-2/`.
- Nenhuma migration oficial foi criada ou modificada em `supabase/migrations/`.
- Nenhum SQL foi executado local ou remotamente; nenhum `db push` foi executado.
- Nenhum arquivo de código da aplicação (`src/`) foi alterado nesta revisão.
- Nenhuma conta ou permissão de usuário foi alterada.

---

## 2. Síntese das Atualizações Realizadas

1. **Matriz oficial de transições de estado (`moderate_research` e `resubmit_research`):**
   - `pending` → `approved` | `rejected` | `archived`
   - `approved` → `archived`
   - `rejected` → `archived`
   - `archived` → nenhuma transição direta
   - `resubmit_research()` mantém responsabilidade exclusiva pelo reenvio `rejected` → `pending` com atualização transacional de conteúdo.
   - Documentada a especificação conceitual de futura operação de republicação de pesquisas arquivadas (`republish_research`), sem implementação nesta etapa.
2. **Revalidação pós-lock de `resubmit_research()` (Padrão V4):**
   - Inspecionadas `public.is_active_member()` (`20261110000002_functions_triggers.sql`) e as RPCs de hardening (`20261113143000_security_hardening.sql`).
   - A revalidação pós-lock agora verifica integralmente os critérios de membro ativo (`auth.uid() IS NOT NULL` pré-lock e `SELECT p.role, p.is_suspended ... FOR SHARE NOWAIT` pós-lock exigindo `FOUND`, `v_caller_susp IS DISTINCT FROM false`, `v_caller_role IS NOT NULL` e `v_author_id = auth.uid()`).
   - Documentada a análise de concorrência com `admin_set_user_role` e `admin_set_user_suspension` (`FOR UPDATE NOWAIT` + ausência de ciclo AB-BA).
3. **Padronização de `SET search_path = ''`:**
   - Todas as funções e triggers de `MIGRATION-REVISED.sql` e `RPC-SECURITY-REVISED.md` foram alinhados ao padrão oficial das migrations (`SET search_path = ''` com qualificação explícita `public.*`, `auth.uid()`, `extensions.unaccent()`).
4. **Reconciliação completa Especificação × SQL:**
   - Verificados e alinhados assinatura, tipos dos parâmetros, ordem dos locks, códigos de erro, transições de estado, campos atualizados, auditoria, notificações e privilégios de execução em `RPC-SPEC-RECONCILIATION.md`.

---

## 3. Artefatos Entregues em `scripts/security-audit/etapa-9-7/revision-2/`

- `RPC-SECURITY-REVISED.md`
- `MIGRATION-REVISED.sql` *(somente artefato de planejamento, não aplicado)*
- `RPC-SPEC-RECONCILIATION.md`
- `FINAL-REPORT.md`

---

**Parada obrigatória:** Aguardando aprovação explícita para prosseguir para as próximas fases.
