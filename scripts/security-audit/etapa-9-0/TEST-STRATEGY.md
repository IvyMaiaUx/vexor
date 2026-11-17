# VEXOR — Etapa 9.0: Estratégia de Testes e Verificações

Este documento separa rigorosamente:
1. **Verificações locais não destrutivas executadas nesta sessão (Etapa 9.0)**;
2. **Estratégia de testes planejada para as Etapas 9.2 a 9.8**.

---

## 1. Verificações Executadas na Etapa 9.0 (Observadas)

| Comando / Script | Escopo | Resultado Observado | Observações |
| --- | --- | --- | --- |
| `npx tsc --noEmit` | Tipagem TypeScript global | **PASSOU** (exit code `0`) | 0 erros de tipo |
| `npx eslint .` | Lint de todo o repositório | **PASSOU** (exit code `0`) | 0 erros; 2 warnings em `scripts/security-audit/run-all-tests.mjs` (`L156`, `L193`: `e` não utilizado) |
| `node scripts\test-session-endpoint-etapa9-1-18-4.mjs` | Runtime SSR `/api/auth/session` (cenários offline/mock) | **PASSOU** (exit code `0`) | 7/7 cenários aprovados (sessão, não autenticado, `profile_missing`, `503`, suspenso, fail-closed) |
| `node scripts\test-profile-integration-etapa9-1-17.mjs` | Serviço de perfil `profile-service.ts` (mocks offline) | **PASSOU** (exit code `0`) | Leitura, atualização, bloqueio de campos proibidos e ciclo do modal aprovados |
| `node scripts\test-admin-etapa4.mjs` | Gestão de usuários e RBAC simulado | **PASSOU** (exit code `0`) | 7/7 verificações aprovadas (camada simulada) |
| `node scripts\test-admin-etapa5.mjs` | Central de auditoria e exportação CSV segura | **PASSOU** (exit code `0`) | 7/7 verificações aprovadas (camada simulada) |
| `node scripts\test-admin-etapa6.mjs` | Moderação, denúncias e `analyzeUrlSafety` | **PASSOU** (exit code `0`) | 8/8 verificações aprovadas (camada simulada) |
| `node scripts\test-cybercrime-research-etapa7.mjs` | Domínio, taxonomia, guard e fluxo local de pesquisa | **PASSOU** (exit code `0`) | 10/10 verificações aprovadas |
| `node scripts\test-audit-etapa8.mjs` | Auditoria geral estática e consistência | **PASSOU** (exit code `0`) | 8/8 módulos aprovados |
| `node scripts\test-supabase-infra-etapa9-1.mjs` | Infraestrutura Supabase e contagem de migrations | **FALHOU** (exit code `1`) | Passou 6/7 blocos (`[1/7]` a `[6/7]`); falhou em `[7/7]` porque o script verifica exatamente 3 migrations, mas existem 4 após a adição oficial de `20261113143000_security_hardening.sql`. |

> **Nota de escopo:** Os scripts `test-admin-etapa4.mjs`, `test-admin-etapa5.mjs`, `test-admin-etapa6.mjs`, `test-cybercrime-research-etapa7.mjs`, `test-audit-etapa8.mjs`, `test-profile-integration-etapa9-1-17.mjs` e `test-session-endpoint-etapa9-1-18-4.mjs` validam lógica local, mocks offline e renderização SSR; **não** executam queries contra o Supabase remoto.

---

## 2. Estratégia de Testes Planejada (Etapas 9.2–9.8)

### 2.1 Testes de Integração e RLS (Não Executados na Etapa 9.0)
- **Conta dedicada `member`:** validar que `member` só lê/edita o próprio perfil (colunas permitidas), não altera `role`/`is_suspended`, e recebe `42501` ao tentar RPCs administrativas (`admin_set_user_role`, `admin_set_user_suspension`, `moderate_*`, `resolve_report`).
- **Usuário suspenso (`is_suspended = true`):** validar que políticas baseadas em `is_active_member()` bloqueiam inserção em `resources`, `topics`, `posts`, `votes` e `bookmarks`.
- **Storage `avatars`:** validar upload apenas no prefixo `{user_id}/` e bloqueio de sobrescrita/remoção no diretório de outro usuário.
- **Auditoria `audit_logs`:** validar que `authenticated` não consegue `INSERT`/`UPDATE`/`DELETE` direto e que somente `admin` consegue `SELECT`.

### 2.2 Regras de Segurança Operacional para Testes Futuros
- Nunca usar `service_role` em código de aplicação ou testes de frontend.
- Nunca modificar ou reutilizar a conta real `admin` em testes destrutivos.
- Restaurar quaisquer registros de teste criados durante execuções remotas autorizadas.
- Atualizar `scripts/test-supabase-infra-etapa9-1.mjs` em etapa própria de código para reconhecer as 4 migrations oficiais.
