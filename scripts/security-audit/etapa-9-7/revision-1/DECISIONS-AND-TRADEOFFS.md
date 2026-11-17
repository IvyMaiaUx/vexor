# VEXOR — Etapa 9.7 (Fase 1.1) — Decisões e Tradeoffs (`revision-1`)

**Data:** 2026-11-15  

---

## 1. Resumo das Decisões Arquiteturais

| Tópico | Decisão Adotada | Alternativa Descartada | Tradeoff / Justificativa |
|---|---|---|---|
| **Status** | ENUM próprio `public.research_status` | Reutilizar `public.resource_status` | Evita acoplamento futuro entre ciclo editorial de pesquisas e catálogo de ferramentas. |
| **TLP 2.0** | `'CLEAR' \| 'GREEN' \| 'AMBER' \| 'AMBER+' \| 'RED'` apenas informativo | Usar TLP como regra RLS | Mantém TLP fiel ao padrão TLP 2.0 sem criar um segundo modelo de autorização paralelo ao `user_role`. |
| **Categorias** | `category_id uuid` com FK `ON DELETE RESTRICT` + extensão de `category_scope` com `'research'` | `category_slug text` sem FK | Garante integridade referencial real; exige seed das categorias de pesquisa na Fase 2. |
| **Preservação histórica** | Sem `DELETE` para clientes; `reports.research_id` com `ON DELETE RESTRICT`; `notifications.research_id` com `ON DELETE SET NULL` | `ON DELETE CASCADE` | Impede perda de evidências/denúncias; exclusão ocorre logicamente via `archived`. |
| **Slug** | Gerado em trigger `BEFORE INSERT` a partir de `(title_pt, id)` | Slug enviado pelo cliente | Elimina colisão, spoofing de URL e enumeração previsível, com leve sufixo hex de 8 chars. |
| **RPC `resubmit_research`** | Transacional recebendo novos campos + `audit_logs` | Apenas trocar `status = 'pending'` | Garante atomicidade entre correção do conteúdo rejeitado, limpeza de `rejection_reason` e trilha de auditoria. |
| **`search_path` nas RPCs** | `pg_catalog, public, pg_temp` com nomes qualificados | `search_path` amplo ou sem `pg_catalog` primeiro | Previne hijacking mantendo compatibilidade com `auth.uid()` e `extensions.unaccent()`. |
| **Notificação a suspenso** | Não cria notificação se autor estiver `is_suspended = true` (ou ausente) | Inserir cegamente | Evita ruído para contas desativadas mantendo `audit_logs` como registro oficial. |
