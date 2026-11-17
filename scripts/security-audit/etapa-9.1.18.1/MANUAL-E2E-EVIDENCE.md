# MANUAL E2E EVIDENCE — ETAPA 9.1.18.1

Data: 2026-11-14  
Escopo: Registro das evidências de testes manuais informados pelo usuário e das verificações de navegador observadas durante a sessão na aplicação Vexor (`http://localhost:3000`).

> **Nota metodológica:** Testes manuais informados pelo usuário são registrados explicitamente como **evidência manual informada pelo usuário**, não como suíte automatizada executada pela IDE.

---

## 1. Fluxos Funcionais Validados Manualmente pelo Usuário

O usuário informou que os seguintes fluxos funcionaram manualmente contra o ambiente conectado ao Supabase:

1. **Cadastro e confirmação de e-mail**
   - Conta de teste dedicada criada via fluxo da aplicação (`maia.operacional@gmail.com`).
   - E-mail de confirmação recebido e confirmado pelo usuário.
   - Criação automática do perfil em `public.profiles` via trigger do banco validada pela disponibilidade subsequente do perfil na aplicação.
2. **Login e logout**
   - Usuário informou login bem-sucedido na aplicação (`"eu consegui logar aqui de boa"`) e validação do fluxo de saída.
3. **Recuperação e redefinição de senha**
   - Usuário informou recebimento do e-mail *Reset your password* (`"tb chegand de boa"`) e conclusão da redefinição de senha.
   - Em tentativa com link inválido/expirado, a tela `Set New Password` exibiu corretamente o bloqueio: *"Invalid or expired recovery link — We could not verify an active password recovery session. Please request a new recovery link."*
4. **Edição de perfil**
   - Usuário informou funcionamento da edição de perfil na interface real (e posteriormente validou visualmente o badge do perfil `@ivymaia` e sua promoção para `admin` no Supabase).

---

## 2. Verificações em Navegador Observadas na Sessão (Sem Sessão Autenticada)

Durante a auditoria da página inicial pública (`http://localhost:3000`), foi observado no navegador real sem sessão ativa:

- `/` carregou diretamente (`HTTP 200`) exibindo a landing page do Vexor e os botões `Sign In` (`/login`) e `Sign Up` (`/register`).
- `/admin` redirecionou para `/login?next=%2Fadmin` (`HTTP 307`).
- `/cybercrime-research` redirecionou para `/login?next=%2Fcybercrime-research` (`HTTP 307`).

---

## 3. Lacunas de Evidência Remota Automatizada (Não Executadas Nesta Etapa)

- Não há suíte E2E automatizada (Playwright/Cypress) executando esses 12 cenários de ponta a ponta em CI/local.
- Não foram executados testes negativos diretos contra o Supabase remoto nesta etapa (ex.: tentativa via API/SQL anônimo ou usuário autenticado tentando alterar `role`/`is_suspended` diretamente em `public.profiles` para comprovar RLS em runtime remoto), conforme restrição de não alterar ou repetir operações remotas desnecessariamente.
