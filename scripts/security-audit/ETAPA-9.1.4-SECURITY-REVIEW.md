# VEXOR — ETAPA 9.1.4: REVISÃO FORENSE E PLANEJAMENTO DAS CORREÇÕES DE SEGURANÇA

**Projeto:** Vexor — Explore. Learn. Defend.  
**Escopo:** Revisão forense exclusiva de análise, auditoria e planejamento com base nas evidências locais das Etapas 9.1.3.5, 9.1.3.6 e 9.1.3.7.  
**Restrições cumpridas:** Nenhuma migration foi criada ou alterada; nenhum SQL corretivo foi executado; o Supabase remoto (`zcjudcbckcxwnfnrjfte`) não foi acessado; a aplicação não foi modificada.  
**Parecer Final:** **APROVADO** *(plano tecnicamente consistente, aguardando autorização explícita do responsável para iniciar a implementação corretiva em ambiente local)*

---

## 1. Resumo Executivo

A auditoria experimental concluída na Etapa 9.1.3.7 no PostgreSQL 18.6 local (`127.0.0.1:5433`, banco `vexor_audit`) fechou todas as pendências metodológicas anteriores e confirmou **três vulnerabilidades estruturais** nas migrations originais (`20261110000001_schema.sql`, `20261110000002_functions_triggers.sql`, `20261110000003_rls_and_grants.sql`):

1. **Ausência de proteção transacional do último administrador ativo** (Crítica): `admin_set_user_role`, `admin_set_user_suspension` e a exclusão em cascata (`auth.users` -> `public.profiles`) não serializam alterações de governança nem impedem que o sistema fique com zero administradores ativos.
2. **Exposição direta de colunas internas em `public.profiles`** (Alta): a política `profiles_select_public` (`USING (true)` para `anon` e `authenticated`) e os `GRANT SELECT` de tabela expõem `is_suspended` e `role` diretamente a qualquer cliente anônimo ou autenticado. A view experimental local `public.public_profiles` não existe nas migrations originais e não protege a tabela base.
3. **Ausência de revalidação de autorização após aquisição de lock** (Alta): comprovado em `C3-CONCURRENT-NO-REVALIDATION` que um administrador rebaixado enquanto aguardava `FOR UPDATE` concluiu a promoção de outro usuário após a liberação do lock.

Adicionalmente, a inspeção das **18 funções `SECURITY DEFINER`** revelou que as RPCs de moderação (`moderate_resource`, `moderate_topic`, `moderate_post`, `resolve_report`) seguem o mesmo padrão de checagem pré-lock sem revalidação, e que a chave estrangeira `audit_logs_actor_id_fkey` (`ON DELETE NO ACTION` / `RESTRICT` implícito) bloqueia exclusões em `auth.users`/`profiles` de atores que possuam registros em `audit_logs`.

---

## 2. Inventário das Evidências e Divergências Registradas

### Arquivos Analisados
- `scripts/security-audit/ETAPA-9.1.3.5-REPORT.md`, `ETAPA-9.1.3.6-RECONCILIATION-REPORT.md`, `ETAPA-9.1.3.7-REPORT.md`
- `scripts/security-audit/audit-report.json`
- `scripts/security-audit/result-c1-c2.json`, `result-c3.json`, `result-c6.json`, `result-f-neg-02-privacy.json`
- `scripts/security-audit/test-c1-c2-concurrency.mjs`, `test-c3-revalidation.mjs`, `test-c6-deadlock.mjs`, `test-f-neg-02-and-privacy.mjs`, `run-all-tests.mjs`, `forensic-evidence.txt`
- `supabase/migrations/20261110000001_schema.sql`, `20261110000002_functions_triggers.sql`, `20261110000003_rls_and_grants.sql`

