# REVISÃO DA MIGRATION OFICIAL CANDIDATA — ETAPA 10.3.3.2

## 1. Origem e Hashes SHA-256
- **Fonte:** [PROPOSED-SOCIAL-MIGRATION-REVISION-3.sql](file:///c:/Users/Ivy%20Maia/Desktop/cybersec-community-platform/scripts/security-audit/etapa-10-3-2-phase-a/PROPOSED-SOCIAL-MIGRATION-REVISION-3.sql) (preservado integralmente)
  - **SHA-256:** `B6D625AB6284F48886F030D96AA0142A54380A92D0EA039433724AB8BCC59FBE`
- **Migration Oficial Candidata:** [20261117234500_social_community.sql](file:///c:/Users/Ivy%20Maia/Desktop/cybersec-community-platform/supabase/migrations/20261117234500_social_community.sql)
  - **SHA-256:** `1E20A3451482472A4B1993F68C39C07378F61BF71CE67553D99923EB22BA6029`

## 2. Comparação com a Revisão 3 e Ajustes Realizados
- **Diff integral (`Compare-Object`):** Diferença exclusiva no cabeçalho de comentários (linhas 1–10) para identificar a migration oficial candidata (`20261117234500`, `41554` bytes, posterior a `20261116114600_research_submissions.sql`, sem timestamps duplicados em `supabase/migrations/`).
- **Equivalência semântica e SQL:** 100% idêntica à Revisão 3 em todas as instruções SQL (`ALTER TYPE ... ADD VALUE IF NOT EXISTS` fora de `BEGIN; ... COMMIT;`, `AUD-01`..`AUD-10`, `AUD-SEC-01`..`05`, `AUD-REV2-01`..`02`).
- **Nota técnica sobre `AUD-REV2-01`:** Em `send_direct_message`, a Revisão 3 e a candidata utilizam `FOR NO KEY UPDATE` (sem `NOWAIT`) + `greatest(last_message_at, now())`, conforme validado nas Etapas 10.3.2.4 e 10.3.2.5 (100 pares simultâneos = 200/200 mensagens persistidas, 0 deadlocks `40P01` e sem aborts espúrios `55P03`).
- **Preservação:** As 5 migrations históricas anteriores e a Revisão 3 experimental permaneceram intocadas.
