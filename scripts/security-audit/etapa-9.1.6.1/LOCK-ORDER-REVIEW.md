# VEXOR — ETAPA 9.1.6.1: REVISÃO INDEPENDENTE DA ORDEM DE LOCKS

**Funções inspecionadas em `PROPOSED-SECURITY-MIGRATION.sql`:**
`admin_set_user_role`, `admin_set_user_suspension`, `moderate_resource`, `moderate_topic`, `moderate_post`, `resolve_report`, `resubmit_resource`, `set_accepted_post`, além de `protect_last_admin_delete()`.

---

## Análise de Consistência e Deadlock

1. **Hierarquia global sem inversão:**
   - **Administração (`admin_set_user_role`, `admin_set_user_suspension`, `protect_last_admin_delete`):** adquirem `pg_advisory_xact_lock(6216471958360507469)` -> `FOR SHARE NOWAIT` em `public.profiles` (chamador) -> `FOR UPDATE NOWAIT` em `public.profiles` (alvo). Nunca tocam tabelas de conteúdo (`topics`, `posts`, `resources`, `reports`).
   - **Moderação / Conteúdo (`moderate_*`, `resolve_report`, `resubmit_resource`, `set_accepted_post`):** adquirem `FOR UPDATE` na linha alvo -> `FOR SHARE NOWAIT` em `public.profiles` (chamador). Nunca adquirem o advisory lock administrativo.
2. **Prevenção de deadlock:**
   - Como os conjuntos de locks entre administração e conteúdo só se interceptam no nível folha (`public.profiles`) e a entrada nesse nível após lock de conteúdo usa `FOR SHARE NOWAIT` (falha imediata com `55P03` se houver lock exclusivo concorrente, sem fila de espera), **não há ciclo possível de deadlock**.
3. **Execução concorrente adicional em `vexor_audit_9161`:**
   - `set_accepted_post` com moderador rebaixado enquanto aguarda lock em `topics`: bloqueio observado (`6056|Lock|transactionid|{11516}`) e rejeição pós-lock com **`SQLSTATE 42501`**.