### Divergências e Inconsistências Identificadas
1. **Histórico 9.1.3.5 vs. Execução Real (`run-all-tests.mjs`):** Já reconciliado na Etapa 9.1.3.6 e fechado na 9.1.3.7 (`C1`/`C2` não chamavam as RPCs reais, `C3` era sessão única, `C6` havia registrado `PASS` com `sqlstate: null` e `F-NEG-02` rodou sem `SET ROLE authenticated`).
2. **Resíduos de usuários temporários no banco local (`result-f-neg-02-privacy.json`):** `anon_direct_base_profiles_rows` retornou linhas de `c3_admin_a`, `c3_admin_b` e `c3_target_1` além de `fneg_*` porque o `DELETE FROM auth.users` no `finally` de `test-c3-revalidation.mjs` foi impedido pela FK `audit_logs_actor_id_fkey` (`public.audit_logs` referencia `public.profiles(id)` sem `ON DELETE SET NULL`), evidenciando impacto operacional também em exclusões legítimas de contas que já atuaram como moderadores/admins.
3. **Objeto experimental local (`public.public_profiles`):** Presente em `vexor_audit` (criado por `run-all-tests.mjs`), ausente nas três migrations originais.
4. **Falso-negativo de string em `G-FUNC-AUDIT`:** `run-all-tests.mjs` buscou `LIKE '%search_path = %'` na saída de `pg_get_functiondef`, mas o PostgreSQL imprime `SET search_path TO ''`; `pg_proc.proconfig` comprova `{"search_path=\"\""}` em todas.

---

## 3. Vulnerabilidade 1 — Revalidação de Autorização

### Análise das Definições Originais
- `admin_set_user_role(uuid, user_role)` (`Migration 02`, linhas 332-357):
  1. Verifica `if not public.is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;` (linha 341).
  2. Verifica auto-despromoção (`p_user_id = auth.uid()`).
  3. Executa `select role into v_old from public.profiles where id = p_user_id for update;` (linha 348) **sem `pg_advisory_xact_lock`** e **sem revalidar `is_admin()` após o lock**.
- `admin_set_user_suspension(uuid, boolean, text)` (`Migration 02`, linhas 359-389):
  1. Verifica `if not public.is_admin()` no início (linha 370).
  2. Executa `update public.profiles set is_suspended = p_suspended where id = p_user_id;` (linha 380) **sem advisory lock**, **sem `FOR UPDATE` explícito prévio** e **sem revalidação pós-lock**.
- `is_admin()` (`Migration 02`, linhas 72-80): `LANGUAGE sql STABLE SECURITY DEFINER`, chama `public.current_user_role()` (`select p.role from public.profiles p where p.id = auth.uid() and not p.is_suspended`).

### Por que uma chamada simples a `is_admin()` no início ou isoladamente não basta
1. **Snapshots MVCC em `READ COMMITTED`:** Cada instrução dentro da função PL/pgSQL vê um snapshot atualizado após o `COMMIT` de outras transações, **mas** se `is_admin()` for chamada *antes* de adquirir o lock (ex.: antes de `pg_advisory_xact_lock` ou antes de `FOR UPDATE`), outra transação pode rebaixar, suspender ou excluir o chamador enquanto este aguarda o lock.
2. **Inconsistência por função `STABLE`:** `is_admin()` e `current_user_role()` são marcadas como `STABLE`; dentro de uma mesma query SQL, o otimizador assume resultado estável para o mesmo snapshot, mas em comandos PL/pgSQL distintos após espera de lock o snapshot avança. Ainda assim, sem serialização via advisory lock, duas operações concorrentes podem ler snapshots antes dos respectivos commits.
3. **Exclusão concorrente do chamador (`C2`):** No `C2`, a RPC só não concluiu a alteração indevida porque `write_audit_log` esbarrou na FK `audit_logs_actor_id_fkey` (`23503`). Se a FK fosse `ON DELETE SET NULL` (ou se a função não gravasse log antes de verificar o chamador travado), a alteração teria sido comitada.

### Estratégia Transacional Recomendada e Limites
- **Ordem única de execução nas RPCs administrativas (`admin_set_user_role` e `admin_set_user_suspension`):**
  1. Checagem rápida inicial (fail-fast para não administradores sem precisar disputar lock global).
  2. Aquisição do lock de governança: `PERFORM pg_advisory_xact_lock(6216471958360507469);` (`0x5645584F5241444D`).
  3. **Revalidação obrigatória pós-lock** consultando diretamente `public.profiles` com `FOR SHARE` (ou `FOR UPDATE` em ordem determinística por `id` quando o chamador e o alvo puderem colidir — ver Seção 5 para evitar deadlocks!): validar que `id = auth.uid()`, `role = 'admin'` e `not is_suspended`.
  4. Execução da checagem de invariante (último admin) e atualização do alvo.
