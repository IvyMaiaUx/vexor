# COMPATIBILIDADE COM A APLICAÇÃO — REVISÃO 3

> Nenhum arquivo em `src/` foi modificado nesta auditoria.

## Mapeamento SQLSTATE Obrigatório na Fase B (`AUD-REV3-INFO-02`)
| SQLSTATE | Origem | HTTP Esperado | Tratamento |
|---|---|---|---|
| `23505` | `report_direct_message` (duplicidade ativa) / `topic_votes` | `409 Conflict` | Mensagem controlada sem detalhes internos do PG |
| `55P03` | `NOWAIT` em `profiles` / `user_warnings` / `direct_messages` | `409 Conflict` | Orientar retry controlado |
| `40P01` | Fallback defensivo em caso de deadlock imprevisto | `409` / `503` | Logar e permitir retry seguro |
| `42501` | RLS / papel / suspensão / bloqueio bilateral | `403 Forbidden` | Sem vazamento de existência |
| `P0002` | Recurso/mensagem/conversa inexistente ou DM oculta/removida | `404 Not Found` | Resposta uniforme anti-enumeração |
| `42901` | Rate limit `send_direct_message` (`30/min`) | `429 Too Many Requests` | Informar limite temporário |

- Compatível com `forum-service.ts`, `notification-service.ts`, `report-service.ts`, `admin-server-handlers.ts`, `supabase-admin-provider.ts`, `database.types.ts`, SSR `getUser()` e futuras assinaturas Realtime.
