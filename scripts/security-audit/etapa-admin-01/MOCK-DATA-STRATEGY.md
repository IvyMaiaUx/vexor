# ETAPA 1 — ESTRATÉGIA DE DADOS SIMULADOS (`MOCK-DATA-STRATEGY.md`)

**Projeto:** VEXOR  
**Escopo:** `src/features/admin/data/simulated-admin-data.ts`

## 1. Centralização e Isolamento

Todos os dados demonstrativos da nova camada modular foram centralizados em `src/features/admin/data/simulated-admin-data.ts`:
- `IS_SIMULATED_ADMIN_DATA = true`
- `SIMULATED_ADMIN_USERS`
- `SIMULATED_REPORTS`
- `SIMULATED_RESOURCES`
- `SIMULATED_MODERATION_QUEUE`
- `SIMULATED_AUDIT_LOGS`

## 2. Regras de Segurança e Higiene

- **Zero `localStorage`:** a nova camada modular armazena estado exclusivamente em memória dentro da instância criada por `createSimulatedAdminProvider()`.
- **Sinalização explícita:** `provider.isSimulated`, `AdminDashboardStats.isSimulatedDemoData`, `PaginatedResult.isSimulatedDemoData` e registros demonstrativos sinalizam explicitamente `isSimulatedDemoData: true`.
- **Sem dados pessoais reais:** nenhum e-mail privado, senha, token ou dado de conta real é armazenado ou exposto.
- **Sem papéis fictícios:** todos os usuários simulados utilizam estritamente `"member"`, `"moderator"` ou `"admin"`.

## 3. Compatibilidade Legada

O serviço legado `src/features/admin/services/admin-service.ts` foi preservado intacto para não quebrar as páginas já existentes em `src/app/admin/**` nem as suítes das etapas anteriores (`test-admin-etapa2.mjs` a `test-admin-etapa6.mjs` e `test-cybercrime-research-etapa7.mjs`). Sua substituição gradual ocorrerá nas etapas específicas de UI.
