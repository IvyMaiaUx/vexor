# Avaliação de Riscos — Etapa 9.1.18.6

## 1. Achado Crítico de Planejamento: Única Conta Atual é `admin`
- A inspeção remota revelou que existe apenas **1 usuário** em `auth.users` e `public.profiles`, com `role = 'admin'` e `is_suspended = false`.
- **Risco:** executar T1, T2 ou T3 com essa conta invalidaria o teste de "usuário comum (`member`)" e colocaria em risco a única conta administrativa ativa do projeto.
- **Mitigação:** exigir uma conta dedicada com `role = 'member'` antes de executar T1–T3.

## 2. Risco de Disparo de E-mails / Rate Limit (T4)
- O cadastro real (`signUp`) dispara e-mail de confirmação via Supabase Auth e está sujeito a limites de taxa (rate limit).
- **Mitigação:** manter T4 bloqueado por padrão (`E2E_ALLOW_EMAILS=false`) e executá-lo apenas uma única vez com endereço isolado autorizado.

## 3. Risco de Falso Positivo por Erro de Rede ou Autenticação
- Uma falha de rede, token expirado (`401`) ou erro de sintaxe no cliente pode retornar erro sem que o Postgres/RLS tenha sido efetivamente testado.
- **Mitigação:** validar explicitamente o código de erro SQL/PostgREST (`42501` / `permission denied`) e confirmar via leitura independente que a sessão está autenticada (`T3` passando confirma sessão ativa e conectividade).

## 4. Risco de Uso Indevido de `service_role` ou Role `postgres`
- Consultas como `postgres` ou `service_role` ignoram RLS (`BYPASSRLS`) e não comprovam bloqueio para `authenticated`.
- **Mitigação:** todos os testes de bloqueio/permissão (T1–T3) devem usar exclusivamente `NEXT_PUBLIC_SUPABASE_ANON_KEY` + JWT real da conta `member`.
