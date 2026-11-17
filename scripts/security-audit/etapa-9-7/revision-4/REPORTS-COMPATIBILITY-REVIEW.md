# VEXOR — Etapa 9.7 (Revisão 4) — Compatibilidade com `reports` e `notifications`

**Data:** 2026-11-16  
**Migrations oficiais comparadas:** `20261110000001_schema.sql` e `20261110000003_rls_and_grants.sql`.

---

## 1. Comparação com as Migrations Oficiais (`public.reports`)

| Aspecto | Migration Oficial (`20261110000001` / `03`) | Proposta Revisão 4 | Preservação |
|---|---|---|---|
| **GRANTs de leitura** | `grant select on public.reports to authenticated;` | Inalterado | **100% preservado** |
| **GRANTs de escrita** | `grant insert (topic_id, post_id, resource_id, profile_id, reason, details) on public.reports to authenticated;` | Adiciona `grant insert (research_id) on public.reports to authenticated;` | **Todas as colunas originais preservadas** |
| **Policy `reports_select`** | `reporter_id = (select auth.uid()) or (select public.is_moderator())` | Inalterada | **100% preservada** |
| **Policy `reports_insert`** | `reporter_id = (select auth.uid()) and (select public.is_active_member()) and status = 'open'` | Preserva as 3 condições originais e acrescenta `and (research_id is null or exists (select 1 from public.research_submissions r where r.id = reports.research_id))` | **Regras legítimas intactas + anti-enumeração de pesquisas privadas** |
| **Constraint `reports_one_target`** | `num_nonnulls(topic_id, post_id, resource_id, profile_id) = 1` | `num_nonnulls(topic_id, post_id, resource_id, profile_id, research_id) = 1` | **Estendida sem quebrar alvos antigos** |
| **Dedupe** | Índices únicos parciais por alvo (`status in ('open', 'reviewing')`) | Adiciona `reports_dedupe_research` com o mesmo filtro | **Consistente** |
| **Integridade referencial** | `topic_id`/`post_id`/`resource_id`/`profile_id` (`ON DELETE CASCADE`) | `research_id references public.research_submissions (id) on delete restrict` | **Preserva histórico de denúncias** |

---

## 2. Prevenção de Enumeração de Pesquisas Privadas

Sem a verificação `exists (select 1 from public.research_submissions r where r.id = reports.research_id)` em `reports_insert`, um atacante autenticado poderia enviar `INSERT INTO reports (research_id, reason)` com UUIDs aleatórios ou suspeitos e distinguir:
- `23503 foreign_key_violation` (pesquisa não existe), de
- sucesso / `23505` (pesquisa `RED` ou `pending` existe!).

Com a subconsulta sujeita à RLS `research_select` em `reports_insert`:
- Se o usuário não tiver acesso de leitura àquela pesquisa (ou se o UUID não existir), `EXISTS (...)` retorna `false` e o PostgreSQL rejeita uniformemente com **`42501` (RLS violation)** antes da verificação de FK, eliminando o oráculo de existência!

---

## 3. Compatibilidade com `public.notifications` e RPCs Existentes

- `resolve_report(uuid, public.report_status, text)` em `20261113143000_security_hardening.sql` atualiza apenas `status`, `handled_by`, `handled_at`, `resolution_note` — continua 100% compatível com denúncias cujo alvo seja `research_id`.
- `public.notifications` recebe `research_id uuid references public.research_submissions (id) on delete set null` e `notification_type` recebe `'research_approved'` e `'research_rejected'`, sem alterar grants nem policies existentes (`notifications_select_own`, `notifications_update_own`, `notifications_delete_own`).
