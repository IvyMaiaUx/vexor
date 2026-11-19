# CORREÇÕES NOS TESTES DE REGRESSÃO DESATUALIZADOS

## 1. [test-supabase-infra-etapa9-1.mjs](file:///c:/Users/Ivy%20Maia/Desktop/cybersec-community-platform/scripts/test-supabase-infra-etapa9-1.mjs)
- **Problema:** Exigia `files.length === 3` em `supabase/migrations/`.
- **Correção:** Validada a cadeia cronológica completa das 5 migrations oficiais (`20261110000001_schema.sql` até `20261116114600_research_submissions.sql`), verificando ausência de duplicatas (`new Set(files).size === files.length`) e ordem exata, sem alterar nenhuma migration oficial.

## 2. [test-research-backend-etapa9-7-2a.mjs](file:///c:/Users/Ivy%20Maia/Desktop/cybersec-community-platform/scripts/test-research-backend-etapa9-7-2a.mjs)
- **Problema:** `createMockSupabase` aceitava apenas `table === "profiles"`, enquanto `createSupabaseResearchRepository` consulta `research_submissions`, `public_profiles`, `categories` e `research_recipients`, e os handlers retornam `201`/`200` em vez do antigo `503 persistence_unavailable` da Fase 2A.
- **Correção:** Atualizado `createMockSupabase` para simular as tabelas reais consultadas pelos handlers e atualizado o check 11 para validar `201` (`status: "pending"`) em `handleCreateResearch` e `200` (`success: true`) em `handleUpdateResearch` após validação de payload.
