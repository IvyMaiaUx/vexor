# Banco de dados

Schema PostgreSQL (Supabase) da plataforma. Primeira etapa da ordem de implementação.

## Estrutura

```
supabase/
├── migrations/
│   ├── 20261110000001_schema.sql              # enums, tabelas, constraints, índices
│   ├── 20261110000002_functions_triggers.sql  # helpers, triggers, RPCs de moderação/admin
│   └── 20261110000003_rls_and_grants.sql      # grants por coluna, policies RLS, storage
├── seed.sql                                   # 12 categorias iniciais (PT/EN)
└── tests/
    ├── postgres_bootstrap.sql                 # compatibilidade apenas para PostgreSQL local puro
    └── rls_smoke_test.sql                     # 48 verificações de permissão e integridade
docs/database/
├── README.md     # este arquivo
├── ERD.md        # diagrama de relacionamentos + decisões de modelagem
└── SECURITY.md   # papéis, matriz de permissões, ameaças, operação
```

## Aplicar

### Opção A — Projeto Supabase (CLI ou Cloud)
No Supabase real, os schemas `auth`, `storage` e `extensions` já existem nativamente. Basta aplicar as migrations de `supabase/migrations/` e o `seed.sql`:

```bash
supabase start
supabase db reset        # aplica migrations/ + seed.sql
```

### Opção B — PostgreSQL 15+ local (sem Docker/Supabase CLI)
Para validar o schema e os 48 testes de RLS em uma instalação local do PostgreSQL (como o PostgreSQL 18), aplique primeiro o `postgres_bootstrap.sql` (que simula `auth.users`, `auth.uid()`, `storage.buckets`/`objects` e as roles `anon`/`authenticated`):

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 \
  -f supabase/tests/postgres_bootstrap.sql \
  -f supabase/migrations/20261110000001_schema.sql \
  -f supabase/migrations/20261110000002_functions_triggers.sql \
  -f supabase/migrations/20261110000003_rls_and_grants.sql \
  -f supabase/seed.sql \
  -f supabase/tests/rls_smoke_test.sql
```

> **Importante:** O bootstrap local valida a lógica SQL, triggers, constraints e RLS, mas não substitui os testes de integração fim a fim com os serviços reais de **Supabase Auth** e **Supabase Storage** em homologação/produção.

Requer PostgreSQL 15+ (usa `ON DELETE SET NULL (coluna)`).

## Decisões já refletidas no schema

| Decisão | Onde |
|---|---|
| Visitantes veem recursos aprovados e discussões públicas | policies `*_select` |
| Só cadastrados publicam, respondem e sugerem | policies `*_insert_member` |
| Recursos da comunidade nascem `pending` | default + `WITH CHECK` |
| Moderadores aprovam/rejeitam | `moderate_resource()` |
| Admin tem controle total | `admin_set_user_role()`, categorias, exclusões, `audit_logs` |
| Usuário edita o próprio perfil, nunca as permissões | GRANT por coluna + `is_active_member()` |
| Usuário suspenso bloqueado em 100% das escritas (inclusive perfil, favoritos e avatar) | `is_active_member()` em todas as policies de escrita e `storage.objects` |
| Tópico bloqueado (`is_locked`) congela respostas, tags e solução aceita para membros, preservando mod/admin | `posts_*_owner`, `topic_tags_*` e `set_accepted_post()` |
| Ações administrativas registradas (inclusive em `categories`) | `audit_logs` + `write_audit_log()` + `on_category_changed()` |
| Busca textual completa (`tsvector` + `pg_trgm`) no catálogo e no fórum | `resources.search_vector` e `topics.search_vector` |
| Deduplicação segura de URLs (RFC 3986) | `normalize_resource_url(url)` |

## Pontos para você confirmar

1. **Moderador não gerencia categorias nem exclui recursos.** Só admin. Moderador arquiva em vez de excluir. Se preferir mais poder ao moderador, é uma linha por policy.
2. **Qualquer membro cria tags.** Alternativa: só moderadores.
3. **Excluir conta anonimiza o conteúdo** (não apaga tópicos/respostas). Alternativa: apagar tudo em cascata.
4. **Votos só em respostas**, não no tópico em si.
5. **Sem tags em recursos** no MVP (o contexto só prevê `topic_tags`).
6. **Mensagens de erro/campos de UI.** Comentários no SQL estão em inglês (contribuidores internacionais) e a documentação em português. Posso gerar a versão EN dos docs.

## Próximos passos (ordem do projeto)

2. Autenticação: configurar Supabase Auth (e-mail, recuperação de senha, captcha) e o cliente Next.js (`@supabase/ssr`).
3. Catálogo: telas e queries (`search_vector`, filtros) sobre o schema pronto.
