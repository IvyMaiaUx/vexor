# VEXOR — Etapa 9.3: Inspeção Inicial

**Data:** 2026-11-15  
**Escopo inspecionado:** `supabase/migrations/20261110000001_schema.sql`, `20261110000003_rls_and_grants.sql`, `src/features/catalog/`, `src/app/catalog/`, `src/app/page.tsx` e `src/types/database.types.ts`.

## Principais Descobertas

1. **Estado anterior do frontend:**
   - `src/features/catalog/use-catalog-store.ts` combinava `FEATURED_RESOURCES` com `cybersec_submitted_resources` (`localStorage`) e persistia favoritos em `cybersec_bookmarks` (`localStorage`).
   - As páginas `/catalog`, `/catalog/bookmarks`, `/catalog/submit`, `/catalog/[slug]` e `/` consumiam `INITIAL_CATEGORIES` e `allResources` em memória.
2. **Estrutura real no Supabase:**
   - `public.categories` possui `id`, `slug`, `name_en`, `name_pt`, `description_en`, `description_pt`, `scope` (`resource | forum | both`), `sort_order`, `is_active`.
   - `public.resources` possui coluna única `description` (sem `description_pt`/`description_en`), `category_id` (FK -> `categories.id`), `type`, `url`, `language`, `difficulty`, `author_name`, `submitted_by`, `status` (`pending | approved | rejected | archived`), `published_at`, `created_at` e índice único `resources_url_active_key` em `normalize_resource_url(url)` para `pending`/`approved`.
   - `public.bookmarks` possui chave primária composta `(user_id, resource_id)` com `user_id default auth.uid()`.
3. **Policies e Grants verificados:**
   - `resources_select` permite `status = 'approved'`, ou `submitted_by = auth.uid()`, ou `is_moderator()`. Portanto, a consulta do catálogo público deve filtrar explicitamente `status = 'approved'` para não misturar itens `pending`/`rejected` do próprio autor ou moderador na listagem pública.
   - `resources` só concede `INSERT` em 8 colunas (`name, description, category_id, type, url, language, difficulty, author_name`), bloqueando `status`, `slug`, `submitted_by`, `reviewed_*`, `published_at`.
   - `bookmarks` só concede `SELECT`, `INSERT (resource_id)` e `DELETE` para `authenticated`, exigindo `user_id = auth.uid()`, `is_active_member()` e recurso `approved`.
