# COMPATIBILIDADE POSTGRESQL 17.11 (SUPABASE REMOTO)

## 1. Metodologia
- O ambiente local possui apenas PostgreSQL 18 (`.pg_test_cluster`); **não há instância local do PostgreSQL 17.11 disponível** neste host e não foi executado nenhum comando contra o Supabase remoto.
- Foi realizada **análise estática completa** de todas as instruções de `PROPOSED-SOCIAL-MIGRATION.sql`.

## 2. Verificação de Recursos por Categoria
| Recurso / Sintaxe | Uso no SQL | Disponibilidade PG 17.11 | Risco |
|---|---|---|---|
| `ALTER TYPE ... ADD VALUE IF NOT EXISTS` fora de `BEGIN` | L22-29 | PG 12+ | Baixo |
| `num_nonnulls(...)` | L212, L216 | PG 9.6+ | Baixo |
| `hashtextextended(text, bigint)` | L646 | PG 11+ | Baixo |
| `pg_catalog.regexp_matches(..., 'gi')` | L358 | PG 8.3+ | Baixo |
| `FOR SHARE NOWAIT` / `FOR UPDATE OF w NOWAIT` | L475, L592, L649, L708, L793, L859 | PG 9.0+ | Baixo |
| `pg_advisory_xact_lock(bigint)` | L469, L575, L646 | PG 9.1+ | Baixo |
| Índices parciais com `WHERE` | L74, L78, L130, L197 | PG 7.2+ | Baixo |
| `(select auth.uid())` em policies RLS | L914, L942-997 | PG 9.5+ | Baixo |
| Recursos exclusivos do PG 18 (`UUIDv7`, `WITHOUT OVERLAPS`, etc.) | **Não utilizados** | N/A | Nenhum |

## 3. Limitação Registrada (`AUD-INFO-01`)
Não é possível declarar validação **runtime** integral em PostgreSQL 17.11 sem execução direta em PG 17. Recomenda-se testar a migration corrigida em um branch/container PostgreSQL 17.11 antes do `db push` oficial na Fase B.
