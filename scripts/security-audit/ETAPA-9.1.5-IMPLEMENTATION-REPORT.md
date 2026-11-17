# VEXOR — ETAPA 9.1.5: RELATÓRIO DE IMPLEMENTAÇÃO CONTROLADA E REGRESSÃO

**Projeto:** Vexor — Explore. Learn. Defend.  
**Banco Local Validado:** `127.0.0.1:5433`, `vexor_audit`, cluster `.pg_test_cluster` (`PostgreSQL 18.6 on x86_64-windows, compiled by msvc-19.44.35229, 64-bit`)  
**Supabase Remoto:** **Não acessado** (`zcjudcbckcxwnfnrjfte` intocado)  
**Parecer Final:** **APROVADA** *(todas as correções implementadas e comprovadas localmente; aguardando avaliação explícita para futura preparação de migration)*

---

## 1. Preservação, Backup e Integridade

- **Backup lógico pré-alterações:** `scripts/security-audit/backup-vexor_audit-pre-9.1.5.sql` (`97.609` bytes via `pg_dump.exe`).
- **Inventário pré-alterações:** `scripts/security-audit/inventory-pre-9.1.5.json`.
- **Scripts reversíveis:** `scripts/security-audit/apply-9.1.5-fixes.sql` e `scripts/security-audit/rollback-9.1.5-fixes.sql`.
- **Hashes SHA-256 (Início e Fim da Etapa — Idênticos):**
  - `supabase/migrations/20261110000001_schema.sql`: `24763C8E77E5643EFA3214093071760539D65C3A8834E5837CBC70698C7BEE75`
  - `supabase/migrations/20261110000002_functions_triggers.sql`: `89D8F4C6A456ABD523EC660C932AE24F63B10AF3D46C199A2B39D898E5A00D77`
  - `supabase/migrations/20261110000003_rls_and_grants.sql`: `10E8487AB58DA75BAC0A7AEE21DA968EA69FB93F284BB879A7DE96347467F030`
  - `supabase/seed.sql`: `E2B814A6E64FD18DEF920792959CE8ABF8463B0A500CDE4FD9F60D875092F3B9`
- Nenhuma migration definitiva foi criada e nenhum comando remoto (`login`, `link`, `db push`, `migration up`, `seed`, `deploy`) foi executado.

---

## 2. Alterações Implementadas no Banco Local e Justificativa Técnica

| Correção | Objetos SQL Afetados | Justificativa Técnica e Estratégia de Locks |
| :--- | :--- | :--- |
| **V1 & V3** (Último Admin + Revalidação pós-lock) | `public.admin_set_user_role`, `public.admin_set_user_suspension`, `public.protect_last_admin_delete()`, trigger `profiles_protect_last_admin_delete` (`BEFORE DELETE ON public.profiles`) | Adquire `pg_advisory_xact_lock(6216471958360507469)` (`0x5645584F5241444D`), revalida o chamador (`role = 'admin' AND NOT is_suspended` com `FOR SHARE NOWAIT`), trava o alvo com `FOR UPDATE NOWAIT` e exige `count(*) > 0` de outros admins ativos antes de rebaixar, suspender ou excluir (inclusive via `ON DELETE CASCADE` de `auth.users`). O uso de `NOWAIT` impede ciclos de inversão de locks (`40P01`) caso um `DELETE` externo em `auth.users` já detenha lock de linha, abortando com `55P03` sem mutação parcial. |
| **V4** (Revalidação pós-lock em moderação) | `public.moderate_resource`, `public.moderate_topic`, `public.moderate_post`, `public.resolve_report` | Adquire `FOR UPDATE` na linha alvo e, antes de mutar qualquer campo, revalida `public.profiles` do chamador com `FOR SHARE NOWAIT` (`role IN ('moderator','admin') AND NOT is_suspended`), eliminando o cenário C3 para moderadores. |
| **V2** (Privacidade de `profiles` e view pública) | `REVOKE SELECT ON public.profiles FROM anon`, remoção de `profiles_select_public`, nova policy `profiles_select_own_or_mod`, nova view `public.public_profiles` (`owner: postgres`, `security_invoker = false`) | `anon` perde acesso direto a `public.profiles` (`42501`). `authenticated` (`member`) lê apenas o próprio perfil (`id = auth.uid()`). Moderadores e admins leem todos os perfis. A view `public.public_profiles` projeta **apenas 10 colunas públicas** (excluindo `role` e `is_suspended`) e oculta suspensos para não moderadores. |
| **V5** (`audit_logs` e exclusão de contas) | `ALTER TABLE public.audit_logs DROP CONSTRAINT audit_logs_actor_id_fkey` | Na Migration 01, `ON DELETE SET NULL` conflitava com o trigger `audit_logs_no_update_delete` (`BEFORE UPDATE`), bloqueando a exclusão legítima de qualquer usuário que já tivesse escrito logs (`42501: audit_logs is append-only`). A remoção da FK preserva o UUID histórico imutável em `actor_id` e mantém `audit_logs` estritamente append-only. |

### Mapeamento do Frontend (`src/`)
- Busca completa (`rg -n "profiles" src` e `rg -n "\.from\(" src`) confirmou que **não existem consultas `.from('profiles')` diretas na aplicação Next.js** no estágio atual (apenas definições de tipos em `src/types/database.types.ts` e comentários/textos). Nenhuma alteração foi necessária no frontend.

---

## 3. Evidências dos 24 Testes de Regressão (`result-9.1.5-regression.json`)

Todos os testes foram executados com sessões PostgreSQL independentes e sincronização explícita via `pg_stat_activity` (sem `pg_sleep()` isolado):

