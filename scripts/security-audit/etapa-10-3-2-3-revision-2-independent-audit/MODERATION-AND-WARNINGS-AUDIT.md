# AUDITORIA DE MODERAÇÃO E ADVERTÊNCIAS — REVISÃO 2

## 1. Hierarquia e Autorização (`AUD-SEC-02`)
- `issue_user_warning` e `revoke_user_warning` aplicam:
  - `admin > moderator > member` (`if v_target_role in ('admin', 'moderator') and v_caller_role <> 'admin'`).
  - Bloqueio de auto-advertência (`p_user_id = v_caller_id`) e auto-revogação (`v_target_id = v_caller_id`).
  - Bloqueio de usuários suspensos (`is_moderator()` + revalidação pós-lock `not v_caller_susp`).
  - Validação de `p_report_id` quando informado (`FOR SHARE NOWAIT`).
  - Prevenção de re-revogação (`where id = p_warning_id and status <> 'revoked'`).

## 2. Auditoria, Notificações e Deduplicação
- `issue_user_warning` grava `notifications` (`user_warning`) e `audit_logs` (`warning.issued`) na mesma transação.
- `revoke_user_warning` grava `audit_logs` (`warning.revoked`) preservando histórico.
- `user_warnings_report_active_key` garante no máximo 1 advertência ativa/reconhecida por `(user_id, report_id)`.
- Nenhuma vulnerabilidade encontrada neste módulo na Revisão 2.
