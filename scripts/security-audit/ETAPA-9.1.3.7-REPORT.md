# VEXOR — ETAPA 9.1.3.7: FECHAMENTO EXPERIMENTAL DE CONCORRÊNCIA, DEADLOCK E PERMISSÕES

**Projeto:** Vexor — Explore. Learn. Defend.  
**Ambiente Local Validado:** `127.0.0.1:5433`, banco `vexor_audit`, cluster `.pg_test_cluster` (`PostgreSQL 18.6 on x86_64-windows, compiled by msvc-19.44.35229, 64-bit`)  
**Supabase Remoto:** **Não acessado** (`zcjudcbckcxwnfnrjfte` intocado)  
**Parecer Final:** **APROVADO PARA PREPARAÇÃO DE MIGRATION** *(aguardando autorização explícita do responsável antes de criar ou aplicar qualquer migration)*

---

## 1. Regras de Segurança e Identidade do Servidor

Antes de cada bateria SQL, os scripts validaram obrigatoriamente a identidade do servidor local via `host(inet_server_addr())`, `inet_server_port()`, `current_database()` e `version()`:

```json
{"addr":"127.0.0.1","port":5433,"db":"vexor_audit","version":"PostgreSQL 18.6 on x86_64-windows, compiled by msvc-19.44.35229, 64-bit"}
```

- Nenhuma conexão foi aberta contra o Supabase remoto.
- Nenhum comando `supabase login`, `supabase link`, `db push`, `migration up`, `seed` ou `deploy` foi executado.
- Nenhuma função original do banco ou arquivo em `supabase/migrations/` / `supabase/seed.sql` foi alterado.
- Usuários temporários de teste e a tabela temporária `_audit_deadlock_test` foram limpos ao término dos scripts (com `ROLLBACK` e `DELETE` em `finally`).

---

## 2. Inventário Inicial e Hashes SHA-256

### Hashes SHA-256 (Início e Fim da Etapa — Idênticos)

| Arquivo | SHA-256 |
| :--- | :--- |
| `supabase/migrations/20261110000001_schema.sql` | `24763C8E77E5643EFA3214093071760539D65C3A8834E5837CBC70698C7BEE75` |
| `supabase/migrations/20261110000002_functions_triggers.sql` | `89D8F4C6A456ABD523EC660C932AE24F63B10AF3D46C199A2B39D898E5A00D77` |
| `supabase/migrations/20261110000003_rls_and_grants.sql` | `10E8487AB58DA75BAC0A7AEE21DA968EA69FB93F284BB879A7DE96347467F030` |
| `supabase/seed.sql` | `E2B814A6E64FD18DEF920792959CE8ABF8463B0A500CDE4FD9F60D875092F3B9` |

A revisão de `20261110000002_functions_triggers.sql` e `forensic-evidence.txt` confirmou que `admin_set_user_role`, `admin_set_user_suspension`, `is_admin`, `is_moderator` e `write_audit_log` no banco `vexor_audit` correspondem integralmente às definições originais da Migration 02 (`SET search_path TO ''`, `SECURITY DEFINER`, sem `pg_advisory_xact_lock`, sem `NOWAIT` e sem revalidação pós-lock).

---

## 3. Testes C1 e C2 — RPCs Administrativas Reais (`test-c1-c2-concurrency.mjs`)

Evidências completas salvas em `scripts/security-audit/result-c1-c2.json`.

### C1 — `admin_set_user_role` e `admin_set_user_suspension` vs. `ON DELETE CASCADE`
- **Sessões:** `Sessão A` (`PID 17696`, `DELETE FROM auth.users WHERE id = ...`) e `Sessão B` (`PID 13296`, `SET LOCAL ROLE authenticated` + JWT de `ADMIN_A`, chamando `public.admin_set_user_role` e `public.admin_set_user_suspension`).
- **Ordem de locks e espera observada:**
  1. `Sessão A` adquiriu `RowExclusiveLock` em `auth.users`, `public.profiles` e tabelas filhas em cascata, além de `ExclusiveLock` em `transactionid`.
  2. `Sessão B` (chamando `admin_set_user_role` com `FOR UPDATE` sem `NOWAIT`) adquiriu `RowShareLock` em `profiles` e `AccessExclusiveLock` na tupla alvo e entrou em espera real (`Lock | transactionid | {17696} | ShareLock=false`).
  3. Após `COMMIT` da `Sessão A`, o `ON DELETE CASCADE` removeu o perfil (`profileExistsAfterCascade = 0`).
  4. `Sessão B` desbloqueou e falhou em ambas as RPCs (`admin_set_user_role` linha 14 e `admin_set_user_suspension` linha 15) com **`SQLSTATE: P0002`** (`ERRO: P0002: user not found`). Não houve deadlock.