| ID | Grupo | Requisitos Cobertos | SQLSTATE | Status | Resultado Observado |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `T01-MUTUAL-DEMOTE` | Governança | 1 | `42501` | **`PASS`** | A1 e A2 simultâneos: A1 rebaixou A2; A2 foi bloqueado (`admins_ativos = 1`). |
| `T02-DEMOTE-LAST-ADMIN` | Governança | 2 | `42501` | **`PASS`** | Bloqueado (`admins cannot demote themselves` / último admin). |
| `T03-CASCADE-LAST-ADMIN` | Governança | 3 | `42501` | **`PASS`** | `DELETE FROM auth.users` do último admin bloqueado pelo trigger `BEFORE DELETE` (`a1Exists = 1`). |
| `T04-SUSPEND-LAST-ADMIN` | Governança | 4 | `42501` | **`PASS`** | Bloqueio de suspensão do último admin ativo. |
| `T05-DEMOTE-DURING-RPC-C3` | Governança | 5, 22 | `42501` | **`PASS`** | Cenário C3 eliminado: admin rebaixado durante espera falhou na revalidação pós-lock (`memRole = member`). |
| `T06-SUSPEND-DURING-RPC` | Governança | 6 | `42501` | **`PASS`** | Admin suspenso concorrentemente falhou na revalidação pós-lock (`memRole = member`). |
| `T07-T09-CONCURRENT-DELETE-SERIALIZED` | Governança | 7, 9 | `42501` | **`PASS`** | Exclusão concorrente do chamador serializada em `Lock:advisory` sem deadlock; após `COMMIT`, B falhou com `42501`. |
| `T08-SIMULTANEOUS-ROLE-SERIALIZED` | Governança | 8 | `null` | **`PASS`** | Alterações simultâneas serializadas de forma consistente (`role final = member`). |
| `T10-AUDIT-LOGS-V5` | Governança | 10 | `42501` | **`PASS`** | Exclusão de A2 (com logs prévios) sucedeu sem `23503`/`42501`; 3 logs preservados e `UPDATE` em `audit_logs` bloqueado (`42501`). |
| `T11-ANON-BASE-PROFILES-DENIED` | Privacidade | 11 | `42501` | **`PASS`** | `anon` negado diretamente em `public.profiles` (`permissão negada para tabela profiles`). |
| `T12-T17-T18-ANON-VIEW-PRIVACY` | Privacidade | 12, 17, 18 | `42703` | **`PASS`** | `public_profiles` ocultou suspenso (7 ativos) e rejeitou consulta a `role`/`is_suspended` (`42703`). |
| `T13-T14-MEMBER-OWN-PROFILE` | Privacidade | 13, 14 | `null` | **`PASS`** | `member` lê apenas o próprio perfil (`count = 1`) e atualiza `bio`. |
| `T15-MODERATOR-ACCESS` | Privacidade | 15 | `null` | **`PASS`** | Moderador visualiza suspenso na view e 9 perfis na tabela base. |
| `T16-ADMIN-ACCESS` | Privacidade | 16 | `null` | **`PASS`** | Administrador lê `audit_logs` (22) e `profiles` (9). |
| `T19-ANON-RPC-DENIED` | Autorização | 19 | `42501` | **`PASS`** | `anon` bloqueado por `REVOKE EXECUTE`. |
| `T20-MEMBER-RPC-DENIED` | Autorização | 20 | `42501` | **`PASS`** | `member` bloqueado com `forbidden`. |
| `T21-MOD-RPC-DENIED` | Autorização | 21 | `42501` | **`PASS`** | `moderator` bloqueado com `forbidden`. |
| `T23-T24-MOD-DEMOTED-DURING-OP` | Autorização | 23, 24 | `42501` | **`PASS`** | Moderador rebaixado enquanto aguardava lock em `moderate_topic` falhou na revalidação (`42501`); `is_locked = f` (rollback integral). |

---

## 4. Riscos Residuais e Estado do Banco Local

- **Funções `SECURITY DEFINER`:** Todas mantêm `SET search_path = ''`, qualificação explícita de schemas e `REVOKE ALL` de funções internas/triggers (`protect_last_admin_delete` revogada de `PUBLIC`, `anon`, `authenticated`).
- **Risco residual documentado:**
  1. Caso uma RPC administrativa colida com um `DELETE` externo concorrente em `auth.users` sobre a mesma linha de perfil, `NOWAIT` retornará `55P03` (`lock_not_available`), exigindo tratamento amigável ou retry na UI.
  2. Ao implementar consultas reais de perfil/fórum em `src/` no futuro, listagens públicas deverão consultar `public.public_profiles` (e não `public.profiles` diretamente como `anon`/`member`).
- **Estado do banco local:** `.pg_test_cluster` (`127.0.0.1:5433`, `vexor_audit`) preservado com as correções experimentais aplicadas e reversíveis via `rollback-9.1.5-fixes.sql`.

---

## 5. Build, Lint e TypeScript

- `npx tsc --noEmit`: **`TSC_EXIT=0`**
- `npm run lint`: **`LINT_EXIT=0`** (0 erros; 2 warnings pré-existentes em `scripts/security-audit/run-all-tests.mjs` linhas `156:16` e `193:44`)
- `npx next build --webpack`: **`BUILD_EXIT=0`** (28 rotas compiladas com sucesso)

---

## 6. Parecer Final

### Classificação: **`APROVADA`**

Todas as vulnerabilidades identificadas nas Etapas 9.1.3.7 e 9.1.4 (**V1**, **V2**, **V3**, **V4** e **V5**) foram corrigidas experimentalmente no PostgreSQL local e validadas nos 24 requisitos de regressão sem deadlocks e sem alterações parciais. Nenhuma migration definitiva foi criada e o Supabase remoto permanece intocado. Aguardando sua avaliação explícita para autorizar a preparação da migration definitiva.
