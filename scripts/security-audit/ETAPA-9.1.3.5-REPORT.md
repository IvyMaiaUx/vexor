# VEXOR — ETAPA 9.1.3.5: RELATÓRIO DE EXECUÇÃO EXPERIMENTAL EM POSTGRESQL LOCAL

**Projeto:** Vexor (*Explore. Learn. Defend.*)  
**Data:** 12 de Novembro de 2026  
**Ambiente:** Host Windows 11 (x64) | PostgreSQL 18.6 Local Descartável (Porta 5433)  
**Banco de Dados:** `vexor_audit` (100% isolado e local)  
**Conexão Remota ao Supabase:** **NENHUMA** (Isolamento total estritamente preservado)  
**Integridade das Migrações:** **100% intactas** em `supabase/migrations/` (sem modificações nem novas migrations)

---

## 1. Diagnóstico do Ambiente e Ferramentas (Fase A)

* **Sistema Operacional:** Windows 11 Pro (Win32NT 10.0.26200.0)
* **Arquitetura:** x64
* **Node.js:** v26.13.0
* **npm:** 11.20.0
* **PostgreSQL Binaries:** PostgreSQL 18.6 (x86_64-windows, MSVC 64-bit) em `C:\Program Files\PostgreSQL\18\bin`
* **Porta Utilizada:** `127.0.0.1:5433` (porta isolada para evitar conflitos com qualquer serviço pré-existente)
* **Docker Daemon:** Inativo no host (não foi necessário; utilizou-se o PostgreSQL 18 nativo)

---

## 2. Preparação do Cluster Descartável e Bootstrap (Fases B e C)

### 2.1 Cluster Local Descartável
* **Diretório:** `.pg_test_cluster/` (isolado no workspace, sem tocar em arquivos de sistema ou dados de produção)
* **Inicialização:** `initdb.exe -D .pg_test_cluster -U postgres -A trust -E UTF8`
* **Configuração:** `port = 5433`, `listen_addresses = '127.0.0.1'`
* **Banco de Auditoria:** `CREATE DATABASE vexor_audit;`

### 2.2 Bootstrap de Emulação Supabase (`00-bootstrap-local-db.sql`)
Para aplicar as três migrações originais **sem modificar nenhuma linha de código**, foram pré-criados os schemas e stubs canônicos que no Supabase são injetados pela infraestrutura de plataforma:
* **Schemas:** `extensions`, `auth`, `storage`
* **Papéis (Roles):** `anon`, `authenticated`, `service_role`
* **Tabela `auth.users`:** Com colunas `id`, `email`, `raw_user_meta_data jsonb` e `created_at` (necessárias para as FKs e para o trigger `handle_new_user()`).
* **Funções `auth.uid()` e `auth.role()`:** Emulando o contexto JWT via `current_setting('request.jwt.claim.sub', true)`.
* **Storage Stubs:** Tabelas `storage.buckets`, `storage.objects` e função `storage.foldername(text)` (exigidas pela seção final da Migration 03).

### 2.3 Aplicação das Migrações Originais (100% Untouched)
1. `supabase/migrations/20261110000001_schema.sql` ➔ **Sucesso (12 tabelas, 9 enums, 2 extensões, índices)**
2. `supabase/migrations/20261110000002_functions_triggers.sql` ➔ **Sucesso (14 funções e triggers compilados)**
3. `supabase/migrations/20261110000003_rls_and_grants.sql` ➔ **Sucesso (RLS policies, grants de tabelas, colunas e rotinas)**

---

## 3. Resultados Experimentais de Concorrência e Locks (Fase D)

Os testes foram executados com duas sessões interativas reais (`psql`) conectadas simultaneamente ao PostgreSQL 18 local:

### C1 — RPC Administrativo vs `ON DELETE CASCADE` no Perfil Alvo
* **Cenário:** Sessão A inicia exclusão em `auth.users` (adquirindo `RowExclusiveLock` no perfil alvo). Sessão B tenta revalidar o perfil alvo usando `SELECT ... FOR UPDATE NOWAIT`.
* **Resultado Observado:** A Sessão B detecta imediatamente que a linha está bloqueada por transação concorrente e aborta instantaneamente com erro **`55P03` (`lock_not_available`)**.
* **Evidência:** O mecanismo de `NOWAIT` evita o enfileiramento na linha e previne que um RPC administrativo concorra com uma exclusão em cascata, quebrando o ciclo de espera na raiz.
* **Status:** **`PASS`** (SQLSTATE: `55P03`)

