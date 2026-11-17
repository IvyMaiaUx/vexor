# Etapa 9.1.12 — Auth Callback Implementation

- **Data:** 2026-11-13
- **Arquivos criados:**
  - `src/lib/security/redirect.ts`
  - `src/app/auth/callback/route.ts`

## 1. Helper de redirecionamento seguro (`src/lib/security/redirect.ts`)

- Exporta `getSafeRedirectPath(target, defaultPath = "/catalog")`.
- Aceita exclusivamente caminhos relativos iniciados por uma única `/`.
- Rejeita `null`, `undefined`, strings vazias, URLs absolutas (`https://...`), protocol-relative (`//...`), backslashes (`\`), caracteres de controle (`\x00-\x1f`, `\x7f`) e loops para `/auth/callback`.

## 2. Route Handler (`src/app/auth/callback/route.ts`)

- Exporta `GET(request: NextRequest)`.
- Valida presença de `code` e ausência de parâmetro `error`.
- Chama `await createClient()` (server por requisição) e `await supabase.auth.exchangeCodeForSession(code)`.
- Em caso de erro, código ausente ou falha de troca de sessão, redireciona para `/login?error=auth_callback_failed` sem expor detalhes técnicos ou mensagens brutas na URL.
- Em caso de sucesso, redireciona para `new URL(safeNext, request.url)`.
