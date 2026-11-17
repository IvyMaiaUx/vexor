# VEXOR — Etapa 9.7 (Revisão 2) — Especificação de RPCs e Auditoria (`revision-2`)

**Data:** 2026-11-15  
**Base inspecionada:** `supabase/migrations/20261110000002_functions_triggers.sql` e `supabase/migrations/20261113143000_security_hardening.sql` (padrão V4 de lock e revalidação pós-lock).

---

## 1. Padronização de `search_path`

Todas as funções das migrations oficiais do VEXOR (`20261110000001_schema.sql`, `20261110000002_functions_triggers.sql` e `20261113143000_security_hardening.sql`) utilizam `SET search_path = ''` com qualificação explícita de todos os objetos (`public.*`, `auth.uid()`, `extensions.unaccent()`).

Na `revision-2`, todas as funções e triggers do módulo `research_submissions` passam a adotar o padrão oficial **`SET search_path = ''`** com qualificação explícita, eliminando qualquer divergência com as migrations oficiais e prevenindo *search_path hijacking* (inclusive sobre `pg_temp` e `public`). Funções nativas do PostgreSQL (`btrim`, `coalesce`, `nullif`, `now`, `jsonb_build_object`, `char_length`, `unnest`, `bool_and`, etc.) residem em `pg_catalog`, que é sempre pesquisado implicitamente pelo PostgreSQL mesmo com `search_path = ''`.

---

## 2. Matriz Oficial de Transições de Estado

### 2.1 Transições permitidas na `moderate_research()`
- `pending` → `approved` | `rejected` | `archived`
- `approved` → `archived`
- `rejected` → `archived`
- `archived` → **nenhuma transição direta** (estado terminal para `moderate_research()`)

Decisões redundantes (`v_prev_status = p_decision`) ou transições fora da matriz acima são rejeitadas com `ERRCODE = '22023'`.

### 2.2 Reenvio de pesquisas rejeitadas (`resubmit_research()`)
- `rejected` → `pending` (única transição válida), com atualização obrigatória dos campos de conteúdo e limpeza de `rejection_reason`, `reviewed_by` e `reviewed_at`.

### 2.3 Operação futura de republicação de pesquisas arquivadas (não implementada nesta etapa)
Caso o produto venha a exigir desarquivamento/republicação de pesquisas em `archived`, deverá ser criada uma RPC dedicada em etapa futura (por exemplo, `public.republish_research(p_research_id uuid, p_reason text)`), com os seguintes requisitos mínimos:
1. Restrita a `admin` (ou `moderator` conforme política de governança), com `SECURITY DEFINER`, `SET search_path = ''` e revalidação pós-lock V4 (`FOR SHARE NOWAIT`).
2. Exigência de justificativa obrigatória (`p_reason` com mínimo de 5 caracteres após `btrim`).
3. Transição controlada exclusivamente para `pending` (submetendo a pesquisa a nova revisão editorial antes de voltar a `approved`), nunca reativando diretamente sem revisão.
4. Registro explícito em `public.audit_logs` (`'research.republished'`, `from: 'archived'`, `to: 'pending'`, `reason`).

*Esta operação NÃO é implementada na Etapa 9.7 nem consta em `MIGRATION-REVISED.sql`.*

---

## 3. RPC `public.moderate_research`

### 3.1 Assinatura e Privilégios
```sql
public.moderate_research(
  p_research_id uuid,
  p_decision    public.research_status,
  p_reason      text DEFAULT NULL
) RETURNS void
```
- `LANGUAGE plpgsql`
- `SECURITY DEFINER`
- `SET search_path = ''`
- `REVOKE ALL ON FUNCTION public.moderate_research(uuid, public.research_status, text) FROM PUBLIC, anon;`
- `GRANT EXECUTE ON FUNCTION public.moderate_research(uuid, public.research_status, text) TO authenticated;`

### 3.2 Fluxo, Ordem de Locks, Códigos de Erro e Efeitos
1. **Autorização inicial (fail-fast):**
   - `IF NOT public.is_moderator() THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;`
