# VEXOR — Etapa 9.7 (Revisão 4) — Triggers e Privilégios

**Data:** 2026-11-16  

---

## 1. Contexto de Execução (`current_user`) nos Triggers

Em PostgreSQL/Supabase:
1. **Escrita direta por cliente (`authenticated` / `anon` via PostgREST):**
   - `current_user` dentro de triggers `BEFORE INSERT OR UPDATE` é `'authenticated'` (ou `'anon'`).
   - Os `GRANT INSERT (...)` e `GRANT UPDATE (...)` por coluna já excluem `id`, `slug`, `author_id`, `status`, `rejection_reason`, `reviewed_by`, `reviewed_at`, `published_at`.
   - Em reforço (defesa em profundidade), `research_protect_fields()` verifica `if current_user in ('anon', 'authenticated')` no `UPDATE` e bloqueia com `42501` qualquer alteração em `status`, `rejection_reason`, `reviewed_by`, `reviewed_at` ou `published_at`.
2. **Escrita via RPCs `SECURITY DEFINER` (`moderate_research`, `resubmit_research`):**
   - Como as funções são `SECURITY DEFINER` e pertencem ao owner da migration (`postgres`), durante sua execução `current_user` assume o owner (`'postgres'`), **não** `'authenticated'`.
   - Assim, `moderate_research` e `resubmit_research` atualizam `status`, `rejection_reason`, `reviewed_by`, `reviewed_at` e `published_at` normalmente.
   - `current_user` **não** pode ser alterado por clientes (sem `SET ROLE`), não abrindo caminho alternativo de escrita.
3. **Imutabilidade incondicional:**
   - `author_id` e `slug` são protegidos para **qualquer** `current_user` no `UPDATE` (`is distinct from old.*` → `42501`).
4. **Validações invariantes:**
   - Categoria ativa com `scope in ('research', 'both')` e contrato JSONB estrito de `source_references` são validados em todo `INSERT` e `UPDATE` (inclusive via `resubmit_research`).

---

## 2. Resumo de Privilégios

- `public.research_submissions`: `REVOKE ALL` baseline; `GRANT SELECT` e `GRANT INSERT/UPDATE` apenas nas 16 colunas de conteúdo para `authenticated`; zero acesso para `anon`; zero `DELETE`.
- `public.research_recipients`: `REVOKE ALL` baseline; `GRANT SELECT` apenas para `authenticated`; zero `INSERT/UPDATE/DELETE` direto para clientes.
- Funções internas/triggers (`research_set_slug`, `research_protect_fields`): `REVOKE ALL FROM PUBLIC, anon, authenticated`.
- `public.is_research_author(uuid)`: `REVOKE ALL FROM PUBLIC, anon; GRANT EXECUTE TO authenticated`.
- `public.research_valid_code_array(text[], text, integer)`: `GRANT EXECUTE TO anon, authenticated` (usada em `CHECK` constraints).
- RPCs (`moderate_research`, `resubmit_research`, `grant_research_recipient`, `revoke_research_recipient`): `REVOKE ALL FROM PUBLIC, anon; GRANT EXECUTE TO authenticated`.