- **Limites da estratégia:**
  - `pg_advisory_xact_lock` serializa operações administrativas críticas em nível transacional, reduzindo vazão de alterações de papel/suspensão (aceitável por serem eventos raros de governança), sem bloquear atualizações comuns de perfil (`C4`).
  - Se um administrador iniciar uma transação explícita (`BEGIN`) fora do fluxo padrão de RPC única, o lock permanece retido até `COMMIT`/`ROLLBACK` — mitigável com `SET LOCAL lock_timeout` bem calibrado se necessário, evitando lock starvation.

---

## 4. Vulnerabilidade 2 — Exposição de Dados em `public.profiles`

### Estado Atual Confirmado (`Migration 03` + `result-f-neg-02-privacy.json`)
- **Policies de `SELECT`:** Apenas `profiles_select_public` (`FOR SELECT TO anon, authenticated USING (true)`).
- **Grants:** `GRANT SELECT ON public.profiles TO anon, authenticated;` — concede leitura de **todas** as colunas (incluindo `is_suspended` e `role`).
- **View `public.public_profiles`:** Existe apenas localmente no banco de testes (`owner: postgres`, `security_invoker=false`), filtrando `WHERE NOT is_suspended OR (SELECT is_moderator())` e omitindo `is_suspended`.

### Comparação de Alternativas Arquiteturais

| Alternativa | Vantagens | Riscos e Limitações | Veredito |
| :--- | :--- | :--- | :--- |
| **A. Restringir policy em `profiles` + View `public_profiles` (`security_invoker=false`, owner `postgres`)** | Compatível com PostgREST/Supabase; `anon` e `member` não leem `profiles` de terceiros diretamente (`id = auth.uid()` ou `is_moderator()`), mas consultam perfis ativos pela view pública sem `is_suspended`. | Exige revisar todas as queries do frontend/backend que fazem `join` direto em `public.profiles` (ex.: autor de tópico/post) para usar `public_profiles` ou RPCs, caso contrário `anon` deixará de ver autores de fórum! | **Recomendada (com validação de impacto em joins)** |
| **B. Apenas `GRANT SELECT (colunas_publicas)` por coluna em `profiles`** | Simples no PostgreSQL puro. | No PostgREST/Supabase, `SELECT *` falha se alguma coluna não tiver `GRANT SELECT`, além de ainda expor linhas de usuários suspensos (o usuário anônimo saberia que a conta existe ou está oculta por filtro). | Insuficiente isoladamente |
| **C. Separação física em 2 tabelas (`profiles_public` + `profiles_private`)** | Isolamento estrito de RLS sem views `security_invoker=false`. | Alta complexidade de migração e refatoração de FKs (`topics`, `posts`, `resources`, `audit_logs`, `handle_new_user`). | Overengineering para esta etapa |

### Arquitetura Recomendada
1. **Substituir `profiles_select_public` por políticas restritivas em `public.profiles`:**
   - Usuário autenticado comum lê apenas o próprio registro (`id = (select auth.uid())`).
   - Moderadores e administradores leem todos os perfis (`(select public.is_moderator())`).
   - `anon` **não** possui acesso `SELECT` direto em `public.profiles`.
2. **Criar oficialmente na migration corretiva a view `public.public_profiles`:**
   - Propriedade de `postgres`, `WITH (security_invoker = false)`, projetando apenas colunas públicas (`id, username, display_name, avatar_url, bio, interests, github_url, linkedin_url, preferred_locale, created_at, role` — avaliando se `role` deve permanecer público para exibir badges de `admin`/`moderator` na comunidade).
   - Filtro `WHERE NOT is_suspended OR (SELECT public.is_moderator())`.
   - `GRANT SELECT ON public.public_profiles TO anon, authenticated;` e `REVOKE ALL` de escrita.
   - **Atenção crítica de regressão:** Mapear no código Next.js/Supabase todas as consultas que fazem `select('..., profiles(...)')` como `anon` ou `member` e migrá-las para `public_profiles` (ou manter uma política explícita / RPC).

---

## 5. Vulnerabilidade 3 — Proteção do Último Administrador

