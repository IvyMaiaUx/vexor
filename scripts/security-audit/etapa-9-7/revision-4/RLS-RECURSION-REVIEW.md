# VEXOR — Etapa 9.7 (Revisão 4) — Análise e Correção de Recursão RLS

**Data:** 2026-11-16  
**Base inspecionada:** `scripts/security-audit/etapa-9-7/revision-3/PROPOSED-MIGRATION-REVISED.sql` e `supabase/migrations/20261110000003_rls_and_grants.sql`.

---

## 1. Diagnóstico da Recursão Circular na Revisão 3

Na Revisão 3, existia uma dependência mútua entre duas policies de `SELECT`:

1. `public.research_submissions` → policy `research_select`:
   ```sql
   exists (
     select 1 from public.research_recipients rr
     where rr.research_id = research_submissions.id
       and rr.user_id = (select auth.uid())
   )
   ```
2. `public.research_recipients` → policy `research_recipients_select`:
   ```sql
   exists (
     select 1 from public.research_submissions r
     where r.id = research_recipients.research_id
       and r.author_id = (select auth.uid())
   )
   ```

Quando um usuário `authenticated` consulta `research_submissions` para uma pesquisa `approved` com `tlp IN ('AMBER', 'AMBER+', 'RED')`, o PostgreSQL avalia `research_select`, que consulta `research_recipients`, que dispara `research_recipients_select`, que volta a consultar `research_submissions` — gerando erro **`42P17: infinite recursion detected in policy for relation "research_submissions"`**.

---

## 2. Solução Proposta: Função Auxiliar `public.is_research_author(uuid)`

Para quebrar o ciclo RLS mantendo a visibilidade legítima do autor sobre os destinatários de sua própria pesquisa:

```sql
create or replace function public.is_research_author(p_research_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
      from public.research_submissions r
      join public.profiles p on p.id = r.author_id
     where r.id = p_research_id
       and r.author_id = auth.uid()
       and not p.is_suspended
  );
$$;
```

### Análise de Segurança da Função Auxiliar
| Critério | Atendimento |
|---|---|
| `SET search_path = ''` | Sim, obrigatório, alinhado às migrations oficiais. |
| Qualificação explícita | `public.research_submissions`, `public.profiles`, `auth.uid()`. |
| Identidade via `auth.uid()` | Não aceita `user_id` arbitrário do cliente; compara exclusivamente com `auth.uid()`. |
| Estado ativo do usuário | Faz `JOIN` com `public.profiles` exigindo `not p.is_suspended` (se `auth.uid()` for `NULL` ou perfil ausente/suspenso, retorna `false`). |
| Retorno mínimo | Apenas `boolean` (`exists (...)`). |
| Privilégios `EXECUTE` mínimos | `REVOKE ALL FROM PUBLIC, anon; GRANT EXECUTE TO authenticated;` (o `anon` não tem acesso a `research_submissions` nem `research_recipients`). |
| Não exposição de dados / sem oráculo | Retorna `true` **somente** se o próprio chamador ativo já for o `author_id` da pesquisa; para qualquer pesquisa inexistente ou de terceiros, retorna `false` uniformemente. |
| Proprietário e RLS | Criada pelo owner da migration (`postgres`), com `SECURITY DEFINER`, portanto lê `research_submissions` sem reacionar `research_select`, eliminando 100% a recursão. |

Na policy `research_recipients_select`:
```sql
create policy research_recipients_select on public.research_recipients
  for select to authenticated
  using (
    (
      (select public.is_active_member())
      and (
        user_id = (select auth.uid())
        or (select public.is_research_author(research_id))
      )
    )
    or (select public.is_moderator())
  );
```

---

## 3. Alternativa Mais Simples (Tradeoff Documentado)

Existe uma solução ainda mais simples que dispensa função `SECURITY DEFINER`: restringir `research_recipients_select` exclusivamente a:
```sql
(user_id = (select auth.uid()) and (select public.is_active_member()))
or (select public.is_moderator())
```
- **Vantagem:** zero acoplamento entre tabelas e nenhuma função auxiliar extra.
- **Desvantagem:** o autor da pesquisa não consegue consultar diretamente via `SELECT` em `research_recipients` quem são os destinatários autorizados da própria pesquisa `AMBER`/`RED` (exigiria uma RPC de leitura dedicada).
- **Decisão:** adotar `public.is_research_author(uuid)` na Revisão 4 por preservar a visibilidade do autor com isolamento estrito e sem recursão.
