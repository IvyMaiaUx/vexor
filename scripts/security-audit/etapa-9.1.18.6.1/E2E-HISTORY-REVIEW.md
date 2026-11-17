# Revisão do Histórico de Testes (9.1.18 a 9.1.18.6) — Etapa 9.1.18.6.1

Esta revisão separa estritamente as categorias de evidência acumuladas até o momento, sem confundir mocks, testes manuais e testes remotos automatizados.

| Categoria | O que foi executado | Evidência real obtida | Limitação |
|---|---|---|---|
| **Testes automatizados Node com mocks offline** | `9.1.13`, `9.1.14`, `9.1.18.4`, `9.1.15` (+`9.1.15.2.2`), `9.1.16`, `9.1.16.2`, `9.1.17` | Validam lógica de serviços, sanitização de redirects, contratos de rota (`/api/auth/session`, `/api/auth/logout`), layouts SSR e `ProfileEditModal` | Não executam contra o PostgreSQL/Supabase Auth remoto |
| **Testes Playwright no navegador (sem credenciais reais)** | `9.1.18.5`, `9.1.18.5.1`, `9.1.18.5.2` (13 aprovados, 7 ignorados, 0 falhos) | Validam UI real de `/register`, `/login`, `/forgot-password`, `/auth/reset-password`, `/profile` anônimo e bloqueio de `/admin*` e `/cybercrime-research`; erro de login inválido testado com `page.route` controlado em `**/auth/v1/token*` | Os 7 cenários autenticados ou com efeito externo (login válido, logout, sessão comum em recovery, e-mails, troca de senha, cadastro real, edição de perfil) estão **ignorados** |
| **Testes manuais informados pelo usuário** | Registrados na Etapa `9.1.18.1` (`MANUAL-E2E-EVIDENCE.md`) | Usuário confirmou manualmente cadastro + confirmação de e-mail, login/logout, recuperação/redefinição de senha e edição de perfil na aplicação conectada ao Supabase | Evidência manual não automatizada e não repetida para testes negativos de RLS (`UPDATE role` / `is_suspended`) |
| **Inspeção remota somente leitura** | Etapas `9.1.18.6` e `9.1.18.6.1` | Comprova migrations `4/4`, RLS habilitada, policies, ACLs por coluna (`role` e `is_suspended` excluídos), trigger `handle_new_user()` e contagem `1/1` | Somente leitura; não comprova execução em runtime via cliente `authenticated` |
| **Testes remotos autenticados de escrita/bloqueio RLS** | **Nenhum executado até o momento** | — | Pendentes (`T1`, `T2`, `T3`, `T4`) mediante conta `member` dedicada e autorização |