- **Classificação:** **`PASS`** *(comportamento real das RPCs originais comprovado)*.

### C2 — Exclusão Concorrente do Administrador Chamador (`ADMIN_B`)
- **Sessões:** `Sessão A` (`PID 17696`, `DELETE FROM auth.users WHERE id = ADMIN_B`) e `Sessão B` (`PID 13296`, `SET LOCAL ROLE authenticated` + JWT de `ADMIN_B`, chamando `public.admin_set_user_role(TARGET_1, 'moderator')`).
- **Comportamento real observado:**
  1. Como o `DELETE` da `Sessão A` ainda não havia sido comitado, a checagem `is_admin()` na `Sessão B` leu o snapshot MVCC anterior e **passou**.
  2. `Sessão B` executou `UPDATE public.profiles` em `TARGET_1` e, ao invocar `write_audit_log` (que insere `actor_id = ADMIN_B` em `public.audit_logs`), **bloqueou** em `Lock | transactionid | {17696}` devido à checagem de chave estrangeira `audit_logs_actor_id_fkey` sobre a linha de `ADMIN_B` em exclusão na `Sessão A`.
  3. Após `COMMIT` da `Sessão A` (`callerExistsAfterC2 = 0`), a `Sessão B` falhou com **`SQLSTATE: 23503`** (`inserção ou atualização em tabela "audit_logs" viola restrição de chave estrangeira "audit_logs_actor_id_fkey"`), sofrendo `ROLLBACK` (`target1RoleAfterC2 = "member"`).
- **Classificação:** **`PASS`** *(comportamento real e ausência de alteração indevida comprovados)*.

---

## 4. Teste C3 — Revalidação de Autorização (`test-c3-revalidation.mjs`)

Evidências completas salvas em `scripts/security-audit/result-c3.json`.

- **Parte 1 (Sequencial após rebaixamento):** `ADMIN_A` rebaixou `ADMIN_B` para `member` e comitou. Em seguida, `Sessão B` (`ADMIN_B`) chamou `admin_set_user_role(TARGET_1, 'moderator')` e foi bloqueada na checagem inicial `is_admin()` com **`SQLSTATE: 42501`** (`forbidden`).
- **Parte 2 (Concorrente — ausência de revalidação pós-lock):**
  1. `Sessão A` (`PID 9036`) travou a linha de `TARGET_1` (`UPDATE public.profiles SET bio = ...`).
  2. `Sessão B` (`PID 16336`, `ADMIN_B`) chamou `admin_set_user_role(TARGET_1, 'moderator')`, **passou pela checagem inicial `is_admin()`** e bloqueou no `FOR UPDATE` (`16336|Lock|transactionid|{9036}`).
  3. Enquanto `B` aguardava o lock, `Sessão C` (`PID 4444`, `ADMIN_A`) rebaixou `ADMIN_B` para `member` e comitou (`adminBRoleBeforeBUnblocks = "member"`).
  4. `Sessão A` comitou e liberou `TARGET_1`. `Sessão B` desbloqueou, **não revalidou `is_admin()` após o lock**, concluiu a promoção (`sqlstate: null`, `COMMIT`) e alterou `TARGET_1` para `moderator` mesmo com `ADMIN_B` já rebaixado para `member`.
- **Classificação:** **`PASS` (vulnerabilidade confirmada)** — diferencia claramente a checagem inicial existente da ausência de revalidação pós-lock nas migrations originais.

---

## 5. Teste C6 — Reprodução Determinística de Deadlock (`test-c6-deadlock.mjs`)

Evidências completas salvas em `scripts/security-audit/result-c6.json`.

- **Cenário:** Duas sessões independentes (`Sessão A` `PID 18368`, `Sessão B` `PID 4488`) sobre recursos distintos X (`id = 1`) e Y (`id = 2`) em tabela temporária `_audit_deadlock_test` (removida ao final), sincronizadas via `pg_stat_activity` (sem `pg_sleep()`).
- **Linha do tempo observada:**
  - `2026-11-13T00:28:39.742Z` — `Sessão A` adquiriu lock exclusivo em X (`id = 1`).
  - `2026-11-13T00:28:39.758Z` — `Sessão B` adquiriu lock exclusivo em Y (`id = 2`).
  - `2026-11-13T00:28:39.779Z` — `Sessão A` requisitou Y (`id = 2`) e entrou em espera (`18368|Lock|transactionid|{4488}`).
  - `2026-11-13T00:28:39.793Z` — `Sessão B` requisitou X (`id = 1`), fechando o ciclo.
  - `2026-11-13T00:28:40.799Z` — Detector de deadlock disparou em **`1006 ms`**.
