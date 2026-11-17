# Análise da Divergência da Conta de Teste — Etapa 9.1.18.6.1

## 1. Pergunta Investigada
Por que a inspeção remota da Etapa 9.1.18.6 encontrou apenas **1 conta** em `auth.users` / `public.profiles`, e com `role = 'admin'`, sendo que anteriormente o usuário havia criado manualmente uma conta de teste durante a validação dos fluxos de autenticação?

## 2. Evidências Coletadas

### Evidência A — Alinhamento de Projeto
- `.env.local`, `supabase/config.toml`, `supabase/.temp/project-ref` e o vínculo do CLI (`npx supabase migration list --remote`) apontam todos para o mesmo projeto `Vexor` (`zcjudcbckcxwnfnrjfte`).
- **Descartado:** não se trata de outro projeto Supabase nem de divergência de ambiente entre frontend e Playwright.

### Evidência B — Histórico Documentado da Etapa 9.1.18.1
- O registro em `scripts/security-audit/etapa-9.1.18.1/MANUAL-E2E-EVIDENCE.md` (seção 1, item 4) documenta que a conta criada manualmente nos testes de cadastro/login/recuperação/perfil foi **posteriormente promovida para `role = 'admin'` no Supabase** para validação do badge e dos fluxos administrativos.

### Evidência C — Estado Agregado do Banco Remoto (`zcjudcbckcxwnfnrjfte`)
- `total_users = 1`, `confirmed_users = 1`, `total_profiles = 1`, `users_without_profile = 0`.
- `earliest_user_date = 2026-11-14`, `latest_user_date = 2026-11-14`.
- Distribuição atual: 1 perfil com `role = 'admin'` e `is_suspended = false`; 0 perfis `member`.
- `audit_logs`: `0` registros.

## 3. Conclusão (Evidência vs. Hipótese)
- **Confirmado por evidência documental e de banco:** a única conta presente hoje no projeto `zcjudcbckcxwnfnrjfte` corresponde à conta criada em `2026-11-14` que recebeu promoção manual para `admin`. Não há erro de ambiente nem perda silenciosa de sincronização entre `auth.users` e `public.profiles`.
- **Implicação operacional:** como essa conta agora é o único `admin` ativo do projeto, ela **não pode** ser usada para simular um usuário comum (`member`) nos futuros testes de RLS/privilégios (`T1`, `T2`, `T3`).