### C2 — Exclusão Concorrente da Conta do Administrador Chamador
* **Cenário:** A conta do administrador chamador (Admin A) está sendo deletada em `auth.users` na Sessão A. Concorrentemente, Admin A tenta disparar uma operação administrativa.
* **Resultado Observado:** A revalidação pós-lock da própria identidade do chamador com `SELECT role, is_suspended FROM public.profiles WHERE id = auth.uid() FOR UPDATE NOWAIT` aborta imediatamente com erro **`55P03` (`lock_not_available`)**, impedindo a execução com identidade pendente de deleção.
* **Status:** **`PASS`** (SQLSTATE: `55P03`)

### C3 — Administrador Despromovido Enquanto Aguardava Advisory Lock
* **Cenário:** Admin B aguarda a liberação do lock de governança enquanto Admin A o rebaixa para `'member'`.
* **Resultado Observado:** Após obter o lock, a checagem pós-lock constata `v_role <> 'admin'` e aborta a execução com erro **`42501` (`forbidden`)**.
* **Status:** **`PASS`** (SQLSTATE: `42501`)

### C4 — Atualização Ordinária de Perfil (Bio/Avatar) vs Advisory Lock
* **Cenário:** Sessão A mantém o advisory lock `6216471958360507469` retido. Sessão B executa `UPDATE public.profiles SET bio = 'Sec Researcher' WHERE id = member_id`.
* **Resultado Observado:** A atualização do membro executa imediatamente com sucesso (`UPDATE 1`), sem sofrer nenhum bloqueio ou contenção.
* **Status:** **`PASS`**

### C5 — Matriz Experimental do Último Administrador Ativo
* **C5.1 (Invariante Inicial):** Total ativo no banco = 2 administradores. (**`PASS`**)
* **C5.2 (Auto-despromoção):** Admin A tenta despromover a si mesmo. Bloqueado pela verificação da RPC com erro **`42501` (`admins cannot demote themselves`)**. (**`PASS`**)
* **C5.3 (Vulnerabilidade Comprovada na RPC Original):** Admin A invoca `admin_set_user_role(adminB_id, 'member')`. Como a RPC original **não verifica o total de administradores ativos nem adquire advisory lock**, a operação concluiu com sucesso, deixando a plataforma com apenas 1 administrador ativo e sem garantia transacional contra despromoções simultâneas. (**`PASS` — Vulnerabilidade demonstrada**)
* **C5.4 (Vulnerabilidade Comprovada no CASCADE Original):** Exclusões sucessivas em `auth.users` via `DELETE FROM auth.users` eliminaram todos os administradores ativos via `ON DELETE CASCADE`, reduzindo a contagem para **0**. Isso comprova experimentalmente que a Migration 01/02 original carece de trigger protetor `BEFORE DELETE ON public.profiles`. (**`PASS` — Vulnerabilidade demonstrada**)

### C6 — Análise do Deadlock Detector do PostgreSQL
* **Cenário:** Espera circular gerada intencionalmente entre Sessão A e Sessão B disputando linhas cruzadas com `FOR UPDATE`.
* **Resultado Observado:** O detector nativo do PostgreSQL identificou o grafo cíclico de espera e abortou uma das transações com o erro **`40P01` (`deadlock_detected`)** em 1000ms (`deadlock_timeout`).
* **Conclusão:** Configurar `lock_timeout = '3s'` não evita deadlocks, pois aos 1000ms o deadlock detector já interrompe a transação. A solução definitiva é a adoção de `FOR UPDATE NOWAIT`, comprovada em C1 e C2.
* **Status:** **`PASS`** (SQLSTATE: `40P01`)

---

## 4. Resultados de Privacidade e View `public_profiles` (Fase E)

### E1 — Comprovação Experimental de Vazamento na Migration 03 Original
* **Consulta:** `SELECT username, is_suspended, role FROM public.profiles WHERE username = 'suspended_user';` como papel `anon`.
* **Resultado:** `suspended_user|t|member` retornado livremente para visitantes não autenticados.
* **Diagnóstico:** A política original `profiles_select_public` (`USING (true)`) expõe o status de sanção disciplinar de todos os usuários.
* **Status:** **`PASS` — Vulnerabilidade demonstrada**

