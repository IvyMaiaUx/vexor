# PROPOSTA DE MIGRATION INCREMENTAL — ETAPA 10.3.6.1

- **Arquivo candidato:** [20261118183000_social_permissions_realtime.sql](file:///c:/Users/Ivy%20Maia/Desktop/cybersec-community-platform/supabase/migrations/20261118183000_social_permissions_realtime.sql)
- **Tamanho:** `1952` bytes
- **SHA-256:** `FF67023F48BF230D3D8E45D0F8BA2696556EC0D565EE4C121393A90CFD9F5CF0`
- **Timestamp:** `20261118183000` (posterior a todas as 6 migrations existentes, sem colisões).

## Conteúdo
1. `grant insert (kind, shared_url, resource_id) on public.topics to authenticated;`
2. Bloco `DO $$` idempotente adicionando `public.direct_messages` e `public.notifications` em `supabase_realtime` dentro de `BEGIN; ... COMMIT;`.
- Nenhuma migration histórica foi alterada; nenhuma aplicação remota foi executada.
