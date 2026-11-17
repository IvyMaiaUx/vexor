# VEXOR — Etapa 9.7 (Fase 2C.1) — Revisão do Seed de Categorias `research`

**Data:** 2026-11-16  

---

## 1. Análise de `supabase/seed.sql`

- `supabase/seed.sql` insere 12 categorias base com `scope = 'both'` usando `INSERT INTO public.categories (...) VALUES (...) ON CONFLICT (slug) DO NOTHING;`.
- É **100% idempotente** e **não destrutivo** (não executa `UPDATE` nem `DELETE` em categorias existentes).
- Como o trigger `categories_after_change` grava em `audit_logs` apenas quando `auth.uid() is not null`, execuções administrativas via CLI/SQL Editor sem JWT não quebram por falta de ator.

---

## 2. Plano de Seed Específico para Categorias `research` (NÃO EXECUTADO)

Deverá ser executado **somente após** o commit da migration `20261116114600_research_submissions.sql` (pois utiliza o novo valor `'research'` do ENUM `public.category_scope`, exigindo transação separada do `ALTER TYPE ... ADD VALUE`):

```sql
insert into public.categories (slug, name_en, name_pt, scope, sort_order) values
  ('ransomware-operations', 'Ransomware Operations',  'Operações de Ransomware',   'research', 200),
  ('apt-campaigns',         'APT Campaigns',          'Campanhas APT',             'research', 210),
  ('underground-economy',   'Underground Economy',    'Economia Clandestina',      'research', 220),
  ('financial-fraud',       'Financial Fraud',        'Fraude Financeira',         'research', 230),
  ('botnet-infrastructure', 'Botnet Infrastructure',  'Infraestrutura de Botnets', 'research', 240),
  ('identity-abuse',        'Identity & Access Abuse','Abuso de Identidade',       'research', 250),
  ('cybercrime-legal',      'Cybercrime Legislation', 'Aspectos Legais e Perícia', 'research', 260)
on conflict (slug) do nothing;
```

### Garantias
1. **Idempotência:** `on conflict (slug) do nothing` garante reexecução segura sem erro.
2. **Preservação:** categorias existentes em `public.categories` (inclusive as `'both'` de catálogo/fórum) não são alteradas nem removidas.
3. **Ordem:** só pode rodar após `20261116114600_research_submissions.sql` estar comitada.
4. *(Observação: como `inspect db table-stats --linked` reportou `estimated_row_count: 0` em `public.categories`, recomenda-se também confirmar se `supabase/seed.sql` base precisa ser aplicado antes ou junto em transação própria na Fase 2C.2.)*
