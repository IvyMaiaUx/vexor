# Inspeção de Conteúdo e Segurança de Links — Etapa 6

## 1. Preexistente vs. Corrigido/Novo

- **Preexistente:** `AdminModerationDetailModal` com ficha técnica, renderização em texto puro (sem `dangerouslySetInnerHTML`) e `analyzeUrlSafety()` detectando `javascript:`, `data:`, `vbscript:`, `file:`, `blob:`, HTTP sem TLS, IPv4 literal, Punycode (`xn--`), encurtadores e portas associadas a C2.
- **Corrigido/Novo (`src/features/admin/utils/url-safety.ts` e `admin-moderation-detail-modal.tsx`):**
  - Detecção de **userinfo spoofing** (`@` na autoridade da URL).
  - Detecção de **caracteres/codificações suspeitas** (`%00`, codificação dupla `%25xx`, caracteres de controle e Unicode bidirecional).
  - Indicador heurístico defensivo de **possível phishing** (excesso de subdomínios ou TLDs de alto abuso combinados com termos de credencial).
  - Detecção de **parâmetros de redirecionamento externo** (`redirect`, `next`, `url`, `target`, `return`, `dest`, `continue`).
  - Linguagem estritamente defensiva e não conclusiva (`urlNonConclusiveNotice`), sem jamais acessar, baixar ou executar URLs externas automaticamente.
  - Exibição de `updatedAt`, `priority`, `reportCount`, `flagReason` e histórico somente leitura de decisões no modal.
