# FINDINGS — Etapa 9.1.15.2.1

## 1. Classificação dos Achados Auditados

| ID | Descrição | Classificação | Resumo |
|----|-----------|---------------|--------|
| `FINDING-01` | Proteção server-side em `/cybercrime-research/*` | **APROVADO** | `src/proxy.ts` + `evaluateProtectedRouteAccess()` + `src/app/cybercrime-research/layout.tsx` (`force-dynamic` + `requireServerAuthorization("active_member")`) bloqueiam acessos não autenticados, sem perfil, suspensos e falhas de conexão no servidor, preservando rotas públicas e redirecionamentos seguros. |
| `FINDING-04` | Feedback de falha no logout e consistência | **APROVADO COM RESSALVAS** | `performConsistentSignOut()` + `<SignOutErrorBanner />` diferenciam falha de servidor (`signOutError: true`) com retry e deduplicação `single-flight`. Ressalva menor: `syncClientSessionFromServer()` limpa `signOutError: false` ao iniciar/em `connection_error` (ex.: em evento `focus`), podendo ocultar o banner antes do retry. |
| `FINDING-05` | Cobertura e qualidade dos testes | **APROVADO COM RESSALVAS** | Testes comportamentais reais para `auth.ts` e `session-sync.ts` (incluindo concorrência, `single-flight`, `syncEpoch`, falha de logout e retry). Ressalva: validações de `layout.tsx` e `api/auth/logout/route.ts` ainda usam `assert.match` por regex e não há teste de renderização React para `<SignOutErrorBanner />`. |
| `FINDING-06` | Build (`npx next build --webpack`) / `EPERM` em `.next` | **NÃO VERIFICADO** *(pendente ambiental)* | `Get-Acl .next` confirma ausência de permissão `Write` para `DESKTOP-G3BH48T\CodexSandboxUsers` no sandbox. Build segue pendente de execução fora do sandbox restrito. |
