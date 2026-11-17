# Etapa 9.1.13 — Security Review

- **Data:** 2026-11-13

## Controles verificados

1. **Zero armazenamento de senha:** Nenhuma senha é salva em `localStorage`, `sessionStorage` ou logs.
2. **Ausência de `service_role`:** `register-service.ts` e `register/page.tsx` utilizam exclusivamente `createClient()` com variáveis `NEXT_PUBLIC_*`.
3. **Anti-enumeração de contas:** Tanto `user_already_exists` quanto `identities: []` retornam `confirmation_required` com a mesma mensagem neutra ("Se o endereço informado estiver elegível..."), evitando confirmar se um e-mail já está cadastrado.
4. **Prevenção de escalação de privilégio:** `options.data` envia apenas `username`, `display_name` e `preferred_locale`; `role` e `is_suspended` nunca são enviados pelo cliente.
5. **Prevenção de open redirect:** `nextPath` é sanitizado por `getSafeRedirectPath()` antes de compor `emailRedirectTo` e no redirecionamento direto.
6. **Validação alinhada ao PostgreSQL:** `displayName` obrigatório (`1..60` caracteres) e `username` (`^[a-z0-9_]{3,30}$`).
