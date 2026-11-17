# VEXOR — Etapa 9.7 (Fase 2C.1) — Rollback e Recuperação

**Data:** 2026-11-16  

---

## 1. Cenários de Falha e Ação

| Cenário | Comportamento | Ação de Recuperação |
|---|---|---|
| **Falha durante `db push`** | A migration roda em transação única; PostgreSQL executa rollback automático. | Diagnosticar o erro reportado sem reenviar até corrigir; nenhum objeto fica parcialmente criado. |
| **Falha no seed pós-migration** | Migration permanece íntegra; `INSERT ... ON CONFLICT DO NOTHING` falha isoladamente. | Corrigir SQL do seed e reexecutar (idempotente). |
| **Necessidade de reverter objetos da 2C.2** | Tabelas/RPCs/policies criados após commit. | Executar script de reversão controlada (em ambiente autorizado) restaurando `reports_insert`, `reports_one_target`, removendo `reports.research_id`, `notifications.research_id`, `research_recipients`, `research_submissions`, funções e tipos novos. |

---

## 2. Limitação Irreversível (PostgreSQL ENUMs)

Os valores adicionados via `ALTER TYPE ... ADD VALUE`:
- `public.category_scope`: `'research'`
- `public.notification_type`: `'research_approved'`, `'research_rejected'`

**Não podem ser removidos automaticamente** pelo PostgreSQL (`DROP VALUE` não existe). Em caso de rollback completo, esses valores permanecem no catálogo de tipos sem impacto funcional (desde que não haja linhas usando-os após remoção de categorias `'research'` e notificações correspondentes) ou exigem recriação manual dos ENUMs.

---

## 3. Salvaguarda Obrigatória para Plano Supabase Free

Como o projeto `Vexor` está no plano **Free** (sem PITR/backup automático gerenciado), deve-se gerar dump lógico local (`npx supabase db dump --linked`) imediatamente antes de executar qualquer escrita na Fase 2C.2.
