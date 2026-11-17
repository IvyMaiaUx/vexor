# VEXOR — Etapa 9.7 (Fase 1.1) — RLS e Grants Revisados (`revision-1`)

**Data:** 2026-11-15  
**Base de comparação:** `supabase/migrations/20261110000003_rls_and_grants.sql`

---

## 1. Princípio de Defesa em Duas Camadas

Seguindo exatamente a arquitetura da Migration 03:
1. **Privilégios por Coluna (`GRANT`):** bloqueiam na raiz qualquer tentativa de escrita em colunas sensíveis (`id`, `slug`, `author_id`, `status`, `rejection_reason`, `reviewed_by`, `reviewed_at`, `published_at`, `created_at`, `updated_at`), mesmo que uma policy RLS seja alterada no futuro.
2. **Row Level Security (`RLS`):** restringe quais linhas podem ser lidas, inseridas ou editadas por `authenticated`.

---

## 2. Grants Detalhados

```sql
alter table public.research_submissions enable row level security;
revoke all on public.research_submissions from public, anon, authenticated;

-- Anon não possui NENHUM privilégio (nem SELECT).
grant select on public.research_submissions to authenticated;

-- Escrita direta restrita às colunas de conteúdo do autor:
grant insert (
  category_id, title_pt, title_en, summary_pt, summary_en, body_pt, body_en,
  domain, severity, tlp, cves, attack_techniques, source_references,
  confidence_level, methodology, read_time_minutes
) on public.research_submissions to authenticated;

grant update (
  category_id, title_pt, title_en, summary_pt, summary_en, body_pt, body_en,
  domain, severity, tlp, cves, attack_techniques, source_references,
  confidence_level, methodology, read_time_minutes
) on public.research_submissions to authenticated;
```

- **`DELETE`:** **Nenhum `GRANT DELETE`** é concedido a `anon` ou `authenticated`.
- **Privilégios herdados:** Como a Migration 03 já executou `alter default privileges in schema public revoke all on tables from anon, authenticated;` e nossa migration executa `revoke all on public.research_submissions from public, anon, authenticated;`, não há privilégios residuais ou herdados.

---

## 3. Policies RLS Completas

### 3.1 `SELECT` (`research_select`)
```sql
create policy research_select on public.research_submissions
  for select to authenticated
  using (
    (
      public.is_active_member()
      and (
        status = 'approved'
        or author_id = (select auth.uid())
      )
    )
    or public.is_moderator()
  );
```
- **Visitante `anon`:** bloqueado (sem `GRANT SELECT` e fora do role `authenticated`).
- **Member/Moderator/Admin suspenso:** `is_active_member() = false` e `is_moderator() = false` (pois `current_user_role()` filtra `not p.is_suspended`) -> **0 linhas visíveis**.
- **Member ativo:** lê pesquisas `'approved'` e suas próprias pesquisas (`'pending'`, `'rejected'`, `'archived'`). Nunca lê pesquisas `'pending'`/`'rejected'`/`'archived'` de terceiros.
- **Moderator/Admin ativo:** lê todas as pesquisas para fila de moderação, sem ampliar acesso de membros comuns.

### 3.2 `INSERT` (`research_insert`)
```sql
create policy research_insert on public.research_submissions
  for insert to authenticated
  with check (
    public.is_active_member()
    and author_id = (select auth.uid())
    and status = 'pending'
  );
```
- Em conjunto com o trigger `BEFORE INSERT` (`research_protect_fields`), garante que contas suspensas não inserem e que toda submissão nasce com `author_id = auth.uid()` e `status = 'pending'`.

### 3.3 `UPDATE` (`research_update_own_pending`)
```sql
create policy research_update_own_pending on public.research_submissions
  for update to authenticated
  using (
    public.is_active_member()
    and author_id = (select auth.uid())
    and status = 'pending'
  )
  with check (
    public.is_active_member()
    and author_id = (select auth.uid())
    and status = 'pending'
  );
```
- O `WITH CHECK` revalida explicitamente `public.is_active_member()`, `author_id = (select auth.uid())` e `status = 'pending'`.
- Pesquisas `'approved'`, `'rejected'` ou `'archived'` não podem ser editadas diretamente via `UPDATE`; pesquisas `'rejected'` são corrigidas e reenviadas exclusivamente pela RPC transacional `resubmit_research(...)`.
