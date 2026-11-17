# ADR — DECISÃO ARQUITETURAL: `public.audit_logs.actor_id` SEM CHAVE ESTRANGEIRA (ALTERNATIVA C)

**Status:** Recomendação arquitetural aprovada para planejamento (sujeita à autorização explícita do responsável pelo projeto antes da criação de qualquer migration definitiva).  
**Contexto:** Etapa 9.1.5.4 — Verificação C.

---

## 1. Contexto e Problema

- Na migration original `20261110000001_schema.sql`, `public.audit_logs.actor_id` possuía `REFERENCES public.profiles(id) ON DELETE SET NULL`.
- Na migration `20261110000002_functions_triggers.sql`, o trigger `audit_logs_no_update_delete` (`BEFORE DELETE OR UPDATE ON public.audit_logs`) bloqueia qualquer alteração ou remoção de linhas com `42501: audit_logs is append-only`.
- Consequentemente, ao excluir qualquer usuário que já tenha atuado como moderador/administrador com registros em `audit_logs`, o `ON DELETE SET NULL` dispara `UPDATE public.audit_logs SET actor_id = NULL`, que falha com erro `42501`, impedindo a exclusão da conta.

## 2. Decisão Proposta (Alternativa C)

**Manter `public.audit_logs.actor_id` (`uuid`) sem chave estrangeira para `public.profiles` ou `auth.users`.**

---

## 3. Análise Obrigatória

### 3.1 Benefícios da Alternativa
- Preserva 100% do histórico de auditoria após exclusão de contas de usuários, moderadores ou administradores.
- Mantém `public.audit_logs` estritamente *append-only*, sem abrir exceções no trigger `audit_logs_no_update_delete`.
- Elimina o conflito operacional entre o direito/necessidade de exclusão de contas e a imutabilidade dos logs.
- Permite correlacionar múltiplos eventos históricos de um mesmo ex-ator pelo mesmo UUID opaco (`actor_id`), o que `ON DELETE SET NULL` destruiria.

### 3.2 Riscos de Manter UUIDs Sem Referência Válida
- `actor_id` pode apontar para um UUID que não existe mais em `public.profiles` ou `auth.users` (como já ocorre nos `21` registros históricos de teste em `vexor_audit`).
- Consultas SQL que utilizem `INNER JOIN public.profiles` sobre `audit_logs.actor_id` omitiriam silenciosamente eventos de contas excluídas se não usarem `LEFT JOIN`.
- Caso no futuro se deseje restaurar uma FK, registros órfãos exigem criação com `NOT VALID` (ou limpeza prévia via restauração controlada).

### 3.3 Garantias de Imutabilidade
- O trigger `audit_logs_no_update_delete` (`BEFORE DELETE OR UPDATE ON public.audit_logs`) permanece integralmente ativo, bloqueando qualquer `UPDATE` ou `DELETE` com `SQLSTATE 42501`.

### 3.4 Permissões para Inserir Registros
- Em `20261110000003_rls_and_grants.sql`, `public.write_audit_log(...)` tem `EXECUTE` revogado de `PUBLIC`, `anon` e `authenticated`.
- A função `write_audit_log` é `SECURITY DEFINER` com `SET search_path = ''` e deriva `actor_id` internamente via `auth.uid()`, não aceitando `actor_id` arbitrário por parâmetro de cliente.
- Não há política `INSERT` permissiva para clientes diretos na tabela `audit_logs`.

### 3.5 Proteção Contra Alteração ou Exclusão
- Combinada em duas camadas: (1) privilégios/RLS restringem acesso de leitura apenas a administradores (`audit_logs_select_admin`) e bloqueiam DML direto; (2) trigger `audit_logs_no_update_delete` impede `UPDATE`/`DELETE` mesmo em contextos privilegiados no fluxo normal da aplicação.

### 3.6 Como Identificar Usuários Excluídos nas Consultas
- Utilizar `LEFT JOIN public.profiles` (ou `LEFT JOIN public.public_profiles`) em `audit_logs.actor_id = p.id`.
- Quando `audit_logs.actor_id IS NOT NULL` e `p.id IS NULL`, trata-se de ator cuja conta foi excluída (podendo ser exibido como `"Conta excluída (<uuid-abreviado>)"` ou rótulo equivalente).

### 3.7 Consequências para a Interface Administrativa
- Telas ou relatórios administrativos que listam `audit_logs` devem tratar `actor` nulo no `LEFT JOIN` sem quebrar renderização nem filtrar o evento fora da listagem.
- Links de perfil para `actor_id` devem ser desabilitados ou tratados quando não houver perfil correspondente.

### 3.8 Impactos na Privacidade e Retenção de Dados
- Após a exclusão de `auth.users` e `public.profiles`, permanecem em `audit_logs` apenas o UUID opaco (`actor_id`), ação, alvo e metadados operacionais — sem email, nome ou biografia do perfil excluído.
- **Ponto de atenção:** campos livres gravados no momento do evento (como `reason` ou metadados JSON em ações administrativas) continuam retidos por força da trilha de auditoria; recomenda-se não gravar PII desnecessária nesses campos.
