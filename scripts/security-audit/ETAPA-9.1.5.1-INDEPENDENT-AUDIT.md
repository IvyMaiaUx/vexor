# VEXOR — ETAPA 9.1.5.1: AUDITORIA INDEPENDENTE DAS CORREÇÕES EXPERIMENTAIS

**Projeto:** Vexor — Explore. Learn. Defend.  
**Escopo:** Auditoria técnica independente e **somente leitura** sobre o banco local `vexor_audit` (`127.0.0.1:5433`, cluster `.pg_test_cluster`, `PostgreSQL 18.6 on x86_64-windows`).  
**Restrições cumpridas:** Nenhuma alteração de objetos SQL ou dados; `apply-9.1.5-fixes.sql` e `rollback-9.1.5-fixes.sql` não foram executados; nenhuma migration criada/alterada; Supabase remoto (`zcjudcbckcxwnfnrjfte`) não acessado.  
**Parecer Final:** **APROVADA COM RESSALVAS** *(correções principais tecnicamente consistentes, com ressalvas objetivas no script de rollback, `security_barrier` na view e cobertura parcial em 2 testes de último admin)*

---

## 1. Resumo Executivo

A inspeção independente somente leitura (`scripts/security-audit/result-9.1.5.1-independent-audit.json`) confirma que as correções experimentais da Etapa 9.1.5 estão ativas no banco `vexor_audit` e eliminam as vulnerabilidades críticas e altas identificadas nas etapas anteriores:
- A proteção do último administrador ativo (`V1`) serializa alterações de governança via `pg_advisory_xact_lock(6216471958360507469)` e bloqueia `DELETE` direto ou via `ON DELETE CASCADE` através do trigger `BEFORE DELETE ON public.profiles`.
- A revalidação pós-lock com `FOR SHARE NOWAIT` (`V3` e `V4`) impede que administradores ou moderadores rebaixados/suspensos durante a espera de lock concluam mutações.
- A privacidade de `public.profiles` (`V2`) bloqueia `anon` na tabela base (`42501`), restringe `authenticated` ao próprio registro ou moderadores, e expõe apenas 10 colunas não sensíveis em `public.public_profiles` (sem `role` e sem `is_suspended`).
- A remoção de `audit_logs_actor_id_fkey` (`V5`) resolve o conflito com `audit_logs_no_update_delete` mantendo `actor_id` histórico imutável.

**Ressalvas identificadas pela auditoria independente:**
1. **`rollback-9.1.5-fixes.sql` incompleto:** não restaura o corpo original das 6 funções modificadas e recria `audit_logs_actor_id_fkey` como `NOT VALID` (incompatível com `VALIDATE CONSTRAINT` após exclusão de contas com logs).
2. **`security_barrier` ausente na view `public.public_profiles`:** recomenda-se adicionar `WITH (security_invoker = false, security_barrier = true)` na futura migration definitiva.
3. **Cobertura parcial nos testes `T02` e `T04`:** acionaram a trava de auto-despromoção/auto-suspensão (`p_user_id = auth.uid()`) antes do ramo `v_other_admin = 0` (que foi efetivamente exercitado em `T01` e `T03`).
4. **Funções `resubmit_resource` e `set_accepted_post`:** não foram incluídas em `V4` (risco baixo, mas merecem decisão explícita antes da migration definitiva).

---

## 2. Inventário das Evidências e Divergências

- **Arquivos auditados:** `ETAPA-9.1.5-IMPLEMENTATION-REPORT.md`, `ETAPA-9.1.4-SECURITY-REVIEW.md`, `ETAPA-9.1.3.7-REPORT.md`, `apply-9.1.5-fixes.sql`, `rollback-9.1.5-fixes.sql`, `run-9.1.5-regression.mjs`, `result-9.1.5-regression.json`, `inventory-pre-9.1.5.json`, `backup-vexor_audit-pre-9.1.5.sql` e as 3 migrations originais.
- **Divergência 1 (Relatório 9.1.5 vs. `rollback-9.1.5-fixes.sql`):** O relatório classificou a reversibilidade como coberta por `rollback-9.1.5-fixes.sql`, porém a inspeção mostra que o arquivo reverte trigger, view, policy e FK, mas **não restaura as definições originais das 6 RPCs** (apenas o `backup-vexor_audit-pre-9.1.5.sql` completo permitiria restauração integral).
- **Divergência 2 (`T02` e `T04` vs. descrição):** Embora o resumo de `T02` e `T04` fale em "último admin", a mensagem registrada em `result-9.1.5-regression.json` foi `admins cannot demote themselves` / `admins cannot suspend themselves` (regra de auto-operação), porque um único admin não pode chamar a RPC sobre si mesmo; o ramo `v_other_admin = 0` só é alcançável quando um 2º admin tenta rebaixar/suspender o penúltimo/último — o que ocorreu em `T01` — ou em `CASCADE` (`T03`).

