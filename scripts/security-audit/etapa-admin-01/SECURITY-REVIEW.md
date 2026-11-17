# ETAPA 1 — REVISÃO DE SEGURANÇA (`SECURITY-REVIEW.md`)

**Projeto:** VEXOR  
**Escopo:** Camada de dados e serviços da Etapa 1 (execução local em memória)

## 1. Limites da Segurança no Cliente/Serviço Simulado

- As validações de RBAC na camada modular (`hasAdminAccess`, `hasModeratorAccess`, bloqueio de auto-rebaixamento, bloqueio de auto-suspensão, obrigatoriedade de justificativa e registro de auditoria) são **controles lógicos de aplicação em memória**.
- A segurança efetiva continua dependendo exclusivamente do servidor, das RPCs `SECURITY DEFINER` e das políticas RLS no PostgreSQL/Supabase.

## 2. Verificações Realizadas

- **Hierarquia estrita de papéis:** apenas `member`, `moderator` e `admin`; ausência total de `root_admin`.
- **Não exposição de PII privada:** `AdminUser` não possui campo `email`.
- **Proteção contra escalação/auto-punição lógica:**
  - `member`, `moderator` e `admin` suspenso recebem negação (`42501`) ao tentar alterar papel ou suspender usuário.
  - `admin` não pode rebaixar ou suspender a si mesmo.
  - Suspensão sem justificativa é rejeitada.
  - Rejeição de recurso sem motivo é rejeitada.
- **Auditoria e sanitização:** mutações geram entradas via `appendAudit` utilizando `sanitizeAuditMetadata()`.
- **Integridade de produção e auth:** `useAuthStore`, fluxos de autenticação, migrations, RLS, policies, GRANTs, triggers e arquivos `.env*` não foram alterados.
