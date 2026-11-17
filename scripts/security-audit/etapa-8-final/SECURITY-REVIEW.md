# Auditoria de Segurança — Etapa 8

1. **XSS:** Zero usos de `dangerouslySetInnerHTML` em `src/`. Conteúdos de moderação e auditoria são renderizados como nós de texto React.
2. **Open Redirect:** `getSafeRedirectPath()` valida caminhos relativos internos, bloqueia `//`, `\`, caracteres de controle, encodings iterados e loops em `/auth/callback`.
3. **Escalada de Privilégios / IDOR / BOLA:**
   - Rotas `/admin/*` e `/cybercrime-research/*` protegidas por `src/proxy.ts` + layouts server-side com `requireServerAuthorization`.
   - `/api/auth/session` valida `profile.id === user.id` e retorna `no-store`.
   - Zero uso de `service_role` em `src/`.
4. **Exposição de Dados Pessoais / Privacidade:**
   - `SimulatedAdminReportsService` mascara `reporterId` e `reporterUsername`; corrigida a página `/admin/reports/page.tsx` que ainda exibia `@${report.reporterUsername}` via serviço legado.
   - `sanitizeAuditMetadata()` redige chaves sensíveis (`password`, `token`, `secret`, `apiKey`, `credential`, `auth`, `hash`, `private_key`, `service_role`, `jwt`, `cookie`, `session`, `email`) e trata referências circulares.
5. **CSV Formula Injection:** `escapeCsvCell()` neutraliza `=`, `+`, `-`, `@`, `\t`, `\r`, `\n`, espaços iniciais seguidos de gatilho e caracteres de controle, preservando UTF-8 BOM.
6. **URLs Maliciosas:** `analyzeUrlSafety()` analisa links estaticamente (protocolos proibidos, userinfo `@`, Punycode, encurtadores, portas C2, redirects suspeitos e heurística defensiva de phishing) sem executar requisições externas.
7. **Uploads:** Não há endpoint ou fluxo de upload arbitrário ativo no painel administrativo auditado.
