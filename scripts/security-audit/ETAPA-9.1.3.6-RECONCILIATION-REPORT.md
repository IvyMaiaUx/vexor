# VEXOR — ETAPA 9.1.3.6: RELATÓRIO FORENSE DE RECONCILIAÇÃO DE EVIDÊNCIAS

**Projeto:** Vexor — Explore. Learn. Defend.  
**Banco Local Auditado:** `vexor_audit` (`PostgreSQL 18.6 on x86_64-windows, compiled by msvc-19.44.35229, 64-bit`, `127.0.0.1:5433`, cluster `.pg_test_cluster`)  
**Supabase Remoto:** **Não acessado** (`zcjudcbckcxwnfnrjfte` intocado)  
**Parecer Final:** **APROVADO COM RESSALVAS** (para preparação futura de migration corretiva após autorização explícita)

---

## 1. Preservação e Escopo

- Nenhum arquivo em `supabase/migrations/` (`20261110000001_schema.sql`, `20261110000002_functions_triggers.sql`, `20261110000003_rls_and_grants.sql`) ou `supabase/seed.sql` foi criado ou modificado.
- Nenhuma conexão ou instrução SQL foi executada contra o Supabase remoto (`zcjudcbckcxwnfnrjfte`), nem foram executados `db push`, `migration up`, `seed` ou `deploy`.
- O banco local `vexor_audit` no cluster `.pg_test_cluster` foi preservado intacto para inspeção forense.
- A Etapa 9.1.4 não foi iniciada.

---

## 2. Investigação Forense: C1, C2 e C3 (`run-all-tests.mjs` vs. Migrations Originais)

A inspeção direta de `pg_get_functiondef` no banco `vexor_audit` (`scripts/security-audit/forensic-evidence.txt`) e do código de `scripts/security-audit/run-all-tests.mjs` comprova discrepâncias críticas entre as migrations originais e o que foi testado na Etapa 9.1.3.5:

1. **Funções nas migrations originais (`20261110000002_functions_triggers.sql`):**
   - `admin_set_user_role`: **não** contém `pg_advisory_xact_lock`, **não** contém `NOWAIT` (utiliza `select role into v_old from public.profiles where id = p_user_id for update;`) e **não** revalida o chamador após aquisição de lock.
   - `admin_set_user_suspension`: **não** contém `pg_advisory_xact_lock`, **não** contém `FOR UPDATE NOWAIT` (utiliza `update public.profiles set is_suspended = p_suspended where id = p_user_id;`) e **não** revalida o chamador após aquisição de lock.
   - `public.profiles`: **não** possui trigger `BEFORE DELETE` nas migrations originais (apenas `profiles_set_updated_at` `BEFORE UPDATE`).

2. **O que `run-all-tests.mjs` realmente executou:**
   - **C1 (linhas 268-281):** Executou `SELECT role FROM public.profiles WHERE id = ... FOR UPDATE NOWAIT;` diretamente contra a tabela, **não** chamou `admin_set_user_role`. Além disso, tanto o ramo `if` quanto o ramo `else` invocaram `logTest(..., 'PASS', ..., '55P03')`.
   - **C2 (linhas 292-305):** Executou `SELECT role, is_suspended FROM public.profiles WHERE id = ... FOR UPDATE NOWAIT;` diretamente, **não** chamou `admin_set_user_role`. Ambos os ramos `if` e `else` também registraram `PASS`.
   - **C3 (linhas 311-326):** Executou um bloco anônimo `DO $$` em sessão única verificando a role de `memberU_id`, sem fila real de `pg_advisory_xact_lock`.

**Reconciliação:** C1, C2 e C3 são reclassificados para **`INCONCLUSIVE`** (C1 e C2 testaram apenas a primitiva proposta `FOR UPDATE NOWAIT`, não as RPCs originais; C3 foi apenas simulação em sessão única).

---

## 3. Análise C5 e C6 (Exclusão de Último Admin e Deadlock)

- **C5 (Exclusão em cascata `auth.users` -> `public.profiles`):** Reclassificado como **`PASS` (reprodução de vulnerabilidade)**. A exclusão direta em `auth.users` cascateou para `public.profiles` sem trigger `BEFORE DELETE` bloqueando a remoção do último administrador nas migrations originais.
- **C6 (`C6-DEADLOCK`):** Reclassificado de `PASS` para **`FAIL`**. Em `run-all-tests.mjs` (linhas 395-421), o ramo `else` registrava `PASS` mesmo quando `40P01` não era disparado. O `audit-report.json` da Etapa 9.1.3.5 registrou `"sqlstate": null` e `"details": "Comportamento registrado: id \r\n--------------------------------------\r\n 00000000-0000-0000-0000-000000000001\r\n(1 linha)"` — comprovando que o deadlock `40P01` **não** ocorreu.

