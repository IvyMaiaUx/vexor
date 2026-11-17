# VEXOR — Etapa 9.7 (Fase 2A) — Resultados Completos dos Testes Isolados

**Data:** 2026-11-16  
**Comando executado:** `node scripts/security-audit/etapa-9-7/phase-2a/run-isolated-2a-tests.mjs`  
**Banco temporário:** `vexor_audit_97_2a` (`PostgreSQL 18.6`, `127.0.0.1:5433`, removido após os testes)  
**Resultado global:** **20/20 cenários aprovados (0 falhas)** — código de saída `0`.

---

## 1. Matriz de Resultados Executados

| ID | Categoria | Descrição | Esperado | Resultado Real | Status |
|---|---|---|---|---|---|
| **RPC-01** | RPC | `moderate_research` rejeita `p_decision NULL` | `SQLSTATE 22023` | `sqlstate=22023` | **PASS** |
| **T01** | RLS | RLS sem recursão (`42P17` ausente) entre `research_submissions` e `research_recipients` | `1/1/1/1` sem erro | `author=1,rec=1,author_rr=1,mod_rr=1,err=null` | **PASS** |
| **T02** | TLP/RLS | Membro lê `CLEAR`/`GREEN` aprovados; nunca lê `AMBER`/`AMBER+`/`RED`/pendente sem grant; `anon` bloqueado | `anon=42501,cg=2,restr=0` | `anon=42501,cg=2,restr=0` | **PASS** |
| **T03** | RLS | Papéis: autor edita `pending`, `DELETE` negado (`42501`), mod/admin leem todos os status | `upd_ok,del=42501,mod=3,adm=3` | `del=42501,mod=3,adm=3` | **PASS** |
| **T04** | Auth | Perfil suspenso e inexistente bloqueados em RLS (`0` linhas) e RPCs (`42501`) | `0/42501/0/42501` | `susp=0/42501,orp=0/42501` | **PASS** |
| **T05** | TLP | Autoconcessão e `INSERT` direto em `research_recipients` bloqueados | `42501/42501` | `self=42501,direct=42501` | **PASS** |
| **T06** | TLP | Concessão duplicada idêntica é idempotente sem duplicar `audit_logs` | `before=1,after=1` | `before=1,after=1` | **PASS** |
| **T07** | TLP | Atualização de justificativa preserva `granted_by` original e grava `research.recipient_updated` | `gb=mod,ub=admin,action=recipient_updated` | `gb=mod,ub=admin,action=research.recipient_updated` | **PASS** |
| **T08** | TLP | Revogação remove acesso imediato, registra 1 evento e repetição é idempotente | `read=0,rev_logs=1` | `read=0,rev_logs=1` | **PASS** |
| **T09** | TLP | Concessão explícita para `CLEAR`/`GREEN` bloqueada | `22023/22023` | `clear=22023,green=22023` | **PASS** |
| **T10** | State | Arquivamento bloqueia leitura de destinatário, e transições fora da matriz falham | `read=0,4x22023` | `read=0,errs=22023/22023/22023/22023` | **PASS** |
| **T11** | Concurrency | Revalidação pós-lock V4 bloqueia moderador rebaixado concorrentemente | `demote_ok,mod=42501` | `demote_err=null,mod=42501` | **PASS** |
| **T12** | Concurrency | Contenção em `profiles FOR SHARE NOWAIT` retorna `SQLSTATE 55P03` imediato | `SQLSTATE 55P03` | `sqlstate=55P03` | **PASS** |
| **T13** | Audit | `audit_logs` registra eventos `research.*` e bloqueia mutação | `mut=42501,count>=7` | `mut=42501,count=11` | **PASS** |
| **T14** | Notifications | Notificações `research_approved`/`research_rejected` criadas para autor ativo | `author>=2,susp=0` | `author=6,susp=0` | **PASS** |
| **T15** | Integrity | `UPDATE` direto em `status`/`slug`/`reviewed_by` bloqueado | `3x42501` | `42501/42501/42501` | **PASS** |
| **T16** | Integrity | Arrays (`NULL`/duplicado) e JSONB (chave extra/`http://`) rejeitados | `23514/23514/22023/22023` | `23514/23514/22023/22023` | **PASS** |
| **T17** | Reports | Denúncia válida aceita, duplicata=`23505`, pesquisa restrita e UUID inexistente=`42501` uniformes | `ok,23505,42501,42501` | `dup=23505,priv=42501,fake=42501` | **PASS** |
| **T18** | Integrity | `resubmit_research` limpa revisão → `pending`; categoria `forum`/inativa rejeitada | `pending\|t,22023,22023` | `pending\|t,22023,22023` | **PASS** |
| **T19** | Privileges | `anon` bloqueado (`42501`) em RPCs `SECURITY DEFINER` e `is_research_author` | `42501/42501` | `42501/42501` | **PASS** |

---

## 2. Testes Não Executados

Nenhum teste planejado deixou de ser executado no escopo SQL local (`20/20` executados com sucesso). Apenas a integração ponta-a-ponta com o frontend/API Next.js contra o Supabase real permanece para as Fases 2B/2C.
