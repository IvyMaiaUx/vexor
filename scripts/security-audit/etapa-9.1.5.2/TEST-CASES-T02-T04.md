# VEXOR — ETAPA 9.1.5.2: REFORÇO DOS TESTES T02 E T04 (RAMO `v_other_admin = 0`)

## Por que `T02` e `T04` foram classificados como `PARCIALMENTE VALIDADO`
Na Etapa 9.1.5, `T02-DEMOTE-LAST-ADMIN` e `T04-SUSPEND-LAST-ADMIN` deixaram apenas 1 administrador ativo (`A1` em `T02`, `A2` em `T04`) e fizeram esse mesmo administrador chamar a RPC contra **si próprio** (`p_user_id = auth.uid()`).  
Consequentemente, a execução foi interrompida pela guarda de auto-operação (`admins cannot demote themselves` / `admins cannot suspend themselves`) **antes** de alcançar a verificação `IF v_other_admin = 0`!

---

## Análise Estrutural de Alcançabilidade de `v_other_admin = 0`
1. **Em `protect_last_admin_delete()` (`BEFORE DELETE ON public.profiles`):**
   - `v_other_admin = 0` é diretamente alcançável via `DELETE FROM auth.users` (ou `public.profiles`) sobre o último administrador ativo (**já validado em `T03-CASCADE-LAST-ADMIN`**).
2. **Em `admin_set_user_role` e `admin_set_user_suspension`:**
   - Enquanto as guardas `p_user_id = auth.uid()` estiverem ativas e apenas administradores ativos passarem em `is_admin()`, qualquer chamada válida em que `p_user_id <> auth.uid()` pressupõe a existência de pelo menos 2 administradores ativos (`auth.uid()` e `p_user_id`), de modo que `v_other_admin >= 1`.
   - Portanto, `v_other_admin = 0` nessas duas RPCs funciona como **invariante de defesa em profundidade** (protegendo contra eventual remoção futura da trava de auto-operação ou corrida sob falha de lock).
   - Para **comprovar em teste isolado** tanto a trava de auto-operação quanto o comportamento sob concorrência e o disparo real de `v_other_admin = 0`, projetam-se os casos abaixo.

---

## Casos de Teste Projetados *(NÃO Executados nesta etapa)*

### Caso `T02-R1`: Rebaixamento mútuo concorrente entre 2 únicos administradores (`A1` vs `A2`)
- **Status:** `Projetado` *(executável em ambiente isolado)*
- **Pré-condição:** Exatamente 2 admins ativos (`A1`, `A2`).
- **Execução (2 sessões independentes com barreira via `pg_stat_activity`):**
  - `Sessão A` (`A1`): `BEGIN; SELECT public.admin_set_user_role(A2, 'member');` (adquire `pg_advisory_xact_lock`, vê `v_other_admin = 1`, atualiza `A2` para `'member'`, ainda sem `COMMIT`).
  - `Sessão B` (`A2`): `BEGIN; SELECT public.admin_set_user_role(A1, 'member');` (entra em espera em `Lock:advisory`).
  - `Sessão A`: `COMMIT;`.
  - `Sessão B`: desbloqueia, revalida `public.profiles` (`FOR SHARE NOWAIT`) e vê que `A2` agora é `'member'`.
- **Resultado Esperado:** `Sessão B` falha com `SQLSTATE 42501` (`forbidden`), `ROLLBACK`, restando exatamente 1 administrador ativo (`A1`).

### Caso `T02-R2`: Exercício direto do ramo `v_other_admin = 0` no trigger `BEFORE DELETE` (sem trava de auto-operação)
- **Status:** `Projetado` *(executável em ambiente isolado)*
- **Pré-condição:** Exatamente 1 admin ativo (`A1`).
- **Execução:** `DELETE FROM auth.users WHERE id = A1;` e `DELETE FROM public.profiles WHERE id = A1;`.
- **Resultado Esperado:** Ambos falham com `SQLSTATE 42501` (`cannot delete the last active admin`), `ROLLBACK`, `A1` preservado.

### Caso `T04-R1`: Suspensão mútua concorrente entre 2 únicos administradores (`A1` vs `A2`)
- **Status:** `Projetado` *(executável em ambiente isolado)*
- **Pré-condição:** Exatamente 2 admins ativos (`A1`, `A2`).
- **Execução (2 sessões independentes):**
  - `Sessão A` (`A1`): `BEGIN; SELECT public.admin_set_user_suspension(A2, true, 'audit');` (adquire `pg_advisory_xact_lock`, `v_other_admin = 1`, suspende `A2`).
  - `Sessão B` (`A2`): `BEGIN; SELECT public.admin_set_user_suspension(A1, true, 'audit');` (aguarda `Lock:advisory`).
  - `Sessão A`: `COMMIT;`.
- **Resultado Esperado:** `Sessão B` falha na revalidação pós-lock com `SQLSTATE 42501` (`forbidden`), `ROLLBACK`, restando `A1` como único administrador ativo.

### Caso `T04-R2`: Tentativa direta de auto-suspensão do último administrador ativo
- **Status:** `Projetado` *(executável em ambiente isolado)*
- **Pré-condição:** Exatamente 1 admin ativo (`A1`).
- **Execução:** `A1` chama `SELECT public.admin_set_user_suspension(A1, true, 'self test');`.
- **Resultado Esperado:** `SQLSTATE 42501` (`admins cannot suspend themselves`), `ROLLBACK`, `A1` permanece `is_suspended = false`.
