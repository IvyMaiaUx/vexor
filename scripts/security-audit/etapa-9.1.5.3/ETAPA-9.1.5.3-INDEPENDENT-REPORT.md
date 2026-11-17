# VEXOR — ETAPA 9.1.5.3: RELATÓRIO INDEPENDENTE DE AUDITORIA E VALIDAÇÃO ISOLADA

**Projeto:** Vexor — *Explore. Learn. Defend.*  
**Etapa:** 9.1.5.3 — Auditoria das Propostas SQL e Validação em Ambiente Isolado  
**Classificação Final:** **APROVADA COM RESSALVAS**  
**Banco Principal Preservado:** `vexor_audit` (`127.0.0.1:5433`, PostgreSQL 18.6) — não modificado.  
**Banco Temporário Isolado Utilizado:** `vexor_audit_9153` (clonado de `vexor_audit` e descartado via `DROP DATABASE IF EXISTS vexor_audit_9153` ao término da execução).

---

## 1. Integridade e Hashes SHA-256 dos Artefatos Auditados

### Migrations Originais e Seed (Inalterados)
| Arquivo | SHA-256 |
| :--- | :--- |
| `supabase/migrations/20261110000001_schema.sql` | `24763C8E77E5643EFA3214093071760539D65C3A8834E5837CBC70698C7BEE75` |
| `supabase/migrations/20261110000002_functions_triggers.sql` | `89D8F4C6A456ABD523EC660C932AE24F63B10AF3D46C199A2B39D898E5A00D77` |
| `supabase/migrations/20261110000003_rls_and_grants.sql` | `10E8487AB58DA75BAC0A7AEE21DA968EA69FB93F284BB879A7DE96347467F030` |
| `supabase/seed.sql` | `E2B814A6E64FD18DEF920792959CE8ABF8463B0A500CDE4FD9F60D875092F3B9` |

### Artefatos da Etapa 9.1.5.2 Auditados
| Arquivo | SHA-256 |
| :--- | :--- |
| `ETAPA-9.1.5.2-REPORT.md` | `8A51CE2F495E1A008D6C09CC74F7702A8E0F10FEB6E87F7E0B04FD03C7C13750` |
| `PROPOSED-AUDIT-LOGS-STRATEGY.md` | `061052703F1E9B94B9FD916DAB987D0B2D262429F53B56BD3AAC875BF4051DF1` |
| `PROPOSED-ROLLBACK-COMPLETE.sql` | `BFC7717234C72741FDB997012FD6339289A948FB27CFB121ED57AE4815E4F9C5` |
| `PROPOSED-RPC-REVALIDATION.sql` | `16FBDBF078AFF46B4161519FCBA190FEC3F44E780ECC516D92943D207579ADC1` |
| `PROPOSED-SECURITY-BARRIER.sql` | `6E1038C4DF0833176215CC9F1A70D185258666DA316B6BE87283B8E91CCA8DDD` |
| `TECHNICAL-DECISIONS.md` | `0514742EE37760B52052A2A3005C8EB8ED0183E923317EB0782AF4C22A8B6EF7` |
| `TEST-CASES-T02-T04.md` | `C732D6A13F19A743A234BAC6EDDD1CCBB600AFAD8C542E1A135DD86978E4FC75` |

---

## 2. Separação Explícita por Categoria de Evidência

### Inspecionado (Análise Estática e Documental)
- Verificação das definições de `PROPOSED-SECURITY-BARRIER.sql`, `PROPOSED-RPC-REVALIDATION.sql`, `PROPOSED-ROLLBACK-COMPLETE.sql` e `PROPOSED-AUDIT-LOGS-STRATEGY.md` frente às migrations originais (`01`, `02`, `03`) e aos resultados da Etapa 9.1.5.1 (`orphan_audit_actors_count = 21`).
- Análise de grafo de locks para o Cenário E (deadlock) em `SET_ACCEPTED_POST-CONCURRENCY-ANALYSIS.md`.
- Análise comparativa da Alternativa C para `audit_logs` em `AUDIT_LOGS-VALIDATION.md`.

