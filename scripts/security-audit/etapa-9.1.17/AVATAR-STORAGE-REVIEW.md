# Etapa 9.1.17 — Revisão de Avatar e Storage (`avatars`)

**Configuração verificada na migration `20261110000003_rls_and_grants.sql` (linhas 443–478):**
- Bucket: `avatars` (`public = true`)
- Limite de tamanho: `2097152` bytes (2 MB)
- MIME types permitidos: `['image/png', 'image/jpeg', 'image/webp']` (**SVG intencionalmente bloqueado**)
- Policies de escrita (`avatars_insert_own`, `avatars_update_own`, `avatars_delete_own`):
  Exigem `bucket_id = 'avatars'`, `(storage.foldername(name))[1] = auth.uid()::text` e `public.is_active_member()`.

---

## Diagnóstico da UI Atual e Proposta de Upload

- **Estado atual:** `ProfileEditModal` possui apenas campo de URL (`avatarUrl` com validação `^https://`, alinhada à constraint `profiles_avatar_https`). Não há UI de upload de arquivo local implementada.
- **Proposta para etapa futura (aguardando autorização antes de implementar):**
  1. Adicionar seletor de arquivo opcional (`accept="image/png,image/jpeg,image/webp"`) em `ProfileEditModal`.
  2. Validar magic bytes / MIME real (`image/png`, `image/jpeg`, `image/webp`) e tamanho `<= 2 MB` no cliente antes do upload (rejeitando SVG explicitamente).
  3. Gerar caminho fixo no servidor/cliente autenticado sob `${user.id}/avatar-${timestamp}.${ext}` (nunca permitindo escolha de pasta de terceiros).
  4. Fazer upload para `supabase.storage.from("avatars").upload(...)`, obter a URL pública `https://...`, salvar em `profiles.avatar_url` via `updateOwnProfile()` e remover apenas o arquivo anterior do próprio usuário quando substituído com sucesso.
