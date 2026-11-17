# VEXOR — Etapa 9.7 (Fase 2C.1) — Plano de Execução Controlada (NÃO EXECUTADO)

**Data:** 2026-11-16  
**Alvo:** Projeto Supabase `Vexor` (`zcjudcbckcxwnfnrjfte`, `us-east-1`, plano Free, PostgreSQL `17.11`).

---

## 1. Ordem Exata das Operações

1. **Snapshot lógico prévio (manual, plano Free):** exportar dump do schema/dados atuais via `npx supabase db dump --linked` antes de aplicar alterações.
2. **Conferência pré-push:** `npx supabase migration list` confirmando apenas `20261116114600` pendente.
3. **Aplicação da migration oficial:** `npx supabase db push --linked` (aplica exclusivamente `20261116114600_research_submissions.sql` em transação própria).
4. **Execução do seed em transação separada:** aplicar o seed de categorias `research` (e `supabase/seed.sql` se necessário) via SQL Editor do Supabase ou script aprovado, **após** o commit da migration.
5. **Verificações pós-aplicação (somente leitura):** confirmar `migration list`, presença das tabelas/RPCs/policies, categorias ativas e resposta dos endpoints da aplicação.

---

## 2. Comandos Propostos

```powershell
# 1. Backup lógico prévio (obrigatório no plano Free)
npx supabase db dump --linked -f backup-pre-2c2-schema.sql

# 2. Conferir pendência
npx supabase migration list

# 3. Aplicar migration pendente (somente após aprovação na Fase 2C.2)
npx supabase db push --linked --include-all

# 4. Verificar sincronização
npx supabase migration list
npx supabase inspect db table-stats --linked
```
*(O seed das categorias `research` é aplicado em etapa posterior ao `db push`, fora da transação do `ALTER TYPE ... ADD VALUE`.)*

---

## 3. Objetos Criados ou Modificados pela Migration

- **ENUMs criados:** `public.research_status`, `public.research_domain`, `public.research_severity`, `public.research_tlp`.
- **ENUMs estendidos:** `public.category_scope` (`'research'`), `public.notification_type` (`'research_approved'`, `'research_rejected'`).
- **Tabelas criadas:** `public.research_submissions`, `public.research_recipients`.
- **Tabelas alteradas:** `public.reports` (`+ research_id`, `reports_one_target`, `reports_dedupe_research`, `reports_research_idx`, `GRANT INSERT (research_id)`, policy `reports_insert`), `public.notifications` (`+ research_id`).
- **Funções/Triggers:** `research_valid_code_array`, `is_research_author`, `research_set_slug`, `research_protect_fields`, `moderate_research`, `resubmit_research`, `grant_research_recipient`, `revoke_research_recipient`.

---

## 4. Dependências entre Migration e Seed

- A migration `20261116114600` executa `ALTER TYPE public.category_scope ADD VALUE IF NOT EXISTS 'research'`.
- No PostgreSQL, novos valores de ENUM não devem ser usados em `INSERT` dentro da mesma transação. Portanto, o seed das categorias `'research'` depende estritamente do **commit prévio** de `20261116114600`.

---

## 5. Verificações Posteriores

1. `npx supabase migration list` mostrando `20261116114600` sincronizada em `Local` e `Remote`.
2. `npx supabase inspect db table-stats --linked` listando `public.research_submissions` e `public.research_recipients`.
3. `GET /api/research/categories` autenticado retornando as categorias `research`/`both`.

---

## 6. Estratégia de Recuperação em Caso de Falha

- Se o `db push` falhar no meio da execução: como o PostgreSQL envolve a migration em transação, toda a DDL é revertida automaticamente pelo banco (sem estado parcial), mantendo o histórico intacto.
- Se a migration concluir mas surgir defeito funcional posterior: aplicar migration corretiva ou executar o script controlado de rollback documentado em `ROLLBACK-AND-RECOVERY.md` (exceto valores de ENUM, conforme seção 9).

---

## 7. Riscos Específicos do Plano Supabase Free

- **Sem backups automáticos / Point-in-Time Recovery (PITR):** o plano Free não possui PITR nem backups gerenciados; por isso o `db dump` lógico prévio é obrigatório.
- **Pausa/limites de conexão:** manter sessões curtas e não rodar testes pesados de carga no banco remoto.

---

## 8. Critérios Objetivos de Sucesso

1. `npx supabase migration list` sem pendências.
2. Hash da migration aplicada igual a `C2D8BFD47EAA588CDCF4562E5CAE25615E80578C2700EEA036AD975BFD7FD100`.
3. Categorias `research` visíveis em `/api/research/categories` e fluxo de leitura/submissão operacional sem erro `42P01`.

---

## 9. Operações que Não Podem ser Revertidas Automaticamente

- **`ALTER TYPE ... ADD VALUE` (`category_scope` = `'research'`, `notification_type` = `'research_approved'`, `'research_rejected'`):** no PostgreSQL, não existe `ALTER TYPE ... DROP VALUE`. Valores adicionados a um ENUM só podem ser removidos recriando o tipo ou permanecem inativos sem uso caso haja rollback das tabelas.