---

## 3. Auditoria V1 — Proteção do Último Administrador

### 3.1 Ordem de Aquisição de Locks por Caminho
- **`admin_set_user_role` e `admin_set_user_suspension`:**
  1. `is_admin()` (leitura MVCC sem lock).
  2. `pg_advisory_xact_lock(6216471958360507469)`.
  3. `FOR SHARE NOWAIT` na linha do chamador (`public.profiles`).
  4. `FOR UPDATE NOWAIT` na linha do alvo (`public.profiles`).
- **Exclusão direta de `public.profiles` ou `ON DELETE CASCADE` a partir de `auth.users`:**
  1. Lock exclusivo na tupla de `auth.users` (se via cascade) e na tupla de `public.profiles`.
  2. Trigger `BEFORE DELETE` (`profiles_protect_last_admin_delete`): se `OLD.role = 'admin' AND NOT OLD.is_suspended`, adquire `pg_advisory_xact_lock(6216471958360507469)`.

**Análise de inversão de locks:** Existe diferença de ordem entre RPC (`advisory -> linha`) e `CASCADE DELETE` (`linha -> advisory`), **porém o risco de deadlock `40P01` foi neutralizado pelo `NOWAIT`**: se um `DELETE` externo já detiver o lock da linha e estiver aguardando o advisory lock no trigger, a RPC que detém o advisory lock falha imediatamente com `55P03` em `FOR SHARE NOWAIT` ou `FOR UPDATE NOWAIT` sem entrar em espera circular.

### 3.2 Concorrência e Advisory Lock
- **Chave:** `6216471958360507469` (`0x5645584F5241444D`), transacional (`pg_advisory_xact_lock`), liberada automaticamente em `COMMIT` ou `ROLLBACK`.
- **Caminhos alternativos:** Não há `GRANT INSERT/DELETE` em `public.profiles` para `anon` ou `authenticated`, e `GRANT UPDATE` exclui `role` e `is_suspended`. Portanto, apenas `postgres`/`service_role` poderia alterar `role`/`is_suspended` por `UPDATE` direto em `public.profiles` fora das RPCs (risco operacional administrativo esperado, já que `service_role` é privilegiado; opcionalmente, um trigger `BEFORE UPDATE` também poderia proteger contra `UPDATE` direto).
- **Momento da contagem:** O `SELECT count(*)` ocorre **após** o `pg_advisory_xact_lock` e **após** `FOR UPDATE NOWAIT` na tupla alvo, garantindo consistência sob serialização.

---

## 4. Auditoria V3 e V4 — Autorização Pós-Lock

Funções auditadas: `admin_set_user_role`, `admin_set_user_suspension`, `moderate_resource`, `moderate_topic`, `moderate_post`, `resolve_report`.

- **Por que a estratégia é segura diante de MVCC e concorrência:**
  1. A primeira checagem (`is_admin()` / `is_moderator()`) atua apenas como *fail-fast* antes de disputar locks.
  2. Nas RPCs administrativas, após obter `pg_advisory_xact_lock`, nenhuma outra RPC admin pode alterar papéis concorrentemente; o `SELECT ... FROM public.profiles WHERE id = auth.uid() FOR SHARE NOWAIT` lê o snapshot `READ COMMITTED` atualizado após o lock **e trava a linha do chamador em modo `FOR SHARE` até o fim da transação**, impedindo que um `DELETE` externo remova o chamador após a revalidação.
  3. Nas 4 RPCs de moderação (`moderate_*`, `resolve_report`), o lock `FOR UPDATE` na linha de conteúdo (`resources`/`topics`/`posts`/`reports`) é adquirido primeiro, e **só depois** executa-se `SELECT ... FROM public.profiles WHERE id = auth.uid() FOR SHARE NOWAIT`. Como o snapshot `READ COMMITTED` avança a cada comando após a espera do lock do conteúdo, qualquer rebaixamento/suspensão comitado enquanto a RPC aguardava é detectado imediatamente (`42501`), e o `FOR SHARE` impede mutação da linha do moderador durante o restante da transação.
  4. **Execução parcial:** Como não há `COMMIT` interno em PL/pgSQL, qualquer `RAISE EXCEPTION` (`42501`, `55P03`, `P0002`) reverte integralmente o `UPDATE` ou lock obtido.