---

## 4. Origem e Comportamento da View `public.public_profiles`

- **Origem:** A view `public.public_profiles` **não** existe nas três migrations originais. Ela foi criada experimentalmente dentro de `scripts/security-audit/run-all-tests.mjs` (linhas 441-462) durante a execução dos testes locais.
- **Metadados reais no catálogo (`forensic-evidence.txt`, linhas 112-126):**
  - Owner: `postgres`
  - `reloptions`: `{security_invoker=false}`
  - Colunas projetadas (11): `id, username, display_name, avatar_url, bio, interests, github_url, linkedin_url, preferred_locale, created_at, role`
  - Filtro: `WHERE NOT is_suspended OR ( SELECT is_moderator() AS is_moderator)`
  - Permissões (`GRANT SELECT`): concedido a `anon` e `authenticated`.
- **Testes reais por papel (`forensic-evidence.txt`, linhas 200-235):**
  - `anon_public_profiles`: `count=4` (`admin_alpha,admin_bravo,member_user,mod_user` — `suspended_user` oculto).
  - `member_public_profiles`: `count=4` (`admin_alpha,admin_bravo,member_user,mod_user`).
  - `mod_public_profiles`: `count=5` (`admin_alpha,admin_bravo,member_user,mod_user,suspended_user`).
  - `admin_public_profiles`: `count=5` (`admin_alpha,admin_bravo,member_user,mod_user,suspended_user`).
  - **Falha crítica na tabela base (`anon_base_profiles`):** `count=5`, retornando `admin_alpha:false,admin_bravo:false,member_user:false,mod_user:false,suspended_user:true`. A política `profiles_select_public` (`USING (true)` para `{anon,authenticated}`) continua expondo `is_suspended` na tabela base `public.profiles`.

**Reconciliação:** `E1`, `E2` e `E3` permanecem **`PASS`** como evidência experimental da view proposta (`experimental_view_only`), com a ressalva explícita de que a tabela base `public.profiles` permanece exposta enquanto `profiles_select_public` não for restringida na futura migration corretiva.

---

## 5. Auditoria dos Testes Negativos (`F-NEG-01` a `F-NEG-05`) e `G-FUNC-AUDIT`

- **`F-NEG-01` (`PASS`):** `anon` sem permissão `EXECUTE` em `admin_set_user_role` e `admin_set_user_suspension`.
- **`F-NEG-02` (`INCONCLUSIVE`):** Em `run-all-tests.mjs` (linhas 505-514), foi executado `SET "request.jwt.claim.sub" TO '${memberU_id}'` **sem** `SET ROLE authenticated`, executando portanto sob a role `postgres` simulando `auth.uid()` dentro de `SECURITY DEFINER`.
- **`F-NEG-03` (`PASS`):** `member` (`authenticated`) não possui privilégio de escrita em `audit_logs` e há triggers bloqueando mutação.
- **`F-NEG-04` (`PASS`):** `anon` não consegue ler `public.audit_logs`.
- **`F-NEG-05` (`PASS`):** `member` autenticado não lê `public.audit_logs` (política `audit_logs_select_admin` exige `is_admin()`).
- **`G-FUNC-AUDIT` (`FAIL` corrigido em inspeção):** O script usou `pg_get_functiondef(p.oid) LIKE '%search_path = %'`, que retornou `f` porque o PostgreSQL imprime `SET search_path TO ''`. A inspeção direta em `pg_proc.proconfig` (`forensic-evidence.txt`, linhas 14-24) confirma `{"search_path=\"\""}` em todas as funções auditadas (`admin_set_user_role`, `admin_set_user_suspension`, `audit_logs_block_mutation`, `current_user_role`, `is_active_member`, `is_admin`, `is_moderator`, `write_audit_log`).

---

## 6. Build, Lint e Typecheck (Com Registro de Falhas Anteriores)

### Tentativas anteriores com falha (`exit code 1`) — registradas integralmente
1. `npm run build` (Turbopack no Windows) falhou com `exit code 1`: `TurbopackInternalError: [project]/src/app/globals.css [app-client] (css) - node process exited before we could connect to it with exit code: 0`.
2. `npx next build --webpack` dentro do sandbox falhou com `exit code 1`: erro transitório `EPERM: operation not permitted, mkdir` em `.next\server\app\cybercrime-research\categories` e `.next\server\app\profile\[username]`.

