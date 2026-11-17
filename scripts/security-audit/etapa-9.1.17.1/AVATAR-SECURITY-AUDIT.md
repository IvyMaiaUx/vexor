# Etapa 9.1.17.1 — Auditoria de Segurança de Avatar e Storage

**Fontes inspecionadas (READ-ONLY):**
- `supabase/migrations/20261110000003_rls_and_grants.sql` (linhas 443–478)
- `supabase/migrations/20261110000001_schema.sql` (linha 57)
- `src/features/auth/validation.ts`
- `src/features/profile/profile-edit-modal.tsx`
- `src/features/profile/profile-header.tsx`

---

## 1. Configuração do Bucket `avatars` (Migration)

- `public = true`
- `file_size_limit = 2097152` (2 MB)
- `allowed_mime_types = ['image/png', 'image/jpeg', 'image/webp']` (**SVG bloqueado**)
- Policies `avatars_insert_own`, `avatars_update_own`, `avatars_delete_own`: restringem escrita/atualização/exclusão a `bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text AND public.is_active_member()`.

## 2. Riscos da Funcionalidade Atual (URL HTTPS)

- `ProfileEditModal` aceita apenas URL iniciando com `https://` (`profiles_avatar_https`), renderizada em `ProfileHeader` com `<Image unoptimized onError={() => setImgError(true)} />` (sem `dangerouslySetInnerHTML`).
- **Risco residual baixo (`PROF-AUD-05`, `INFORMATIVA`):** Como qualquer URL `https://` externa é aceita no campo `avatarUrl`, o navegador do visitante realiza requisição GET para o domínio informado (exposição padrão de IP/Referer ao servidor externo de imagem, mitigável quando o upload exclusivo para o Storage `avatars` for adotado e/ou com `referrerPolicy="no-referrer"`).

## 3. Requisitos para Implementação Futura de Upload

1. Aceitar apenas `image/png`, `image/jpeg`, `image/webp` e validar *magic bytes* além do `file.type`/extensão.
2. Bloquear SVG explicitamente.
3. Impor limite de 2 MB antes do envio.
4. Gravar apenas no caminho `${user.id}/...` derivado de `auth.getUser()`.
5. Remover somente o arquivo anterior do próprio usuário após confirmação de sucesso (sem exclusão em massa).
