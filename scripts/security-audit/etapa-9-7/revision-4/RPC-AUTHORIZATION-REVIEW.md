# VEXOR — Etapa 9.7 (Revisão 4) — Revisão de Autorização e Concorrência nas RPCs

**Data:** 2026-11-16  
**Migrations oficiais comparadas:** `20261110000002_functions_triggers.sql` e `20261113143000_security_hardening.sql`.

---

## 1. Bug de Lógica Ternária (3VL) Corrigido na Comparação de Roles

Na Revisão 3, expressões como:
```sql
if not found or v_caller_susp is distinct from false or v_caller_role not in ('moderator', 'admin') then
```
continham uma falha sutil da lógica de três valores (3VL) do SQL caso `v_caller_role` fosse `NULL` em um perfil existente e não suspenso:
- `NULL NOT IN ('moderator', 'admin')` avalia para **`NULL`** (e não `TRUE`).
- `false OR false OR NULL` avalia para **`NULL`**, fazendo o `IF` **não** entrar no bloco `raise exception`!

### Correção Aplicada nas 4 RPCs
Em `moderate_research`, `grant_research_recipient` e `revoke_research_recipient`:
```sql
if not found
   or v_caller_susp is distinct from false
   or v_caller_role is null
   or v_caller_role not in ('moderator', 'admin') then
  raise exception 'forbidden' using errcode = '42501';
end if;
```

Em `resubmit_research` (reproduzindo `is_active_member()` com validação integral de integridade do perfil):
```sql
if not found
   or v_caller_susp is distinct from false
   or v_caller_role is null
   or v_caller_role not in ('member', 'moderator', 'admin') then
  raise exception 'forbidden' using errcode = '42501';
end if;
```

---

## 2. Comparação com Funções e RPCs Oficiais

| RPC | Pré-lock | Lock 1 | Lock 2 (V4) | Critério Pós-Lock |
|---|---|---|---|---|
| `moderate_research` | `auth.uid() is null or not public.is_moderator()` | `research_submissions FOR UPDATE` (`P0002`) | `profiles FOR SHARE NOWAIT` | `FOUND`, `is_suspended = false`, `role IN ('moderator', 'admin')` |
| `grant_research_recipient` | `auth.uid() is null or not public.is_moderator()` | `research_submissions FOR UPDATE` (`P0002`) | `profiles FOR SHARE NOWAIT` | `FOUND`, `is_suspended = false`, `role IN ('moderator', 'admin')` |
| `revoke_research_recipient` | `auth.uid() is null or not public.is_moderator()` | `research_submissions FOR UPDATE` (`P0002`) | `profiles FOR SHARE NOWAIT` | `FOUND`, `is_suspended = false`, `role IN ('moderator', 'admin')` |
| `resubmit_research` | `auth.uid() is null or not public.is_active_member()` | `research_submissions FOR UPDATE` (`P0002`) | `profiles FOR SHARE NOWAIT` | `FOUND`, `is_suspended = false`, `role IN ('member', 'moderator', 'admin')`, `author_id = auth.uid()` |

### Comparação com `admin_set_user_role` e `admin_set_user_suspension`
- Ambas as RPCs administrativas (`20261113143000_security_hardening.sql`) adquirem `pg_advisory_xact_lock(6216471958360507469)` → `profiles (caller) FOR SHARE NOWAIT` → `profiles (target) FOR UPDATE NOWAIT`.
- Nenhuma RPC administrativa adquire lock em `research_submissions`, portanto não há ciclo de deadlock AB-BA com a ordem `research_submissions FOR UPDATE` → `profiles FOR SHARE NOWAIT`.
- Em `grant_research_recipient`, também lemos o perfil do destinatário (`p_user_id`) com `FOR SHARE NOWAIT` (após o lock do chamador) para impedir que um usuário seja concedido como destinatário no exato milissegundo em que está sendo suspenso (`admin_set_user_suspension` detém `FOR UPDATE NOWAIT` sobre `p_user_id`). Como `admin_set_user_suspension` só trava `profiles`, continua não havendo ciclo AB-BA.

---

## 3. Tratamento de `SQLSTATE 55P03` (`lock_not_available`)

Quando `FOR SHARE NOWAIT` colide com `admin_set_user_role` ou `admin_set_user_suspension` em andamento sobre o mesmo perfil:
- O PostgreSQL aborta imediatamente com `SQLSTATE 55P03`, evitando autorização obsoleta (*stale authorization*).
- Os Route Handlers da aplicação devem mapear `55P03` explicitamente para **HTTP `409 Conflict`** com mensagem orientando nova tentativa.
