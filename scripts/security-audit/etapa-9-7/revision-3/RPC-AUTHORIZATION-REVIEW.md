# VEXOR — Etapa 9.7 (Revisão 3) — Revisão de Autorização e Concorrência nas RPCs

**Data:** 2026-11-15  
**Migrations oficiais inspecionadas:**
- `supabase/migrations/20261110000002_functions_triggers.sql`
- `supabase/migrations/20261113143000_security_hardening.sql`

---

## 1. Definições Oficiais Inspecionadas

### 1.1 `public.current_user_role()`, `public.is_active_member()` e `public.is_moderator()`
Extraído de `20261110000002_functions_triggers.sql` (linhas 37-70):
- `current_user_role()`:
  ```sql
  select p.role
  from public.profiles p
  where p.id = auth.uid() and not p.is_suspended;
  ```
- `is_active_member()`:
  ```sql
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and not p.is_suspended
  );
  ```
- `is_moderator()`:
  ```sql
  select coalesce(public.current_user_role() in ('moderator', 'admin'), false);
  ```

### 1.2 `admin_set_user_role` e `admin_set_user_suspension` (`20261113143000_security_hardening.sql`)
- Ambas adquirem `PERFORM pg_advisory_xact_lock(6216471958360507469);`
- Revalidam o chamador via `SELECT p.role, p.is_suspended ... WHERE p.id = auth.uid() FOR SHARE NOWAIT;`
- Adquirem lock exclusivo no alvo via `SELECT ... FROM public.profiles p WHERE p.id = p_user_id FOR UPDATE NOWAIT;`

---

## 2. Comparação das Condições de Revalidação Pós-Lock

| Critério | `moderate_research` / `grant_research_recipient` / `revoke_research_recipient` | `resubmit_research` |
|---|---|---|
| **Fail-fast pré-lock** | `if auth.uid() is null or not public.is_moderator()` → `42501` | `if auth.uid() is null or not public.is_active_member()` → `42501` |
| **Perfil inexistente (`NOT FOUND`)** | Negado (`42501`) | Negado (`42501`) |
| **Perfil suspenso (`v_caller_susp IS DISTINCT FROM false`)** | Negado (`42501`) — cobre `true` e eventual `NULL` | Negado (`42501`) — cobre `true` e eventual `NULL` |
| **`role IS NULL` (`v_caller_role IS NULL`)** | Negado (`42501`) | Negado (`42501`) |
| **Role não autorizada** | `v_caller_role NOT IN ('moderator', 'admin')` → Negado (`42501`) | Qualquer `user_role` válido (`member`, `moderator`, `admin`) é membro ativo, desde que `v_author_id = auth.uid()` |
| **Autoria / alvo** | Não exige autoria (moderação) | `v_author_id IS NULL OR v_author_id <> auth.uid()` → Negado (`42501`) |

---

## 3. Ordem dos Locks e Tratamento de `SQLSTATE 55P03`

1. **Ordem dos locks (idêntica a `moderate_resource` e `resubmit_resource` em `20261113143000_security_hardening.sql`):**
   - Primeiro: `FOR UPDATE` em `public.research_submissions` (`p_research_id`). Se `NOT FOUND` → `P0002`.
   - Segundo: `FOR SHARE NOWAIT` em `public.profiles` (`auth.uid()`).
2. **Coerência com as migrations oficiais:**
   - `admin_set_user_role` e `admin_set_user_suspension` nunca bloqueiam `research_submissions`.
   - Portanto, não existe ciclo de deadlock AB-BA entre as RPCs de governança administrativa e as RPCs de `research_submissions`.
3. **Tratamento documentado para `SQLSTATE 55P03` (`lock_not_available`):**
   - Caso um administrador esteja executando `admin_set_user_role` ou `admin_set_user_suspension` sobre o perfil do chamador exatamente no mesmo instante (`FOR UPDATE NOWAIT`), o `FOR SHARE NOWAIT` em `moderate_research` / `resubmit_research` / `grant_research_recipient` / `revoke_research_recipient` falha imediatamente com `SQLSTATE 55P03` (`lock_not_available`), impedindo leitura defasada (TOCTOU) sem travar a transação.
   - A camada de Route Handler (`/api/research/**` e `/api/admin/**`) deve mapear `55P03` explicitamente para HTTP `409 Conflict` com mensagem segura orientando nova tentativa.
