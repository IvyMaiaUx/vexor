# Cybersecurity Community Platform

> Plataforma internacional, colaborativa e open source voltada à comunidade de cibersegurança (PT-BR / EN).  
> *Nome definitivo da marca em definição.*

## Sobre o Projeto

O objetivo desta plataforma é centralizar ferramentas, projetos open source, repositórios GitHub, scripts, frameworks, laboratórios práticos, plataformas CTF, cursos e artigos técnicos em um único ambiente colaborativo, integrado a um fórum técnico estruturado.

## Estrutura Atual do Repositório

```text
cybersec-community-platform/
├── docs/
│   ├── PROJECT_CONTEXT.md                # Visão geral, objetivos e escopo do MVP
│   ├── ARCHITECTURE.md                   # Arquitetura planejada (Next.js + Supabase)
│   └── database/
│       ├── README.md                     # Guia de banco de dados e testes
│       ├── ERD.md                        # Diagrama Entidade-Relacionamento (Mermaid)
│       └── SECURITY.md                   # Matriz de permissões, RLS e modelo de ameaças
├── supabase/
│   ├── migrations/
│   │   ├── 20261110000001_schema.sql
│   │   ├── 20261110000002_functions_triggers.sql
│   │   └── 20261110000003_rls_and_grants.sql
│   ├── seed.sql                          # 12 categorias iniciais (PT-BR / EN)
│   └── tests/
│       ├── postgres_bootstrap.sql        # Bootstrap para testes em PostgreSQL puro local
│       └── rls_smoke_test.sql            # 48 verificações automatizadas de RLS e segurança
├── .env.example
└── .gitignore
```

## Documentação

- [Contexto do Projeto (`docs/PROJECT_CONTEXT.md`)](docs/PROJECT_CONTEXT.md)
- [Arquitetura e Estrutura Planejada (`docs/ARCHITECTURE.md`)](docs/ARCHITECTURE.md)
- [Documentação do Banco de Dados (`docs/database/README.md`)](docs/database/README.md)
- [Diagrama ER e Decisões de Modelagem (`docs/database/ERD.md`)](docs/database/ERD.md)
- [Modelo de Segurança e Matriz de Permissões (`docs/database/SECURITY.md`)](docs/database/SECURITY.md)
