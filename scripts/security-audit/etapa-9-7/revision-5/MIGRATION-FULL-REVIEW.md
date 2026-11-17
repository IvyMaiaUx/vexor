# VEXOR — Etapa 9.7 (Revisão 5) — Revisão Geral de Integridade da Migration

**Data:** 2026-11-16  
**Artefato auditado:** `scripts/security-audit/etapa-9-7/revision-4/PROPOSED-MIGRATION-REVISION-4.sql`

---

## 1. Integridade Estrutural Verificada

1. **ENUMs e `ALTER TYPE` (linhas 8-17):** `research_status`, `research_domain`, `research_severity`, `research_tlp`, além de `category_scope` (`'research'`) e `notification_type` (`'research_approved'`, `'research_rejected'`). Os novos valores só são referenciados dentro de corpos PL/pgSQL, evitando erro transacional do PostgreSQL durante a execução da migration.
2. **Validação estrita de arrays (linhas 20-43, 82-83):** `research_valid_code_array(text[], text, integer)` bloqueia array `NULL`, array multidimensional (`array_ndims > 1`), elementos `NULL`, duplicidades, formato inválido e excesso de cardinalidade para `cves` (máx. 20) e `attack_techniques` (máx. 30).
3. **Contrato JSONB `source_references` (linhas 168-204):** exige array (`<= 20`), objetos com exclusivamente `{title, url, isExternal}`, `title` string `1..200`, `url` `https://` sem espaços (`<= 500`) e `isExternal` booleano.
4. **Slug e extensão `extensions.unaccent` (linhas 134-147):** compatível com `20261110000001_schema.sql:15` e `SET search_path = ''`; usa `new.id` já gerado pelo `DEFAULT gen_random_uuid()`.
5. **Categorias:** valida `c.is_active and c.scope in ('research', 'both')` no trigger `research_protect_fields()`.

---

## 2. Achados Consolidados de Integridade

| ID | Severidade | Trecho | Descrição / Impacto | Recomendação |
|---|---|---|---|---|
| **INT-01** | `LOW` | `PROPOSED-MIGRATION-REVISION-4.sql:391` | `p_decision` nulo em `moderate_research` cai em `23502` no `UPDATE` em vez de `22023`. (Mesmo item `RPC-01`). | Adicionar `p_decision is null or` antes de `p_decision not in (...)` quando gerar a migration oficial da Fase 2B. |
| **INT-02** | `INFORMATIONAL` | `PROPOSED-MIGRATION-REVISION-4.sql:15` | Qualquer `INSERT` de seed em `public.categories` com `scope = 'research'` deve ocorrer em transação separada **após** o commit desta migration. | Manter seed em script/etapa posterior na Fase 2B. |
| **INT-03** | `INFORMATIONAL` | `PROPOSED-MIGRATION-REVISION-4.sql:1-767` | Verificação completa de `SET search_path = ''`, qualificação explícita (`public.*`, `auth.uid()`, `extensions.unaccent()`), nomes de constraints/índices e compatibilidade com as 4 migrations oficiais: **sem conflitos**. | Nenhuma ação bloqueante. |
