# COMPATIBILIDADE POSTGRESQL 17.11 — REVISÃO 3

- **Classificação:** **Estática revisada, runtime pendente** (`AUD-REV3-INFO-01`).
- **Mudanças da Revisão 3:** `FOR NO KEY UPDATE` (PG 9.3+), `greatest(last_message_at, now())` (PG 8.4+), `and dm.status = 'published'::public.content_status` (SQL padrão).
- **Limitação:** Apenas PostgreSQL `18` está instalado localmente; testes em PG `17.11` permanecem pendentes para o momento de promoção em ambiente PG 17.
