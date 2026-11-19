# AUDITORIA DE MODERAÇÃO E ADVERTÊNCIAS — REVISÃO 3

- `issue_user_warning` e `revoke_user_warning` permanecem idênticas à Revisão 2 aprovada (`admin > moderator > member`, anti-auto-advertência, anti-auto-revogação, `pg_advisory_xact_lock(6216471958360507469)`, revalidação pós-lock, `audit_logs` e `notifications`).
- Revalidadas em `vexor_etapa10_3_2_5` via `run-revision-2-tests.sql` (`PASS AUD-SEC-02`).
