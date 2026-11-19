# REGISTRO DE RISCOS — ETAPA 10.3.2.4

| ID | Gravidade | Status | Observação |
|---|---|---|---|
| `AUD-REV2-01` | `MEDIUM` | **Fechado na Revisão 3** | Eliminado deadlock `40P01` em `send_direct_message`; 200/200 envios concorrentes persistidos. |
| `AUD-REV2-02` | `LOW` | **Fechado na Revisão 3** | `report_direct_message` exige `dm.status = 'published'`. |
| `AUD-REV2-03` | `INFORMATIONAL` | Aberto (Limitação ambiental) | Apenas PG 18 disponível localmente; PG 17.11 validado estaticamente. |
| `AUD-REV2-04` | `INFORMATIONAL` | Aberto (Fase B) | Mapear `23505` → HTTP `409` em `report-service.ts`. |
