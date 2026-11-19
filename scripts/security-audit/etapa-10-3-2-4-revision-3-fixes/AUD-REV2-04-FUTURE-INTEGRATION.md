# INTEGRAÇÃO FUTURA — AUD-REV2-04 (`report-service.ts`)

> `report-service.ts` **não foi alterado** nesta etapa (escopo exclusivamente SQL/local).

## Requisito para a Fase B
Ao integrar `public.report_direct_message` em `src/features/reports/report-service.ts` e nas futuras rotas de API:
1. Mapear SQLSTATE `23505` (`duplicate active report for message`) para **HTTP `409 Conflict`** com código controlado (`duplicate_report`) e mensagem amigável sem expor detalhes internos do PostgreSQL.
2. Mapear `P0002` para **HTTP `404`**, `42501` para **HTTP `403`** e `42901` para **HTTP `429`**.
3. Não usar fallback silencioso que mascare erros inesperados (`500`).
