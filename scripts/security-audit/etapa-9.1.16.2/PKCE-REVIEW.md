# PKCE-REVIEW — Etapa 9.1.16.2 (`REC-06`)

## 1. Contexto PKCE no Fluxo de Recuperação
- O fluxo PKCE com `@supabase/ssr` armazena o `code_verifier` em cookie no navegador onde `resetPasswordForEmail()` foi executado.
- **Incompatibilidade cross-browser / cross-device:** Se o usuário solicitar a recuperação em um navegador/dispositivo e abrir o link do e-mail em outro, `exchangeCodeForSession(code)` falhará por ausência do `code_verifier` correspondente, redirecionando com segurança para `/auth/reset-password?error=recovery_link_invalid`.
- **Recuperação de UX sem enfraquecer PKCE:** Na tela de erro `/auth/reset-password`, o usuário é orientado a solicitar um novo link via `/forgot-password` (abrindo-o no mesmo navegador onde realizou a solicitação). PKCE não foi enfraquecido.
