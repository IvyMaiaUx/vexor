# LOGOUT-HARDENING — Etapa 9.1.15.2 (FINDING-04)

## 1. Problema Identificado na Auditoria 9.1.15.1
O `FINDING-04` identificou ausência de feedback visual adequado ao usuário quando a chamada de logout falha por erro de rede ou indisponibilidade do servidor/Supabase, além da necessidade de permitir nova tentativa explícita sem comprometer a limpeza da sessão local.

## 2. Correções Aplicadas

### 2.1. Estado de Logout e Sincronização (`src/features/auth/session-sync.ts` e `src/features/auth/use-auth-store.ts`)
- Adicionados os campos `isSigningOut` e `signOutError` em `AuthSyncMeta` e `DEFAULT_AUTH_SYNC_META`.
- Atualizada a função `performConsistentSignOut()` para:
  - Manter deduplicação `single-flight` para evitar chamadas concorrentes/duplicadas de logout.
  - Incrementar a época de sincronização via `bumpSyncEpoch()` para invalidar respostas de sincronização anteriores em voo.
  - Limpar a sessão local da UI mesmo em caso de falha de rede, garantindo que áreas protegidas não permaneçam acessíveis no estado do cliente.
  - Registrar `signOutError: true` quando ocorrer falha de rede/servidor e limpar `signOutError: false` após retry bem-sucedido.
- Expostos `isSigningOut` e `signOutError` no store `useAuthStore`.

### 2.2. Internacionalização (`src/lib/i18n/dictionaries.ts`)
- Adicionadas as chaves `auth.retrySignOut` e `auth.errors.logoutFailed` nos dicionários `pt-BR` e `en`.

### 2.3. Feedback Visual e Retry (`src/components/auth/sign-out-error-banner.tsx`)
- Criado o componente `<SignOutErrorBanner dict={dict} />` com `role="alert"`.
- Exibe a mensagem `dict.auth.errors.logoutFailed` e um botão de nova tentativa (`dict.auth.retrySignOut`), desabilitado enquanto `isSigningOut` estiver ativo.
- Integrado em `src/components/layout/header.tsx` e `src/features/admin/components/admin-layout-shell.tsx`.

## 3. Verificação
- Validado no bloco `Test 13b` de `scripts/test-session-auth-etapa9-1-15.mjs`, cobrindo falha no logout (`signOutError: true` + limpeza local), deduplicação de chamadas concorrentes e nova tentativa bem-sucedida (`signOutError: false`).
