# Diagrama de relacionamentos (ERD)

Renderiza automaticamente no GitHub (Mermaid). Colunas de auditoria (`created_at`, `updated_at`) omitidas por legibilidade.

```mermaid
erDiagram
    AUTH_USERS ||--|| PROFILES : "1:1 (trigger)"
    PROFILES ||--o{ RESOURCES : "submitted_by"
    PROFILES ||--o{ TOPICS : "author_id"
    PROFILES ||--o{ POSTS : "author_id"
    PROFILES ||--o{ VOTES : "user_id"
    PROFILES ||--o{ BOOKMARKS : "user_id"
    PROFILES ||--o{ REPORTS : "reporter_id"
    PROFILES ||--o{ NOTIFICATIONS : "user_id"
    PROFILES ||--o{ AUDIT_LOGS : "actor_id"

    CATEGORIES ||--o{ RESOURCES : "category_id"
    CATEGORIES ||--o{ TOPICS : "category_id"

    TOPICS ||--o{ POSTS : "topic_id"
    TOPICS ||--o| POSTS : "accepted_post_id"
    TOPICS ||--o{ TOPIC_TAGS : ""
    TAGS   ||--o{ TOPIC_TAGS : ""
    POSTS  ||--o{ VOTES : "post_id"
    RESOURCES ||--o{ BOOKMARKS : "resource_id"

    REPORTS }o--o| TOPICS : "alvo (exatamente 1)"
    REPORTS }o--o| POSTS : "alvo (exatamente 1)"
    REPORTS }o--o| RESOURCES : "alvo (exatamente 1)"
    REPORTS }o--o| PROFILES : "alvo (exatamente 1)"

    PROFILES {
        uuid id PK
        text username UK
        text display_name
        text avatar_url
        text bio
        text_array interests
        text github_url
        text linkedin_url
        text preferred_locale "pt-BR | en"
        user_role role "member | moderator | admin"
        boolean is_suspended
    }
    CATEGORIES {
        uuid id PK
        text slug UK
        text name_en
        text name_pt
        category_scope scope "resource | forum | both"
        boolean is_active
        int sort_order
    }
    RESOURCES {
        uuid id PK
        text slug UK
        text name
        text description
        uuid category_id FK
        resource_type type
        text url
        text language
        difficulty_level difficulty "nullable"
        text author_name
        uuid submitted_by FK
        resource_status status "pending | approved | rejected | archived"
        uuid reviewed_by FK
        timestamptz reviewed_at
        text rejection_reason
        timestamptz published_at "data de inclusao"
        tsvector search_vector "gerada"
    }
    TOPICS {
        uuid id PK
        uuid author_id FK
        uuid category_id FK
        text title
        text body
        content_status status "published | hidden | deleted"
        boolean is_pinned
        boolean is_locked
        uuid accepted_post_id FK
        timestamptz last_activity_at
        tsvector search_vector "gerada"
    }
    POSTS {
        uuid id PK
        uuid topic_id FK
        uuid author_id FK
        text body
        content_status status
        int vote_count "mantido por trigger"
    }
    TAGS {
        uuid id PK
        text slug UK
        text name
    }
    TOPIC_TAGS {
        uuid topic_id PK,FK
        uuid tag_id PK,FK
    }
    VOTES {
        uuid user_id PK,FK
        uuid post_id PK,FK
    }
    BOOKMARKS {
        uuid user_id PK,FK
        uuid resource_id PK,FK
    }
    REPORTS {
        uuid id PK
        uuid reporter_id FK
        uuid topic_id FK
        uuid post_id FK
        uuid resource_id FK
        uuid profile_id FK
        report_reason reason
        report_status status "open | reviewing | resolved | dismissed"
        uuid handled_by FK
        text resolution_note
    }
    NOTIFICATIONS {
        uuid id PK
        uuid user_id FK
        notification_type type
        uuid actor_id FK
        uuid topic_id FK
        uuid post_id FK
        uuid resource_id FK
        timestamptz read_at
    }
    AUDIT_LOGS {
        bigint id PK
        uuid actor_id FK
        text action
        text entity_type
        uuid entity_id
        jsonb metadata
    }
```

## Decisões de modelagem

| Decisão | Motivo |
|---|---|
| `categories` compartilhada entre catálogo e fórum, com `scope` e nomes `name_en`/`name_pt` | Uma única fonte de categorias; i18n das categorias já resolvida no banco. |
| `reports` com 4 FKs nulas + `CHECK (num_nonnulls(...) = 1)` | Integridade referencial real (um alvo polimórfico genérico não teria FK). |
| FK composta `topics(accepted_post_id, id) → posts(id, topic_id)` | O banco garante que a resposta aceita pertence ao próprio tópico. |
| `author_id` / `submitted_by` com `ON DELETE SET NULL` | Excluir a conta não apaga discussões de outras pessoas (compatível com LGPD/GDPR: o perfil some, o conteúdo anonimiza). |
| `categories` com `ON DELETE RESTRICT` | Categoria em uso é desativada (`is_active = false`), nunca apagada. Alterações administrativas disparam trigger para `audit_logs`. |
| Busca no catálogo e no fórum: `tsvector` (config `simple`) + `pg_trgm` | Funciona para PT e EN sem dicionário por idioma; em `topics`, o título tem peso `A` e o corpo peso `B`, além de `pg_trgm` no nome do recurso e no título do tópico. |
| Deduplicação de URLs: `normalize_resource_url(url)` | Normaliza esquema e host em minúsculas, remove portas padrão (`:80`/`:443`) e barra apenas na raiz vazia, preservando case-sensitivity de caminho/query e caminhos distintos (`/dir/` vs `/dir`). |
| Descrição de recursos até 2.000 caracteres | Permite detalhar ferramentas, laboratórios e repositórios na página individual do recurso. |
| Votos só em respostas (`posts`) | Conforme o escopo do MVP ("curtir ou votar em respostas"). |
| `audit_logs` com `bigint identity` | Tabela só de inserção, ordenação cronológica barata. |

## Fora do schema atual (extensões previstas)

- Tags em recursos (`resource_tags`): o contexto só prevê `topic_tags`. Fácil de adicionar depois.
- Favoritar tópicos.
- Busca com `unaccent` (não é `IMMUTABLE`, exigiria coluna materializada ou função wrapper).
