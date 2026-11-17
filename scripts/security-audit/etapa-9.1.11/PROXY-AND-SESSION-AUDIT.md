# Etapa 9.1.11 — Proxy and Session Audit

- **Data:** 2026-11-13
- **Arquivo analisado:** `src/proxy.ts` (não há `src/middleware.ts` legado).

## 1. Implementação atual de `src/proxy.ts`

- Exporta `updateSession(request: NextRequest)`, `proxy(request: NextRequest)` e `export default proxy` + `config.matcher`, compatível com Next.js `16.4.6`.
- Cria `createServerClient<Database>` usando `request.cookies.getAll()` e propagando `setAll` tanto para `request.cookies` quanto para `response.cookies`.
- Chama `await supabase.auth.getUser()` para validar o JWT no servidor Auth e renovar tokens expirados.
- `matcher` exclui `_next/static`, `_next/image`, `favicon.ico` e extensões de imagem/SVG.

## 2. Lacunas identificadas no `src/proxy.ts`

1. **Ausência de proteção de rotas privadas no proxy:** `updateSession` apenas renova cookies e retorna `NextResponse.next()` para qualquer rota, permitindo que requisições anônimas cheguem diretamente a `/admin/*`, `/profile`, `/my-contributions`, `/catalog/submit`, `/catalog/bookmarks` e `/forum/new`.
2. **Ausência de verificação de `is_suspended` ou `role` no proxy/servidor:** Como páginas administrativas e de usuário são Client Components (`"use client"`), não há bloqueio SSR prévio.
3. **Ausência de rota `/auth/callback` ou `/auth/confirm`:** Necessária para troca de `code` PKCE / verificação de `token_hash` (confirmação de e-mail e recuperação de senha).
4. **Lembrete arquitetural:** Mesmo após adicionar redirecionamentos no `src/proxy.ts`, Server Components, Server Actions e Route Handlers devem revalidar `getUser()`/`getClaims()` e confiar na RLS do PostgreSQL como camada definitiva.
