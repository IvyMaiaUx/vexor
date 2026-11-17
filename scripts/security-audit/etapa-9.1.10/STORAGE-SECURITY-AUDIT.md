# Etapa 9.1.10 — Storage Security Audit (Fase I)

- **Data:** 2026-11-13
- **Método:** Consulta read-only em `storage.buckets`, `pg_class` e `pg_policies`.
- **Status:** `VERIFIED_REMOTE`

## 1. Configuração do bucket `avatars`

| Propriedade | Valor remoto observado | Esperado | Status |
|---|---|---|---|
| `id` / `name` | `avatars` | `avatars` | `VERIFIED_REMOTE` |
| `public` | `true` | `true` (leitura pública) | `VERIFIED_REMOTE` |
| `file_size_limit` | `2097152` (2 MB) | 2 MB (`2097152` bytes) | `VERIFIED_REMOTE` |
| `allowed_mime_types` | `["image/png", "image/jpeg", "image/webp"]` | PNG, JPEG, WEBP (SVG bloqueado) | `VERIFIED_REMOTE` |

## 2. Policies em `storage.objects`

- `avatars_insert_own` (`INSERT`, `authenticated`): `bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text AND is_active_member()`.
- `avatars_update_own` (`UPDATE`, `authenticated`): mesma restrição de pasta do usuário + membro ativo.
- `avatars_delete_own` (`DELETE`, `authenticated`): mesma restrição de pasta do usuário + membro ativo.
- **Ausência de policy `SELECT` em `storage.objects`:** não há listagem pública via API de `storage.objects`; o acesso público aos arquivos de avatar ocorre via URL pública do bucket `public = true`, sem expor listagem do bucket.
