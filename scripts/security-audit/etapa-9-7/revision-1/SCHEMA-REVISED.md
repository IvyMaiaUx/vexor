# VEXOR — Etapa 9.7 (Fase 1.1) — Modelo de Dados Revisado (`revision-1`)

**Data:** 2026-11-15  
**Escopo:** Revisão de segurança e integridade referencial da modelagem proposta para `public.research_submissions` e extensões relacionadas.

---

## 1. Decisões de Revisão (Itens A–G)

### A. Status Dedicado (`public.research_status`)
Na Fase 1 havia sido considerada a reutilização de `public.resource_status` (`pending`, `approved`, `rejected`, `archived`). Embora os rótulos iniciais coincidam, **reutilizar `resource_status` acopla o ciclo de vida editorial de pesquisas investigativas ao catálogo de ferramentas**. Pesquisas podem exigir estados futuros próprios (ex.: `draft`, `revision_requested`) sem impactar `public.resources` ou a RPC `moderate_resource`.  
**Decisão:** Criar ENUM próprio `public.research_status` inicialmente com `('pending', 'approved', 'rejected', 'archived')` e matriz explícita de transições em `moderate_research` e `resubmit_research`.

### B. Classificação TLP 2.0 (`public.research_tlp`)
Revisada conforme padrão **TLP 2.0** (FIRST):
- `'CLEAR'`, `'GREEN'`, `'AMBER'`, `'AMBER+'`, `'RED'`.
- **Regra explícita:** TLP é exclusivamente uma **classificação de compartilhamento e manuseio operacional (handling label)** exibida aos membros autorizados. **TLP não é mecanismo de autorização nem substitui RLS** no PostgreSQL.

### C. Categorias com Integridade Referencial (`category_id`)
- Substituído `category_slug text` (sem FK) por `category_id uuid not null references public.categories(id) on delete restrict`.
- `public.category_scope` atualmente aceita `('resource', 'forum', 'both')`. Na Fase 2, será estendido com `'research'` (`alter type public.category_scope add value if not exists 'research'`), permitindo cadastrar as 10 categorias oficiais do domínio Cybercrime Research sem quebrar ou ocultar categorias existentes de `resource`/`forum`.
- Trigger/validação de domínio garante que `category_id` aponte para uma categoria ativa (`is_active = true`) com `scope in ('research', 'both')`.

### D. Integridade Referencial, Exclusão Lógica e Preservação Histórica
- **Exclusão física bloqueada:** Clientes não recebem `DELETE` em `research_submissions`. Remoção editorial ocorre via **exclusão lógica** (`status = 'archived'`).
- **`reports.research_id`:** `uuid references public.research_submissions(id) on delete restrict` (nunca `cascade`). Garante que denúncias e evidências nunca sejam apagadas por exclusão acidental e preserva a invariante `reports_one_target` (`num_nonnulls(topic_id, post_id, resource_id, profile_id, research_id) = 1`).
- **`notifications.research_id`:** `uuid references public.research_submissions(id) on delete set null`. Preserva o histórico de notificações do usuário mesmo em eventual limpeza administrativa excepcional.
- **`audit_logs`:** `entity_id uuid` sem FK cascata + trigger `audit_logs_no_update_delete` garantem preservação append-only permanente.
- **Autor ou moderador excluído:** `author_id` e `reviewed_by` usam `references public.profiles(id) on delete set null`. Caso a conta seja removida, a pesquisa, denúncias e logs permanecem íntegros com `author_id = NULL` / `reviewed_by = NULL` (mesma convenção da Migration 01).

### E. Proteção de Autoria no Banco
- `author_id uuid references public.profiles(id) on delete set null default auth.uid()`.
- Trigger `BEFORE INSERT OR UPDATE` (`public.research_protect_fields()`):
  - No `INSERT`: força `new.author_id := auth.uid()`, `new.status := 'pending'`, `new.reviewed_by := null`, `new.reviewed_at := null`, `new.published_at := null`, `new.rejection_reason := null`.
  - No `UPDATE`: proíbe qualquer alteração de `author_id` (`if new.author_id is distinct from old.author_id then raise exception ... errcode = '42501'`) — **nem moderadores podem alterar autoria**.
- Contas suspensas (`not public.is_active_member()`) são bloqueadas no RLS tanto no `INSERT` quanto no `UPDATE` (`USING` e `WITH CHECK`).

### F. Geração Segura e Determinística de Slug
- O cliente **nunca** envia ou define `slug` (coluna excluída dos `GRANT INSERT`/`UPDATE`).
- Como `new.id` já possui `default gen_random_uuid()` antes do trigger `BEFORE INSERT`, `public.research_set_slug()` gera:
  `v_base := trim(both '-' from regexp_replace(lower(extensions.unaccent(new.title_pt)), '[^a-z0-9]+', '-', 'g'))`
  `new.slug := left(coalesce(nullif(v_base, ''), 'research'), 54) || '-' || substr(replace(new.id::text, '-', ''), 1, 8)`
- Isso é **determinístico** dado `(title_pt, id)`, imune a enumeração sequencial, imune a colisões de títulos idênticos e imutável após criação (`new.slug := old.slug` em updates comuns).

### G. Campos, Constraints e Limites de Payload
- `title_pt`: `text not null`, `char_length(btrim(title_pt)) between 5 and 180`.
- `title_en`: `text`, `null` ou `char_length(btrim(title_en)) between 5 and 180`.
- `summary_pt`: `text not null`, `char_length(btrim(summary_pt)) between 20 and 1000`.
- `summary_en`: `text`, `null` ou `char_length(btrim(summary_en)) between 20 and 1000`.
- `body_pt`: `text not null`, `char_length(btrim(body_pt)) between 20 and 50000`.
- `body_en`: `text`, `null` ou `char_length(btrim(body_en)) between 20 and 50000`.
- `cves`: `text[] not null default '{}'`, `cardinality(cves) <= 20`, cada elemento validado por trigger/função imutável (`^CVE-[0-9]{4}-[0-9]{4,7}$`).
- `attack_techniques`: `text[] not null default '{}'`, `cardinality(attack_techniques) <= 30`, cada elemento validado (`^T[0-9]{4}(\.[0-9]{3})?$`).
- `source_references`: `jsonb not null default '[]'::jsonb`, array com no máximo 20 itens; trigger valida cada objeto (`title` string 1–200 chars; `url` opcional `^https://` <= 500 chars; `isExternal` opcional boolean).
- `confidence_level`: `text`, `null` ou `in ('low', 'medium', 'high')`.
- `methodology`: `text`, `null` ou `char_length(btrim(methodology)) between 10 and 2000`.
- `read_time_minutes`: `integer not null default 10`, `between 1 and 180`.
- `rejection_reason`: `text`, `null` ou `char_length(btrim(rejection_reason)) between 5 and 1000`.
