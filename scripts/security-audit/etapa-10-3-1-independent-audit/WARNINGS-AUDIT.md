# VEXOR — Etapa 10.3.1: Auditoria do Sistema de Advertências

## 1. Separação entre Advertência e Suspensão
- A proposta separa corretamente `public.user_warnings` de `profiles.is_suspended`: advertir não suspende automaticamente e mantém histórico próprio.

## 2. Achados de Segurança e Integridade
- **[HIGH] Ausência de revalidação pós-lock e proteção de hierarquia em `issue_user_warning` e `revoke_user_warning`:**
  - Conforme `20261113143000_security_hardening.sql`, RPCs de governança devem executar `pg_advisory_xact_lock` (ou lock de perfil `FOR SHARE NOWAIT` no chamador e `FOR UPDATE NOWAIT` no alvo) e revalidar que o chamador continua `moderator`/`admin` ativo e não suspenso.
  - Além disso, um `moderator` **não** pode advertir um `admin`, e ninguém pode advertir a si próprio (`p_user_id = auth.uid()`).
- **[MEDIUM] Proteção contra advertências duplicadas:**
  - Se um moderador clicar duas vezes ou duas sessões resolverem o mesmo `report_id`, podem gerar advertências duplicadas. **Correção:** criar índice único parcial `create unique index user_warnings_report_active_key on public.user_warnings (user_id, report_id) where report_id is not null and status <> 'revoked'`.
- **[MEDIUM] Justificativa obrigatória na emissão e na revogação:**
  - Exigir `char_length(btrim(description)) between 10 and 1500` na emissão e `revocation_reason text` obrigatório (`>= 5` chars) em `revoke_user_warning`, gravando `warning.issued` e `warning.revoked` em `audit_logs`.
- **Preservação do histórico:** Negar `DELETE` em `user_warnings` para todos os perfis (`REVOKE DELETE`) — advertências só mudam para `'acknowledged'` (pelo próprio usuário via RPC) ou `'revoked'` (por admin/moderador autorizado via RPC), mantendo trilha imutável de quem aplicou, motivo, conteúdo relacionado e data.
