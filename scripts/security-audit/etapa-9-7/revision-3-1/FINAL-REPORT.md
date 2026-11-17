# VEXOR — Etapa 9.7 (Revisão 3.1) — Relatório Final de Correção Pontual

**Data:** 2026-11-16  
**Status:** Correção pontual concluída (somente documentação e proposta textual; nenhum SQL executado e nenhum banco alterado).

---

## 1. Arquivos Criados em `scripts/security-audit/etapa-9-7/revision-3-1/`

1. `PROPOSED-MIGRATION-REVISED.sql`
2. `RPC-AUTHORIZATION-REVIEW.md`
3. `NULL-ROLE-VALIDATION-REPORT.md`
4. `FINAL-REPORT.md`

---

## 2. Trechos Corrigidos

Adicionada verificação explícita `or v_caller_role is null` antes de `v_caller_role not in ('moderator', 'admin')` na validação pós-lock das 3 RPCs:
- `public.moderate_research`
- `public.grant_research_recipient`
- `public.revoke_research_recipient`

`public.resubmit_research` foi inspecionada e mantida inalterada (já verifica `not found`, `v_caller_susp is distinct from false`, `v_caller_role is null` e autoria `v_author_id = auth.uid()`, preservando `is_active_member()` para qualquer role válida).

---

## 3. Ocorrências Adicionais de `NOT IN (...)` Identificadas

- Linha 162 (`v_key not in ('title', 'url', 'isExternal')`): segura (`jsonb_object_keys` nunca retorna `NULL`).
- Linha 184 (`jsonb_typeof(...) not in ('boolean', 'null')`): segura.
- Linha 382 (`p_decision not in ('approved', 'rejected', 'archived')`): `p_decision` é parâmetro de entrada após `is_moderator()`, não configura bypass de autorização; mantida inalterada.

---

## 4. Verificações e Testes

- **Verificações realizadas:** busca completa de `not in` em `revision-3/PROPOSED-MIGRATION-REVISED.sql` e comparação com `20261110000002_functions_triggers.sql` e `20261113143000_security_hardening.sql`.
- **Testes realmente executados:** Nenhum (`0` execuções SQL).
- **Testes apenas planejados:** cenários de validação de `role NULL`, perfil inexistente, suspensão, concorrência/`55P03` e autorização nas 4 RPCs (a executar na Fase 2B após aprovação).

---

**Confirmação explícita:** Não houve execução SQL local ou remota, nenhuma migration oficial foi criada ou modificada em `supabase/migrations/`, nenhum arquivo de aplicação foi alterado e nenhum banco ou conta foi tocado.

**Parada obrigatória:** Aguardando aprovação humana explícita antes de qualquer outra alteração ou aplicação de migration.
