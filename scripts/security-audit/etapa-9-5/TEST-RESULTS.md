# VEXOR — Etapa 9.5: Resultados de Testes e Regressões

Todos os testes abaixo foram executados após as alterações finais da Etapa 9.5, utilizando mocks offline/ambiente local isolado (sem escritas no Supabase remoto).

---

## 1. Suíte Dedicada da Etapa 9.5 (`node scripts\test-notifications-reports-etapa9-5.mjs`)

**Resultado:** **PASSOU** (exit code `0`)

- **1, 3, 4 & 5:** Listagem própria de notificações, paginação via `.range`, ordenação descendente por `created_at`, resolução de links internos e contagem de não lidas.
- **2:** Estado vazio de notificações.
- **6, 7, 8, 9 & 10:** Marcar uma notificação como lida (enviando apenas `read_at`), marcar todas como lidas, bloqueio de acesso cruzado (`requestedUserId !== user.id`), rejeição de manipulação de destinatário (`user_id`) e tratamento de erro de conexão.
- **11, 12, 13, 14 & 22:** Criação de denúncia para `topic`, `post`, `resource` e `profile`, enviando apenas as 6 colunas concedidas, e proteção da identidade do denunciante na resposta pública.
- **15–21, 23 & 25:** Bloqueio de não autenticado, anti-spoofing de `reporter_id` e `status`, validação do enum `report_reason`, alvo inválido/inexistente (`23503`), duplicidade (`23505`), bloqueio de consulta de denúncias alheias e tratamento de erros do Supabase.
- **24:** Verificação dos guardas single-flight em `notification-bell.tsx` e `report-modal.tsx`.

---

## 2. Análise Estática e Regressões

| Comando | Resultado | Observações |
| --- | --- | --- |
| `npx tsc --noEmit` | **PASSOU** (exit code `0`) | 0 erros |
| `npx eslint .` | **PASSOU** (exit code `0`) | 0 erros; 2 warnings pré-existentes em `scripts/security-audit/run-all-tests.mjs` (`L156`, `L193`) |
| `node scripts\test-forum-integration-etapa9-4.mjs` | **PASSOU** (exit code `0`) | Integração do fórum aprovada |
| `node scripts\test-catalog-integration-etapa9-3.mjs` | **PASSOU** (exit code `0`) | Catálogo e favoritos aprovados |
| `node scripts\test-avatar-upload-etapa9-2.mjs` | **PASSOU** (exit code `0`) | 13/13 cenários de upload de avatar aprovados |
| `node scripts\test-profile-integration-etapa9-1-17.mjs` | **PASSOU** (exit code `0`) | Integração de perfil aprovada |
| `node scripts\test-session-endpoint-etapa9-1-18-4.mjs` | **PASSOU** (exit code `0`) | 7/7 cenários de `/api/auth/session` aprovados |
| `node scripts\test-admin-etapa6.mjs` | **PASSOU** (exit code `0`) | 8/8 verificações administrativas aprovadas |
| `node scripts\test-audit-etapa8.mjs` | **PASSOU** (exit code `0`) | 8/8 módulos da auditoria geral aprovados |

> **Nota sobre build de produção:** `next build` não foi reexecutado na Etapa 9.5 devido à restrição já observada do sandbox Windows (Turbopack / `EPERM` em `.next`).
> **Nota sobre RLS:** Testes com mocks offline não comprovam a segurança real das policies RLS no PostgreSQL remoto em runtime.
