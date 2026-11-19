# PROVENIÊNCIA DA REVISÃO 2 DA MIGRATION EXPERIMENTAL

- **Original preservado:** [PROPOSED-SOCIAL-MIGRATION.sql](file:///c:/Users/Ivy%20Maia/Desktop/cybersec-community-platform/scripts/security-audit/etapa-10-3-2-phase-a/PROPOSED-SOCIAL-MIGRATION.sql)
  - **SHA-256:** `35031D14AACE6B27E5568C0339266ABB9A1821C9C10B26D1E96642EA382E496B`
- **Revisão 2:** [PROPOSED-SOCIAL-MIGRATION-REVISION-2.sql](file:///c:/Users/Ivy%20Maia/Desktop/cybersec-community-platform/scripts/security-audit/etapa-10-3-2-phase-a/PROPOSED-SOCIAL-MIGRATION-REVISION-2.sql)
  - **SHA-256:** `D6976DA11FDCA907577CA5FE5161849FBE254C26CB5FC66502A86D901AB970F3`
- **Localização:** `scripts/security-audit/etapa-10-3-2-phase-a/` (fora de `supabase/migrations/`).
- **Diferenças funcionais da Revisão 2:**
  1. `reports.message_id` + `reports_dm_message_id_pair` + índice único parcial `reports_dedupe_direct_message_active` + checagem pré-snapshot em `report_direct_message` (`AUD-SEC-01`).
  2. Hierarquia `admin > moderator > member`, bloqueio de auto-revogação e validação de `p_report_id` em `issue_user_warning` / `revoke_user_warning` (`AUD-SEC-02`).
  3. Filtro `status = 'published'` em `direct_messages_select` + RPC `mark_dm_conversation_read(uuid)` (`AUD-SEC-03`).
  4. Índice parcial `direct_messages_sender_recent_idx` + advisory lock por remetente em `send_direct_message` (`AUD-SEC-04`).