### Todos os Caminhos Identificados
1. **`admin_set_user_role(p_user_id, p_role)`:** Rebaixamento de outro administrador ativo (`p_role <> 'admin'`).
2. **`admin_set_user_suspension(p_user_id, true, ...)`:** Suspensão de outro administrador ativo (anula `current_user_role()` e `is_admin()`).
3. **Exclusão em `auth.users` (`ON DELETE CASCADE` -> `public.profiles`):** Remove o perfil do último administrador ativo sem passar por RPCs.
4. **Exclusão direta em `public.profiles`:** Por `service_role` ou papel privilegiado.
5. **Auto-despromoção / auto-suspensão:** Já bloqueadas nas RPCs (`p_user_id = auth.uid()`), mas devem continuar protegidas caso haja alteração futura.

### Estratégia Transacional e Prevenção de Deadlock
- **Advisory Lock Único de Governança:** `6216471958360507469` (`0x5645584F5241444D`).
- **Trigger `BEFORE DELETE ON public.profiles` (`protect_last_admin_delete`):**
  - Dispara tanto em `DELETE` direto em `public.profiles` quanto em `ON DELETE CASCADE` a partir de `auth.users`.
  - Se `OLD.role = 'admin' AND NOT OLD.is_suspended`:
    - Adquire `PERFORM pg_advisory_xact_lock(6216471958360507469);`
    - Conta administradores ativos remanescentes (`SELECT count(*) FROM public.profiles WHERE role = 'admin' AND NOT is_suspended AND id <> OLD.id FOR UPDATE` ou sob a serialização exclusiva do advisory lock).
    - Se contagem = `0`, lança `RAISE EXCEPTION 'cannot delete the last active admin' USING ERRCODE = '42501';`.
- **Análise da Ordem de Locks e Deadlocks (RPC vs `CASCADE DELETE`):**
  - Se `Sessão A` executar `DELETE FROM auth.users` (adquirindo lock exclusivo na tupla `auth.users` e depois `public.profiles`, e então no trigger `BEFORE DELETE` tentando adquirir `pg_advisory_xact_lock(6216471958360507469)`) **ao mesmo tempo** que `Sessão B` adquire `pg_advisory_xact_lock(6216471958360507469)` primeiro e depois tenta `FOR UPDATE` na mesma tupla de `public.profiles`... **há risco de inversão de locks (deadlock clássico `40P01`)!**
  - **Solução para eliminar a inversão de locks:**
    1. Nas RPCs (`admin_set_user_role`, `admin_set_user_suspension`), manter a ordem canônica: **1º** `pg_advisory_xact_lock(6216471958360507469)`, **2º** `FOR UPDATE` na tupla alvo em `public.profiles`.
    2. Em exclusões de conta pelo próprio fluxo controlado da aplicação/admin, adquirir o advisory lock antes do `DELETE` em `auth.users` ou utilizar `FOR UPDATE NOWAIT` / `lock_timeout` curto nas RPCs para falhar rapidamente (`55P03`) em vez de entrar em ciclo com um `CASCADE` externo vindo do `auth.users` (GoTrue).
    3. Nunca bloquear operações comuns (`UPDATE bio` em `profiles`) com o advisory lock administrativo.

---

## 6. Auditoria das Funções `SECURITY DEFINER` (`Migration 02` & `Migration 03`)

Todas as 18 funções `SECURITY DEFINER` possuem `SET search_path TO ''` (`proconfig: {"search_path=\"\""}`) e proprietário `postgres` no ambiente local. Contudo, **`search_path` vazio não garante autorização**:

