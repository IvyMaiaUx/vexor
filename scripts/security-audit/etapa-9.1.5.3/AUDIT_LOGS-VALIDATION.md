# VEXOR — ETAPA 9.1.5.3: VALIDAÇÃO DA ESTRATÉGIA DE `public.audit_logs`

**Artefato auditado:** `scripts/security-audit/etapa-9.1.5.2/PROPOSED-AUDIT-LOGS-STRATEGY.md` (`SHA-256: 061052703F1E9B94B9FD916DAB987D0B2D262429F53B56BD3AAC875BF4051DF1`).

---

## 1. Avaliação Técnica da Alternativa C

A **Alternativa C** propõe manter `public.audit_logs.actor_id` como `uuid` sem chave estrangeira (`audit_logs_actor_id_fkey` removida), preservando o UUID histórico de forma imutável.

### Pontos Validados por Inspeção
1. **Preservação de `append-only`:** o trigger `audit_logs_no_update_delete` (`20261110000002_functions_triggers.sql`) bloqueia `BEFORE DELETE OR UPDATE ON public.audit_logs` com `SQLSTATE 42501`. Na definição original (`20261110000001_schema.sql`), `ON DELETE SET NULL` disparava um `UPDATE` implícito bloqueado pelo próprio trigger, impedindo a exclusão de qualquer usuário com histórico em `audit_logs`. Sem a FK, `audit_logs` permanece 100% imutável.
2. **Segurança de `write_audit_log`:** em `20261110000002_functions_triggers.sql` e `20261110000003_rls_and_grants.sql`, `public.write_audit_log` é `SECURITY DEFINER`, possui `SET search_path = ''`, deriva o ator internamente via `auth.uid()` (não aceita `actor_id` por parâmetro) e tem execução revogada de `PUBLIC`, `anon` e `authenticated`. Assim, não há risco de falsificação arbitrária de `actor_id` por clientes mesmo sem FK no banco.
3. **Privacidade e LGPD:** após a exclusão de `auth.users` e `public.profiles`, permanecem em `audit_logs` apenas o UUID opaco (`actor_id`), ação, alvo e metadados operacionais da moderação, sem retenção de email, nome de exibição ou biografia do perfil excluído (salvo eventual dado textual inserido manualmente em `metadata` ou `reason`).
4. **Compatibilidade com registros órfãos existentes:** no banco local `vexor_audit`, a auditoria da Etapa 9.1.5.1 (`result-9.1.5.1-independent-audit.json`) registrou `orphan_audit_actors_count = 21`, decorrentes de exclusões experimentais de usuários de teste. A Alternativa C acomoda naturalmente esse estado sem perda de histórico.

---

## 2. Riscos Residuais e Dependências

1. **Decisão arquitetural explícita:** como `actor_id` deixa de ter FK para `public.profiles(id)`, consultas futuras de UI/relatórios que façam `JOIN public.profiles` sobre `audit_logs` devem usar `LEFT JOIN` para não ocultar eventos de contas excluídas.
2. **Rollback com dados históricos:** caso seja necessário reverter para o schema com FK após exclusão de contas (como ocorreu com os `21` registros órfãos em `vexor_audit`), a recriação da FK exige `NOT VALID` para não falhar nem exigir remoção de histórico (validado em `PROPOSED-ROLLBACK-COMPLETE.sql`, resultando em `audit_logs_actor_id_fkey|validated=false`).
3. **Aprovação formal:** a adoção definitiva da Alternativa C (em detrimento da Alternativa D, com tabela/coluna de tombstones) depende de aprovação do responsável pelo projeto antes da criação da migration definitiva.
