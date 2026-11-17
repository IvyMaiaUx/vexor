# VEXOR — Etapa 9.6 — Limitações e Riscos Conhecidos

**Data:** 2026-11-15  

---

## 1. Limitações de Schema / Backend (Sem Alterações no Banco)

1. **Cybercrime Research sem tabela no banco:**
   - Não existe tabela para submissões de pesquisa em `supabase/migrations/`. A fila `research` retorna vazia (`0` itens, `isSimulatedDemoData: false`) e ações de moderação sobre `research` são rejeitadas explicitamente (`400`).
2. **Ações `escalate` e `request_revision`:**
   - As RPCs oficiais `moderate_resource`, `moderate_topic` e `moderate_post` não possuem estados `escalated` ou `revision_requested`. Essas ações foram removidas de `getSupabaseModerationAvailableActions` e são rejeitadas no servidor.
3. **Campos ausentes em `public.profiles`:**
   - `email` (privado em `auth.users`) e `lastActivityAt` não existem em `public.profiles` e não são exibidos.
4. **Métrica `recentAuditActionsCount` no Dashboard:**
   - Como `/admin` é acessível a moderadores e `audit_logs` é restrito a `is_admin()`, `recentAuditActionsCount` no agregado do Dashboard permanece `0`; administradores visualizam os eventos recentes no painel dedicado `/admin/audit` e no card de atividade recente do Dashboard.

## 2. Riscos e Mitigações

- **Volume de leitura em `audit_logs` / `moderation`:** As consultas no servidor limitam resultados (`limit(500)` em `audit_logs`) e aplicam paginação no servidor. Para bases muito grandes no futuro, recomenda-se paginação direta por `range()` e índices/views dedicadas (fora do escopo da Etapa 9.6).
- **Execução de `next build` na sandbox Windows:** O ambiente Windows restrito bloqueia processos filhos do Turbopack (`next build`), sendo a validação estática garantida por `npx tsc --noEmit`, `npx eslint .` e suítes Node.js.
