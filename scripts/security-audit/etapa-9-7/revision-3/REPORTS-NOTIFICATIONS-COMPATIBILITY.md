# VEXOR — Etapa 9.7 (Revisão 3) — Compatibilidade com `reports` e `notifications`

**Data:** 2026-11-15  
**Migrations oficiais inspecionadas:**
- `supabase/migrations/20261110000001_schema.sql` (linhas 32-33, 276-321)
- `supabase/migrations/20261110000003_rls_and_grants.sql` (linhas 82-84, 122-126, 412-436)
- `supabase/migrations/20261113143000_security_hardening.sql` (linhas 399-444)

---

## 1. Auditoria da Tabela `public.reports`

### 1.1 Estado Oficial Atual
- **Colunas:** `id`, `reporter_id`, `topic_id`, `post_id`, `resource_id`, `profile_id`, `reason`, `details`, `status`, `handled_by`, `handled_at`, `resolution_note`, `created_at`.
- **Constraint:** `reports_one_target check (num_nonnulls(topic_id, post_id, resource_id, profile_id) = 1)`.
- **Deduplicação:** 4 índices únicos parciais (`where <col> is not null and status in ('open','reviewing')`).
- **Grants (`20261110000003_rls_and_grants.sql:122-123`):**
  ```sql
  grant insert (topic_id, post_id, resource_id, profile_id, reason, details)
    on public.reports to authenticated;
  ```
- **Policies (`20261110000003_rls_and_grants.sql:412-422`):**
  - `reports_select`: `reporter_id = (select auth.uid()) or (select public.is_moderator())`
  - `reports_insert`: `reporter_id = (select auth.uid()) and (select public.is_active_member()) and status = 'open'`

### 1.2 Bloqueador Encontrado na `revision-2`
Na `revision-2`, a migration adicionava a coluna `research_id` em `public.reports`, atualizava `reports_one_target` e criava `reports_dedupe_research`, **porém não concedia `GRANT INSERT (research_id)` para `authenticated`**.  
Sem esse grant explícito por coluna, qualquer tentativa de um usuário autenticado criar uma denúncia com `research_id` falharia com `42501 permission denied for table reports`.

### 1.3 Correções Necessárias na `revision-3`
1. **Grant de coluna explícito:**
   ```sql
   grant insert (research_id) on public.reports to authenticated;
   ```
2. **Restrição de visibilidade na policy `reports_insert` (Prevenção de enumeração de pesquisas restritas):**
   - Para evitar que um usuário sem permissão em uma pesquisa `pending`/`rejected`/`archived` ou `TLP:AMBER`/`AMBER+`/`RED` tente denunciar um UUID arbitrário para inferir sua existência via erro de FK (`23503`) vs RLS (`42501`), recomenda-se estender `reports_insert` (ou validar na camada de API + policy) para exigir que, quando `research_id IS NOT NULL`, o alvo seja legível ao denunciante (`exists (select 1 from public.research_submissions r where r.id = research_id)` — como a subconsulta respeita RLS de `research_submissions`, só retorna `true` se o usuário tiver acesso de leitura àquela pesquisa).
3. **Verificação dos 5 requisitos:**
   - Criar denúncia por autenticado: **Compatível** após `grant insert (research_id)`.
   - Consultar no painel administrativo: **Compatível** (`grant select` já cobre a tabela inteira e `reports_select` permite `is_moderator()`).
   - Regra de exatamente 1 alvo: **Preservada** (`num_nonnulls(topic_id, post_id, resource_id, profile_id, research_id) = 1`).
   - Evitar duplicidade de denúncias abertas: **Preservada** (`reports_dedupe_research` em `(reporter_id, research_id) where research_id is not null and status in ('open', 'reviewing')`).
   - Preservar histórico: **Preservado** (`on delete restrict` em `reports.research_id` impede exclusão física se houver denúncias vinculadas).

---

## 2. Auditoria da Tabela `public.notifications`

### 2.1 Estado Oficial Atual
- **Grants (`20261110000003_rls_and_grants.sql:82-84, 125-126`):**
  - `grant select on public.notifications to authenticated;`
  - `grant update (read_at) on public.notifications to authenticated;`
  - `grant delete on public.notifications to authenticated;`
  - **Sem `GRANT INSERT`** para clientes (somente `SECURITY DEFINER` escreve).
- **Policies:** `notifications_select_own`, `notifications_update_own`, `notifications_delete_own`.

### 2.2 Compatibilidade com `research_approved` e `research_rejected`
- `alter type public.notification_type add value if not exists 'research_approved';`
- `alter type public.notification_type add value if not exists 'research_rejected';`
- `alter table public.notifications add column if not exists research_id uuid references public.research_submissions (id) on delete set null;`
- Como `public.moderate_research()` é `SECURITY DEFINER` e pertence ao owner da migration, ela ignora os grants de `authenticated` e insere diretamente em `public.notifications` sem necessidade de alterar `GRANT INSERT` nem as policies de `notifications`.
- **Atenção transacional PostgreSQL:** valores adicionados via `ALTER TYPE ... ADD VALUE` não devem ser referenciados em DDL/DML direto (ex.: `CHECK` ou `INSERT`) dentro da mesma transação em que foram criados; dentro do corpo PL/pgSQL de `moderate_research` (compilado em runtime), a referência funciona normalmente.