- **Resultado:**
  - **Vítima abortada:** `Sessão B` (`PID 4488`) com **`SQLSTATE: 40P01`** (`ERRO: 40P01: impasse detectado` — `Processo 4488 espera por ShareLock em transação 2146; bloqueado pelo processo 18368. Processo 18368 espera por ShareLock em transação 2147; bloqueado pelo processo 4488.`), finalizando em `ROLLBACK`.
  - **Sobrevivente:** `Sessão A` (`PID 18368`) concluiu com `COMMIT` (`1|A_locked_X`, `2|A_wants_Y`).
- **Classificação:** **`PASS`**.

---

## 6. Teste F-NEG-02 — Autorização com `SET ROLE authenticated` (`test-f-neg-02-and-privacy.mjs`)

Evidências completas salvas em `scripts/security-audit/result-f-neg-02-privacy.json`.

1. **Sessão 1 (`SET LOCAL ROLE authenticated` + JWT de `member` válido):**
   - `current_user = authenticated`, `session_user = postgres`.
   - `auth.uid()` retornou `91370005-0000-0000-0000-000000000001`.
   - `auth.role()` retornou `authenticated`.
   - `public.is_admin()` retornou `false`.
   - `public.admin_set_user_role` foi negada com **`SQLSTATE: 42501`** (`ERRO: 42501: forbidden`).
2. **Controle negativo A (`SET LOCAL ROLE authenticated` sem contexto JWT):**
   - `auth.uid() = NULL`, `auth.role() = anon`, `is_admin() = false`.
   - Chamada a `admin_set_user_role` negada na camada da aplicação (`SECURITY DEFINER`) com **`SQLSTATE: 42501`** (`forbidden`).
3. **Controle negativo B (`SET LOCAL ROLE anon`):**
   - Chamada negada na camada de privilégio SQL do PostgreSQL antes mesmo de entrar na função: **`SQLSTATE: 42501`** (`permissão negada para função admin_set_user_role`).
- **Classificação:** **`PASS`**.

---

## 7. Revalidação da View Experimental e Privacidade da Tabela Base

- **View `public.public_profiles`:** Existe **apenas** como objeto experimental local (owner `postgres`, `reloptions: {security_invoker=false}`). Para `anon`, oculta `suspended_user` (retorna 9 perfis ativos); `public.is_moderator()` retorna `false` para `anon` e `true` para moderador ativo.
- **Tabela base `public.profiles`:** Permanece com a política original `profiles_select_public` (`PERMISSIVE`, `{anon,authenticated}`, `SELECT`, `USING (true)`), `GRANT SELECT` para `anon` e `authenticated` na tabela e nas colunas `is_suspended` e `role`.
- **Acesso direto de `anon`:** `SET LOCAL ROLE anon; SELECT username, is_suspended, role FROM public.profiles;` retornou **10 linhas**, incluindo `suspended_user|true|member` e todas as roles (`admin`, `moderator`, `member`).
- **Classificação:** **`FAIL` (vulnerabilidade confirmada na Migration 03 original)** — a view experimental não mitiga o acesso direto à tabela base enquanto `profiles_select_public` não for restringida na futura migration corretiva.

---

## 8. Matriz Consolidada de Resultados (Etapa 9.1.3.7)