- **Funções não alteradas (`resubmit_resource`, `set_accepted_post`):** Ainda checam `is_active_member()` / `is_moderator()` apenas no início da função. Risco baixo, mas recomenda-se avaliar inclusão na migration definitiva por uniformidade.

---

## 5. Auditoria V2 — Privacidade e View Pública (`result-9.1.5.1-independent-audit.json`)

- **Tabela `public.profiles`:**
  - `anon`: `SELECT` revogado (`readonly_role_checks.anon_profiles_sqlstate = "42501"`).
  - `authenticated`: `GRANT SELECT` na tabela, protegido pela policy `profiles_select_own_or_mod` (`id = auth.uid() OR is_moderator()`).
  - Testes somente leitura: `member` leu apenas `1` linha (a própria); `moderator` leu todas as `5` linhas existentes.
- **View `public.public_profiles`:**
  - **Proprietário:** `postgres`.
  - **`reloptions`:** `{security_invoker=false}` — necessário para permitir que `anon` e `member` leiam perfis ativos sem acesso direto à tabela base `public.profiles`.
  - **Colunas:** exatamente 10 colunas públicas (`id, username, display_name, avatar_url, bio, interests, github_url, linkedin_url, preferred_locale, created_at`). Tentativa de ler `role, is_suspended` como `anon` retornou `42703` (`column does not exist`).
  - **Filtro:** `anon` e `member` leram `4` perfis ativos; `moderator` leu `5` (incluindo o perfil suspenso).
  - **Ponto de melhoria (`security_barrier`):** `reloptions` não inclui `security_barrier=true`. Embora `anon` e `authenticated` não possam criar funções em `public`, recomenda-se adicionar `security_barrier = true` na migration definitiva para impedir *predicate pushdown* por funções de baixo custo.

---

## 6. Auditoria V5 — Integridade de `audit_logs`

- **Estado verificado:** Constraint `audit_logs_actor_id_fkey` removida; triggers `audit_logs_no_update_delete` (`BEFORE DELETE OR UPDATE`) e `audit_logs_no_truncate` ativos; `write_audit_log` revogada de `PUBLIC`, `anon`, `authenticated` (apenas invocada por funções `SECURITY DEFINER` internas que gravam `auth.uid()`).
- **Dado real observado:** `orphan_audit_actors_count = 21` (21 registros históricos de testes cujos `actor_id` não existem mais em `public.profiles`).
- **Comparação das 5 alternativas:**
  1. *Manter FK com bloqueio de exclusão:* Impede usuários/moderadores/admins que já geraram logs de excluir a própria conta (quebra funcional/LGPD).
  2. *`ON DELETE SET NULL`:* Conflita diretamente com `audit_logs_no_update_delete` (`42501: audit_logs is append-only`), além de destruir a rastreabilidade de quem executou o evento.
  3. **Remover FK e preservar `actor_id` histórico (adotada):** Mantém `audit_logs` 100% append-only, preserva o UUID original do autor mesmo após exclusão da conta e evita falsificação de autoria porque `INSERT` só ocorre via `write_audit_log` (`SECURITY DEFINER`, revogada dos clientes) usando `auth.uid()`. Risco residual: `actor_id` pode apontar para UUID que não existe mais em `profiles` (esperado em logs históricos).
  4. *Identidade histórica separada / 5. Tabela de tombstones:* Desnecessárias se `actor_id` já é imutável sem FK, embora registrar `actor_username` em `metadata` seja um complemento opcional útil.

---

## 7. Auditoria das 19 Funções `SECURITY DEFINER`

