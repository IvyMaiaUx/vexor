# VEXOR — Etapa 9.7 (Revisão 3) — Compatibilidade com Auditoria (`audit_logs`)

**Data:** 2026-11-15  
**Migrations oficiais inspecionadas:**
- `supabase/migrations/20261110000001_schema.sql` (linhas 326-337)
- `supabase/migrations/20261110000002_functions_triggers.sql` (linhas 96-127)
- `supabase/migrations/20261110000003_rls_and_grants.sql` (linhas 47, 82-84, 439-441)
- `supabase/migrations/20261113143000_security_hardening.sql` (linhas 627-633)

---

## 1. Assinatura Real de `public.write_audit_log()`

Extraída de `20261110000002_functions_triggers.sql:96-109`:
```sql
create function public.write_audit_log(
  p_action      text,
  p_entity_type text,
  p_entity_id   uuid,
  p_metadata    jsonb default '{}'::jsonb
)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.audit_logs (actor_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), p_action, p_entity_type, p_entity_id, coalesce(p_metadata, '{}'::jsonb));
$$;
```

### Tabela `public.audit_logs` (`20261110000001_schema.sql:326-337`)
- `id bigint generated always as identity primary key`
- `actor_id uuid` *(FK `audit_logs_actor_id_fkey` removida em `20261113143000_security_hardening.sql:631-632` para preservar histórico 100% append-only)*
- `action text not null` *(sem CHECK/ENUM restritivo)*
- `entity_type text not null` *(sem CHECK/ENUM restritivo)*
- `entity_id uuid`
- `metadata jsonb not null default '{}'::jsonb`
- `created_at timestamptz not null default now()`

---

## 2. Verificação de Compatibilidade

1. **Tipos dos parâmetros:** todas as chamadas propostas passam `(text, text, uuid, jsonb)` — compatibilidade exata.
2. **Entidades aceitas:** `entity_type` é `text not null` (exemplos existentes: `'profile'`, `'resource'`, `'topic'`, `'post'`, `'report'`, `'category'`). A entidade `'research'` é totalmente compatível com a tabela e os índices (`audit_logs_entity_idx (entity_type, entity_id)`).
   - *Observação de aplicação (Fase 2B/2C):* ao integrar o painel administrativo, o mapeamento de `entity_type` na UI/serviços de auditoria deverá incluir `'research'` explicitamente (sem alteração necessária no SQL).
3. **Formato dos eventos (`research.*`):**
   - `research.approved` (em `moderate_research`)
   - `research.rejected` (em `moderate_research`)
   - `research.archived` (em `moderate_research`)
   - `research.resubmitted` (em `resubmit_research`)
   - `research.recipient_granted` (em `grant_research_recipient`)
   - `research.recipient_revoked` (em `revoke_research_recipient`)
   Todos seguem a convenção `<entidade>.<ação>` já usada em `'user.role_changed'`, `'resource.approved'`, `'topic.hide'`, `'report.resolved'`.
4. **Permissões de execução:** `20261110000003_rls_and_grants.sql:47` executa `revoke all on function public.write_audit_log(...) from public, anon, authenticated;`. Como `moderate_research`, `resubmit_research`, `grant_research_recipient` e `revoke_research_recipient` são `SECURITY DEFINER` pertencentes ao mesmo owner (`postgres`), elas invocam `public.write_audit_log(...)` internamente sem expor `write_audit_log` a clientes.
5. **Estratégia append-only:** triggers `audit_logs_no_update_delete` e `audit_logs_no_truncate` bloqueiam mutações com `42501`; nenhuma RPC ou trigger proposto executa `UPDATE` ou `DELETE` em `audit_logs`, apenas `INSERT` via `write_audit_log`.
