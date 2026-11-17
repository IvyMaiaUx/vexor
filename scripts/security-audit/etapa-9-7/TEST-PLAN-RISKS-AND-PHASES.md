# VEXOR — Etapa 9.7 (Fase 1) — Plano de Testes, Riscos e Fases

**Data:** 2026-11-15  

---

## 1. Plano de Testes (Para Fases 2 e 3)

| Categoria | Cenários Obrigatórios |
|---|---|
| **Não Autenticado (`anon`)** | Bloqueio `401` em `/api/research/**`; redirect `/login?next=/cybercrime-research` no layout SSR; 0 linhas retornadas pelo RLS. |
| **Member Ativo** | Leitura apenas de pesquisas `approved` + próprias (`pending`/`rejected`); criação com `status = 'pending'`; edição apenas das próprias enquanto `pending`; bloqueio IDOR ao tentar editar pesquisa de outro autor; reenvio (`resubmit_research`) apenas de pesquisa própria `rejected`. |
| **Conta Suspensa** | Bloqueio `403` em `/api/research/**` e `is_active_member() = false` no RLS (nem leitura nem escrita). |
| **Moderator & Admin** | Leitura de todas as submissões; aprovação/rejeição/arquivamento via `moderate_research` (motivo obrigatório >= 5 chars em `rejected`); geração de `audit_logs` (`research.approved`/`rejected`/`archived`) e `notifications`. Member comum recebe `403`/`42501` ao tentar moderar. |
| **Consultas, Filtros & Paginação** | Busca por título/resumo/CVE/técnica ATT&CK; filtros por `domain`, `severity`, `category_slug`; ordenação; paginação com `count: "exact"` e `range()`. |
| **Integridade & Erros** | UUID inválido (`400`); registro inexistente (`P0002` / `404`); ausência de `service_role`; ausência de fallback silencioso para `localStorage`/dados simulados em caso de erro de banco. |

---

## 2. Riscos e Dependências

1. **Dependência de nova migration oficial (Fase 2):** Diferentemente das Etapas 9.3–9.6, não há tabela para pesquisas nas 4 migrations atuais. A integração real depende da aprovação e aplicação da migration `research_submissions`.
2. **Coexistência com conteúdo editorial estático:** `CASE_STUDIES` e `ANALYSIS_LAB_GUIDES` são conteúdos editoriais curados. Caso permaneçam estáticos inicialmente, devem ser claramente marcados como conteúdo editorial/curado, sem misturar `localStorage` com dados do Supabase.
3. **Impacto em testes legados da Etapa 7:** `scripts/test-cybercrime-research-etapa7.mjs` valida atualmente a chave `vexor_admin_research_queue` em `localStorage`. Na Fase 3, esse contrato deverá ser migrado ou isolado conforme padrão usado na Etapa 9.6 (`createSimulated...` vs real).

---

## 3. Ordem Recomendada das Próximas Fases

- **Fase 2 — Modelagem SQL e Migration (após aprovação):**
  1. Redigir e revisar a migration oficial (`research_submissions`, ENUMs, índices, triggers, RLS, grants, `moderate_research`, `resubmit_research`, extensão em `reports`/`notifications`).
  2. Aplicar no banco (conforme autorização do usuário) e regenerar `src/types/database.types.ts`.
- **Fase 3 — Implementação Backend & Frontend:**
  1. Criar handlers server-side e Route Handlers `/api/research/**` com `requireServerAuthorization("active_member")`.
  2. Integrar `research_submissions` em `src/features/admin/server/admin-server-handlers.ts` (moderação + contador `pendingResearch` no Dashboard).
  3. Atualizar `researchService` e páginas/modais de `/cybercrime-research/**` para consumo real com loading, empty e error states.
  4. Criar suíte de testes automatizados da Etapa 9.7 e executar regressões completas.