Todas as 19 funções `SECURITY DEFINER` (`18` originais + `protect_last_admin_delete`) têm proprietário `postgres` e `proconfig = {"search_path=\"\""}`. Nenhuma nova elevação de privilégio foi introduzida:
- `protect_last_admin_delete()`: revogada de `PUBLIC`, `anon`, `authenticated` (executada apenas via trigger).
- `write_audit_log(...)`, triggers de sistema (`handle_new_user`, `on_category_changed`, `on_post_created`, `on_vote_changed`): revogadas de `PUBLIC`, `anon`, `authenticated`.
- RPCs (`admin_set_user_role`, `admin_set_user_suspension`, `moderate_*`, `resolve_report`, `resubmit_resource`, `set_accepted_post`): revogadas de `PUBLIC` e `anon`; `EXECUTE` apenas para `authenticated`, com checagem explícita de papel/propriedade.
- Helpers RLS (`current_user_role`, `is_active_member`, `is_moderator`, `is_admin`, `topic_has_replies`): `EXECUTE` para `anon, authenticated` (necessário em políticas e índices); apenas leitura booleana/escalar baseada em `auth.uid()`.

---

## 8. Revisão Independente dos 24 Testes (`result-9.1.5-regression.json`)

| ID (9.1.5) | Requisitos | Status Original | Revisão Independente | Justificativa |
| :--- | :--- | :--- | :--- | :--- |
| `T01-MUTUAL-DEMOTE` | 1 | `PASS` | **VALIDADO** | 2 sessões autenticadas independentes; advisory lock serializou e preservou 1 admin ativo. |
| `T02-DEMOTE-LAST-ADMIN` | 2 | `PASS` | **PARCIALMENTE VALIDADO** | Acionou `admins cannot demote themselves` (auto-despromoção), não o ramo `v_other_admin = 0` (coberto por `T01`). |
| `T03-CASCADE-LAST-ADMIN` | 3 | `PASS` | **VALIDADO** | `DELETE FROM auth.users` bloqueado por `protect_last_admin_delete` (`42501`). |
| `T04-SUSPEND-LAST-ADMIN` | 4 | `PASS` | **PARCIALMENTE VALIDADO** | Acionou `admins cannot suspend themselves`; proteção contra suspensão do último admin por outro depende da lógica validada em `T01`/`T06`. |
| `T05-DEMOTE-DURING-RPC-C3` | 5, 22 | `PASS` | **VALIDADO** | 2 sessões + observador (`pg_stat_activity`); bloqueou pós-lock com `42501`. |
| `T06-SUSPEND-DURING-RPC` | 6 | `PASS` | **VALIDADO** | Suspensão concorrente detectada na revalidação pós-lock (`42501`). |
| `T07-T09-CONCURRENT-DELETE-SERIALIZED` | 7, 9 | `PASS` | **VALIDADO** | Bloqueio real em `Lock:advisory` sem deadlock `40P01`; `42501` após `COMMIT` de A. |
| `T08-SIMULTANEOUS-ROLE-SERIALIZED` | 8 | `PASS` | **VALIDADO** | Duas sessões serializadas com estado final determinístico. |
| `T10-AUDIT-LOGS-V5` | 10 | `PASS` | **VALIDADO** | Exclusão com histórico sucedeu; logs preservados e `UPDATE` bloqueado (`42501`). |
| `T11-ANON-BASE-PROFILES-DENIED` | 11 | `PASS` | **VALIDADO** | `SET LOCAL ROLE anon` bloqueado com `42501`. |
| `T12-T17-T18-ANON-VIEW-PRIVACY` | 12, 17, 18 | `PASS` | **VALIDADO** | `anon` vê apenas ativos na view e recebe `42703` para `role`/`is_suspended`. |
| `T13-T14-MEMBER-OWN-PROFILE` | 13, 14 | `PASS` | **VALIDADO** | `member` lê apenas `1` registro próprio e atualiza `bio`. |
| `T15-MODERATOR-ACCESS` | 15 | `PASS` | **VALIDADO** | `moderator` lê suspensos na view e todos na base. |
| `T16-ADMIN-ACCESS` | 16 | `PASS` | **VALIDADO** | `admin` lê `audit_logs` e `profiles`. |
| `T19-ANON-RPC-DENIED` | 19 | `PASS` | **VALIDADO** | `42501` por `REVOKE EXECUTE`. |
| `T20-MEMBER-RPC-DENIED` | 20 | `PASS` | **VALIDADO** | `42501` (`forbidden`). |
| `T21-MOD-RPC-DENIED` | 21 | `PASS` | **VALIDADO** | `42501` (`forbidden`). |
| `T23-T24-MOD-DEMOTED-DURING-OP` | 23, 24 | `PASS` | **VALIDADO** | 3 sessões + lock real no tópico; rebaixamento durante espera abortou com `42501` e `is_locked = f`. |

