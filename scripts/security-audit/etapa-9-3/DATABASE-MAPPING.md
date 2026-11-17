# VEXOR — Etapa 9.3: Mapeamento de Banco de Dados

## 1. `public.categories` -> `CatalogCategoryItem`

| Coluna SQL | Campo Frontend | Observações |
| --- | --- | --- |
| `id` | `id` | UUID da categoria |
| `slug` | `slug` | Usado nos filtros de URL (`/catalog?category=...`) |
| `name_en` / `name_pt` | `name_en` / `name_pt` | Nomes localizados |
| `description_en` / `description_pt` | `description_en` / `description_pt` | Nullable no DB -> `""` |
| `sort_order` | `sortOrder` | Ordenação crescente |
| `scope`, `is_active` | Filtro de consulta | `.eq("is_active", true).in("scope", ["resource", "both"])` |

## 2. `public.resources` -> `CatalogResourceItem`

| Coluna SQL | Campo Frontend | Observações |
| --- | --- | --- |
| `id` | `id` | Chave usada em `bookmarks.resource_id` |
| `slug` | `slug` | Gerado por trigger `resources_set_slug()` no `INSERT` |
| `name` | `name` | 2..120 chars |
| `description` | `description_pt` & `description_en` | Coluna única no schema oficial |
| `category_id` | `categoryId` + `categorySlug` | Resolvido via `categories` |
| `type` | `type` | ENUM `resource_type` |
| `url` | `url` | Normalizada via `normalizeResourceUrl` |
| `language` | `language` | `'en' | 'pt-BR' | 'multilingual' | 'other'` |
| `difficulty` | `difficulty` | ENUM `difficulty_level` (nullable) |
| `author_name` | `authorName` | Nullable |
| `status` | `status` | ENUM `resource_status` (`pending` padrão no `INSERT`) |
| `published_at` / `created_at` | `publishedAt` / `createdAt` | Ordenação `newest` |

## 3. `public.bookmarks`

| Coluna SQL | Uso no Serviço |
| --- | --- |
| `user_id` | Default `auth.uid()`; nunca enviado no `INSERT`; usado em `eq("user_id", user.id)` no `SELECT`/`DELETE` |
| `resource_id` | Único campo enviado no `INSERT ({ resource_id })` |
| `created_at` | Ordenação decrescente dos favoritos |
