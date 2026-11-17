# VEXOR — Etapa 9.7 (Fase 1) — Plano de Migration Proposto (Artefato de Planejamento)

> **ATENÇÃO:** Este SQL é exclusivamente um **artefato de planejamento**. **NÃO** foi aplicado ao banco remoto nem salvo em `supabase/migrations/`. Só será transformado em migration na Fase 2 após aprovação explícita.

---

## 1. Migration Proposta: `YYYYMMDDHHMMSS_cybercrime_research.sql`

### 1.1 Novos ENUMs e Extensões Mínimas
- Criar `public.research_domain`: `'malware' | 'ransomware' | 'apt' | 'darkweb' | 'fraud' | 'botnets' | 'identity' | 'legal'`
- Criar `public.research_severity`: `'critical' | 'high' | 'medium' | 'info'`
- Criar `public.research_tlp`: `'CLEAR' | 'GREEN' | 'AMBER'`
- Estender `public.notification_type` com `'research_approved'` e `'research_rejected'`.

### 1.2 SQL Proposto (Somente Planejamento)

```sql
-- =============================================================================
-- PLANEJAMENTO — NÃO APLICADO
-- Cybercrime Research: tabela dedicada, triggers, RLS, grants e RPCs
-- =============================================================================

create type public.research_domain   as enum (
  'malware', 'ransomware', 'apt', 'darkweb', 'fraud', 'botnets', 'identity', 'legal'
);
create type public.research_severity as enum ('critical', 'high', 'medium', 'info');
create type public.research_tlp      as enum ('CLEAR', 'GREEN', 'AMBER');

alter type public.notification_type add value if not exists 'research_approved';
alter type public.notification_type add value if not exists 'research_rejected';

create table public.research_submissions (
  id                 uuid primary key default gen_random_uuid(),
  slug               text not null unique,
  author_id          uuid references public.profiles (id) on delete set null default auth.uid(),
  title_pt           text not null,
  title_en           text,
  summary_pt         text not null,
  summary_en         text,
  body_pt            text not null,
  body_en            text,
  domain             public.research_domain not null,
  category_slug      text,
  severity           public.research_severity not null default 'medium',
  tlp                public.research_tlp not null default 'CLEAR',
  status             public.resource_status not null default 'pending',
  cves               text[] not null default '{}',
  attack_techniques  text[] not null default '{}',
  source_references  jsonb not null default '[]'::jsonb,
  confidence_level   text,
  methodology        text,
  read_time_minutes  integer not null default 10,
  rejection_reason   text,
  reviewed_by        uuid references public.profiles (id) on delete set null,
  reviewed_at        timestamptz,
  published_at       timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),

  constraint research_title_pt_len      check (char_length(btrim(title_pt)) between 5 and 180),
  constraint research_summary_pt_len    check (char_length(btrim(summary_pt)) between 20 and 1000),
  constraint research_body_pt_len       check (char_length(btrim(body_pt)) >= 20),
  constraint research_read_time_range   check (read_time_minutes between 1 and 180),
  constraint research_cves_max          check (cardinality(cves) <= 20),
  constraint research_techniques_max    check (cardinality(attack_techniques) <= 30),
  constraint research_refs_array        check (jsonb_typeof(source_references) = 'array'),
  constraint research_confidence_valid  check (confidence_level is null or confidence_level in ('low', 'medium', 'high')),
  constraint research_methodology_len   check (methodology is null or char_length(methodology) <= 2000)
);

create index research_status_pub_idx    on public.research_submissions (status, published_at desc);
create index research_author_idx        on public.research_submissions (author_id, created_at desc);
create index research_domain_sev_idx    on public.research_submissions (domain, severity);
create index research_techniques_gin    on public.research_submissions using gin (attack_techniques);
create index research_cves_gin          on public.research_submissions using gin (cves);

-- Reutiliza set_updated_at() existente
create trigger research_submissions_set_updated_at
  before update on public.research_submissions
  for each row execute function public.set_updated_at();

-- Extensão opcional para denúncias e notificações de pesquisa
alter table public.reports
  add column if not exists research_id uuid references public.research_submissions (id) on delete cascade;

alter table public.notifications
  add column if not exists research_id uuid references public.research_submissions (id) on delete cascade;

-- RLS & Grants (deny-all baseline)
alter table public.research_submissions enable row level security;
revoke all on public.research_submissions from public, anon, authenticated;

grant select on public.research_submissions to authenticated;
grant insert (
  title_pt, title_en, summary_pt, summary_en, body_pt, body_en,
  domain, category_slug, severity, tlp, cves, attack_techniques,
  source_references, confidence_level, methodology, read_time_minutes
) on public.research_submissions to authenticated;
grant update (
  title_pt, title_en, summary_pt, summary_en, body_pt, body_en,
  domain, category_slug, severity, tlp, cves, attack_techniques,
  source_references, confidence_level, methodology, read_time_minutes
) on public.research_submissions to authenticated;

create policy research_select on public.research_submissions
  for select to authenticated
  using (
    (public.is_active_member() and (status = 'approved' or author_id = (select auth.uid())))
    or public.is_moderator()
  );

create policy research_insert on public.research_submissions
  for insert to authenticated
  with check (
    public.is_active_member()
    and author_id = (select auth.uid())
    and status = 'pending'
  );

create policy research_update_own_pending on public.research_submissions
  for update to authenticated
  using (
    public.is_active_member()
    and author_id = (select auth.uid())
    and status = 'pending'
  )
  with check (
    author_id = (select auth.uid())
    and status = 'pending'
  );
```

### 1.3 Observação sobre `reports_exactly_one_target` e RPCs
- Atualizar `reports_exactly_one_target` em `public.reports` para incluir `research_id` (`num_nonnulls(topic_id, post_id, resource_id, profile_id, research_id) = 1`).
- Criar `moderate_research(uuid, resource_status, text)` e `resubmit_research(uuid)` como `SECURITY DEFINER` com `SET search_path = public, pg_temp`, `REVOKE ALL FROM public, anon`, `GRANT EXECUTE TO authenticated`, gravando `audit_logs` e `notifications`.