| Função | Finalidade | EXECUTE (`anon` / `auth`) | Depende `auth.uid()` | Checagem de Autorização e Riscos |
| :--- | :--- | :--- | :--- | :--- |
| `current_user_role()` | Retorna `role` se ativo | `anon`, `auth` | Sim | Leitura segura; retorna `NULL` para suspensos/`anon`. |
| `is_active_member()` | Bool membro não suspenso | `anon`, `auth` | Sim | Leitura segura para RLS. |
| `is_moderator()` | Bool `moderator`/`admin` | `anon`, `auth` | Sim | Leitura segura; usada em RLS e view `public_profiles`. |
| `is_admin()` | Bool `admin` ativo | `anon`, `auth` | Sim | Leitura segura; insuficiente se usada apenas antes de locks. |
| `topic_has_replies(uuid)` | Verifica se tópico tem respostas | `anon`, `auth` | Não | Apenas existência booleana (bypassa RLS para incluir ocultos); baixo risco. |
| `write_audit_log(...)` | Insere em `audit_logs` | **Revogado** de `public`/`anon`/`auth` | Sim (`actor_id`) | Interna; FK `audit_logs_actor_id_fkey` bloqueia exclusão de perfil se houver logs (ver Seção 2). |
| `on_category_changed()`, `handle_new_user()`, `on_post_created()`, `on_vote_changed()` | Triggers de sistema/contadores | **Revogado** de `public`/`anon`/`auth` | Não | Executadas apenas via trigger; `handle_new_user` lê `raw_user_meta_data` (validado/sanitizado com fallback de username). |
| `admin_set_user_role(uuid, user_role)` | Altera `role` | `auth` apenas | Sim | **Vulnerável:** sem advisory lock, sem checagem de último admin, sem revalidação pós-lock. |
| `admin_set_user_suspension(uuid, bool, text)` | Suspende/reativa usuário | `auth` apenas | Sim | **Vulnerável:** sem advisory lock, sem checagem de último admin, sem revalidação pós-lock. |
| `moderate_resource(...)` | Aprova/rejeita recurso | `auth` apenas | Sim | **Inspeção de código:** checa `is_moderator()` no início; sem revalidação pós-lock (hipótese não testada). |
| `resubmit_resource(uuid)` | Reenvia recurso rejeitado | `auth` apenas | Sim | Checa `submitted_by = auth.uid()` e `is_active_member()` no início; sem revalidação pós-lock. |
| `moderate_topic(uuid, text, text)` | Modera tópico | `auth` apenas | Sim | **Inspeção de código:** checa `is_moderator()` no início; sem revalidação pós-lock. |
| `moderate_post(uuid, text, text)` | Modera post | `auth` apenas | Sim | **Inspeção de código:** checa `is_moderator()` no início; sem revalidação pós-lock. |
| `resolve_report(...)` | Resolve denúncia | `auth` apenas | Sim | **Inspeção de código:** checa `is_moderator()` no início; sem revalidação pós-lock. |
| `set_accepted_post(uuid, uuid)` | Marca resposta aceita | `auth` apenas | Sim | Checa `is_active_member()` e autoria do tópico ou `is_moderator()`; sem revalidação pós-lock. |

*(Nota: `auth.role()` é suportada no ambiente Supabase/local, mas as funções da Migration 02 dependem primariamente de `auth.uid()` + consulta em `public.profiles`.)*

---

## 7. Matriz de Correções e Riscos

| Vulnerabilidade / Achado | Evidência | Origem | Gravidade | Causa Raiz | Correção Proposta | Risco Residual |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **V1 — Último administrador sem proteção** (`admin_set_user_role`, `admin_set_user_suspension`, `CASCADE DELETE`) | `C5.3`, `C5.4`, `C1` | **Confirmada experimentalmente** | **Crítica** | Ausência de serialização transacional, de contagem mínima de admins ativos nas RPCs e de trigger `BEFORE DELETE` em `profiles`. | Advisory lock `6216471958360507469` + contagem de admins ativos + trigger `BEFORE DELETE` em `public.profiles` + `NOWAIT`/timeout nas RPCs. | Contenção entre operações admin raras; se `CASCADE` externo ocorrer durante RPC, `NOWAIT` retorna `55P03` exigindo retry do cliente. |
| **V2 — Exposição de `is_suspended` e `role` em `public.profiles`** | `E1`, `PRIVACY-BASE-VS-VIEW` (`result-f-neg-02-privacy.json`) | **Confirmada experimentalmente** | **Alta** | `profiles_select_public` (`USING (true)`) + `GRANT SELECT` na tabela inteira para `anon` e `authenticated`. | Restringir `SELECT` em `profiles` (`id = auth.uid()` ou `is_moderator()`), revogar `anon` em `profiles` e criar view `public_profiles` (`security_invoker=false`). | Quebra de consultas frontend/SSR que façam `join` direto em `profiles` como `anon`/`member` se não migradas para `public_profiles`. |
| **V3 — Ausência de revalidação pós-lock em RPCs admin** | `C3-CONCURRENT-NO-REVALIDATION` (`result-c3.json`) | **Confirmada experimentalmente** | **Alta** | `is_admin()` avaliada apenas antes do `FOR UPDATE`, sem revalidação após aquisição do lock. | Adquirir `pg_advisory_xact_lock` e revalidar `role = 'admin' AND NOT is_suspended` do chamador antes de mutar o alvo. | Revalidação depende de a exclusão do chamador já estar comitada ou serializada pelo mesmo advisory lock. |
| **V4 — Ausência de revalidação pós-lock em RPCs de moderação (`moderate_*`, `resolve_report`)** | `20261110000002_functions_triggers.sql` L392-626 | **Inspeção de código** *(não testada concorrencialmente)* | **Média** | Padrão idêntico ao de `admin_set_user_role`: `is_moderator()` apenas no início da função. | Revalidar `is_moderator()` após lock da linha alvo (`FOR UPDATE`) nas RPCs de moderação. | Baixo; janela estreita entre perda de papel de moderador e ação concorrente. |
| **V5 — Bloqueio de exclusão por `audit_logs_actor_id_fkey`** | Erro `23503` em `C2` e resíduos de `test-c3` | **Confirmada experimentalmente** | **Média** | `audit_logs.actor_id` referencia `profiles(id)` sem `ON DELETE SET NULL`. | Avaliar na migration corretiva alterar `audit_logs_actor_id_fkey` para `ON DELETE SET NULL` (preservando `actor_id` como `NULL` após exclusão do usuário, mantendo `audit_logs` append-only). | Logs antigos perdem vínculo direto com perfil excluído (mitigado gravando metadados se necessário). |

