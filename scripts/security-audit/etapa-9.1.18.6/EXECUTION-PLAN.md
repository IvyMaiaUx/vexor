# Plano de Execução Controlada — Etapa 9.1.18.6

## Pré-requisitos Obrigatórios antes de Executar
1. **Autorização explícita do usuário** para testes remotos com escrita/autenticação real.
2. **Criação/configuração de conta de teste `member` dedicada** (não usar a única conta `admin` existente no banco remoto para testes de usuário comum ou mutações de perfil).
3. Credenciais da conta `member` informadas apenas em `.env.e2e.local` (ignorado pelo Git, nunca versionado nem exibido em logs).
4. Para o teste T4 (trigger), autorização explícita adicional com `E2E_ALLOW_EMAILS=true` e `E2E_SIGNUP_EMAIL` isolado.

## Ordem Segura de Execução (Futura Etapa)
1. **Pré-checagem (somente leitura):** registrar snapshot de `total_users`, `total_profiles` e estado inicial da conta `member` (`role`, `is_suspended`, `bio`, `display_name`).
2. **T1 e T2 (bloqueio de `role` e `is_suspended`):** autenticar como `member` via `NEXT_PUBLIC_SUPABASE_ANON_KEY`, executar `UPDATE` em `role` e `is_suspended`, distinguir explicitamente código `42501` (bloqueio SQL/RLS) de falhas de rede/auth (`401`/timeout), e confirmar ausência de mutação.
3. **T3 (atualização permitida):** atualizar `bio` com valor temporário, validar leitura independente e restaurar o valor original em `finally`.
4. **T4 (trigger `handle_new_user()` — somente se autorizado):** executar `signUp` isolado (incluindo tentativa de `role: 'admin'` nos metadados para validar ignorância pelo trigger), verificar paridade `profiles.id = auth.users.id` e `role = 'member'`, e executar o plano de limpeza da conta isolada.
5. **Pós-checagem (somente leitura):** confirmar que a conta `admin` existente não sofreu qualquer alteração e que a contagem final de usuários/perfis corresponde ao esperado.
