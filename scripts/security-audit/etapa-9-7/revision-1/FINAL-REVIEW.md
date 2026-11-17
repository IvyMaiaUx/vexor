# VEXOR — Etapa 9.7 (Fase 1.1) — Relatório Final de Revisão (`revision-1`)

**Status:** Fase 1.1 concluída (somente revisão e planejamento; nenhuma migration oficial criada ou aplicada; nenhuma alteração no código da aplicação ou banco remoto).  
**Data:** 2026-11-15

---

## 1. Síntese das Correções Aplicadas na `revision-1`

Todas as 12 correções obrigatórias (itens A a L) foram incorporadas e validadas contra as migrations oficiais existentes (`20261110000001_schema.sql`, `20261110000002_functions_triggers.sql`, `20261110000003_rls_and_grants.sql`, `20261113143000_security_hardening.sql`):

1. **Status próprio (`public.research_status`):** desacoplado de `resource_status`.
2. **TLP 2.0 completo:** `'CLEAR' | 'GREEN' | 'AMBER' | 'AMBER+' | 'RED'`, explicitamente documentado como rótulo de compartilhamento e não mecanismo RLS.
3. **Categorias com FK:** `category_id uuid` referenciando `public.categories(id)` (`ON DELETE RESTRICT`) com validação de `scope in ('research', 'both')`.
4. **Preservação histórica:** bloqueio de `DELETE` para clientes, `reports.research_id` com `ON DELETE RESTRICT`, `notifications.research_id` com `ON DELETE SET NULL`, e `author_id`/`reviewed_by` com `ON DELETE SET NULL`.
5. **Proteção de autoria e slug:** grants por coluna restritos + trigger `research_protect_fields()` + slug determinístico via `(title_pt, id)` em `research_set_slug()`.
6. **Validações estritas:** limites de tamanho em títulos, resumos, corpos, metodologia, `read_time_minutes`, regex em CVEs e MITRE ATT&CK, e validação estrutural + `https://` em `source_references`.
7. **RLS e Grants:** `REVOKE ALL` baseline, sem acesso para `anon`, `WITH CHECK` de `UPDATE` revalidando `is_active_member()`, e acesso de moderação restrito a `is_moderator()`.
8. **RPCs `moderate_research` e `resubmit_research`:** `SECURITY DEFINER`, `SET search_path = pg_catalog, public, pg_temp`, `FOR UPDATE` + revalidação pós-lock `FOR SHARE NOWAIT` (padrão V4), registro de `from`/`to` em `audit_logs`, notificação atômica e reenvio transacional com correção de conteúdo.
9. **Isolamento administrativo:** fluxos existentes de `resources`, `topics`, `posts` e `reports` permanecem inalterados.

---

## 2. Artefatos Entregues em `scripts/security-audit/etapa-9-7/revision-1/`

- `SCHEMA-REVISED.md`
- `RLS-AND-GRANTS-REVISED.md`
- `RPC-SECURITY-REVISED.md`
- `MIGRATION-REVISED.sql` *(somente artefato de planejamento, não aplicado)*
- `TEST-PLAN-REVISED.md`
- `DECISIONS-AND-TRADEOFFS.md`
- `FINAL-REVIEW.md`

---

## 3. Verificação e Limitações

- Consistência verificada manualmente contra as assinaturas reais de `write_audit_log`, `is_active_member`, `is_moderator`, `moderate_resource`, `resubmit_resource`, `reports` e `notifications` nas 4 migrations oficiais.
- Nenhum SQL foi aplicado em banco remoto ou local vinculado; nenhum arquivo em `src/` ou `supabase/migrations/` foi modificado.

**Parada obrigatória:** Aguardando sua aprovação explícita da `revision-1` antes de iniciar a Fase 2.
