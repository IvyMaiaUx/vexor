# Ações de Moderação e Regras de Estado — Etapa 6

## 1. Preexistente vs. Corrigido/Novo

- **Preexistente:** Aprovação e rejeição com modal `AdminModerationDecisionModal`, exigindo 5 caracteres na UI.
- **Corrigido/Novo (`moderation-service.ts`, `admin-moderation-decision-modal.tsx`, `page.tsx`):**
  - Implementação de `getModerationAvailableActions(item)` diferenciando os fluxos por `contentType` (`resource`, `research`, `topic`/`post`) e estado atual (`pending`, `approved`, `published`, `rejected`, `revision_requested`, `escalated`, `hidden`, `archived`, `deleted`).
  - Suporte às ações `approve`, `reject`, `hide`, `restore`, `escalate` e `request_revision`.
  - Validação no serviço exigindo **mínimo de 5 caracteres** para `reject`, `hide`, `delete`, `request_revision` e `escalate` (erro `22023`, `statusCode: 400`).
  - Bloqueio de ações duplicadas ou incompatíveis com o estado atual com **conflito `409 Conflict`**.
  - Bloqueio de envio duplicado no modal (`submitting`) e fechamento por `Escape`.
