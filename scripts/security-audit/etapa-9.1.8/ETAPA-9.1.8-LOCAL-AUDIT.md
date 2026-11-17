# VEXOR — ETAPA 9.1.8: AUDITORIA LOCAL (FASE A)

**Projeto:** Vexor (`zcjudcbckcxwnfnrjfte` / `https://zcjudcbckcxwnfnrjfte.supabase.co`).

---

## 1. Arquivos Inspecionados
- `supabase/config.toml`
- `supabase/migrations/` (`20261110000001_schema.sql`, `20261110000002_functions_triggers.sql`, `20261110000003_rls_and_grants.sql`, `20261113143000_security_hardening.sql`)
- `supabase/seed.sql`
- `src/lib/supabase/client.ts`, `src/lib/supabase/server.ts`, `src/proxy.ts`
- `src/types/database.types.ts`
- `.env.example`, `.gitignore`
- Nomes de variáveis em `.env.local` (valores não exibidos nem copiados)

---

## 2. Verificações Realizadas

1. **Project Reference local:** `supabase/config.toml` define `project_id = "zcjudcbckcxwnfnrjfte"` — **compatível**.
2. **Quatro migrations presentes e ordem válida:**
   - `20261110000001_schema.sql` (`SHA-256: 24763C8E77E5643EFA3214093071760539D65C3A8834E5837CBC70698C7BEE75`)
   - `20261110000002_functions_triggers.sql` (`SHA-256: 89D8F4C6A456ABD523EC660C932AE24F63B10AF3D46C199A2B39D898E5A00D77`)
   - `20261110000003_rls_and_grants.sql` (`SHA-256: 10E8487AB58DA75BAC0A7AEE21DA968EA69FB93F284BB879A7DE96347467F030`)
   - `20261113143000_security_hardening.sql` (`SHA-256: A8ABA292389CB485F79DD6563D1F57E49FAE7542F2267E5B880AAC90337EB336`)
   - Ordem cronológica estritamente crescente; sem arquivos SQL duplicados ou inesperados em `supabase/migrations/`.
3. **Separação do Seed:** `supabase/seed.sql` (`SHA-256: E2B814A6E64FD18DEF920792959CE8ABF8463B0A500CDE4FD9F60D875092F3B9`) está separado de `supabase/migrations/`.
4. **Configurações de Auth e Storage (`supabase/config.toml`):** `[api]` expõe `["public", "storage", "graphql_public"]` com `extra_search_path = ["public", "extensions"]`; `[auth]` habilitado (`enable_signup = true`, `jwt_expiry = 3600`); `[storage]` habilitado (`file_size_limit = "50MiB"`).
5. **Proteção de ambiente (`.gitignore`):** `.env` e `.env.*` (com exceção explícita de `!.env.example`) e `supabase/.branches` / `supabase/.temp` estão ignorados.
6. **Clientes SSR/Browser (`client.ts`, `server.ts`, `proxy.ts`):** utilizam `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (com fallback para `NEXT_PUBLIC_SUPABASE_ANON_KEY`) e `supabase.auth.getUser()` no `proxy.ts`.

---

## 3. Divergências Locais Identificadas

1. **`supabase/config.toml` vs PostgreSQL remoto:** `config.toml` declara `[db] major_version = 15`, enquanto o projeto remoto `zcjudcbckcxwnfnrjfte` reporta `postgres_engine: "17"` (`17.11.0.019`).
2. **`src/types/database.types.ts` desatualizado frente à 4ª migration:** `database.types.ts` ainda referencia `foreignKeyName: "audit_logs_actor_id_fkey"` e não inclui a view `public_profiles` (deverá ser regenerado após a futura aplicação das migrations).
3. **Projeto não vinculado localmente (`linked: false`):** `supabase migration list` aponta para `127.0.0.1:54322` por ausência de `supabase link`; `.env.local` não contém `DATABASE_URL` nem credenciais administrativas de banco.
