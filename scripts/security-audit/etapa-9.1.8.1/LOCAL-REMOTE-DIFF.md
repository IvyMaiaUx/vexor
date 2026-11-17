# VEXOR — ETAPA 9.1.8.1: COMPARAÇÃO LOCAL × REMOTO (FASE G)

| Objeto / Categoria | Estado Local (4 Migrations) | Estado Remoto (`zcjudcbckcxwnfnrjfte`) | Classificação |
| :--- | :--- | :--- | :--- |
| **Histórico `schema_migrations`** | 4 migrations (`20261110000001..03`, `20261113143000`) | 0 migrations aplicadas (`remote: ""`) | **NÃO EXISTE** (nenhuma aplicada) |
| **12 Tabelas de usuário (`profiles` .. `audit_logs`)** | Definidas em Migration 1 | `table-stats = []`, `total_table_size = 0 bytes` | **NÃO EXISTE** |
| **Índices das tabelas de usuário** | Definidos em Migration 1 | `index-stats = []`, `total_index_size = 0 bytes` | **NÃO EXISTE** |
| **Bucket Storage `avatars`** | Definido em Migration 3 | `storage ls --remote = []` | **NÃO EXISTE** |
| **Roles Supabase (`anon`, `authenticated`, `service_role`, `supabase_auth_admin`, `supabase_storage_admin`)** | Pressupostas nas Migrations 1–4 | Confirmadas em `role-stats` | **EXISTE E É COMPATÍVEL** |
| **Versão PostgreSQL (`config.toml` vs Remoto)** | `major_version = 15` | `17.11.0.019` (`postgres_engine: "17"`) | **EXISTE COM DIVERGÊNCIA** |
| **Extensões / ENUMs / Funções isoladas / `auth` internals** | Definidos nas Migrations 1–2 / pressupostos | Sem acesso `psql`/Docker `db dump` nesta etapa | **NÃO VERIFICADO** |
| **Objetos remotos sem previsão local** | — | `table-stats = []`, `index-stats = []`, `storage ls = []` | Nenhum detectado nos relatórios `inspect db` |
