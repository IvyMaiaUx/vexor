# VEXOR — Etapa 9.7 (Fase 2A) — Resultados de RLS, TLP e Privilégios

**Data:** 2026-11-16  
**Banco isolado:** `vexor_audit_97_2a` (PostgreSQL 18.6, removido ao final)

---

## 1. Verificação de Recursão RLS (`T01`)

- `author` lendo `research_submissions` (`TLP:RED` aprovado): `1` linha, sem erro (`err=null`).
- `recipient` autorizado lendo `research_submissions` (`TLP:RED` aprovado): `1` linha, sem erro.
- `author` lendo `research_recipients` via `public.is_research_author(research_id)`: `1` linha, sem erro (`42P17` ausente).
- `moderator` lendo `research_recipients`: `1` linha, sem erro.

---

## 2. Matriz de Acesso por Papel e TLP (`T02`, `T03`, `T04`, `T05`, `T08`, `T10`, `T19`)

| Ator | `CLEAR`/`GREEN` aprovado | `AMBER`/`AMBER+`/`RED` aprovado (sem grant) | `AMBER`/`RED` aprovado (com grant) | `pending` / `rejected` / `archived` | Escrita direta em `research_recipients` / `DELETE` / RPCs |
|---|---|---|---|---|---|
| **`anon`** | `42501` | `42501` | — | `42501` | `42501` (`moderate_research`, `is_research_author`) |
| **Perfil inexistente (`orphan`)** | `0` linhas | `0` linhas | — | `0` linhas | `42501` nas RPCs |
| **Perfil suspenso** | `0` linhas | `0` linhas | — | `0` linhas | `42501` nas RPCs |
| **Membro ativo (não autor)** | Lê (`2` linhas) | `0` linhas | — | `0` linhas | `INSERT` direto em `research_recipients`: `42501` |
| **Destinatário ativo** | Lê | `0` linhas após revogação (`T08`) ou arquivamento (`T10`) | Lê (`1` linha) | `0` linhas | Sem permissão de alteração |
| **Autor ativo** | Lê | Lê | — | Lê; edita apenas `pending`; `DELETE` negado (`42501`) | `UPDATE` direto de `status`/`slug`/`reviewed_by` negado (`42501`) |
| **Moderator / Admin** | Lê | Lê | Lê | Lê todos (`3/3`) | Autoconcessão em `grant_research_recipient` negada (`42501`) |

---

## 3. Anti-Enumeração em `reports` (`T17`)

- Denúncia válida sobre `CLEAR` aprovado: inserida com sucesso.
- Denúncia duplicada aberta sobre o mesmo alvo: `SQLSTATE 23505`.
- Denúncia sobre `AMBER+` sem acesso de leitura vs UUID inexistente: ambos rejeitados uniformemente com `SQLSTATE 42501`.