---

## 9. Revisão do Rollback (`rollback-9.1.5-fixes.sql`)

A inspeção de `scripts/security-audit/rollback-9.1.5-fixes.sql` identificou **duas limitações reais**:
1. **Não restaura as 6 funções modificadas:** O script remove o trigger, a view e a policy nova, mas **não** contém o `CREATE OR REPLACE FUNCTION` com o código original de `admin_set_user_role`, `admin_set_user_suspension`, `moderate_resource`, `moderate_topic`, `moderate_post` e `resolve_report`.
2. **FK `audit_logs_actor_id_fkey` com `NOT VALID`:** Por existirem `21` registros órfãos em `audit_logs` após exclusões de teste (`V5`), um `VALIDATE CONSTRAINT` futuro falharia com `23503`, e o `ON DELETE SET NULL` voltaria a conflitar com `audit_logs_no_update_delete`.

**Conclusão do rollback:** Para reversão completa ao estado pré-9.1.5 no ambiente local, deve-se restaurar a partir de `backup-vexor_audit-pre-9.1.5.sql` (ou complementar o rollback com as definições originais das 6 funções).

---

## 10. Matriz de Riscos

| Item | Categoria | Gravidade | Evidência | Risco Residual | Ação Necessária |
| :--- | :--- | :--- | :--- | :--- | :--- |
| V1 — Proteção último admin | Corrigida e comprovada | Crítica *(resolvida)* | `T01`, `T03`, `T07`, `result-9.1.5.1` | `55P03` em colisão RPC vs `CASCADE` externo (seguro, sem mutação) | Documentar retry/mensagem amigável na UI para `55P03`. |
| V2 — Privacidade `profiles` / `public_profiles` | Corrigida com risco residual | Baixa | `T11`–`T18`, `result-9.1.5.1` | View sem `security_barrier = true` | Adicionar `security_barrier = true` na migration definitiva. |
| V3 & V4 — Revalidação pós-lock | Corrigida e comprovada | Alta *(resolvida)* | `T05`, `T06`, `T23` | `resubmit_resource` e `set_accepted_post` sem revalidação pós-lock | Avaliar inclusão dessas 2 funções na migration definitiva. |
| V5 — Remoção de `audit_logs_actor_id_fkey` | Corrigida (decisão arquitetural) | Informativa | `T10`, `orphan_audit_actors_count = 21` | `actor_id` histórico pode não existir mais em `profiles` | Confirmar aprovação definitiva de remoção da FK na migration. |
| `rollback-9.1.5-fixes.sql` incompleto | Limitação operacional | Média | Inspeção direta do arquivo SQL | Rollback parcial não reverte corpo das 6 RPCs | Atualizar script de rollback ou usar `backup-vexor_audit-pre-9.1.5.sql` se necessário reverter. |

---

## 11. Parecer Final

### Classificação: **`APROVADA COM RESSALVAS`**

As correções de segurança implementadas localmente na Etapa 9.1.5 (**V1**, **V2**, **V3**, **V4** e **V5**) eliminam efetivamente as vulnerabilidades confirmadas sem introduzir novas falhas de elevação de privilégio ou deadlocks. As ressalvas registradas (`security_barrier = true` na view `public_profiles`, completude do `rollback-9.1.5-fixes.sql` e decisão sobre `resubmit_resource`/`set_accepted_post` e remoção definitiva de `audit_logs_actor_id_fkey`) devem ser endereçadas no planejamento da migration definitiva após sua aprovação.

**Nenhuma alteração foi executada nesta auditoria e o Supabase remoto permanece intocado.** Aguardando sua avaliação explícita para prosseguir.
