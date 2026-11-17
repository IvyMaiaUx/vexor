# Etapa 9.1.10 — Auth Integration Audit (Fase J)

- **Data:** 2026-11-13
- **Método:** Consulta read-only em `pg_constraint`, `pg_trigger`, `pg_proc` e `auth.users` (`count(*)` apenas, sem leitura de PII).
- **Status:** `VERIFIED_REMOTE`

## 1. Integração `auth.users` ↔ `public.profiles`

- **Foreign Key:** `profiles_id_fkey` (`FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE`) confirmada em `pg_constraint`.
- **Trigger de criação automática:** `on_auth_user_created` (`AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_user()`) confirmado em `pg_trigger` com `enabled_state = 'O'`.
- **Função `handle_new_user()`:** `SECURITY DEFINER`, `owner = postgres`, `search_path = ""`, `EXECUTE` revogado de `PUBLIC`, `anon` e `authenticated`.
- **Contagem atual:** `auth.users` = `0`, `public.profiles` = `0` (nenhum usuário criado).
- **Configurações de Auth:** Nenhuma configuração de autenticação foi alterada nesta etapa.