| ID | Objetivo | Script | Sessões | SQLSTATE | Classificação | Observação |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `C1-ROLE-VS-CASCADE` | `admin_set_user_role` vs `DELETE auth.users` | `test-c1-c2-concurrency.mjs` | 2 + Obs | `P0002` | **`PASS`** | Bloqueio em `Lock:transactionid`; após `COMMIT` de A, `user not found`. |
| `C1-SUSPENSION-VS-CASCADE` | `admin_set_user_suspension` vs `DELETE auth.users` | `test-c1-c2-concurrency.mjs` | 2 + Obs | `P0002` | **`PASS`** | Bloqueio em `Lock:transactionid`; após `COMMIT` de A, `user not found`. |
| `C2-CALLER-DELETION-CONCURRENT` | `admin_set_user_role` com chamador em exclusão | `test-c1-c2-concurrency.mjs` | 2 + Obs | `23503` | **`PASS`** | Bloqueou na FK `audit_logs_actor_id_fkey`; após `COMMIT` de A, sofreu `ROLLBACK`. |
| `C3-SEQ-AFTER-DEMOTION` | Chamada após rebaixamento já comitado | `test-c3-revalidation.mjs` | 2 + Obs | `42501` | **`PASS`** | Bloqueado em `is_admin()` (`forbidden`). |
| `C3-CONCURRENT-NO-REVALIDATION` | Rebaixamento enquanto RPC aguarda lock | `test-c3-revalidation.mjs` | 3 + Obs | `null` | **`PASS`** *(vuln. confirmada)* | RPC não revalidou após lock e promoveu alvo mesmo após perda de privilégio. |
| `C6-DEADLOCK` | Reprodução determinística de ciclo de locks | `test-c6-deadlock.mjs` | 2 + Obs | `40P01` | **`PASS`** | Vítima B abortada em `1006 ms` (`impasse detectado`). |
| `F-NEG-02-SET-ROLE` | `SET LOCAL ROLE authenticated` + controles negativos | `test-f-neg-02-and-privacy.mjs` | 2 + Obs | `42501` | **`PASS`** | `forbidden` na RPC para `member`/`sem JWT`; `permission denied` para `anon`. |
| `PRIVACY-BASE-VS-VIEW` | Revalidação de `profiles` vs `public_profiles` | `test-f-neg-02-and-privacy.mjs` | 2 + Obs | `null` | **`FAIL`** *(vuln. confirmada)* | `anon` segue lendo `is_suspended` e `role` diretamente em `public.profiles`. |

---

## 9. Integridade Final e Verificações de Build

1. **Hashes SHA-256:** Todos os 4 arquivos (`20261110000001_schema.sql`, `20261110000002_functions_triggers.sql`, `20261110000003_rls_and_grants.sql`, `seed.sql`) mantiveram exatamente os mesmos hashes SHA-256 do inventário inicial.
2. **Acesso remoto e migrations:** Zero conexões ao Supabase remoto; nenhuma migration criada ou alterada.
3. **Cluster local:** `.pg_test_cluster` preservado e desligado ao término dos scripts; objetos temporários de teste removidos.
4. **Verificações de código e build (Etapa 9.1.3.7):**
   - `npx tsc --noEmit`: **`TSC_EXIT=0`**
   - `npm run lint`: **`LINT_EXIT=0`** (0 erros; 2 warnings pré-existentes em `scripts/security-audit/run-all-tests.mjs` linhas `156:16` e `193:44`)
   - `npx next build --webpack`: **`BUILD_EXIT=0`** (28 rotas compiladas com sucesso)
   - *Histórico de falhas anteriores (não ocultado):* `npm run build` (Turbopack no Windows) falhou com `exit code 1` em `globals.css`; `npx next build --webpack` dentro do sandbox falhou com `exit code 1` por `EPERM: operation not permitted, mkdir`.

---

## 10. Parecer Final

- **Testes aprovados:** `C1-ROLE-VS-CASCADE`, `C1-SUSPENSION-VS-CASCADE`, `C2-CALLER-DELETION-CONCURRENT`, `C3-SEQ-AFTER-DEMOTION`, `C3-CONCURRENT-NO-REVALIDATION` *(como diagnóstico de vulnerabilidade)*, `C6-DEADLOCK`, `F-NEG-02-SET-ROLE`.
- **Testes reprovados:** `PRIVACY-BASE-VS-VIEW` *(vulnerabilidade original na tabela base `public.profiles`)*.
- **Testes inconclusivos:** **0** (todas as pendências da Etapa 9.1.3.6 foram fechadas experimentalmente).
- **Vulnerabilidades originais confirmadas (a corrigir na próxima etapa autorizada):**
  1. Ausência de proteção atômica (`pg_advisory_xact_lock` + trigger `BEFORE DELETE`) contra remoção/despromoção/suspensão do último administrador ativo.
  2. Ausência de revalidação de autorização após aquisição de lock em `admin_set_user_role` (comprovada em `C3-CONCURRENT-NO-REVALIDATION`).
  3. Exposição de `is_suspended` (e `role`) na tabela base `public.profiles` via `profiles_select_public` (`USING (true)`).

### Classificação: **`APROVADO PARA PREPARAÇÃO DE MIGRATION`**

Nenhuma migration foi criada ou aplicada. Aguardando sua avaliação e autorização explícita para iniciar a etapa de implementação corretiva.
