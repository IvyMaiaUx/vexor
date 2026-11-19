# VEXOR — EVOLUÇÃO DO FORMULÁRIO DE SUBMISSÃO DE RECURSOS (PREÇO, CARTÃO E TAGS)

## 1. Arquivos Modificados e Criados
- **Migration incremental candidata (NÃO aplicada remotamente):**
  - [20261118190000_catalog_pricing_metadata.sql](file:///c:/Users/Ivy%20Maia/Desktop/cybersec-community-platform/supabase/migrations/20261118190000_catalog_pricing_metadata.sql)
  - **SHA-256:** `CA302B3E29401E22317C2CF109E563FD6872BBA51ADB93D3F0E62BD63CFA5FCB`
- **Tipos e Labels:**
  - [src/config/site.ts](file:///c:/Users/Ivy%20Maia/Desktop/cybersec-community-platform/src/config/site.ts)
  - [src/features/catalog/pricing-labels.ts](file:///c:/Users/Ivy%20Maia/Desktop/cybersec-community-platform/src/features/catalog/pricing-labels.ts)
- **Validação e Serviço:**
  - [src/features/catalog/validation.ts](file:///c:/Users/Ivy%20Maia/Desktop/cybersec-community-platform/src/features/catalog/validation.ts)
  - [src/features/catalog/catalog-service.ts](file:///c:/Users/Ivy%20Maia/Desktop/cybersec-community-platform/src/features/catalog/catalog-service.ts)
- **Interface (`/catalog/submit`, cards e detalhe):**
  - [src/app/catalog/submit/page.tsx](file:///c:/Users/Ivy%20Maia/Desktop/cybersec-community-platform/src/app/catalog/submit/page.tsx)
  - [src/features/catalog/resource-card.tsx](file:///c:/Users/Ivy%20Maia/Desktop/cybersec-community-platform/src/features/catalog/resource-card.tsx)
  - [src/app/catalog/[slug]/page.tsx](file:///c:/Users/Ivy%20Maia/Desktop/cybersec-community-platform/src/app/catalog/[slug]/page.tsx)
- **Testes:**
  - [scripts/test-catalog-integration-etapa9-3.mjs](file:///c:/Users/Ivy%20Maia/Desktop/cybersec-community-platform/scripts/test-catalog-integration-etapa9-3.mjs)
  - [scripts/security-audit/etapa-catalog-pricing/run-pricing-pg-tests.sql](file:///c:/Users/Ivy%20Maia/Desktop/cybersec-community-platform/scripts/security-audit/etapa-catalog-pricing/run-pricing-pg-tests.sql)

## 2. Estrutura de Banco Proposta (`public.resources`)
- `pricing_model text`: `CHECK (pricing_model IS NULL OR pricing_model IN ('free', 'freemium', 'paid'))`
- `requires_credit_card text`: `CHECK (requires_credit_card IS NULL OR requires_credit_card IN ('yes', 'no', 'depends', 'not_informed'))`
- `free_tier_limits text`: `CHECK (free_tier_limits IS NULL OR char_length(btrim(free_tier_limits)) <= 1000)`
- `pricing_notes text`: `CHECK (pricing_notes IS NULL OR char_length(btrim(pricing_notes)) <= 500)`
- `tags text[] NOT NULL DEFAULT '{}'`: `CHECK (cardinality(tags) <= 6 AND tags <@ ARRAY['free','freemium','paid','no_card','card_required','card_depends','card_not_informed','open_source','self_hosted']::text[])`
- Trigger `resources_before_write_sync_tags` (`SECURITY DEFINER`, `SET search_path = ''`): recalcula automaticamente as tags de preço e cartão a partir de `pricing_model`/`requires_credit_card`, preservando apenas `'open_source'` e `'self_hosted'` dentre as opcionais.
- `GRANT INSERT / UPDATE (pricing_model, requires_credit_card, free_tier_limits, pricing_notes, tags) ON public.resources TO authenticated;` (mantendo `status`, `slug`, `submitted_by`, `reviewed_*`, `published_at` bloqueados).

## 3. Confirmação de Preservação
- Nenhuma migration foi aplicada remotamente no Supabase (`zcjudcbckcxwnfnrjfte`).
- `src/types/database.types.ts` permanece inalterado até aprovação e aplicação do schema.
