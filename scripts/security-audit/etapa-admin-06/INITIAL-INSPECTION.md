# Inspeção Inicial — Etapa 6: Moderação de Conteúdo (`/admin/moderation`)

## 1. Escopo da Inspeção

Foram analisados integralmente antes de qualquer edição:
- `src/app/admin/layout.tsx` e `src/app/admin/moderation/page.tsx`
- `src/features/admin/types.ts`
- `src/features/admin/data/simulated-admin-data.ts`
- `src/features/admin/services/admin-provider.ts`
- `src/features/admin/services/moderation-service.ts`
- `src/features/admin/services/reports-service.ts`
- `src/features/admin/services/admin-service.ts` (legado)
- `src/features/admin/utils/url-safety.ts`
- `src/features/admin/components/admin-moderation-detail-modal.tsx`
- `src/features/admin/components/admin-moderation-decision-modal.tsx`
- `src/features/admin/components/admin-moderation-queue.tsx`
- `src/features/admin/components/admin-report-modal.tsx`
- `src/lib/i18n/dictionaries.ts` (`adminPanel.moderationPage` e `adminPanel.reportsPage`)
- `scripts/test-admin-etapa6.mjs`

---

## 2. Funcionalidades Já Implementadas e Corretas (Preservar)

1. **Proteção de rota no servidor (`src/app/admin/layout.tsx`) e client (`AdminGuard`):**
   - `AdminLayout` usa `export const dynamic = "force-dynamic"` e `requireServerAuthorization("moderator")`, permitindo acesso a `moderator` e `admin`, redirecionando não autenticados para `/login?next=%2Fadmin` e não autorizados para `/catalog`.
2. **Estrutura base de `/admin/moderation`:**
   - Suporte a query string `?type=resource|topic|post|research`.
   - Filtros por tipo de conteúdo, situação, categoria, período (`24h`, `7d`, `30d`) e busca textual.
   - Paginação e modais `AdminModerationDetailModal` e `AdminModerationDecisionModal` sem `dangerouslySetInnerHTML`.
3. **Analisador `analyzeUrlSafety` (`src/features/admin/utils/url-safety.ts`):**
   - Já identifica `javascript:`, `data:`, `vbscript:`, `file:`, `blob:`, `http:` não criptografado, IPv4 literal, Punycode (`xn--`), 9 encurtadores e 10 portas associadas a C2 (`1337`, `4444`, etc.), sem realizar requisições externas.
4. **Dicionários i18n (`pt-BR` e `en`):**
   - Chaves base em `adminPanel.moderationPage` e `adminPanel.reportsPage` já existentes.
5. **Integridade do banco:**
   - Migrações SQL intactas (`user_role`, `resource_status`, `content_status`, `report_status`, `report_reason`, `resources_reject_reason`, `resubmit_resource` e policies RLS).

---

## 3. Problemas e Lacunas Identificados

1. **Serviço legado vs. `adminDataProvider` modular:**
   - `/admin/moderation/page.tsx` e `AdminReportModal` ainda consomem `adminService` legado em vez de `adminDataProvider.moderation` e `adminDataProvider.reports`.
   - `SIMULATED_MODERATION_QUEUE` em `simulated-admin-data.ts` possui apenas 2 itens (`resource` e `topic`), sem exemplos de `post` e `research`, e sem metadados de `updatedAt`, `flagReason`, `reportCount`, `priority` e `moderationHistory`.
2. **Regras de negócio incompletas em `SimulatedAdminModerationService`:**
   - Exige justificativa de apenas `>= 3` caracteres (deve exigir `>= 5` para rejeição e ações restritivas).
   - Não verifica conflitos de estado (`409 Conflict`) nem incompatibilidade de ação por tipo/estado do conteúdo (ex.: `resource` usa `pending`/`approved`/`rejected`/`archived`, enquanto `topic`/`post` usam `published`/`hidden`/`deleted`, e `research` usa `pending`/`approved`/`rejected`/`revision_requested`).
   - Não possui ações de ocultar (`hide`), restaurar (`restore`/`unhide`), encaminhar para análise adicional (`escalate` / `request_revision`) nem histórico por item.
   - Não registra estado anterior (`from`) e posterior (`to`) de forma padronizada na auditoria.
3. **Filtros e colunas ausentes na fila:**
   - Faltam filtros por **prioridade**, **autor** e **presença de denúncias**, além de exibição clara de `updatedAt`, `flagReason`, `reportCount`, `priority` e histórico de decisões.
4. **Integração de Denúncias na Central de Moderação:**
   - Falta aba/consulta de denúncias vinculada a `adminDataProvider.reports` dentro de `/admin/moderation`, exibindo tipo, conteúdo denunciado, motivo, data, estado e histórico de decisões, sem expor identidade privada do denunciante (`reporterUsername`/`reporterId` ocultados/mascarados na interface).
5. **Lacunas no `analyzeUrlSafety`:**
   - Faltam verificações explícitas para: userinfo spoofing (`@` na autoridade), codificação suspeita (`%00`, múltiplos `%`, caracteres invisíveis/bidi), heurística defensiva de phishing (excesso de subdomínios ou termos de login/verificação em domínios suspeitos) e parâmetros de redirecionamento suspeitos (`redirect=`, `next=`, `url=`, `target=` para outro host).
6. **Cobertura de `scripts/test-admin-etapa6.mjs`:**
   - O script atual simula funções locais em vez de importar e exercitar `createSimulatedAdminProvider()`, `analyzeUrlSafety()`, fluxos completos de moderação/denúncias/auditoria e renderização SSR em `pt-BR` e `en`.
