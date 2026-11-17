# Alterações Realizadas — Etapa 9.1.18.5.2

## Arquivos Modificados

### `e2e/auth/login.spec.ts`
1. **Teste `valida campos vazios e formato inválido sem quebrar a página`:**
   - Substituído seletor frágil baseado em classe CSS (`p.text-rose-400`) por asserções semânticas dentro de `main` usando os textos reais de `dict.auth.errors.invalidEmail` e `dict.auth.errors.passwordLength` (`pt-BR` / `en`).
2. **Teste `exibe erro genérico seguro ao tentar login com credenciais inválidas`:**
   - Adicionado `page.route("**/auth/v1/token*", ...)` retornando HTTP `400` com payload padrão do Supabase Auth (`{ error: "invalid_grant", error_description: "Invalid login credentials" }`).
   - Substituído o seletor CSS por asserção semântica dentro de `main` verificando a mensagem genérica segura (`dict.auth.errors.invalidCredentials`).
   - O fluxo completo no navegador (formulário real -> `handleSubmit` -> `loginWithSupabase` -> `fetch` do `@supabase/supabase-js` -> mapeamento de erro -> renderização na UI) continua sendo executado integralmente, porém sem depender de rede externa.

## Arquivos Não Modificados
- Nenhum arquivo em `src/` (código de produção) foi alterado.
- Nenhuma migration, política RLS, trigger, RPC, `.env.local`, `.env.e2e.local` ou configuração de navegador/Playwright foi alterada.
