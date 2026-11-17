# VEXOR — Etapa 9.7 — Revisão 4: Relatório Final

**Data:** 2026-11-16  
**Status:** Revisão 4 concluída (somente análise, documentação e proposta textual SQL; nenhum SQL executado e nenhum banco alterado).

---

## 1. Entregáveis Criados em `scripts/security-audit/etapa-9-7/revision-4/`

1. `RLS-RECURSION-REVIEW.md`
2. `RPC-AUTHORIZATION-REVIEW.md`
3. `RECIPIENT-LIFECYCLE-AND-TLP.md`
4. `AUDIT-AND-NOTIFICATIONS-REVIEW.md`
5. `TRIGGERS-AND-PRIVILEGES-REVIEW.md`
6. `REPORTS-COMPATIBILITY-REVIEW.md`
7. `PROPOSED-MIGRATION-REVISION-4.sql` *(proposta textual; NÃO aplicada)*
8. `TEST-PLAN-AND-RISKS.md`
9. `FINAL-REPORT.md`

---

## 2. Problemas Encontrados na Revisão 3 e Correções Propostas

| Área | Problema encontrado na Revisão 3 | Correção aplicada na Revisão 4 |
|---|---|---|
| **Recursão RLS** | Ciclo mútuo entre `research_select` (`research_submissions` → `research_recipients`) e `research_recipients_select` (`research_recipients` → `research_submissions`) causando `42P17`. | Criada função auxiliar `public.is_research_author(uuid)` (`SECURITY DEFINER`, `SET search_path = ''`, usando `auth.uid()` e verificando `not p.is_suspended`), quebrando o ciclo sem oráculo de existência. Documentada também alternativa mais simples. |
| **Lógica ternária (3VL) em roles** | `v_caller_role NOT IN ('moderator', 'admin')` avaliava para `NULL` se `v_caller_role` fosse `NULL`, não disparando o `IF` caso `FOUND` e `is_suspended = false`. | Todas as 4 RPCs agora verificam explicitamente `v_caller_role is null or v_caller_role not in (...)` após o lock V4. |
| **Gestão de destinatários TLP** | `grant_research_recipient` permitia concessão em `pending`/`rejected`/`archived` e `CLEAR`/`GREEN`, além de sobrescrever silenciosamente `granted_by` e `justification` no `ON CONFLICT`. | Exige `status = 'approved'`, bloqueia `CLEAR`/`GREEN`, valida destinatário via `FOR SHARE NOWAIT`, preserva `granted_by`/`created_at` originais, adiciona `updated_by`/`updated_at`, torna repetições idempotentes e distingue `research.recipient_granted` de `research.recipient_updated`. |
| **Revogação** | Gravava auditoria mesmo quando nenhuma linha era removida. | Usa `DELETE ... RETURNING` e só registra `research.recipient_revoked` quando `FOUND`, mantendo idempotência. |

---

## 3. Problemas Ainda Não Resolvidos (Dependem das Fases 2B/2C)

- Aplicação controlada da migration e execução do seed de categorias `'research'` em ambiente isolado.
- Mapeamento explícito de `SQLSTATE 55P03` para HTTP `409 Conflict` nos Route Handlers (`/api/research/**`).
- Suporte a `entity_type = 'research'` e eventos `research.recipient_*` no painel de auditoria administrativa.

---

## 4. Compatibilidade com Migrations Oficiais e Riscos Residuais

- **Compatibilidade:** 100% alinhada a `20261110000001_schema.sql`, `20261110000002_functions_triggers.sql`, `20261110000003_rls_and_grants.sql` e `20261113143000_security_hardening.sql` (`SET search_path = ''`, padrão V4 `FOR UPDATE` → `FOR SHARE NOWAIT`, `write_audit_log`, `reports` grants/policies preservados + `GRANT INSERT (research_id)` + anti-enumeração, `notifications` via `SECURITY DEFINER`).
- **Riscos residuais:** separação transacional entre `ALTER TYPE ... ADD VALUE` e `INSERT` de seed; contenção momentânea `55P03` em concorrência direta com alterações administrativas de perfil.

---

## 5. Testes Executados vs. Pendentes

- **Testes realmente executados:** Nenhum (`0` comandos SQL executados).
- **Testes pendentes (planejados):** 18 cenários SQL (`T01` a `T18`) em `TEST-PLAN-AND-RISKS.md`.

---

**Confirmação explícita:** Nenhum comando SQL foi executado (local ou remotamente), nenhuma migration oficial foi criada em `supabase/migrations/`, nenhum arquivo da aplicação foi modificado e nenhum banco ou conta foi alterado.

**PARADA OBRIGATÓRIA:** Aguardando aprovação humana explícita para avançar para a próxima fase.
