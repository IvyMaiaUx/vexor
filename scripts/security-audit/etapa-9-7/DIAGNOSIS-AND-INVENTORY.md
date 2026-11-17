# VEXOR — Etapa 9.7 (Fase 1) — Diagnóstico, Inventário e Funcionalidades

**Data:** 2026-11-15  
**Escopo:** Mapeamento completo do módulo Cybercrime Research (`src/app/cybercrime-research/**` e `src/features/cybercrime-research/**`).

---

## 1. Diagnóstico da Implementação Atual

O módulo Cybercrime Research já possui uma camada de proteção de rota SSR (`src/app/cybercrime-research/layout.tsx`) usando `requireServerAuthorization("active_member")` e um guard visual cliente (`ResearchAccessGuard`), bloqueando visitantes não autenticados e contas suspensas.

Entretanto, **toda a camada de dados, leitura e submissão é 100% local/simulada**:
- As consultas leem arrays estáticos em memória (`RESEARCH_CATEGORIES`, `RESEARCH_PILLARS`, `RESEARCH_ARTICLES`, `CASE_STUDIES`, `TECHNICAL_DISCUSSIONS`, `ANALYSIS_LAB_GUIDES`).
- As submissões de pesquisa (`researchService.submitResearch` e `researchService.resubmitResearch`) gravam e leem exclusivamente em `localStorage` sob a chave `"vexor_admin_research_queue"`.
- A fila de moderação do painel administrativo real (Etapa 9.6) retorna vazia para `contentType = "research"` porque não existe tabela correspondente no PostgreSQL.
- Não existem Route Handlers (`/api/research/**`), Server Actions, nem queries `@supabase/ssr` para o domínio Cybercrime Research.

---

## 2. Inventário Completo de Arquivos Envolvidos

### 2.1 Rotas App Router (`src/app/cybercrime-research/`)
- `src/app/cybercrime-research/layout.tsx` — Proteção SSR via `requireServerAuthorization("active_member")`.
- `src/app/cybercrime-research/page.tsx` — Portal principal (pilares, categorias, destaques, acesso ao modal de submissão).
- `src/app/cybercrime-research/library/page.tsx` — Biblioteca de artigos com busca, filtro por categoria/severidade, ordenação e paginação cliente (6 itens/página).
- `src/app/cybercrime-research/cases/page.tsx` — Estudos de casos forenses (`CaseStudy`) com busca por texto, threat actor, IoCs e TTPs.
- `src/app/cybercrime-research/discussions/page.tsx` — Debates técnicos (`TechnicalDiscussion`) com busca e filtro por categoria.
- `src/app/cybercrime-research/labs/page.tsx` — Guias de laboratório e OPSEC (`AnalysisLabGuide`) com modal detalhado.
- `src/app/cybercrime-research/categories/[slug]/page.tsx` — Página agregadora por categoria (artigos, casos, debates e labs relacionados).

### 2.2 Domínio, Dados, Serviços e Componentes (`src/features/cybercrime-research/`)
- `src/features/cybercrime-research/types.ts` — Interfaces: `ResearchCategory`, `ResearchPillar`, `ResearchArticle`, `CaseStudy`, `TechnicalDiscussion`, `AnalysisLabGuide`.
- `src/features/cybercrime-research/services/research-service.ts` — Classe `ResearchService` com leitura de dados estáticos + `localStorage` (`vexor_admin_research_queue`).
- `src/features/cybercrime-research/data/categories.ts` — 10 categorias oficiais do domínio (`itemCount` estático).
- `src/features/cybercrime-research/data/pillars.ts` — 2 pilares conceituais (`investigation`, `underground`).
- `src/features/cybercrime-research/data/research-data.ts` — Seeds estáticos de artigos, estudos de casos, debates e guias de laboratório.
- `src/features/cybercrime-research/components/research-access-guard.tsx` — Guard visual cliente para não autenticados/suspensos.
- `src/features/cybercrime-research/components/research-submit-modal.tsx` — Modal de submissão de pesquisa (título PT, resumo PT, domínio, severidade, TLP, CVEs, técnicas MITRE ATT&CK, tempo de leitura).
- `src/features/cybercrime-research/components/research-article-detail-modal.tsx` — Visualização detalhada de artigo.
- `src/features/cybercrime-research/components/case-study-detail-modal.tsx` — Visualização detalhada de estudo de caso (timeline, IoCs, TTPs, mitigações).
- `src/features/cybercrime-research/components/lab-guide-modal.tsx` — Visualização detalhada de guia de laboratório.
- `src/features/cybercrime-research/components/research-breadcrumbs.tsx` — Navegação breadcrumb interna.

### 2.3 Referências no Painel Administrativo e Testes
- `src/app/admin/research/page.tsx` — Redireciona para `/admin/moderation?type=research`.
- `src/app/admin/moderation/page.tsx` — Aba `research` na fila unificada.
- `src/features/admin/server/admin-server-handlers.ts` — Retorna lista vazia para `research` e bloqueia moderação até existir tabela/RPC oficial.
- `scripts/test-cybercrime-research-etapa7.mjs` — Suíte offline de validação da Etapa 7.

---

## 3. Classificação: Funcionalidades Reais vs Simuladas

| Funcionalidade | Status Atual | Detalhamento |
|---|---|---|
| Bloqueio de rota SSR (`/cybercrime-research/*`) | **Real (SSR)** | `layout.tsx` usa `requireServerAuthorization("active_member")` e redireciona deslogados/suspensos. |
| Listagem de Categorias e Pilares | **Simulada (Estática)** | Arrays hardcoded em `categories.ts` e `pillars.ts` (inclui `itemCount` fixo). |
| Biblioteca de Artigos (`/library`) | **Simulada (Estática + `localStorage`)** | Mescla `RESEARCH_ARTICLES` com itens `approved` em `localStorage`; filtros e paginação apenas em memória no cliente. |
| Submissão e Reenvio de Pesquisa | **Simulada (`localStorage`)** | `submitResearch` e `resubmitResearch` gravam em `vexor_admin_research_queue` no navegador; sem persistência entre dispositivos, sem RLS real. |
| Moderação Administrativa de Pesquisas | **Indisponível no Backend Real** | `admin-server-handlers.ts` bloqueia `contentType === "research"` porque não há tabela/RPC no Supabase. |
| Estudos de Caso (`/cases`) | **Simulada (Estática)** | Apenas leitura de `CASE_STUDIES` em memória; sem criação/edição. |
| Debates Técnicos (`/discussions`) | **Simulada (Estática)** | Apenas leitura de `TECHNICAL_DISCUSSIONS` em memória; `repliesCount`/`voteCount` fixos; sem resposta/voto real. |
| Guias de Laboratório (`/labs`) | **Simulada (Estática)** | Apenas leitura de `ANALYSIS_LAB_GUIDES` em memória. |
