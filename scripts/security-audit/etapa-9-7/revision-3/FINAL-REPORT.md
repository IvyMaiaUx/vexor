# VEXOR — Etapa 9.7 — Revisão 3: Relatório Final de Auditoria de Segurança e Compatibilidade

**Data:** 2026-11-15  
**Status:** Revisão 3 concluída (somente leitura, análise e planejamento; nenhum SQL executado e nenhum banco alterado).

---

## 1. Arquivos Criados em `scripts/security-audit/etapa-9-7/revision-3/`

1. `TLP-ACCESS-CONTROL-ANALYSIS.md`
2. `RPC-AUTHORIZATION-REVIEW.md`
3. `REPORTS-NOTIFICATIONS-COMPATIBILITY.md`
4. `TRIGGERS-AND-DATA-INTEGRITY.md`
5. `AUDIT-COMPATIBILITY.md`
6. `PROPOSED-MIGRATION-REVISED.sql` *(proposta textual; NÃO aplicada)*
7. `TEST-PLAN-AND-RISKS.md`
8. `FINAL-REPORT.md`

---

## 2. Achados Críticos Identificados na `revision-2` e Corrigidos na `revision-3`

| Bloco | Achado na `revision-2` | Correção na `revision-3` |
|---|---|---|
| **Bloco 1 (TLP)** | `research_select` permitia leitura de pesquisas `approved` com `AMBER`, `AMBER+` e `RED` por qualquer membro ativo. | Criada tabela `public.research_recipients` (RLS + `REVOKE ALL` + `GRANT SELECT` apenas), RPCs `grant_research_recipient` / `revoke_research_recipient` (sem autoconcessão) e `research_select` aplicando TLP 2.0 no banco. |
| **Bloco 2 (RPCs)** | Faltava documentar formalmente o tratamento de `SQLSTATE 55P03` e comparar cada critério de `is_active_member()`, `is_moderator()`, `current_user_role()` e hardening V4. | Verificação integral documentada em `RPC-AUTHORIZATION-REVIEW.md`, mantendo ordem de locks coerente com `20261113143000_security_hardening.sql` e mapeamento de `55P03`. |
| **Bloco 3 (Reports)** | `public.reports` possui `GRANT INSERT` por coluna em `20261110000003_rls_and_grants.sql`; faltava `GRANT INSERT (research_id)` para `authenticated` e proteção contra enumeração de pesquisas restritas. | Adicionado `grant insert (research_id) on public.reports to authenticated;` e policy `reports_insert` validando visibilidade de `research_id` via RLS. |
| **Bloco 4 (Triggers)** | `research_protect_fields()` só protegia `author_id` e `slug` no `UPDATE`, deixando `status`, `rejection_reason`, `reviewed_by`, `reviewed_at` e `published_at` protegidos apenas pelos `GRANT`s. | Trigger atualizado para bloquear alteração direta desses 5 campos quando `current_user IN ('anon', 'authenticated')`, sem depender de valores controláveis pelo cliente. |
| **Bloco 5 (Arrays)** | `research_text_array_matches()` aceitava elementos `NULL` (pois `bool_and()` ignora `NULL`), arrays multidimensionais e elementos duplicados. | Substituída por `research_valid_code_array(text[], text, integer)` rejeitando `NULL`, `array_ndims > 1`, duplicidades, formato inválido e excesso de cardinalidade. |
| **Bloco 6 (`source_references`)** | Trigger não validava chaves desconhecidas nem tipos de `title` e `isExternal`. | Contrato JSONB estrito impondo apenas `{title, url, isExternal}`, tipos validados (`string`, `https://`, `boolean`) e máximo de 20 itens. |

---

## 3. Pendências Remanescentes e Riscos Conhecidos

- **Aplicação futura da migration e seed (Fase 2B):** depende de aprovação humana explícita; o seed de categorias de pesquisa deve rodar após o `ALTER TYPE public.category_scope ADD VALUE IF NOT EXISTS 'research'` em transação separada.
- **Mapeamento de erros e auditoria na aplicação (Fase 2B/2C):** tratar `SQLSTATE 55P03` como `409 Conflict` nos Route Handlers e incluir `entity_type = 'research'` no painel de auditoria.
- **Exposição pública futura de `TLP:CLEAR`:** caso o produto passe a permitir leitura anônima de `CLEAR`, será necessário revisar o guard `active_member` das rotas `/cybercrime-research` e conceder `GRANT SELECT` específico a `anon`.

---

## 4. Testes Executados vs. Planejados

- **Testes executados nesta Revisão 3:** Nenhum (`0` execuções SQL).
- **Testes planejados:** 18 cenários SQL documentados em `TEST-PLAN-AND-RISKS.md` (`T01` a `T18`), aguardando Fase 2B.

---

**Confirmação explícita:** Nenhum comando SQL foi executado (local ou remotamente), nenhuma migration oficial foi criada ou alterada, nenhum arquivo da aplicação foi modificado e nenhum banco ou conta foi alterado.

**PARADA OBRIGATÓRIA:** Aguardando aprovação humana explícita antes de iniciar qualquer implementação.