2. **Validação de entrada:**
   - `p_decision IN ('approved', 'rejected', 'archived')` (caso contrário, `ERRCODE = '22023'`).
   - Se `p_decision = 'rejected'`, `v_clean_reason := nullif(btrim(coalesce(p_reason, '')), '')` deve ter `char_length(v_clean_reason) >= 5` (caso contrário, `ERRCODE = '22023'`).
3. **Lock 1 — Lock exclusivo na pesquisa (`FOR UPDATE`):**
   - `SELECT r.author_id, r.status INTO v_author_id, v_prev_status FROM public.research_submissions r WHERE r.id = p_research_id FOR UPDATE;`
   - Se `NOT FOUND` → `ERRCODE = 'P0002'`.
4. **Lock 2 — Revalidação pós-lock do chamador (Padrão V4):**
   - `SELECT p.role, p.is_suspended INTO v_caller_role, v_caller_susp FROM public.profiles p WHERE p.id = auth.uid() FOR SHARE NOWAIT;`
   - Se `NOT FOUND OR v_caller_susp IS DISTINCT FROM false OR v_caller_role NOT IN ('moderator', 'admin')` → `ERRCODE = '42501'`.
   - Em caso de contenção simultânea com alteração de papel/suspensão (`admin_set_user_role` / `admin_set_user_suspension`), `FOR SHARE NOWAIT` falha imediatamente com `55P03` (`lock_not_available`).
5. **Validação da matriz de transições:**
   - Se `v_prev_status = p_decision` → `ERRCODE = '22023'`.
   - Se `v_prev_status = 'archived'` → `ERRCODE = '22023'`.
   - Se `v_prev_status IN ('approved', 'rejected') AND p_decision <> 'archived'` → `ERRCODE = '22023'`.
6. **Atualização segura (sem alterar `id`, `slug` ou `author_id`):**
   - `status = p_decision`
   - `reviewed_by = auth.uid()`
   - `reviewed_at = now()`
   - `rejection_reason = CASE WHEN p_decision = 'rejected' THEN v_clean_reason ELSE NULL END`
   - `published_at = CASE WHEN p_decision = 'approved' THEN coalesce(r.published_at, now()) ELSE r.published_at END`
7. **Auditoria append-only na mesma transação:**
   - `PERFORM public.write_audit_log('research.' || p_decision::text, 'research', p_research_id, jsonb_build_object('from', v_prev_status, 'to', p_decision, 'reason', v_clean_reason));`
8. **Notificação atômica na mesma transação:**
   - Se `p_decision IN ('approved', 'rejected') AND v_author_id IS NOT NULL AND v_author_id <> auth.uid()`:
   - Verifica `SELECT NOT p.is_suspended INTO v_recipient_active FROM public.profiles p WHERE p.id = v_author_id;`
   - Se `coalesce(v_recipient_active, false)`, insere em `public.notifications (user_id, type, actor_id, research_id)` com `'research_approved'::public.notification_type` ou `'research_rejected'::public.notification_type`.

---

## 4. RPC `public.resubmit_research` (Transacional com Correção de Conteúdo)

### 4.1 Assinatura e Privilégios
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
- `LANGUAGE plpgsql`
- `SECURITY DEFINER`
- `SET search_path = ''`
- `REVOKE ALL ON FUNCTION public.resubmit_research(...) FROM PUBLIC, anon;`
- `GRANT EXECUTE ON FUNCTION public.resubmit_research(...) TO authenticated;`

### 4.2 Análise da Revalidação Pós-Lock e Concorrência (Padrão V4)
Na migration oficial `20261110000002_functions_triggers.sql`, `public.is_active_member()` verifica:
```sql
select exists (
  select 1 from public.profiles p
  where p.id = auth.uid() and not p.is_suspended
);
```
Isso exige cumulativamente:
1. `auth.uid() IS NOT NULL` e existência da linha correspondente em `public.profiles` (`FOUND`);
2. `p.is_suspended = false` (`v_caller_susp IS DISTINCT FROM false` bloqueia tanto `true` quanto eventual `NULL`);
3. Perfil íntegro com papel válido (`v_caller_role IS NOT NULL`).

