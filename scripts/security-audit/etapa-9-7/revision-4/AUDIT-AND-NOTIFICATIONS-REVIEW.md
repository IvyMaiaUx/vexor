# VEXOR — Etapa 9.7 (Revisão 4) — Auditoria e Notificações

**Data:** 2026-11-16  
**Migrations oficiais inspecionadas:** `20261110000001_schema.sql`, `20261110000002_functions_triggers.sql`, `20261110000003_rls_and_grants.sql`, `20261113143000_security_hardening.sql`.

---

## 1. Auditoria (`public.write_audit_log`)

Assinatura oficial (`20261110000002_functions_triggers.sql:96-109`):
```sql
public.write_audit_log(
  p_action      text,
  p_entity_type text,
  p_entity_id   uuid,
  p_metadata    jsonb default '{}'::jsonb
) returns void
```
- `actor_id` é sempre `auth.uid()` internamente.
- `audit_logs` é 100% *append-only* (triggers `audit_logs_no_update_delete` e `audit_logs_no_truncate`, e sem FK `audit_logs_actor_id_fkey` desde `20261113143000_security_hardening.sql:631-632`).
- `revoke all on function public.write_audit_log(...) from public, anon, authenticated;` (`20261110000003_rls_and_grants.sql:47`).

### Eventos Registrados para `entity_type = 'research'`
| RPC | `action` | `metadata` registrado |
|---|---|---|
| `moderate_research` | `'research.approved'` / `'research.rejected'` / `'research.archived'` | `from`, `to`, `reason` |
| `resubmit_research` | `'research.resubmitted'` | `from`, `to` |
| `grant_research_recipient` (novo) | `'research.recipient_granted'` | `recipient_id`, `tlp`, `justification` |
| `grant_research_recipient` (atualização) | `'research.recipient_updated'` | `recipient_id`, `tlp`, `previous_justification`, `new_justification`, `original_granted_by`, `updated_by` |
| `revoke_research_recipient` | `'research.recipient_revoked'` | `recipient_id`, `previous_granted_by`, `previous_justification` |

- **Rollback atômico:** como `write_audit_log` executa dentro da mesma transação da RPC sem bloco `EXCEPTION` que engula erros, qualquer falha de auditoria ou constraint provoca rollback integral da operação.

---

## 2. Notificações (`public.notifications`)

- `notifications.user_id`: `uuid not null references public.profiles (id) on delete cascade`.
- `notifications.actor_id`: `uuid references public.profiles (id) on delete set null`.
- `notifications.research_id`: `uuid references public.research_submissions (id) on delete set null` (evita perda em cascatas ou conflito com `reports` `ON DELETE RESTRICT`).
- `notification_type` estendido com `'research_approved'` e `'research_rejected'`.
- **Autor excluído (`v_author_id IS NULL`) ou auto-moderação (`v_author_id = auth.uid()`):** nenhuma notificação é inserida; a moderação e a auditoria continuam normalmente.
- **Autor suspenso (`is_suspended = true`):** verificado via `SELECT NOT p.is_suspended INTO v_recipient_active FROM public.profiles p WHERE p.id = v_author_id;`; se suspenso ou não encontrado, não insere notificação.
- **Falha ao inserir notificação:** provoca rollback atômico da atualização e da auditoria.
