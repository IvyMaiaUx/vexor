# VEXOR — Etapa 9.7 (Revisão 3) — Análise de Controle de Acesso e TLP 2.0

**Data:** 2026-11-15  
**Base inspecionada:** `scripts/security-audit/etapa-9-7/revision-2/MIGRATION-REVISED.sql`, `supabase/migrations/20261110000001_schema.sql`, `supabase/migrations/20261110000003_rls_and_grants.sql`.

---

## 1. Problema Identificado na Revisão 2

Na `revision-2`, a policy `research_select` em `public.research_submissions` estava definida como:

```sql
using (
  (public.is_active_member() and (status = 'approved' or author_id = (select auth.uid())))
  or public.is_moderator()
)
```

Embora `revision-2` tratasse `tlp` apenas como rótulo informativo, isso **não atende** ao modelo de confidencialidade TLP 2.0 exigido para pesquisas sensíveis: qualquer membro ativo autenticado conseguiria ler registros `approved` com `tlp IN ('AMBER', 'AMBER+', 'RED')` diretamente via PostgREST/Supabase, mesmo que a interface ocultasse o conteúdo.

---

## 2. Modelo Proposto de Autorização por TLP 2.0 no Banco

### 2.1 Semântica por Nível TLP
| Nível TLP | Estado `approved` | Estados não publicados (`pending`, `rejected`, `archived`) |
|---|---|---|
| `CLEAR` | Qualquer `is_active_member()` (leitura autenticada; `anon` segue sem `GRANT SELECT` nesta etapa para manter alinhamento com o guard `active_member` das 6 rotas de `/cybercrime-research`). | Apenas autor ativo (`author_id = auth.uid()`) ou `is_moderator()`. |
| `GREEN` | Qualquer `is_active_member()` (comunidade autenticada e não suspensa). | Apenas autor ativo ou `is_moderator()`. |
| `AMBER` | Autor ativo, `is_moderator()`, ou destinatário ativo explicitamente autorizado em `public.research_recipients`. | Apenas autor ativo ou `is_moderator()`. |
| `AMBER+` | Autor ativo, `is_moderator()`, ou destinatário ativo explicitamente autorizado em `public.research_recipients` (com justificativa registrada). | Apenas autor ativo ou `is_moderator()`. |
| `RED` | Autor ativo, `is_moderator()`, ou destinatário individualmente autorizado em `public.research_recipients` (com justificativa obrigatória). | Apenas autor ativo ou `is_moderator()`. |

> **Observação sobre `CLEAR` e `anon`:** Nas migrations atuais do VEXOR (`src/app/cybercrime-research/layout.tsx`), todas as rotas do módulo exigem `requireServerAuthorization("active_member")`. Por isso, `anon` permanece sem `GRANT SELECT` em `research_submissions`. Caso futuramente o produto deseje exposição pública anônima para `TLP:CLEAR`, bastará adicionar `GRANT SELECT` a `anon` e uma policy dedicada `status = 'approved' and tlp = 'CLEAR'`.

---

## 3. Tabela Proposta: `public.research_recipients`

Para garantir autorização real no PostgreSQL sem depender de filtros de UI:

```sql
create table public.research_recipients (
  research_id   uuid not null references public.research_submissions (id) on delete cascade,
  user_id       uuid not null references public.profiles (id) on delete cascade,
  granted_by    uuid references public.profiles (id) on delete set null,
  justification text,
  created_at    timestamptz not null default now(),

  primary key (research_id, user_id),
  constraint research_recipients_just_len check (
    justification is null or char_length(btrim(justification)) between 5 and 500
  )
);

create index research_recipients_user_idx
  on public.research_recipients (user_id, research_id);
```

### 3.1 RLS e Grants de Menor Privilégio
- `alter table public.research_recipients enable row level security;`
- `revoke all on public.research_recipients from public, anon, authenticated;`
- `grant select on public.research_recipients to authenticated;`
- **Sem `GRANT INSERT`, `UPDATE` ou `DELETE` para `anon` ou `authenticated`:** nenhum usuário pode conceder acesso a si mesmo nem a terceiros via escrita direta na tabela.
- Policy de leitura (`research_recipients_select`):
  - O próprio destinatário ativo (`user_id = (select auth.uid()) and (select public.is_active_member())`),
  - O autor ativo da pesquisa (`exists (select 1 from public.research_submissions r where r.id = research_recipients.research_id and r.author_id = (select auth.uid()) and (select public.is_active_member()))`), ou
  - `(select public.is_moderator())`.

### 3.2 Concessão e Revogação via RPCs `SECURITY DEFINER`
- `public.grant_research_recipient(p_research_id uuid, p_user_id uuid, p_justification text default null)`:
  - Exige `public.is_moderator()` pré-lock e revalidação pós-lock V4 (`FOR SHARE NOWAIT` em `profiles`).
  - Bloqueia autoconcessão (`if p_user_id = auth.uid() and not public.is_admin() ...` ou bloqueio absoluto de autoconcessão para evitar conflito de interesse — na proposta atual, exige `p_user_id <> auth.uid()`, já que moderadores/admins já possuem acesso pela função de moderação).
  - Verifica que o destinatário existe em `profiles` e não está suspenso (`NOT is_suspended`).
  - Exige `justification` (`>= 5` chars) quando a pesquisa for `AMBER+` ou `RED`.
  - Grava `granted_by = auth.uid()` e registra evento `'research.recipient_granted'` em `audit_logs`.
- `public.revoke_research_recipient(p_research_id uuid, p_user_id uuid)`:
  - Exige `public.is_moderator()` + revalidação V4 + registro `'research.recipient_revoked'` em `audit_logs`.

---

## 4. Policy `research_select` Revisada

```sql
create policy research_select on public.research_submissions
  for select to authenticated
  using (
    (
      (select public.is_active_member())
      and (
        author_id = (select auth.uid())
        or (
          status = 'approved'
          and (
            tlp in ('CLEAR', 'GREEN')
            or (
              tlp in ('AMBER', 'AMBER+', 'RED')
              and exists (
                select 1
                  from public.research_recipients rr
                 where rr.research_id = research_submissions.id
                   and rr.user_id = (select auth.uid())
              )
            )
          )
        )
      )
    )
    or (select public.is_moderator())
  );
```

### Garantias de Segurança
1. **Autor:** sempre lê suas próprias pesquisas em qualquer `status` e qualquer `tlp` (enquanto `is_active_member()`).
2. **Moderadores e Administradores:** têm acesso via `(select public.is_moderator())` (que já verifica `role in ('moderator', 'admin') and not is_suspended`), inclusive para pesquisas não publicadas (`pending`, `rejected`, `archived`) e qualquer `tlp`.
3. **Destinatários autorizados:** só acessam pesquisas `approved` de TLP restrito (`AMBER`, `AMBER+`, `RED`) enquanto permanecerem `is_active_member()`; se forem suspensos, perdem o acesso imediatamente.
4. **Usuários comuns sem vínculo:** nunca leem pesquisas `pending`, `rejected`, `archived`, nem pesquisas `approved` com `AMBER`, `AMBER+` ou `RED`.
