# VEXOR — ETAPA 9.1.5.4: REVISÃO E VALIDAÇÃO DO CENÁRIO B DE `set_accepted_post`

**Artefatos da Etapa 9.1.5.3 revisados:**
- `ETAPA-9.1.5.3-INDEPENDENT-REPORT.md`
- `SET_ACCEPTED_POST-CONCURRENCY-ANALYSIS.md`
- `TEST-EXECUTION-RESULTS.json`
- `FINAL-RECOMMENDATIONS.md`

---

## 1. Análise da Cobertura Anterior (Etapa 9.1.5.3)

1. **O Cenário B foi executado na Etapa 9.1.5.3?**  
   **Não.** Em `TEST-EXECUTION-RESULTS.json`, `set_accepted_post` executou diretamente apenas os cenários **A** (`scenario_A_demoted_mod`), **C** (`scenario_C_deleted_mod`) e **D** (`scenario_D_concurrent_set`).
2. **Comportamento exato previsto para o Cenário B:**  
   Um chamador autorizado (moderador ou autor do tópico) invoca `public.set_accepted_post(p_topic_id, p_post_id)` e entra em espera pelo lock `FOR UPDATE` na linha de `public.topics`. Enquanto aguarda o lock, um administrador suspende o chamador (`admin_set_user_suspension(..., true, ...)`) e faz `COMMIT`. Quando o lock em `topics` é liberado, `set_accepted_post` deve revalidar `p.is_suspended` via `SELECT p.role, p.is_suspended ... FOR SHARE NOWAIT` e rejeitar a operação com `SQLSTATE 42501` (`forbidden`), mantendo `accepted_post_id` inalterado.
3. **Resultado registrado na Etapa 9.1.5.3:**  
   Classificado em `SET_ACCEPTED_POST-CONCURRENCY-ANALYSIS.md` como "Validado por análise + cobertura equivalente em `resubmit_resource`".
4. **Existia evidência reproduzível direta na Etapa 9.1.5.3?**  
   **Não** — não havia execução direta de `set_accepted_post` sob suspensão concorrente em `TEST-EXECUTION-RESULTS.json`.
5. **Cobertura equivalente:**  
   O padrão técnico (`FOR SHARE NOWAIT` + `v_caller_susp`) havia sido testado diretamente apenas em `resubmit_resource.concurrent_suspension`.
6. **Necessidade de teste adicional:**  
   **Sim**, para eliminar a lacuna de evidência direta antes de encerrar a auditoria.

---

## 2. Execução Adicional em Banco Temporário Isolado (`vexor_audit_9154`)

Na Etapa 9.1.5.4, foi criada uma cópia temporária isolada `vexor_audit_9154` (clonada de `vexor_audit`), aplicada a definição proposta de `PROPOSED-RPC-REVALIDATION.sql` apenas nessa cópia, e executado o teste concorrente com 3 sessões independentes:

- **Identidade confirmada:** `127.0.0.1:5433`, banco `vexor_audit_9154`, `PostgreSQL 18.6 on x86_64-windows, compiled by msvc-19.44.35229, 64-bit`.
- **Bloqueio observado na Sessão B (autor `U_MEM` chamando `set_accepted_post`):** `15764|Lock|transactionid|{17192}`.
- **Suspensão concorrente pela Sessão C (`U_ADM` chamando `admin_set_user_suspension` + `COMMIT`):** `suspension_has_error: false`.
- **Resultado após `COMMIT` da Sessão A:**
  - `sqlstate_B`: `42501`
  - `message_B`: `ERRO:  42501: forbidden`
  - `accepted_post_id`: `NULL`
- **Limpeza após o teste:** `DROP DATABASE IF EXISTS vexor_audit_9154;` executado no `finally`, restando apenas `vexor_audit` (`REMAINING_DBS=vexor_audit`).

---

## 3. Conclusão da Verificação B

**Cenário B VALIDADO com evidência experimental reproduzível em ambiente isolado.**
