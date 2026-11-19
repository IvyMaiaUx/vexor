# REVISÃO DE ADVERTÊNCIAS E MODERAÇÃO

## 1. Modelo `user_warnings`
- Separação clara entre advertência (`user_warnings`: `active`, `acknowledged`, `revoked`) e suspensão de conta (`profiles.is_suspended`).
- Justificativa obrigatória: `description` (`10..1500` chars) e `revocation_reason` (`>= 5` chars quando `status = 'revoked'`).
- Deduplicação (`AUD-08`): índice único parcial `user_warnings_report_active_key` em `(user_id, report_id) where report_id is not null and status <> 'revoked'`.

## 2. Hierarquia e Concorrência (`AUD-04`)
- `issue_user_warning` e `revoke_user_warning` usam `pg_advisory_xact_lock(6216471958360507469)` (mesmo lock global de moderação da migration `20261113143000_security_hardening.sql`), revalidam `role` e `is_suspended` do caller com `for share nowait` e bloqueiam o alvo com `for update nowait`.
- Auditoria e notificação: `issue_user_warning` grava notificação `user_warning` e log `'warning.issued'`; `revoke_user_warning` grava `'warning.revoked'`.
- **Defeito confirmado (`AUD-SEC-02`, MEDIUM):**
  1. As linhas 492 e 598 checam apenas `v_target_role = 'admin' and v_caller_role <> 'admin'`. Um `moderator` ainda consegue advertir ou revogar advertência de **outro `moderator`** (contradizendo a documentação da Fase A).
  2. `revoke_user_warning` não impede `v_target_id = v_caller_id` (auto-revogação por moderador) e trava apenas `w` (`for update of w nowait`), sem travar `p` (`for share of p nowait`).
