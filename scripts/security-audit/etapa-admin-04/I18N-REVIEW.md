# I18N-REVIEW — ETAPA 4

## 1. Cobertura PT-BR e EN

`src/lib/i18n/dictionaries.ts` foi estendido em `Dictionary`, `pt-BR` e `en` dentro de `adminPanel.usersPage`:
- `demoActions` (incluindo `lastAdminProtected`)
- `roleModal` (eyebrow, título, descrição, rótulos de papel atual/destino, descrições dos 3 papéis, avisos de auto-rebaixamento e último administrador, etapa de confirmação, estados de carregamento/sucesso/erro)
- `suspensionModal` (títulos e descrições de suspensão e reativação, validação de justificativa >= 5 caracteres, avisos de auto-suspensão e último administrador, etapa de confirmação, estados de carregamento/sucesso/erro)
- `auditHistory` (título, subtítulo, selo `APPEND-ONLY`, tradução de `user.role_changed`, `user.suspended`, `user.unsuspended`, rótulos de ator, usuário afetado e justificativa)
- `errorMessages` (mapeamento localizado para códigos `42501`, `22023`, `P0002` via `src/features/admin/utils/user-error-mapper.ts`)

## 2. Preservação de Chaves Legadas

Foram preservadas todas as chaves esperadas pelos testes anteriores (`rbacTitle`, `suspendBtn`, `unsuspendBtn`, `detailsModal`, etc.).
