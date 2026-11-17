# LOGOUT-INDEPENDENT-AUDIT — Etapa 9.1.15.2.1 (FINDING-04)

**Classificação:** **APROVADO COM RESSALVAS**

## 1. Arquivos e Funções Inspecionados
- `src/features/auth/session-sync.ts`: `performConsistentSignOut()`, `syncClientSessionFromServer()`, `bumpSyncEpoch()`, `readSyncMeta()`, `writeSyncMeta()`
- `src/features/auth/use-auth-store.ts`: `useAuthStore()`, `signOut()`, `refreshSession()`
- `src/components/auth/sign-out-error-banner.tsx`: `SignOutErrorBanner`
- `src/components/auth/auth-session-sync.tsx`: `AuthSessionSync`
- `src/components/layout/header.tsx`: integração de `<SignOutErrorBanner dict={dict} />` e chamada `signOut()`
- `src/features/admin/components/admin-layout-shell.tsx`: integração de `<SignOutErrorBanner dict={dict} />`
- `src/app/api/auth/logout/route.ts`: `POST()`
- `src/lib/i18n/dictionaries.ts`: `auth.retrySignOut` e `auth.errors.logoutFailed` (`pt-BR` e `en`)

## 2. Análise Ponto a Ponto

| # | Requisito | Status | Evidência Observada |
|---|-----------|--------|---------------------|
| 1 | Logout bem-sucedido | OK | `performConsistentSignOut()` chama `bumpSyncEpoch()`, remove `SESSION_STORAGE_KEY` e `AUTH_MODE_STORAGE_KEY`, executa `POST /api/auth/logout` (`supabase.auth.signOut()`) e `clientSignOut()`, e grava `isSigningOut: false, signOutError: false`. |
| 2 | Falha na invalidação da sessão SSR | OK (com ressalva) | Se `POST /api/auth/logout` retornar status != 2xx ou lançar erro, `networkError` torna-se `true` e `signOutError: true` é gravado no `AUTH_SYNC_META_KEY`. |
| 3 | Estado local após falha | OK (com ressalva) | A sessão visual local (`SESSION_STORAGE_KEY` e `AUTH_MODE_STORAGE_KEY`) é limpa para não exibir estado autenticado nem conceder UI protegida, enquanto `signOutError: true` sinaliza explicitamente que a confirmação no servidor falhou. |
| 4 | Possibilidade de nova tentativa | OK | `<SignOutErrorBanner />` (`role="alert"`) exibe botão de retry (`dict.auth.retrySignOut`) que aciona `void signOut()`, ficando `disabled={isSigningOut}` durante a execução. |
| 5 | Deduplicação de chamadas concorrentes | OK | `inFlightSignOut` garante `single-flight` em `performConsistentSignOut()`, evitando múltiplas requisições simultâneas a `/api/auth/logout` ou `clientSignOut()`. |
| 6 | Invalidação de sincronizações antigas | OK | `bumpSyncEpoch()` é chamado no início de `performConsistentSignOut()`; `syncClientSessionFromServer()` compara `syncEpoch !== startEpoch` (linhas 167 e 234) e descarta respostas obsoletas. |
| 7 | Consistência entre cookies SSR e estado visual | Ressalva menor | Ver Seção 3 abaixo. |
| 8 | Mensagens exibidas ao usuário | OK | `pt-BR`: `"Não foi possível confirmar o encerramento da sessão no servidor. Tente sair novamente."`; `en`: `"Unable to confirm sign-out with the server. Please try signing out again."` |
| 9 | Comportamento quando a rede fica indisponível | OK | Exceções de rede em `serverLogout` ou `clientSignOut` são capturadas sem throw, marcando `signOutError: true` e mantendo `ok: false, networkError: true`. |
| 10 | Ausência de exposição de informações sensíveis | OK | `POST /api/auth/logout` retorna apenas `{ ok: false, error: "logout_failed" }` com `Cache-Control: no-store`; o banner exibe apenas texto i18n estático. |

## 3. Avaliação Especial: Cookies SSR vs Estado Visual do Cliente
1. **Diferenciação de estados:** A implementação **diferencia** os estados via `signOutError: true` e exibe aviso claro de que não foi possível confirmar o encerramento da sessão no servidor. Além disso, se a página for recarregada ou revalidada enquanto o cookie SSR ainda estiver válido no servidor, `AuthSessionSync` (`syncClientSessionFromServer`) consultará `GET /api/auth/session` e restaurará o estado real do servidor em vez de tratar a sessão como definitivamente encerrada no backend.
2. **Ressalva observada (`session-sync.ts:159` e `:173`):**
   - Quando `syncClientSessionFromServer()` inicia (por exemplo, disparado automaticamente por `AuthSessionSync` em evento `focus` ou `visibilitychange`), a linha 159 grava `signOutError: false`. Se essa sincronização também falhar por erro de rede (`connection_error`, linha 173), `DEFAULT_AUTH_SYNC_META` mantém `signOutError: false`.
   - **Impacto:** Se o logout falhar por indisponibilidade de rede e o usuário trocar de aba e voltar (`focus`) antes de clicar em "Tentar sair novamente", o `AuthSessionSync` executará `refreshSession()` e apagará `signOutError: true`, ocultando o `<SignOutErrorBanner />` mesmo sem o logout no servidor ter sido confirmado.
3. **Ressalva de cobertura de UI:** `<SignOutErrorBanner />` foi montado em `Header` e `AdminLayoutShell`; páginas sem `Header` (se houver redirecionamento imediato para `/login`) não exibem o banner enquanto estiverem fora dessas duas cascas.
