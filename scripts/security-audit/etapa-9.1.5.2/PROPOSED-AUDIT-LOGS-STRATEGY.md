# VEXOR — ETAPA 9.1.5.2: ESTRATÉGIA DE INTEGRIDADE DE `public.audit_logs` (RESSALVA B)

## Contexto Técnico Verificado
- Na Migration 01 (`20261110000001_schema.sql`), `public.audit_logs.actor_id` foi definido com `references public.profiles (id) on delete set null`.
- Na Migration 02 (`20261110000002_functions_triggers.sql`), `audit_logs_no_update_delete` (`BEFORE DELETE OR UPDATE ON public.audit_logs`) bloqueia qualquer `UPDATE` ou `DELETE` com `42501: audit_logs is append-only`.
- Consequência comprovada na Etapa 9.1.3.7 e 9.1.5: ao excluir qualquer conta que possua registros em `audit_logs`, o `ON DELETE SET NULL` dispara `UPDATE public.audit_logs SET actor_id = NULL`, que é bloqueado pelo trigger append-only. No banco local `vexor_audit`, após a remoção experimental da FK, existem `21` registros históricos cujo `actor_id` pertence a contas de teste já removidas (`orphan_audit_actors_count = 21`).

---

## Comparação Formal das Alternativas

| Critério | Alt. A: Manter FK com bloqueio de exclusão (`NO ACTION`/`RESTRICT`) | Alt. B: `ON DELETE SET NULL` (com exceção no trigger) | Alt. C: Manter `actor_id` sem FK (UUID histórico imutável) | Alt. D: Identidade histórica separada / tombstones (`actor_id` + tabela/coluna dedicada) |
| :--- | :--- | :--- | :--- | :--- |
| **Integridade referencial** | Estrita (FK ativa). | Parcial (vira `NULL` após exclusão). | Sem FK no banco; integridade garantida na origem por `write_audit_log` (`auth.uid()`). | Sem FK em `auth.users`/`profiles`, ou FK para tabela de tombstones. |
| **Imutabilidade do histórico** | Total (`audit_logs` nunca sofre `UPDATE`). | **Quebrada** (exige permitir `UPDATE` em `actor_id` durante `ON DELETE`). | **Total** (`audit_logs` permanece 100% append-only). | Total (se gravar snapshot no `INSERT`). |
| **Rastreabilidade** | Preserva UUID, mas impede exclusão. | **Perdida** (`actor_id` vira `NULL`, perdendo correlação entre eventos do mesmo ex-ator). | **Preservada** (UUID original mantido e correlacionável entre eventos). | Preservada (UUID + metadados históricos). |
| **Exclusão de contas** | **Bloqueada** para qualquer moderador/admin com logs. | Permitida. | **Permitida** sem bloqueios. | Permitida. |
| **Privacidade e LGPD** | Conflita com direito de exclusão de conta. | Anonimiza `actor_id` para `NULL`. | Mantém apenas UUID opaco (sem email/nome/bio após exclusão de `auth.users`/`profiles`). | Requer cuidado para não reter PII em tombstones após exclusão. |
| **Complexidade operacional** | Baixa no schema, alta no suporte (contas presas). | Média (exige alterar trigger append-only com exceção de FK). | **Baixa** (apenas `DROP CONSTRAINT audit_logs_actor_id_fkey`). | Alta (nova tabela/colunas e alterações em `write_audit_log` e UI). |
| **Compatibilidade com schema** | Compatível, mas operacionalmente inviável. | Incompatível com imutabilidade estrita. | **100% compatível** com `audit_logs` e `write_audit_log`. | Exige migração estrutural de schema. |
| **Risco de falsificação de autoria** | Nulo (`write_audit_log` revogada de clientes). | Nulo. | **Nulo** (`write_audit_log` é `SECURITY DEFINER`, revogada de `PUBLIC`/`anon`/`authenticated`, usa `auth.uid()`). | Nulo. |
| **Impacto em funções admin** | Nenhum nas RPCs, bloqueia `DELETE auth.users`. | Nenhum nas RPCs. | Nenhum nas RPCs; libera `DELETE auth.users`. | Exige atualizar `write_audit_log` e funções chamadoras. |

---

## Recomendação Fundamentada
Recomenda-se formalmente a **Alternativa C (manter `actor_id` sem FK, preservando o UUID histórico imutável)** para a futura migration definitiva:
1. Mantém `public.audit_logs` **100% append-only** sem abrir brechas no trigger `audit_logs_no_update_delete`.
2. Permite exclusão legítima de contas (inclusive ex-moderadores e ex-administradores não últimos) sem erro `42501`.
3. Preserva a correlação forense entre eventos históricos do mesmo ator via UUID opaco, sem reter dados pessoais (PII) após a exclusão de `auth.users` e `public.profiles`.
4. **Decisão arquitetural pendente para aprovação:** confirmar oficialmente que o projeto aceita `actor_id` sem FK (ou seja, registros históricos podem conter UUIDs que não existem mais em `public.profiles`), dispensando a Alternativa D (nova tabela/colunas).
