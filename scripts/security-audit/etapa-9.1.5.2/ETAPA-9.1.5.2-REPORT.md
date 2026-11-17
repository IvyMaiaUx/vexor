# VEXOR — ETAPA 9.1.5.2: RELATÓRIO DE RESOLUÇÃO DAS RESSALVAS

**Projeto:** Vexor — Explore. Learn. Defend.  
**Ambiente Autorizado (Inspeção):** `127.0.0.1:5433`, banco `vexor_audit`, cluster `.pg_test_cluster`, `PostgreSQL 18.6 on x86_64-windows`  
**Confirmação de Imutabilidade:** **Nenhuma alteração foi aplicada ao banco local, às migrations originais, ao frontend ou ao Supabase remoto (`zcjudcbckcxwnfnrjfte`).**  
**Parecer Final:** **APROVADA** *(todas as 4 ressalvas da Etapa 9.1.5.1 investigadas, documentadas e resolvidas em artefatos isolados, prontas para decisão do responsável)*

---

## 1. Resumo Executivo

Todas as ressalvas levantadas pela auditoria independente da Etapa 9.1.5.1 foram investigadas e endereçadas exclusivamente por inspeção e elaboração de artefatos isolados em `scripts/security-audit/etapa-9.1.5.2/`, sem executar qualquer comando modificador no banco local ou remoto.

---

## 2. Evidências Consultadas

- `scripts/security-audit/ETAPA-9.1.5.1-INDEPENDENT-AUDIT.md`
- `scripts/security-audit/result-9.1.5.1-independent-audit.json`
- `scripts/security-audit/ETAPA-9.1.5-IMPLEMENTATION-REPORT.md`
- `scripts/security-audit/apply-9.1.5-fixes.sql` e `rollback-9.1.5-fixes.sql`
- `scripts/security-audit/result-9.1.5-regression.json`
- `supabase/migrations/20261110000001_schema.sql`, `20261110000002_functions_triggers.sql` (linhas 443-626), `20261110000003_rls_and_grants.sql`

---

## 3. Análise das Ressalvas e Decisões Recomendadas

1. **Ressalva A (`security_barrier` em `public_profiles`):**
   - `PROPOSED-SECURITY-BARRIER.sql` propõe `WITH (security_invoker = false, security_barrier = true)` mantendo as 10 colunas públicas (sem `role` e `is_suspended`). Explica explicitamente que `security_barrier` protege contra *predicate pushdown* de funções de baixo custo, mas não substitui projeção explícita nem `REVOKE SELECT` na tabela base.
2. **Ressalva B (`audit_logs_actor_id_fkey`):**
   - `PROPOSED-AUDIT-LOGS-STRATEGY.md` compara formalmente as 4 alternativas (A, B, C, D) em 9 critérios e recomenda a **Alternativa C** (manter `actor_id` sem FK, preservando imutabilidade append-only, exclusão de contas e rastreabilidade via UUID opaco). **Depende de aprovação arquitetural explícita antes da migration definitiva.**
3. **Ressalva C (`resubmit_resource` e `set_accepted_post`):**
   - `PROPOSED-RPC-REVALIDATION.sql` justifica individualmente cada função: `resubmit_resource` revalida apenas `NOT is_suspended` após `FOR UPDATE` em `resources` (não exige `is_moderator()`); `set_accepted_post` corrige o bug do `v_is_mod := public.is_moderator()` no `DECLARE` pré-lock, movendo a checagem para após `FOR UPDATE` em `topics` com `FOR SHARE NOWAIT` em `public.profiles`.
4. **Ressalva D (`rollback-9.1.5-fixes.sql` incompleto):**
   - `PROPOSED-ROLLBACK-COMPLETE.sql` restaura integralmente todas as **6 RPCs originais** da Migration 02 (`admin_set_user_role`, `admin_set_user_suspension`, `moderate_resource`, `moderate_topic`, `moderate_post`, `resolve_report`), além de trigger, view, policy, grants e `audit_logs_actor_id_fkey` (`NOT VALID` caso haja órfãos históricos), deixando explícita a dependência de `backup-vexor_audit-pre-9.1.5.sql` para restauração de dados pré-exclusão.
5. **Reforço `T02` e `T04` (`TEST-CASES-T02-T04.md`):**
   - Documenta por que `T02` e `T04` pararam na trava de auto-operação e projeta os casos `T02-R1`, `T02-R2`, `T04-R1`, `T04-R2` (status: **`Projetado`**, não executados nesta etapa).

---

## 4. Riscos Residuais e Decisão Pendente

- **Decisão pendente:** Aprovação formal da **Alternativa C** para `public.audit_logs.actor_id` (sem FK) antes da criação da migration definitiva.
- **Risco residual:** Contenção `55P03` (`NOWAIT`) em colisão rara entre RPC administrativa e `DELETE` externo concorrente em `auth.users` (comportamento seguro, sem deadlock nem mutação parcial).

---

## 5. Arquivos Criados (`scripts/security-audit/etapa-9.1.5.2/`)

1. `TECHNICAL-DECISIONS.md`
2. `PROPOSED-SECURITY-BARRIER.sql`
3. `PROPOSED-AUDIT-LOGS-STRATEGY.md`
4. `PROPOSED-RPC-REVALIDATION.sql`
5. `PROPOSED-ROLLBACK-COMPLETE.sql`
6. `TEST-CASES-T02-T04.md`
7. `ETAPA-9.1.5.2-REPORT.md`

---

## 6. Verificação de Consistência e Parecer Final

- Todos os 7 arquivos criados, consistentes entre si e com as migrations originais.
- Arquivos anteriores preservados; migrations e seed intactos; zero alterações no banco local e zero conexões remotas.

### Classificação: **`APROVADA`**

Aguardando sua avaliação e autorização explícita para o próximo passo (aplicação/validação local das propostas ou preparação da migration definitiva).
