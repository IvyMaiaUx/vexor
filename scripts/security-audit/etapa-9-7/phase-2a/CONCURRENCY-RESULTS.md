# VEXOR — Etapa 9.7 (Fase 2A) — Resultados de Concorrência (Padrão V4)

**Data:** 2026-11-16  
**Banco isolado:** `vexor_audit_97_2a` (PostgreSQL 18.6, 3 sessões `psql` independentes)

---

## 1. `T11` — Revalidação Pós-Lock vs. Rebaixamento Concorrente de Papel

- **Objetivo:** comprovar que um moderador cuja sessão já passou pela checagem pré-lock (`is_moderator()`) é bloqueado após o lock caso outro administrador rebaixe seu papel antes da conclusão da operação.
- **Execução multi-sessão:**
  1. `sessB` adquiriu `BEGIN; SELECT 1 FROM public.research_submissions WHERE id = ID_PENDING FOR UPDATE;`.
  2. `main` (como `mod_2a`) iniciou `public.moderate_research(ID_PENDING, 'approved', NULL)`, passando `is_moderator()` pré-lock e aguardando o `FOR UPDATE` em `research_submissions`.
  3. `sessC` (como `admin_2a`) executou `public.admin_set_user_role(mod_2a, 'member'); COMMIT;` (`demote_err=null`).
  4. `sessB` executou `ROLLBACK;`, liberando `research_submissions`.
  5. `main` adquiriu `profiles FOR SHARE NOWAIT` e executou a revalidação pós-lock.
- **Resultado observado:** `main` falhou com **`SQLSTATE 42501`** (`forbidden`) — **PASS**.

---

## 2. `T12` — Contenção `NOWAIT` (`SQLSTATE 55P03`)

- **Objetivo:** comprovar que contenção simultânea sobre o perfil do chamador em `profiles FOR SHARE NOWAIT` não bloqueia nem lê estado obsoleto, falhando imediatamente com `55P03`.
- **Execução multi-sessão:**
  1. `sessB` adquiriu `BEGIN; SELECT 1 FROM public.profiles WHERE id = mod_2a FOR UPDATE;`.
  2. `main` (como `mod_2a`) chamou `public.moderate_research(ID_PENDING, 'approved', NULL);`.
- **Resultado observado:** `main` retornou imediatamente **`SQLSTATE 55P03`** (`lock_not_available`) — **PASS**.
