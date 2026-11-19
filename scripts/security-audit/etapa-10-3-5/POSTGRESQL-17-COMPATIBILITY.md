# COMPATIBILIDADE POSTGRESQL 17.11 — ETAPA 10.3.5

- **Status:** Aplicada com sucesso no PostgreSQL `17.11` remoto (`exit code 0`, `COMMIT`), validando sintaxe, ENUMs, constraints, índices, triggers, funções `SECURITY DEFINER`, RLS e grants durante o deploy.
- **Diferenciação explícita:**
  - **Validado em PG 17.11 (DDL/deploy):** Criação integral de todos os objetos de `20261117234500_social_community.sql`.
  - **Validado em PG 18 local (runtime/concorrência):** Testes de execução das RPCs, RLS, `55P03`, `42901`, `23505` e 100 pares concorrentes sem `40P01`.
  - **Pendente em PG 17.11 (runtime com sessões reais):** Execução direta das RPCs em produção ocorrerá somente na Etapa 10.3.6 / Fase B após autorização.
- **Nota de ambiente local:** `supabase/config.toml` declara `major_version = 15`; caso venha a usar Docker local no futuro, atualizar para `17`.
