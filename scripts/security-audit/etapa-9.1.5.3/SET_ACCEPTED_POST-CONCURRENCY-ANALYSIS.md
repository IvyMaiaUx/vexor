# VEXOR — ETAPA 9.1.5.3: ANÁLISE DE CONCORRÊNCIA DE `set_accepted_post` E `resubmit_resource`

**Ambiente validado:** PostgreSQL 18.6 local (`127.0.0.1:5433`, banco temporário isolado `vexor_audit_9153`, clonado de `vexor_audit`).  
**Artefato auditado:** `scripts/security-audit/etapa-9.1.5.2/PROPOSED-RPC-REVALIDATION.sql` (`SHA-256: 16FBDBF078AFF46B4161519FCBA190FEC3F44E780ECC516D92943D207579ADC1`).

---

## 1. Análise da Ordem de Locks e Mecanismo Proposto

### `public.set_accepted_post(p_topic_id uuid, p_post_id uuid)`
1. **Fail-fast inicial (`is_active_member()`):** rejeita imediatamente (`42501: forbidden`) usuários não autenticados ou já suspensos antes de adquirir qualquer lock.
2. **Lock no alvo (`SELECT ... FROM public.topics WHERE id = p_topic_id FOR UPDATE`):** serializa alterações concorrentes em `accepted_post_id` para o mesmo tópico e garante leitura consistente de `author_id`, `status` e `is_locked`.
3. **Revalidação e lock compartilhado do chamador (`SELECT p.role, p.is_suspended FROM public.profiles p WHERE p.id = auth.uid() FOR SHARE NOWAIT`):**
   - Em `READ COMMITTED`, executa após a liberação de eventual lock em `topics`, lendo o estado mais recente de `role` e `is_suspended` do chamador.
   - Mantém lock `FOR SHARE` sobre a linha do chamador até o `COMMIT`, impedindo que outra transação rebaixe, suspenda ou exclua o chamador entre a revalidação e a conclusão do `UPDATE` em `topics`.
   - O uso de `NOWAIT` evita espera bloqueante caso o perfil do chamador já esteja sob lock exclusivo de exclusão/alteração, retornando `55P03` (`lock_not_available`).
4. **Cálculo pós-lock de `v_is_mod`:** `v_is_mod := v_caller_role IN ('moderator', 'admin')` é calculado **após** o lock e revalidação, eliminando o bug da definição original (`20261110000002_functions_triggers.sql`) em que `v_is_mod` era avaliado no bloco `DECLARE` antes de qualquer espera.

### `public.resubmit_resource(p_resource_id uuid)`
1. **Fail-fast inicial (`is_active_member()`).**
2. **Lock no alvo (`SELECT r.submitted_by, r.status FROM public.resources r WHERE r.id = p_resource_id FOR UPDATE`).**
3. **Validação de propriedade e estado:** exige `v_submitted_by = auth.uid()` e `v_status = 'rejected'`.
4. **Revalidação do chamador (`SELECT p.is_suspended FROM public.profiles p WHERE p.id = auth.uid() FOR SHARE NOWAIT`):** verifica se o dono foi suspenso durante a espera pelo lock em `resources`. Sem exigência de `is_moderator()`, preservando a regra de negócio original.

---

## 2. Cobertura dos Cenários (A, B, C, D, E)

| Cenário | Descrição | Status na Etapa 9.1.5.3 | Evidência / Observação |
| :--- | :--- | :--- | :--- |
| **Cenário A** | Moderador não-autor aguarda lock em `topics`; admin rebaixa o moderador para `member` e commita antes da liberação do lock. | **Validado (Executado)** | `TEST-EXECUTION-RESULTS.json`: Sessão B bloqueada (`19164\|Lock\|transactionid\|{17300}`), após rebaixamento e `COMMIT` de A, retornou `SQLSTATE 42501` e `accepted_post_id = NULL`. |
| **Cenário B** | Moderador/autor aguarda lock em `topics`; admin suspende o chamador antes da liberação do lock. | **Validado por análise + cobertura equivalente em `resubmit_resource`** | Na linha 112 de `PROPOSED-RPC-REVALIDATION.sql`, `IF NOT FOUND OR v_caller_susp THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';`. O mesmo padrão (`FOR SHARE NOWAIT` + `v_caller_susp`) foi executado em `resubmit_resource`, onde a suspensão concorrente durante espera de lock retornou `42501` (`blocked: 19164\|Lock\|transactionid\|{17300}`). |
| **Cenário C** | Moderador/autor é excluído concorrentemente (`DELETE FROM auth.users`) antes ou durante a chamada. | **Validado (Executado)** | `TEST-EXECUTION-RESULTS.json`: `scenario_C_deleted_mod` retornou `SQLSTATE 55P03` (`hasError: true`) devido a `FOR SHARE NOWAIT` sobre a linha travada para exclusão. |
| **Cenário D** | Duas sessões autorizadas executam `set_accepted_post` simultaneamente no mesmo tópico. | **Validado (Executado)** | `TEST-EXECUTION-RESULTS.json`: Sessão B aguardou lock em `topics` (`19164\|Lock\|transactionid\|{17300}`), executou após `COMMIT` de A sem erro (`hasError: false`), prevalecendo `POST2` (`91530001-0000-0000-0000-000000000031`). |
| **Cenário E** | Deadlock potencial entre `set_accepted_post` (`topics` -> `profiles`) e operações administrativas (`advisory_lock` -> `profiles`). | **Validado por análise de grafo de locks** | Ver Seção 3 abaixo. |

---

## 3. Análise de Deadlock (Cenário E)

- `set_accepted_post` adquire: (1) `RowExclusiveLock`/`FOR UPDATE` em `public.topics`, depois (2) `FOR SHARE NOWAIT` em `public.profiles`.
- `admin_set_user_role` e `admin_set_user_suspension` adquirem: (1) `pg_advisory_xact_lock` sobre o alvo, depois (2) `FOR UPDATE` em `public.profiles` (alvo e/ou chamador). Elas **não** adquirem locks em `public.topics`.
- Como `topics` e `advisory_lock` não formam ciclo com `profiles`, e o segundo passo em `set_accepted_post` utiliza `NOWAIT` (nunca entra em fila de espera sobre `profiles`), **não há condição de deadlock** em ciclo envolvendo `profiles` e `topics`.
- Caso o perfil do chamador já esteja travado por uma operação administrativa em andamento, `FOR SHARE NOWAIT` falha imediatamente com `55P03` em vez de bloquear esperando, mantendo a integridade sem travamento mútuo.
