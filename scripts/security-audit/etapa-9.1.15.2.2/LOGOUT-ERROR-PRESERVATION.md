# LOGOUT-ERROR-PRESERVATION — Etapa 9.1.15.2.2

## 1. Problema Identificado
Na auditoria 9.1.15.2.1, verificou-se que `syncClientSessionFromServer()` em `src/features/auth/session-sync.ts` redefinia `signOutError` para `false` logo no início da sincronização (estado `isLoading: true`) e nos retornos baseados em `DEFAULT_AUTH_SYNC_META` (incluindo `connection_error`, `profile_missing`, `authenticated`, `demo` e `unauthenticated`).

Além disso, durante a criação dos testes comportamentais do `<SignOutErrorBanner />`, identificou-se que `performConsistentSignOut()` também zerava `signOutError: false` ao iniciar um retry (`isSigningOut: true`), fazendo o componente `<SignOutErrorBanner />` retornar `null` durante o retry em vez de manter o botão de retry visível e desabilitado (`disabled={isSigningOut}`).

## 2. Correções Aplicadas em `src/features/auth/session-sync.ts`
1. **`syncClientSessionFromServer()`:**
   - Passou a preservar `signOutError: prevMeta.signOutError` tanto na gravação inicial (`isLoading: true`) quanto em todos os ramos de conclusão/erro (`connection_error`, `profile_missing`, `mappedProfile`, `demo`, `unauthenticated` e `catch`).
   - Assim, sincronizações automáticas por foco, visibilidade, `onAuthStateChange` ou falha de rede não ocultam o aviso de falha de logout enquanto o usuário não concluir um novo logout ou realizar ação explícita de login.
2. **`performConsistentSignOut()`:**
   - Passou a ler `const prevMeta = readSyncMeta(storage)` e manter `signOutError: prevMeta.signOutError` enquanto `isSigningOut: true` está em execução.
   - Em um logout inicial normal (`prevMeta.signOutError === false`), o banner de erro não aparece durante o loading; em um retry após falha (`prevMeta.signOutError === true`), o banner permanece visível com o botão desabilitado (`disabled={isSigningOut}`) até a conclusão, limpando `signOutError: false` apenas quando `networkError === false`.
3. **Preservação de garantias:**
   - Mantidos integralmente `inFlightSync`, `inFlightSignOut` (`single-flight`), `syncEpoch`, `bumpSyncEpoch()`, limpeza imediata de `SESSION_STORAGE_KEY`/`AUTH_MODE_STORAGE_KEY` no logout e ausência de fallback para `DEMO_PROFILES`.