---

## 8. Plano de Implementação Futura *(Proposta Ilustrativa — NÃO Executada)*

A implementação deverá ocorrer futuramente em **nova migration local** (ou revisão aprovada antes da primeira aplicação remota), testada integralmente no cluster `.pg_test_cluster` antes de qualquer `db push`:

1. **Etapa A — Governança e Último Admin (`admin_set_user_role`, `admin_set_user_suspension`, `protect_last_admin_delete`):**
   - **Objetos envolvidos:** `public.admin_set_user_role`, `public.admin_set_user_suspension`, nova função/trigger `public.protect_last_admin_delete` (`BEFORE DELETE ON public.profiles`).
   - **Pseudocódigo ilustrativo (NÃO EXECUTAR):**
     ```sql
     -- Exemplo ilustrativo para admin_set_user_role:
     -- 1) Fail-fast inicial: IF NOT public.is_admin() THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
     -- 2) Lock global de governança: PERFORM pg_advisory_xact_lock(6216471958360507469);
     -- 3) Revalidação pós-lock do chamador:
     --    SELECT role, is_suspended INTO v_caller_role, v_caller_susp FROM public.profiles WHERE id = auth.uid();
     --    IF NOT FOUND OR v_caller_susp OR v_caller_role <> 'admin' THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
     -- 4) Lock do alvo com NOWAIT (evita deadlock com CASCADE vindo de auth.users):
     --    SELECT role, is_suspended INTO v_old, v_target_susp FROM public.profiles WHERE id = p_user_id FOR UPDATE NOWAIT;
     -- 5) Se rebaixando admin ativo, contar outros admins ativos > 0 antes de atualizar.
     ```
   - **Dependências:** Deve ser testada junto com `C1`, `C2`, `C3` e `C5`.
   - **Risco de regressão:** Chamadas simultâneas retornarem `55P03` (`lock_not_available`) durante exclusão concorrente em `auth.users`.
   - **Critério de aprovação:** Todos os testes de concorrência (Seção 9) retornando `PASS` sem deadlocks `40P01`.
   - **Rollback:** `DROP TRIGGER` + `CREATE OR REPLACE FUNCTION` restaurando definições originais.

2. **Etapa B — Privacidade de `public.profiles` e View `public.public_profiles`:**
   - **Objetos envolvidos:** Policy `profiles_select_public` em `public.profiles`, `REVOKE SELECT ON public.profiles FROM anon`, criação oficial da view `public.public_profiles` (`WITH (security_invoker = false)`, owner `postgres`, `GRANT SELECT` para `anon, authenticated`).
   - **Dependências:** Auditoria prévia das queries da aplicação Next.js (`src/`) que fazem `SELECT` em `profiles` para `anon` ou `member` (ex.: listagem de fórum/catálogo), migrando-as para `public_profiles`.
   - **Critério de aprovação:** `anon` bloqueado (`42501`) em `public.profiles`, `anon` vendo apenas ativos em `public_profiles` sem `is_suspended`, `member` vendo o próprio perfil em `profiles`, `moderator`/`admin` vendo suspensos em `public_profiles`.
   - **Rollback:** `DROP VIEW IF EXISTS public.public_profiles;` + restaurar `GRANT SELECT` e `profiles_select_public`.

