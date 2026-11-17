# VEXOR — Etapa 9.7 (Fase 1.1) — Especificação de RPCs e Auditoria (`revision-1`)

**Data:** 2026-11-15  
**Padrões inspecionados:** `20261110000002_functions_triggers.sql` e `20261113143000_security_hardening.sql` (V4 lock + revalidação pós-lock).

---

## 1. Análise de `search_path`

As migrations oficiais do VEXOR utilizam `SET search_path = ''` com qualificação completa de todos os objetos (`public.*`, `auth.uid()`, `extensions.unaccent()`).  
Para atender ao requisito de `search_path` seguro e manter compatibilidade total com `pg_catalog`, `public` e `pg_temp` **sem risco de hijacking**:
- Usaremos `SET search_path = pg_catalog, public, pg_temp` **e** manteremos qualificação explícita (`public.*`, `auth.uid()`, `extensions.*`) em todas as referências dentro das funções `SECURITY DEFINER`. Como `pg_catalog` vem primeiro e `pg_temp` por último (nunca antes de `public`), objetos de catálogo nunca podem ser sombreados e objetos temporários nunca interceptam funções/tabelas de `public`.

---

## 2. RPC `public.moderate_research`

### 2.1 Assinatura e Privilégios
```sql
public.moderate_research(
  p_research_id uuid,
  p_decision    public.research_status,
  p_reason      text DEFAULT NULL
) RETURNS void
```
- `SECURITY DEFINER`
- `SET search_path = pg_catalog, public, pg_temp`
- `REVOKE ALL ON FUNCTION public.moderate_research(uuid, public.research_status, text) FROM PUBLIC, anon;`
- `GRANT EXECUTE ON FUNCTION public.moderate_research(uuid, public.research_status, text) TO authenticated;`

### 2.2 Regras de Negócio, Concorrência e Transições
1. **Autorização inicial:** `if not public.is_moderator() then raise exception 'forbidden' using errcode = '42501'; end if;`
2. **Validação de entrada:**
   - `p_decision in ('approved', 'rejected', 'archived')` (senão `22023`).
   - Se `p_decision = 'rejected'`, `p_reason` deve ter ao menos 5 caracteres após `btrim` (senão `22023`).
3. **Lock exclusivo na pesquisa (`FOR UPDATE`):**
   - `SELECT r.author_id, r.status INTO v_author_id, v_prev_status FROM public.research_submissions r WHERE r.id = p_research_id FOR UPDATE;`
   - Se `NOT FOUND` -> `P0002`.
4. **Revalidação pós-lock (Padrão V4):**
   - `SELECT p.role, p.is_suspended INTO v_caller_role, v_caller_susp FROM public.profiles p WHERE p.id = auth.uid() FOR SHARE NOWAIT;`
   - Se `NOT FOUND OR v_caller_susp OR v_caller_role NOT IN ('moderator', 'admin')` -> `42501`.
5. **Matriz de transições permitidas:**
   - `'pending'  -> 'approved' | 'rejected' | 'archived'`
   - `'approved' -> 'rejected' | 'archived'`
   - `'rejected' -> 'approved' | 'archived'`
   - `'archived' -> 'approved' | 'rejected'`
   - Bloqueia decisão redundante (`v_prev_status = p_decision` -> `22023` / conflito de estado).
6. **Atualização segura (sem tocar em `author_id`):**
   - Atualiza apenas `status`, `reviewed_by = auth.uid()`, `reviewed_at = now()`, `rejection_reason`, `published_at`.
7. **Auditoria append-only na mesma transação:**
   - `PERFORM public.write_audit_log('research.' || p_decision::text, 'research', p_research_id, jsonb_build_object('from', v_prev_status, 'to', p_decision, 'reason', nullif(btrim(coalesce(p_reason, '')), '')));`
8. **Notificação na mesma transação:**
   - Se `p_decision in ('approved', 'rejected')` e `v_author_id is not null` e `v_author_id <> auth.uid()`:
   - Verifica se o perfil destinatário existe e não está suspenso (`SELECT NOT p.is_suspended INTO v_recipient_active FROM public.profiles p WHERE p.id = v_author_id;`); se ativo, insere em `public.notifications (user_id, type, actor_id, research_id)` com `'research_approved'` ou `'research_rejected'`. Se falhar, toda a transação faz rollback atômico.

---

## 3. RPC `public.resubmit_research` (Transacional com Correção de Conteúdo)

### 3.1 Assinatura
```sql
public.resubmit_research(
  p_research_id       uuid,
  p_category_id       uuid,
  p_title_pt          text,
  p_summary_pt        text,
  p_body_pt           text,
  p_domain            public.research_domain,
  p_severity          public.research_severity,
  p_tlp               public.research_tlp,
  p_title_en          text DEFAULT NULL,
  p_summary_en        text DEFAULT NULL,
  p_body_en           text DEFAULT NULL,
  p_cves              text[] DEFAULT '{}',
  p_attack_techniques text[] DEFAULT '{}',
  p_source_references jsonb DEFAULT '[]'::jsonb,
  p_confidence_level  text DEFAULT NULL,
  p_methodology       text DEFAULT NULL,
  p_read_time_minutes integer DEFAULT 10
) RETURNS void
```

### 3.2 Fluxo Transacional
1. Verifica `public.is_active_member()` (`42501`).
2. Adquire lock exclusivo `SELECT r.author_id, r.status INTO v_author_id, v_prev_status FROM public.research_submissions r WHERE r.id = p_research_id FOR UPDATE;` (`P0002` se inexistente).
3. Revalida pós-lock o autor no `profiles` (`FOR SHARE NOWAIT` -> `not is_suspended`).
4. Valida `v_author_id = auth.uid()` (`42501` se não for o autor) e `v_prev_status = 'rejected'` (`22023` se não estiver rejeitada).
5. Atualiza conteúdo e redefine `status = 'pending'`, `rejection_reason = NULL`, `reviewed_by = NULL`, `reviewed_at = NULL`, preservando intactos `id`, `slug` e `author_id` (as constraints CHECK e o trigger `research_protect_fields` validam todos os novos campos).
6. Registra auditoria: `PERFORM public.write_audit_log('research.resubmitted', 'research', p_research_id, jsonb_build_object('from', v_prev_status, 'to', 'pending'));`.
