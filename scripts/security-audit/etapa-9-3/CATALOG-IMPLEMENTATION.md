# VEXOR — Etapa 9.3: Implementação do Catálogo e Submissão

## 1. Camada de Serviço (`src/features/catalog/catalog-service.ts`)

- **`fetchCatalogCategories()`**: lê `public.categories` ativas com `scope in ('resource', 'both')`, ordenadas por `sort_order`.
- **`queryCatalogResources(params)`**:
  - Filtra explicitamente `.eq("status", "approved")`.
  - Aplica filtros suportados pelo schema: `category_id` (resolvido por `slug`), `type`, `difficulty`, `language`, `id in (...)` (para filtro de favoritos) e busca em `name`, `description` e `author_name` com sanitização de caracteres especiais (`%`, `_`, `\`, `(`, `)`, `,`).
  - Ordena no PostgreSQL por `published_at desc, created_at desc` (`newest`) ou `name asc` (`alphabetical`).
  - Executa paginação real via `.range(from, to)` com `{ count: "exact" }`.
- **`fetchCatalogResourceBySlug(slug)`**: busca o recurso por `slug` (respeitando RLS para aprovados ou próprios/moderador) e carrega até 3 relacionados aprovados da mesma categoria.
- **`submitCatalogResource(payload)`**:
  - Rejeita qualquer tentativa de envio de campos privilegiados (`status`, `slug`, `submitted_by`, `reviewed_*`, `published_at`).
  - Valida nome, descrição, URL (`isSafeExternalUrl` + `normalizeResourceUrl`), categoria e autor.
  - Verifica `supabase.auth.getUser()` e insere apenas as 8 colunas permitidas pelo `GRANT INSERT`.
  - Trata `23505` (URL duplicada), `42501` (conta suspensa/RLS), `23503` (categoria inválida) e `23514`/`22001` (constraints).

## 2. Páginas Conectadas

- `src/app/catalog/page.tsx`: listagem paginada no servidor/DB, URL `searchParams` como fonte da verdade, loading skeleton, erro com retry e estado vazio.
- `src/app/catalog/[slug]/page.tsx`: detalhe real por `slug`, relacionados reais e alternância de favorito.
- `src/app/catalog/submit/page.tsx`: submissão real em `public.resources` com `status = 'pending'`, guarda single-flight (`inFlightRef`) e uso das categorias reais do banco.
- `src/app/page.tsx`: vitrine da home conectada a `fetchCatalogCategories` e `queryCatalogResources` (sem misturar `FEATURED_RESOURCES`).
