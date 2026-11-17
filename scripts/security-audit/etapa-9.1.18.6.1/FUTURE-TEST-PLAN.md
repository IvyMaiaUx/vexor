# Plano Técnico para Testes Futuros — Etapa 9.1.18.6.1

> Nenhum destes testes foi executado nesta etapa. A execução depende da existência de uma conta dedicada `member` e de autorização explícita.

## T1 — Proteção de `role`
- **Pré-requisitos:** Conta dedicada `member` confirmada, configurada em `.env.e2e.local` (`E2E_EMAIL`/`E2E_PASSWORD`); chave pública (`NEXT_PUBLIC_SUPABASE_ANON_KEY`).
- **Conta necessária:** Usuário comum (`role = 'member'`, `is_suspended = false`) — **nunca** usar a conta `admin`.
- **Operação realizada:** Autenticar via `signInWithPassword` e executar `supabase.from("profiles").update({ role: "admin" }).eq("id", user.id)`.
- **Resultado esperado:** Operação bloqueada pelo PostgreSQL/PostgREST com código `42501` (`permission denied for table profiles` / coluna `role` sem `GRANT UPDATE`).
- **Como comprovar:** Verificar `error.code === "42501"` (distinguindo de erro de rede/401) e confirmar em leitura independente que `role === 'member'` permaneceu inalterado.
- **Restauração:** Nenhuma escrita esperada. Caso `role` seja alterado (falha crítica), abortar suíte e reverter manualmente.
- **Riscos:** Uso acidental da conta `admin` invalidaria o teste; erro de rede pode gerar falso negativo.
- **Critério de interrupção:** Falha de login ou alteração inesperada de `role`.

## T2 — Proteção de `is_suspended`
- **Pré-requisitos:** Mesma conta `member` dedicada e sessão ativa com chave `anon`.
- **Conta necessária:** Usuário comum (`role = 'member'`, `is_suspended = false`).
- **Operação realizada:** Executar `supabase.from("profiles").update({ is_suspended: true }).eq("id", user.id)`.
- **Resultado esperado:** Bloqueio com código `42501` (`permission denied`).
- **Como comprovar:** Verificar `error.code === "42501"` e leitura independente confirmando `is_suspended === false`.
- **Restauração:** Nenhuma escrita esperada.
- **Riscos / Interrupção:** Se `is_suspended` mudar para `true`, interromper imediatamente e reverter.

## T3 — Atualização legítima de perfil
- **Pré-requisitos:** Conta `member` dedicada; snapshot prévio de `display_name`, `bio` e `preferred_locale`.
- **Conta necessária:** Usuário comum (`role = 'member'`, `is_suspended = false`).
- **Operação realizada:** Atualizar `display_name`, `bio` e `preferred_locale` com valores temporários via `supabase.from("profiles").update(...)` (e/ou fluxo real de `/profile` no Playwright).
- **Resultado esperado:** Sucesso (`error: null`, HTTP `200`/`204`) e persistência após nova leitura / `page.reload()`.
- **Como comprovar:** Leitura independente retornando exatamente os valores temporários gravados.
- **Restauração:** Restaurar `display_name`, `bio` e `preferred_locale` originais em bloco `try ... finally` e confirmar igualdade ao snapshot inicial.
- **Riscos:** Interrupção abrupta antes do `finally` deixaria valores temporários na conta de teste.
- **Critério de interrupção:** Erro inesperado na restauração ou perda de sessão durante o teste.

## T4 — Cadastro automatizado isolado (trigger `handle_new_user()`)
- **Pré-requisitos:** Autorização específica para envio de e-mail (`E2E_ALLOW_EMAILS=true`), endereço dedicado isolado (`E2E_SIGNUP_EMAIL`) que não colida com a conta `admin`, e janela livre de rate limit.
- **Conta necessária:** Nova conta isolada a ser criada via `supabase.auth.signUp`.
- **Operação realizada:** Executar cadastro via frontend/cliente público enviando `username` e `display_name` nos metadados (e opcionalmente testando que tentativa de `role: 'admin'` nos metadados é ignorada).
- **Resultado esperado:** Usuário criado em `auth.users`, e trigger `on_auth_user_created` (`handle_new_user()`) cria automaticamente 1 linha em `public.profiles` com `id = auth.users.id`, `role = 'member'`, `is_suspended = false`.
- **Como comprovar:** Consulta somente leitura verificando `profiles.id = auth.users.id`, `role = 'member'`, `is_suspended = false`.
- **Restauração (limpeza posterior):** Procedimento aprovado de remoção exclusiva da conta isolada em `auth.users` (com remoção em cascata em `public.profiles`), preservando integralmente a conta `admin` existente.
- **Riscos:** Envio real de e-mail de confirmação, rate limit de Auth/SMTP e permanência de conta órfã se a limpeza falhar.
- **Critério de interrupção:** Rate limit (`429`), falha de criação de perfil pelo trigger ou erro no procedimento de limpeza.
