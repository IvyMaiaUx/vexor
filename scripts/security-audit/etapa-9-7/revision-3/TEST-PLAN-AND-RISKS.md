# VEXOR — Etapa 9.7 (Revisão 3) — Plano de Testes e Riscos Conhecidos

**Data:** 2026-11-15  
**Aviso obrigatório:** Nenhum teste SQL foi executado nesta Revisão 3. Todos os cenários abaixo são **exclusivamente planejados** para execução em ambiente isolado na Fase 2B.

---

## 1. Distinção Explícita de Execução

- **Testes realmente executados nesta Revisão 3:** Nenhum (`0` comandos SQL executados; apenas inspeção estática e documental contra as 4 migrations oficiais e `supabase/seed.sql`).
- **Testes apenas planejados (listados abaixo):** 18 suítes/cenários SQL a serem implementados e executados somente após aprovação da migration oficial.

---

## 2. Plano de Testes SQL Propostos (Somente Planejados)

| ID | Cenário | Pré-condição / Ação Planejada | Resultado Esperado |
|---|---|---|---|
| **T01** | RLS de autor | Autor autenticado (`is_active_member()`) lê e edita própria pesquisa `pending` | `SELECT` e `UPDATE` permitidos; `DELETE` bloqueado (`42501`) |
| **T02** | RLS de membro comum | Membro ativo tenta ler pesquisa `pending`/`rejected`/`archived` de terceiros | Retorna 0 linhas |
| **T03** | RLS de moderador/admin | Moderador/admin ativo lê pesquisas em qualquer `status` e qualquer `tlp` | Leitura permitida em todas |
| **T04** | Acesso TLP `CLEAR` / `GREEN` | Membro ativo lê pesquisa `approved` com `tlp IN ('CLEAR', 'GREEN')`; `anon` tenta `SELECT` | Membro ativo lê; `anon` recebe `42501` |
| **T05** | Acesso TLP `AMBER` / `AMBER+` / `RED` | Membro não autorizado tenta ler `approved` restrita; moderador concede acesso via `grant_research_recipient`; usuário tenta autoconcessão via `INSERT` direto em `research_recipients` | Sem grant: 0 linhas; autoconcessão: `42501`; após RPC de moderador: leitura liberada (e bloqueada após `revoke_research_recipient`) |
| **T06** | Usuário suspenso | Usuário com `is_suspended = true` tenta `SELECT`, `INSERT`, `UPDATE` e RPCs | `0` linhas em `SELECT` (inclusive própria/destinatário) e `42501` em escritas/RPCs |
| **T07** | Perfil inexistente | Sessão com `auth.uid()` sem linha em `public.profiles` chama `moderate_research` ou `resubmit_research` | Rejeitado com `42501` pré-lock e pós-lock |
| **T08** | Revalidação concorrente de role | Sessão A inicia `moderate_research`; Sessão B (`admin_set_user_role`) rebaixa A para `'member'` antes do commit | Sessão A recebe `42501` na revalidação pós-lock (`role NOT IN ('moderator', 'admin')`) |
| **T09** | Contenção `NOWAIT` (`55P03`) | Sessão B segura `FOR UPDATE` no `profile` do chamador enquanto Sessão A executa `moderate_research` / `resubmit_research` | Sessão A falha imediatamente com `SQLSTATE 55P03` (`lock_not_available`) |
| **T10** | Transições válidas e inválidas | Testar `pending -> approved/rejected/archived`, `approved -> archived`, `rejected -> archived`, `archived -> *`, `approved -> rejected`, `rejected -> approved` | Matriz permitida funciona; transições fora da matriz e redundantes falham com `22023` |
| **T11** | Reenvio de pesquisa rejeitada | Autor chama `resubmit_research()` em pesquisa `rejected`; depois tenta em `approved`/`pending`/`archived` ou em pesquisa de outro autor | `rejected` pelo autor volta para `pending` limpando `rejection_reason`/`reviewed_*`; demais casos retornam `22023` ou `42501` |
| **T12** | Denúncia de pesquisa (`reports`) | Membro ativo insere denúncia com `research_id` válido; tenta duplicata aberta; tenta denunciar pesquisa `RED` sem acesso; moderador consulta fila | Primeira denúncia permitida (`GRANT INSERT (research_id)` ativo); duplicata falha com `23505`; `RED` sem acesso falha com `42501` |
| **T13** | Notificação | `moderate_research(..., 'approved'/'rejected', ...)` para autor ativo vs autor suspenso vs auto-moderação | Notificação criada apenas quando autor ativo e `author_id <> auth.uid()` |
| **T14** | Auditoria (`audit_logs`) | Verificar registros `research.*` gerados por todas as RPCs e tentar `UPDATE`/`DELETE` em `audit_logs` | Eventos gravados com `from`/`to`; mutação bloqueada com `42501` |
| **T15** | Proteção de campos administrativos | `authenticated` tenta `UPDATE` direto em `status`, `reviewed_by`, `reviewed_at`, `published_at`, `rejection_reason`, `author_id`, `slug` | Bloqueado tanto por `GRANT` quanto pelo trigger `research_protect_fields()` (`42501`) |
| **T16** | Arrays inválidos (CVE / ATT&CK) | Inserir `ARRAY['CVE-2024-1234', NULL]`, `ARRAY[['T1059']]`, `ARRAY['T1059', 'T1059']`, formato inválido ou > limite | Todos rejeitados por `research_valid_code_array` (`23514`) |
| **T17** | JSONB `source_references` inválido | Inserir chave extra (`{"title":"x","evil":1}`), `title` vazio, URL `http://`, `isExternal: "yes"`, > 20 itens | Todos rejeitados com `22023` / `23514` |
| **T18** | Categoria inativa/incompatível e rollback | Inserir com categoria `is_active = false` ou `scope = 'forum'`; forçar falha após `write_audit_log` em transação | Categoria rejeitada com `22023`; rollback desfaz atualização, auditoria e notificação atomicamente |

---

## 3. Riscos Conhecidos e Pendências Remanescentes

1. **Dependência de seed de categorias de pesquisa:** `supabase/seed.sql` atual contém 12 categorias com `scope = 'both'`. Embora `scope in ('research', 'both')` permita usar essas categorias, categorias dedicadas de Cybercrime Research precisam ser inseridas na Fase 2B.
2. **Ordem transacional de `ALTER TYPE ... ADD VALUE`:** no PostgreSQL, novos valores de enum (`'research'`, `'research_approved'`, `'research_rejected'`) não devem ser usados em DDL/DML direto (como `INSERT` de seed) na mesma transação em que o `ALTER TYPE` é executado. Recomenda-se manter o seed em script/migration posterior.
3. **Mapeamento de `SQLSTATE 55P03` na aplicação:** os Route Handlers em `src/features/cybercrime-research/server/` deverão traduzir `55P03` para HTTP `409 Conflict` na Fase 2B.
4. **Integração no painel administrativo (`entity_type = 'research'`):** a camada TypeScript do módulo admin precisará reconhecer `'research'` e os eventos `research.*` nos filtros de auditoria na Fase 2B/2C.
