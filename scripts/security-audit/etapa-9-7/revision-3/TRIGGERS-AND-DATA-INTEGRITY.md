# VEXOR — Etapa 9.7 (Revisão 3) — Triggers, Proteção de Campos e Integridade de Dados

**Data:** 2026-11-15  
**Base inspecionada:** `scripts/security-audit/etapa-9-7/revision-2/MIGRATION-REVISED.sql`, `src/features/cybercrime-research/types.ts`, `supabase/seed.sql`.

---

## 1. Proteção dos Campos Administrativos (`research_protect_fields()`)

### 1.1 Vulnerabilidade / Lacuna na `revision-2`
Na `revision-2`, `research_protect_fields()` verificava apenas `author_id` e `slug` no `UPDATE`. Os campos administrativos `status`, `rejection_reason`, `reviewed_by`, `reviewed_at` e `published_at` dependiam exclusivamente dos `GRANT UPDATE` por coluna. Embora o `GRANT` bloqueie escrita direta por `authenticated`, defesa em profundidade exige proteção também no trigger, sem depender de variáveis controláveis pelo cliente.

### 1.2 Solução Segura na `revision-3` (Sem Valores Controláveis pelo Cliente)
Em PostgreSQL/Supabase, requisições de clientes executam com `current_user IN ('anon', 'authenticated')`, enquanto funções `SECURITY DEFINER` (como `moderate_research` e `resubmit_research`) executam com `current_user` igual ao owner da função (ex.: `postgres`), o que **não** pode ser falsificado pelo cliente via payload ou GUC.

Regras aplicadas em `research_protect_fields()`:
- **`INSERT`:** sobrescreve incondicionalmente `author_id := auth.uid()`, `status := 'pending'`, `rejection_reason := null`, `reviewed_by := null`, `reviewed_at := null`, `published_at := null`.
- **`UPDATE` (incondicional para qualquer `current_user`):**
  - `author_id` imutável (`is distinct from old.author_id` → `42501`).
  - `slug` imutável (`is distinct from old.slug` → `42501`).
- **`UPDATE` (quando `current_user in ('anon', 'authenticated')`):**
  - Bloqueia com `42501` qualquer alteração em `status`, `rejection_reason`, `reviewed_by`, `reviewed_at` ou `published_at`.
  - Somente RPCs `SECURITY DEFINER` autorizadas (`moderate_research`, `resubmit_research`) conseguem transicionar esses 5 campos.

---

## 2. Correção Conceitual de `research_text_array_matches()` (CVEs e ATT&CK)

### 2.1 Falhas na `revision-2`
A função anterior:
```sql
select coalesce((select bool_and(elem ~ p_pattern) from unnest(p_items) as elem), true);
```
apresentava **3 falhas graves**:
1. **Elementos `NULL`:** em SQL, `NULL ~ pattern` retorna `NULL`, e `bool_and()` ignora `NULL`. Assim, `ARRAY['CVE-2024-1234', NULL]` retornava `TRUE`!
2. **Arrays multidimensionais:** `ARRAY[['CVE-2024-1234']]` (`array_ndims = 2`) era achatado por `unnest()` e aceito.
3. **Duplicidades:** `ARRAY['CVE-2024-1234', 'CVE-2024-1234']` era aceito sem deduplicação.

### 2.2 Implementação Corrigida (`revision-3`)
```sql
create or replace function public.research_valid_code_array(
  p_items   text[],
  p_pattern text,
  p_max_len integer
)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select
    p_items is not null
    and (array_ndims(p_items) is null or array_ndims(p_items) = 1)
    and cardinality(p_items) <= p_max_len
    and not exists (
      select 1
        from unnest(p_items) as elem
       where elem is null or elem !~ p_pattern
    )
    and (
      select count(distinct elem) = cardinality(p_items)
        from unnest(p_items) as elem
    );
$$;
```

### 2.3 Exemplos Práticos (CVEs e ATT&CK)
- **Válidos:**
  - `cves`: `'{}'::text[]`, `ARRAY['CVE-2024-12345', 'CVE-2025-0001']`
  - `attack_techniques`: `'{}'::text[]`, `ARRAY['T1059', 'T1059.001']`
- **Inválidos (rejeitados pelas CHECK constraints):**
  - Elemento nulo: `ARRAY['CVE-2024-1234', NULL]`
  - Array multidimensional: `ARRAY[['T1059'], ['T1078']]`
  - Duplicado: `ARRAY['T1059', 'T1059']`
  - Formato inválido: `ARRAY['cve-2024-1234']`, `ARRAY['T1059.1']`, `ARRAY['CVE-2024-12']`
  - Cardinalidade excedida: `> 20` CVEs ou `> 30` técnicas ATT&CK.

---

## 3. Contrato Explícito de `source_references` (JSONB)

Alinhado a `ResearchSourceReference` (`src/features/cybercrime-research/types.ts`):
- **Tipo raiz:** `jsonb_typeof(source_references) = 'array'`, máximo de `20` itens (`jsonb_array_length <= 20`).
- **Cada elemento:** objeto JSON (`jsonb_typeof(v_ref) = 'object'`).
- **Chaves permitidas exclusivamente:** `title`, `url`, `isExternal`. Qualquer chave desconhecida é rejeitada com `22023`.
- **Regras por campo:**
  - `title` (obrigatório): `jsonb_typeof(v_ref -> 'title') = 'string'` e `char_length(btrim(v_ref ->> 'title')) between 1 and 200`.
  - `url` (opcional; se presente e não nulo): `jsonb_typeof(v_ref -> 'url') = 'string'`, `char_length(v_ref ->> 'url') <= 500` e `(v_ref ->> 'url') ~ '^https://[^[:space:]]+$'`.
  - `isExternal` (opcional; se presente e não nulo): `jsonb_typeof(v_ref -> 'isExternal') = 'boolean'`.

---

## 4. Categorias e Extensão `extensions.unaccent`

1. **`extensions.unaccent`:** definida em `20261110000001_schema.sql:15` (`create extension if not exists unaccent with schema extensions;`) e já utilizada em `resources_set_slug()` (`20261110000002_functions_triggers.sql:249`). Portanto, `extensions.unaccent(new.title_pt)` em `research_set_slug()` é 100% compatível com `SET search_path = ''`.
2. **`public.category_scope` e categorias atuais (`supabase/seed.sql`):**
   - Definição atual: `enum ('resource', 'forum', 'both')`.
   - `supabase/seed.sql` define 12 categorias (`blue-team`, `red-team`, `osint`, `dfir`, `application-security`, `cloud-security`, `threat-intelligence`, `malware-analysis`, `network-security`, `grc`, `ai-security`, `career-learning`), todas com `scope = 'both'`.
   - O `seed.sql` não foi executado por esta auditoria (conforme restrição).
   - **Proposta para `research` (sem executar seed):** estender `category_scope` com `'research'` (`alter type public.category_scope add value if not exists 'research';`) e planejar seed futuro dedicado com categorias específicas de Cybercrime Research (ex.: `ransomware-operations`, `apt-campaigns`, `underground-economy`, `financial-fraud`, `botnet-infrastructure`, `identity-theft`, `cybercrime-legislation`), além de manter compatibilidade com categorias `'both'` caso desejado — ou restringir `research_protect_fields()` a `c.scope in ('research', 'both')` conforme já modelado.
