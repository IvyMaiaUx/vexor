# PLANO DE CORREÇÕES PÓS-AUDITORIA — ETAPA 10.3.2.2

## Objetivo
Corrigir integralmente os 5 achados (`AUD-SEC-01` a `AUD-SEC-05`) da auditoria independente (Etapa 10.3.2.1), atualizar os dois scripts de regressão desatualizados (`test-supabase-infra-etapa9-1.mjs` e `test-research-backend-etapa9-7-2a.mjs`) e validar a nova revisão SQL em PostgreSQL 18 local isolado sem tocar em `src/`, `supabase/migrations/`, `PROPOSED-SOCIAL-MIGRATION.sql` ou no Supabase remoto.

## Entregáveis
- **Original preservado:** `scripts/security-audit/etapa-10-3-2-phase-a/PROPOSED-SOCIAL-MIGRATION.sql` (SHA-256 `35031D14AACE6B27E5568C0339266ABB9A1821C9C10B26D1E96642EA382E496B`)
- **Revisão 2:** `scripts/security-audit/etapa-10-3-2-phase-a/PROPOSED-SOCIAL-MIGRATION-REVISION-2.sql` (SHA-256 `D6976DA11FDCA907577CA5FE5161849FBE254C26CB5FC66502A86D901AB970F3`)
- **Suíte dedicada:** `scripts/security-audit/etapa-10-3-2-2-post-audit-fixes/run-revision-2-tests.sql`
