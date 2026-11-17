# VEXOR — Etapa 9.7 (Fase 1) — Análise do Schema e Proposta de Modelagem

**Data:** 2026-11-15  
**Base analisada:** `20261110000001_schema.sql`, `20261110000002_functions_triggers.sql`, `20261110000003_rls_and_grants.sql`, `20261113143000_security_hardening.sql`.

---

## 1. Avaliação do Schema Existente

O banco atual possui 12 tabelas públicas (`profiles`, `categories`, `resources`, `topics`, `posts`, `tags`, `topic_tags`, `votes`, `bookmarks`, `reports`, `notifications`, `audit_logs`) e 9 ENUMs.

### Por que NÃO reutilizar `resources`, `topics` ou `posts` para pesquisas?
1. **`public.resources`** exige `url` obrigatória e única (`normalize_resource_url`), `type` (`tool`, `repository`, `script`, etc.) e `difficulty`, além de ser pública (`anon`) quando `approved`. Pesquisas de cibercrime são **restritas a membros autenticados ativos** (`active_member`), possuem metadados forenses específicos (`domain`, `severity`, `tlp`, `cves`, `attack_techniques`, `references`, conteúdo bilíngue/técnico) e **não possuem URL externa única obrigatória**.
2. **`public.topics` / `public.posts`** não possuem fluxo de pré-aprovação (`pending` -> `approved` / `rejected`), não têm `severity`, `tlp`, `cves`, `attack_techniques`, nem sigilo exclusivo de acesso para membros ativos.
3. **`public.reports`** aceita atualmente 4 alvos (`topic_id`, `post_id`, `resource_id`, `profile_id`) via constraint `reports_exactly_one_target`.
4. **`public.notifications`** possui ENUM `notification_type` (`topic_reply`, `solution_accepted`, `resource_approved`, `resource_rejected`) sem tipos para pesquisa.
5. **`public.categories`** usa `category_scope` (`'resource' | 'forum' | 'both'`).

**Conclusão:** É **tecnicamente necessário e justificado** criar uma estrutura dedicada (`public.research_submissions`) na Fase 2, mantendo `pillars`, `case_studies` e `lab_guides` editoriais curados inicialmente ou em evolução posterior, e integrando `research_submissions` ao fluxo real de submissão, biblioteca, moderação administrativa, denúncias e auditoria.

---

## 2. Necessidade de Novas Tabelas vs Reaproveitamento

| Entidade | Decisão | Justificativa |
|---|---|---|
| **Pesquisas / Artigos submetidos (`research_submissions`)** | **Nova tabela dedicada** | Fluxo próprio de submissão/moderação (`pending`, `approved`, `rejected`, `archived`), campos técnicos (`domain`, `severity`, `tlp`, `cves`, `attack_techniques`, `references`), acesso restrito a `is_active_member()` / autor / moderador. |
| **Categorias de Pesquisa** | **Reutilizar `public.categories` (estendendo `category_scope` com `'research'`) ou manter taxonomia oficial sincronizada** | Evita duplicar tabela de categorias bilíngues; permite associar `category_id` opcional/obrigatório se desejado. |
| **Tags** | **Opcional / Fase posterior** | `attack_techniques` (`text[]`) e `cves` (`text[]`) já atendem a busca técnica imediata sem tabela pivô extra na primeira entrega. |
| **Auditoria** | **Reutilizar `public.audit_logs`** | Já aceita `entity_type = 'research'` no domínio administrativo e é gravada via `write_audit_log(...)`. |
| **Denúncias** | **Extensão mínima em `public.reports`** | Adicionar coluna opcional `research_id uuid references public.research_submissions(id) on delete cascade` na constraint `reports_exactly_one_target` permite denunciar pesquisas publicadas. |
| **Notificações** | **Extensão mínima em `public.notifications` + `notification_type`** | Adicionar `'research_approved'`, `'research_rejected'` e `research_id` para notificar o autor na moderação. |
| **Debates Técnicos (`/discussions`)** | **Reaproveitar `topics`/`posts` em fase futura (com escopo/categoria dedicada)** ou manter separados até definição editorial | Evita criar um segundo fórum paralelo. |

---

## 3. Modelo de Dados Proposto (`public.research_submissions`)

### 3.1 Novos ENUMs Propostos
- `public.research_domain`: `'malware' | 'ransomware' | 'apt' | 'darkweb' | 'fraud' | 'botnets' | 'identity' | 'legal'`
- `public.research_severity`: `'critical' | 'high' | 'medium' | 'info'`
- `public.research_tlp`: `'CLEAR' | 'GREEN' | 'AMBER'`
- Status: reutilizar `public.resource_status` (`'pending' | 'approved' | 'rejected' | 'archived'`) — evita criar um ENUM redundante e alinha diretamente com `moderate_resource` / painel admin.

### 3.2 Colunas de `public.research_submissions`
- **Obrigatórias:**
  - `id uuid primary key default gen_random_uuid()`
  - `slug text not null unique` (gerado por trigger a partir do título + sufixo curto, imitando `resources_set_slug()`)
  - `author_id uuid references public.profiles(id) on delete set null default auth.uid()`
  - `title_pt text not null` (CHECK `char_length(btrim(title_pt)) between 5 and 180`)
  - `summary_pt text not null` (CHECK `char_length(btrim(summary_pt)) between 20 and 1000`)
  - `body_pt text not null` (CHECK `char_length(btrim(body_pt)) >= 20`)
  - `domain public.research_domain not null`
  - `severity public.research_severity not null default 'medium'`
  - `tlp public.research_tlp not null default 'CLEAR'`
  - `status public.resource_status not null default 'pending'`
  - `read_time_minutes integer not null default 10` (CHECK `between 1 and 180`)
- **Opcionais / Bilíngues / Técnicas:**
  - `title_en text`, `summary_en text`, `body_en text`
  - `category_slug text` (alinhado às 10 categorias oficiais ou FK para `categories`)
  - `cves text[] not null default '{}'` (CHECK `cardinality(cves) <= 20`)
  - `attack_techniques text[] not null default '{}'` (CHECK `cardinality(attack_techniques) <= 30`)
  - `source_references jsonb not null default '[]'::jsonb` (CHECK `jsonb_typeof(source_references) = 'array'`)
  - `confidence_level text` (CHECK `confidence_level in ('low', 'medium', 'high')`, opcional)
  - `methodology text` (opcional, <= 2000 chars)
- **Moderação e Timestamps (somente servidor/RPC):**
  - `rejection_reason text`
  - `reviewed_by uuid references public.profiles(id) on delete set null`
  - `reviewed_at timestamptz`
  - `published_at timestamptz`
  - `created_at timestamptz not null default now()`
  - `updated_at timestamptz not null default now()`
- **Índices:**
  - `(status, published_at desc)` para listagem paginada da biblioteca.
  - `(author_id, created_at desc)` para "Minhas submissões".
  - `(domain, severity)` para filtros combinados.
  - GIN em `attack_techniques` e `cves` ou índice `pg_trgm` em `title_pt` / `title_en` para busca textual.
