# Diagnóstico Inicial — Etapa 9.1.18.5

## 1. Gerenciador de pacotes e instalação do Playwright
- Gerenciador identificado via `package-lock.json`: **npm**.
- Playwright não estava instalado previamente em `package.json`.
- A suíte foi preparada para instalar exclusivamente `@playwright/test` como `devDependency` e o navegador `chromium`.

## 2. Estrutura das páginas e seletores estáveis identificados
- `/register` (`src/app/register/page.tsx`):
  - `#reg-email`, `#reg-username`, `#reg-display-name`, `#reg-language`, `#reg-password`, `#reg-confirm-password`, checkbox de compromisso ético (`input[type="checkbox"]`), botão `submit`.
  - Estado pós-envio exibe heading de verificação de e-mail (`confirmationPending`).
- `/login` (`src/app/login/page.tsx`):
  - `#login-email`, `#login-password`, botão `submit`.
  - Validação client-side exibe mensagens em `p.text-rose-400`; erros de autenticação exibem alerta seguro sem vazar detalhes sensíveis.
- `/forgot-password` (`src/app/forgot-password/page.tsx`):
  - `#recovery-email`, botão `submit`.
  - Resposta anti-enumeração após submissão válida.
- `/auth/reset-password` (`src/app/auth/reset-password/page.tsx`):
  - Valida sessão via `validateRecoverySession()`.
  - Bloqueia acesso anônimo, link com `?error=recovery_link_invalid` e sessão comum de login (sem fluxo de recovery).
- `/profile` (`src/app/profile/page.tsx`, `src/features/profile/profile-header.tsx`, `src/features/profile/profile-edit-modal.tsx`):
  - Sem sessão, exibe estado não autenticado sem botão de edição nem dados privados.
  - Autenticado, o botão `Editar Perfil` / `Edit Profile` abre modal `role="dialog"` com campos associados a labels (`useId()`), limites `maxLength` (`displayName`: 60, `bio`: 500) e confirmação via `window.confirm` ao cancelar com alterações pendentes.
- `/admin` e `/cybercrime-research`:
  - Protegidos por `src/proxy.ts` e guards no cliente/servidor, redirecionando sessões anônimas para `/login`.

## 3. Servidor local de execução
- Servidor de desenvolvimento ativo em `http://localhost:3000` (`npm run dev`).
- `playwright.config.ts` configurado com `webServer.reuseExistingServer: true` para reutilizar o servidor ativo sem conflito de porta.
