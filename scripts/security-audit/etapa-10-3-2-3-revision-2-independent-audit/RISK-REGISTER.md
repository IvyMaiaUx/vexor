# REGISTRO DE RISCOS — ETAPA 10.3.2.3

| ID | Gravidade | Tipo | Status | Ação Recomendada |
|---|---|---|---|---|
| `AUD-REV2-01` | `MEDIUM` | Defeito de concorrência confirmado | Aberto | Trocar `FOR SHARE NOWAIT` por `FOR NO KEY UPDATE NOWAIT` em `send_direct_message` (L717) antes da promoção oficial. |
| `AUD-REV2-02` | `LOW` | Melhoria recomendada | Aberto | Filtrar `dm.status = 'published'` em `report_direct_message`. |
| `AUD-REV2-03` | `INFORMATIONAL` | Limitação ambiental | Aberto | Validar em instância PG 17.11 antes de aplicar no remoto. |
| `AUD-REV2-04` | `INFORMATIONAL` | Requisito Fase B | Aberto | Mapear `23505` → HTTP `409` em `report-service.ts`. |
| `AUD-SEC-01..05` | Anterior (`MEDIUM`/`LOW`) | Corrigidos na Revisão 2 | **Fechado** | Validados em runtime e concorrência paralela. |