3. **Etapa C — Revalidação nas RPCs de Moderação e FK de `audit_logs` (se aprovado):**
   - **Objetos envolvidos:** `moderate_resource`, `moderate_topic`, `moderate_post`, `resolve_report` e (opcionalmente) `audit_logs_actor_id_fkey`.
   - **Critério de aprovação:** Rebaixamento concorrente de moderador bloqueado com `42501`; exclusão de conta legítima com histórico de moderação funcionando sem erro `23503`.

---

## 9. Testes de Regressão Planejados (Pós-Implementação)

Todos os testes de concorrência deverão usar conexões PostgreSQL independentes e barreiras explícitas via `pg_stat_activity`:

1. Dois administradores tentando rebaixar um ao outro simultaneamente (apenas 1 pode prosseguir; o último ativo deve ser preservado).
2. Tentativa de rebaixar o último administrador ativo via `admin_set_user_role` (esperado: bloqueio).
3. Exclusão em cascata (`DELETE FROM auth.users`) do último administrador ativo (esperado: bloqueio pelo trigger `BEFORE DELETE`).
4. Suspensão do último administrador ativo via `admin_set_user_suspension` (esperado: bloqueio).
5. Rebaixamento de um administrador enquanto sua RPC administrativa aguarda lock (esperado: `42501` na revalidação pós-lock).
6. Suspensão de um administrador enquanto sua RPC administrativa aguarda lock (esperado: `42501` na revalidação pós-lock).
7. Exclusão concorrente da conta do administrador chamador durante RPC administrativa (esperado: falha segura sem mutação indevida).
8. Acesso anônimo direto (`SET ROLE anon`) à tabela `public.profiles` (esperado: negado / zero linhas expostas).
9. Acesso anônimo à view `public.public_profiles` (esperado: apenas perfis não suspensos, sem coluna `is_suspended`).
10. Acesso de usuário autenticado comum (`member`) à tabela `public.profiles` (lê apenas o próprio perfil) e à view `public_profiles`.
11. Acesso de `moderator` à tabela `public.profiles` e à view `public_profiles` (vê suspensos).
12. Acesso de `admin` à tabela `public.profiles`, `public_profiles` e `audit_logs`.
13. Tentativas de chamada não autorizada das RPCs administrativas (`anon`, `member`, sem JWT).
14. Verificação da integridade append-only de `audit_logs` após todas as operações aprovadas/rejeitadas.
15. Regressão de deadlocks entre `CASCADE DELETE` em `auth.users` e RPCs administrativas concorrentes.

---

## 10. Riscos Residuais e Decisões Pendentes de Aprovação

1. **Impacto no Frontend (`src/`):** A restrição de `SELECT` em `public.profiles` para `anon` e `member` exige confirmar antes da migration se páginas públicas de fórum/catálogo/perfil consultam `profiles` diretamente via PostgREST.
2. **Exposição da coluna `role` em `public_profiles`:** Decidir se `role` (`admin`, `moderator`, `member`) deve permanecer visível publicamente na view `public_profiles` para exibição de badges ou se deve ser restrita.
3. **Política da FK `audit_logs_actor_id_fkey`:** Decidir se contas que já atuaram como moderadores/admins podem ser excluídas (`ON DELETE SET NULL`) ou se a exclusão deve ser bloqueada/anonimizada.
4. **Tratamento de `55P03` (`NOWAIT`):** Confirmar se a aplicação deve exibir mensagem amigável ou fazer retry quando uma RPC administrativa colidir com exclusão simultânea.

---

## 11. Parecer Final

### Classificação: **`APROVADO`**

As evidências experimentais da Etapa 9.1.3.7 são completas e reprodutíveis, as causas raiz foram isoladas com precisão no código das migrations originais e o plano de correção e regressão está tecnicamente consistente.

**Nenhuma correção foi implementada e nenhuma migration foi criada.** Aguardando sua avaliação e autorização explícita para avançar para a etapa de implementação controlada no PostgreSQL local.