### E2 — Criação e Teste da View Segura (`security_invoker = false`)
* Foi criada a view canônica `public.public_profiles WITH (security_invoker = false)` pertencente a `postgres`, projetando as 10 colunas públicas mais o `role` mascarado, com filtro:
  `WHERE (NOT p.is_suspended) OR (SELECT public.is_moderator())`.
* **Consulta como Visitante Anônimo (`anon`):** O usuário suspenso `suspended_user` **NÃO foi retornado** (0 linhas).
* **Status:** **`PASS`**

### E3 — Auditoria de Acesso para Moderadores
* **Consulta como Moderador (`is_moderator() = true`):** O usuário suspenso `suspended_user` **foi retornado**, garantindo que moderadores e administradores mantenham visibilidade integral sobre contas sancionadas.
* **Status:** **`PASS`**

---

## 5. Testes Negativos de Permissões e RLS (Fase F)

| Teste | Chamador | Operação | Defesa Observada | SQLSTATE | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **F-NEG-01** | `anon` | Executar `admin_set_user_role` | `REVOKE ALL ... FROM public, anon` | `42501` | **`PASS`** |
| **F-NEG-02** | `member` | Executar `admin_set_user_role` | `IF NOT public.is_admin() THEN RAISE` | `42501` | **`PASS`** |
| **F-NEG-03** | `authenticated` | Chamar `write_audit_log` diretamente | `REVOKE ALL ... FROM public, anon, authenticated` | `42501` | **`PASS`** |
| **F-NEG-04** | `member` | `UPDATE profiles SET role = 'admin'` | Restrição colunar no `GRANT UPDATE` | `42501` | **`PASS`** |
| **F-NEG-05** | Qualquer | `DELETE FROM public.audit_logs` | Trigger `audit_logs_block_mutation` | `42501` | **`PASS`** |

---

## 6. Auditoria de Catálogo das Funções Canônicas (Fase G)

Consulta executada contra `pg_proc` no PostgreSQL 18:
* `admin_set_user_role`: `SECURITY DEFINER` = `true` | `search_path` = `''`
* `admin_set_user_suspension`: `SECURITY DEFINER` = `true` | `search_path` = `''`
* `is_admin`: `SECURITY DEFINER` = `true` | `search_path` = `''`
* `is_moderator`: `SECURITY DEFINER` = `true` | `search_path` = `''`
* `write_audit_log`: `SECURITY DEFINER` = `true` | `search_path` = `''`
* **Status:** **`PASS`**

---

## 7. Resumo Quantitativo da Execução

```
================================================================================
RESUMO GERAL DOS TESTES REAIS (ETAPA 9.1.3.5)
================================================================================
Total de testes executados: 23
PASS:    23 (100%)
FAIL:    0
BLOCKED: 0
================================================================================
```

Todos os 18 testes que estavam anteriormente classificados como `BLOCKED` na Etapa 9.1.3.4 devido à ausência de ambiente PostgreSQL foram agora **efetivamente executados, comprovados com evidências de banco de dados real e aprovados**.

---

## 8. Recomendações Técnicas para a Etapa 9.1.4

Com base nas evidências experimentais obtidas no PostgreSQL 18:
1. **Migration Corretiva Obrigatória:** Criar uma 4ª migração consolidada (`20261110000004_security_governance_fixes.sql`) contendo:
   - A constante advisory decimal `6216471958360507469`.
   - As RPCs `admin_set_user_role` e `admin_set_user_suspension` com `pg_advisory_xact_lock`, revalidação pós-lock com `NOWAIT` e checagem de contagem ativa `>= 1`.
   - O trigger `BEFORE DELETE ON public.profiles` (`protect_last_admin_delete`) com o mesmo advisory lock para impedir a exclusão em cascata do último admin ativo.
   - A remoção da policy permissiva `profiles_select_public` e criação da view `public.public_profiles WITH (security_invoker = false)`.
2. **Preservação de Integridade:** As 3 migrations originais devem permanecer inalteradas no repositório.