Na `revision-1`, `resubmit_research()` consultava apenas `p.is_suspended`. Na `revision-2`, a revalidação pós-lock consulta **`p.role, p.is_suspended`** com **`FOR SHARE NOWAIT`**:
- **Concorrência com `admin_set_user_suspension`:** ambas as RPCs administrativas da `20261113143000_security_hardening.sql` adquirem `FOR UPDATE NOWAIT` sobre `public.profiles`. Se a suspensão estiver em curso, `FOR SHARE NOWAIT` falha imediatamente com `55P03`; se a suspensão já tiver sido confirmada antes do lock, `v_caller_susp` reflete `true` e bloqueia com `42501`.
- **Concorrência com `admin_set_user_role`:** caso o papel do autor seja alterado concorrentemente (`member` ↔ `moderator` ↔ `admin`), `FOR SHARE NOWAIT` serializa a leitura com o `FOR UPDATE NOWAIT` administrativo; qualquer papel válido (`v_caller_role IS NOT NULL`) com `is_suspended = false` mantém elegibilidade para reenviar a própria pesquisa rejeitada (`v_author_id = auth.uid()`).
- **Ausência de deadlock AB-BA:** `admin_set_user_role` e `admin_set_user_suspension` bloqueiam apenas `pg_advisory_xact_lock` e `public.profiles` (nunca `research_submissions`). Em `resubmit_research()`, a ordem é `research_submissions FOR UPDATE` → `profiles FOR SHARE NOWAIT`, não formando ciclo.

### 4.3 Fluxo Transacional e Códigos de Erro
1. **Autorização inicial (fail-fast):** `IF auth.uid() IS NULL OR NOT public.is_active_member() THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;`
2. **Lock 1 — Lock exclusivo na pesquisa (`FOR UPDATE`):**
   - `SELECT r.author_id, r.status INTO v_author_id, v_prev_status FROM public.research_submissions r WHERE r.id = p_research_id FOR UPDATE;`
   - Se `NOT FOUND` → `ERRCODE = 'P0002'`.
3. **Lock 2 — Revalidação pós-lock de membro ativo (Padrão V4):**
   - `SELECT p.role, p.is_suspended INTO v_caller_role, v_caller_susp FROM public.profiles p WHERE p.id = auth.uid() FOR SHARE NOWAIT;`
   - Se `NOT FOUND OR v_caller_susp IS DISTINCT FROM false OR v_caller_role IS NULL` → `ERRCODE = '42501'`.
4. **Autoria:**
   - Se `v_author_id IS NULL OR v_author_id <> auth.uid()` → `ERRCODE = '42501'`.
5. **Estado válido:**
   - Se `v_prev_status <> 'rejected'` → `ERRCODE = '22023'`.
6. **Atualização transacional:**
   - Atualiza `category_id`, `title_pt`, `title_en`, `summary_pt`, `summary_en`, `body_pt`, `body_en`, `domain`, `severity`, `tlp`, `cves`, `attack_techniques`, `source_references`, `confidence_level`, `methodology`, `read_time_minutes`, além de `status = 'pending'`, `rejection_reason = NULL`, `reviewed_by = NULL`, `reviewed_at = NULL`.
   - Preserva `id`, `slug`, `author_id` e `published_at`. As constraints `CHECK` e o trigger `research_protect_fields` validam integralmente os novos dados.
7. **Auditoria append-only na mesma transação:**
   - `PERFORM public.write_audit_log('research.resubmitted', 'research', p_research_id, jsonb_build_object('from', v_prev_status, 'to', 'pending'));`
8. **Notificações:** não gera notificação ao próprio autor (registro exclusivo em `audit_logs`).
