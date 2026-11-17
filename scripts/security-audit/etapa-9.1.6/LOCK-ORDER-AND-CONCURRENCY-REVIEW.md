# VEXOR — ETAPA 9.1.6: REVISÃO DA ORDEM GLOBAL DE LOCKS E CONCORRÊNCIA

## 1. Hierarquia Global de Locks

Para evitar inversão de ordem de locks e deadlocks entre transações concorrentes, a proposta adota a seguinte hierarquia:

1. **Nível 1 — Governança administrativa (`pg_advisory_xact_lock(6216471958360507469)`):**
   - Adquirido primeiro por `admin_set_user_role`, `admin_set_user_suspension` e `protect_last_admin_delete()`.
   - Serializa alterações de papel/suspensão/exclusão de administradores, garantindo contagem consistente de `v_other_admin` na transação.
2. **Nível 2 — Recurso alvo de conteúdo (`FOR UPDATE`):**
   - `moderate_resource` (`public.resources`), `moderate_topic` (`public.topics`), `moderate_post` (`public.posts`), `resolve_report` (`public.reports`), `resubmit_resource` (`public.resources`), `set_accepted_post` (`public.topics`).
   - Adquirido antes da verificação do perfil do chamador; nunca seguido de advisory lock administrativo.
3. **Nível 3 — Perfil do chamador / alvo (`public.profiles`):**
   - Nas operações administrativas (após Nível 1): `FOR SHARE NOWAIT` no chamador (`auth.uid()`), depois `FOR UPDATE NOWAIT` no alvo (`p_user_id`).
   - Nas operações de moderação/conteúdo (após Nível 2): `FOR SHARE NOWAIT` no chamador (`auth.uid()`).

---

## 2. Análise de Deadlock e `NOWAIT`

- **Por que não há ciclo de deadlock:** operações administrativas (Nível 1 -> Nível 3) **nunca** adquirem locks de Nível 2 (`topics`, `posts`, `resources`, `reports`), e operações de conteúdo (Nível 2 -> Nível 3) **nunca** adquirem `pg_advisory_xact_lock(6216471958360507469)`.
- **Papel de `FOR SHARE NOWAIT`:**
  - Garante que, após esperar o lock de Nível 2 em `READ COMMITTED`, a RPC leia o snapshot mais recente de `public.profiles` (detectando rebaixamento ou suspensão recém-commitados com `42501`).
  - Mantém lock compartilhado na linha do chamador até o `COMMIT`, impedindo que outra transação altere/exclua o chamador no intervalo entre a revalidação e a gravação final.
  - Se o chamador já estiver sob lock exclusivo de exclusão/alteração em andamento, `NOWAIT` falha imediatamente com `SQLSTATE 55P03` (`lock_not_available`) em vez de criar espera circular.