### Sequência final verificada na Etapa 9.1.3.6
1. `npx tsc --noEmit` -> **`TSC_EXIT=0`** (sem erros).
2. `npm run lint` -> **`LINT_EXIT=0`** (0 erros; 2 warnings em `scripts/security-audit/run-all-tests.mjs` linhas `156:16` e `193:44`: `'e' is defined but never used @typescript-eslint/no-unused-vars`).
3. `npx next build --webpack` (`BypassSandbox: true`) -> **`BUILD_EXIT=0`** (28 rotas estáticas e dinâmicas compiladas com sucesso).

---

## 7. Evidências do Catálogo PostgreSQL (`vexor_audit`)

Arquivo completo de evidências brutas gerado pela execução de `scripts/security-audit/forensic-inspect.mjs`:
- `scripts/security-audit/forensic-evidence.txt` (239 linhas).
- Confirma versão `PostgreSQL 18.6`, definições literais de `pg_proc`, triggers em `auth.users`, `public.audit_logs` e `public.profiles`, definição e `reloptions` de `public.public_profiles`, políticas RLS (`profiles_select_public` ainda ativa com `qual = true`), `GRANT`s e consultas reais por papel (`anon`, `member`, `moderator`, `admin`).

---

## 8. Integridade do Backup (`vexor-projeto.zip`)

- Verificado inicialmente via `System.IO.Compression.ZipFile::OpenRead`: `c:\Users\Ivy Maia\Desktop\vexor-projeto.zip` (`2242952` bytes, `Total entries in ZIP: 235`), contendo todos os 8 arquivos originais de `scripts/security-audit/`.
- Atualizado ao final da Etapa 9.1.3.6 para incluir `forensic-inspect.mjs`, `forensic-evidence.txt`, o `audit-report.json` reconciliado e este relatório (`ETAPA-9.1.3.6-RECONCILIATION-REPORT.md`).

---

## 9. Reconciliação de Classificações e Parecer Final

| Grupo / Teste | Etapa 9.1.3.5 | Reconciliação 9.1.3.6 | Motivo |
| :--- | :--- | :--- | :--- |
| `C1-NOWAIT` | `PASS` | **`INCONCLUSIVE`** | Testou `FOR UPDATE NOWAIT` direto na tabela, não `admin_set_user_role`. |
| `C2-PRELOCK` | `PASS` | **`INCONCLUSIVE`** | Testou `SELECT ... FOR UPDATE NOWAIT` direto, não `admin_set_user_role`. |
| `C3-POSTLOCK` | `PASS` | **`INCONCLUSIVE`** | Simulação em sessão única (`DO $$`), sem contenção real de lock. |
| `C4-DEMOTE-LAST-ADMIN` | `PASS` | **`PASS`** *(vuln. repro)* | Reproduziu vulnerabilidade real nas migrations originais. |
| `C5-CASCADE-DELETE-LAST-ADMIN` | `PASS` | **`PASS`** *(vuln. repro)* | Reproduziu ausência de proteção contra `ON DELETE CASCADE`. |
| `C6-DEADLOCK` | `PASS` | **`FAIL`** | `sqlstate: null` e retorno de 1 linha comprovam que `40P01` não ocorreu. |
| `E1`, `E2`, `E3` | `PASS` | **`PASS`** *(exp. view)* | View experimental `public_profiles` validada; tabela base segue exposta. |
| `F-NEG-01`, `03`, `04`, `05` | `PASS` | **`PASS`** | Restrições de permissão e RLS comprovadas em `vexor_audit`. |
| `F-NEG-02` | `PASS` | **`INCONCLUSIVE`** | Executado sem `SET ROLE authenticated`. |
| `G-FUNC-AUDIT` | `PASS` (parcial) | **`PASS`** *(via `proconfig`)* | `pg_proc.proconfig` confirma `search_path=""` em todas as funções. |

### Parecer Final: **APROVADO COM RESSALVAS**

As migrations originais permanecem preservadas e limpas para execução local, as três vulnerabilidades centrais (despromoção do último admin, exclusão em cascata do último admin e exposição de `is_suspended` via `profiles_select_public`) foram comprovadas experimentalmente e o desenho da view `public.public_profiles` (`security_invoker=false`) foi validado nos papéis `anon`, `member`, `moderator` e `admin`. As ressalvas documentadas (`C1`, `C2`, `C3`, `C6`, `F-NEG-02`) exigem que, na etapa corretiva autorizada, os testes sejam reescritos para invocar diretamente as RPCs sob `SET ROLE authenticated` e validar o comportamento real de concorrência/advisory lock após a implementação.
