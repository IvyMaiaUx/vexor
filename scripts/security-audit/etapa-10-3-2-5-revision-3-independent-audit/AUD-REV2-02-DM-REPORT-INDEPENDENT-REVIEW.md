# REVISÃO INDEPENDENTE: AUD-REV2-02 (`report_direct_message`)

## 1. Análise do SQL (`PROPOSED-SOCIAL-MIGRATION-REVISION-3.sql`, L797–856)
- A consulta inicial em `public.report_direct_message` (L825–830) agora exige:
  `where dm.id = p_message_id and dm.status = 'published'::public.content_status for share nowait;`
- **Ausência de caminho alternativo:** `reported_message_snapshots` não possui `INSERT` direto para `authenticated`/`anon`; a única porta de entrada é `report_direct_message`.
- **Anti-enumeração:** Mensagens `hidden`, `deleted` ou inexistentes retornam uniformemente `P0002` (`message not found`), impedindo que terceiros ou participantes sondem mensagens removidas/ocultas. Usuário externo diante de mensagem `published` recebe `42501` (`forbidden`). Usuário suspenso recebe `42501` antes mesmo da consulta de mensagem.
- **Deduplicação e snapshots:** A checagem pré-snapshot + `reports_dedupe_direct_message_active` impedem duplicatas ativas e snapshots órfãos.

## 2. Veredito
**CORRIGIDO E VALIDADO.**