### Proposto (Artefatos da Etapa 9.1.5.2 Ainda Não Aplicados ao Banco Principal)
- Aplicação de `security_barrier = true` em `public.public_profiles`.
- Revalidação pós-lock com `FOR SHARE NOWAIT` em `public.set_accepted_post` e `public.resubmit_resource`.
- Remoção definitiva de `audit_logs_actor_id_fkey` (Alternativa C) e script de rollback completo.

### Executado (Testes em Ambiente Isolado `vexor_audit_9153` — `TEST-EXECUTION-RESULTS.json`)
- **Identidade confirmada:** `127.0.0.1:5433`, banco `vexor_audit_9153`, `PostgreSQL 18.6 on x86_64-windows, compiled by msvc-19.44.35229, 64-bit`.
- **`PROPOSED-SECURITY-BARRIER.sql`:** `view_meta = public_profiles|postgres|{security_invoker=false,security_barrier=true}`; `anon_view_count = 4`; consulta direta à tabela base `public.profiles` como `anon` bloqueada (`SQLSTATE 42501`).
- **`set_accepted_post`:**
  - Cenário A (moderador rebaixado durante espera de lock em `topics`): bloqueio observado (`19164|Lock|transactionid|{17300}`), retorno `SQLSTATE 42501`, `accepted_post_id = NULL`.
  - Cenário C (moderador excluído concorrentemente): retorno `SQLSTATE 55P03` (`hasError: true`).
  - Cenário D (duas sessões concorrentes): bloqueio observado (`19164|Lock|transactionid|{17300}`), sem erro (`hasError: false`), serialização preservada (`final_accepted_post_id = 91530001-0000-0000-0000-000000000031`).
- **`resubmit_resource`:**
  - Suspensão concorrente durante espera de lock em `resources`: bloqueio observado (`19164|Lock|transactionid|{17300}`), retorno `SQLSTATE 42501`, `status = rejected`.
  - Dono ativo: `hasError = false`, `status = pending`.
- **`T02` / `T04`:**
  - `T02-R1` (rebaixamento mútuo concorrente): bloqueio em advisory lock (`19164|Lock|advisory|{17300}`), sessão B rejeitada com `SQLSTATE 42501`, `admins_remaining = 1`.
  - `T02-R2` (`DELETE` direto em `auth.users` e `public.profiles` do último admin ativo): alcança diretamente `v_other_admin = 0` no trigger `BEFORE DELETE`, retornando `SQLSTATE 42501` (`cannot delete the last active admin`), `admin_preserved = true`.
  - `T04-R1` (suspensão mútua concorrente): bloqueio em advisory lock (`19164|Lock|advisory|{17300}`), sessão B rejeitada com `SQLSTATE 42501`, `admins_remaining = 1`.
  - `T04-R2` (auto-suspensão do último admin): rejeitada com `SQLSTATE 42501` pela guarda explícita `admins cannot suspend themselves` (antes de atingir `v_other_admin = 0`).
- **`PROPOSED-ROLLBACK-COMPLETE.sql`:** `exit_code = 0`, `trigger_remaining = 0`, `view_remaining = 0`, `fk_restored = audit_logs_actor_id_fkey|validated=false`, `rpcs_still_with_advisory_lock = 0`.

### Validado
- Todas as propostas SQL da Etapa 9.1.5.2 são tecnicamente consistentes, reproduzíveis e funcionam conforme especificado no PostgreSQL 18.6 local isolado, sem efeitos colaterais no banco `vexor_audit` ou nas migrations originais.

---

## 3. Ressalvas para Aprovação Final

1. **Decisão pendente sobre `audit_logs` (Alternativa C):** depende de aprovação formal do responsável pelo projeto antes da migration definitiva.
2. **Escopo do script de rollback definitivo:** `PROPOSED-ROLLBACK-COMPLETE.sql` reverte integralmente a Etapa 9.1.5, mas a futura migration definitiva deverá incluir também a restauração original de `set_accepted_post` e `resubmit_resource`.
3. **Observação sobre `T04-R2`:** a proteção contra auto-suspensão do último admin ocorre pela guarda de auto-suspensão (`admins cannot suspend themselves`), enquanto `v_other_admin = 0` é exercitado diretamente em `T02-R2`.
