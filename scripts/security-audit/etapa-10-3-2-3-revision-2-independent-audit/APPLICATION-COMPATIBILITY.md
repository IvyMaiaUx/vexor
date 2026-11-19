# COMPATIBILIDADE COM A APLICAÇÃO — REVISÃO 2

> Nenhum arquivo em `src/` foi alterado nesta auditoria.

## 1. Contratos RPC e Mapeamento SQLSTATE → HTTP (Fase B)
- `report_direct_message`: retorna `23505` em duplicidade ativa — `report-service.ts` deve mapear `23505` para **HTTP `409 Conflict`**, nunca `500`.
- `send_direct_message`: retorna `42901` no rate limit (mapear para **HTTP `429`**), `55P03` em lock conflict (mapear para **HTTP `409`**), `42501` em bloqueio/suspensão (mapear para **HTTP `403`**).
- `mark_dm_conversation_read(uuid)`: retorna `timestamptz` ou `42501` uniforme (mapear para **HTTP `403`** sem revelar existência da conversa).
- `issue_user_warning` / `revoke_user_warning`: `42501` → **HTTP `403`**, `P0002` → **HTTP `404`**, `22023` → **HTTP `400`**.

## 2. Compatibilidade com Serviços Existentes
- `database.types.ts`: regeneração/extensão necessária para novos enums, colunas (`topics`, `reports`, `notifications`), 7 novas tabelas e novas RPCs.
- `forum-service.ts`, `notification-service.ts`, `report-service.ts`, `admin-server-handlers.ts`, `supabase-admin-provider.ts`, `research-server-handlers.ts`: compatíveis sem conflito com `research_submissions`; todos os acessos futuros devem operar via cliente autenticado com `getUser()` (sem `service_role`).
- Navbar desktop/mobile e CTA `/catalog` (`AUD-11`): preservados para integração na Fase B.
