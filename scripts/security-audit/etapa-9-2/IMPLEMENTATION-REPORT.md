# VEXOR — Etapa 9.2: Relatório de Implementação

## 1. Arquivos Criados e Modificados

- **Criado:** `src/features/profile/avatar-service.ts` — validação de arquivo (metadados + magic bytes), geração de caminho `<auth.uid()>/<uuid>.<ext>`, upload para o bucket `avatars`, persistência em `public.profiles.avatar_url` via `updateOwnProfile`, rollback de órfão e remoção segura do avatar anterior.
- **Modificado:** `src/features/profile/profile-edit-modal.tsx` — substituição do input manual de URL por seletor de arquivo (`PNG`, `JPEG`, `WEBP`), prévia local (`URL.createObjectURL` com `revokeObjectURL`), botão de cancelar seleção, estado de carregamento, guarda `inFlightRef` contra envio duplicado e preservação dos demais campos do perfil.
- **Modificado:** `src/features/profile/profile-header.tsx` — reset de erro de imagem (`failedAvatarUrl` + `key={profile.avatarUrl}`) para garantir atualização visual imediata após troca de avatar.
- **Modificado:** `src/lib/i18n/dictionaries.ts` — chaves PT-BR e EN para seleção, troca, cancelamento, dica de formato/tamanho e carregamento do avatar.
- **Criado:** `scripts/test-avatar-upload-etapa9-2.mjs` — suíte automatizada offline/mockada cobrindo os 13 cenários exigidos.

## 2. Sequência do Fluxo de Upload (`uploadAndPersistAvatar`)

1. Valida o arquivo (`validateAvatarFile`: tamanho `<= 2097152`, bloqueio explícito de SVG, MIME + extensão compatíveis e assinatura binária / magic bytes).
2. Obtém o usuário autenticado exclusivamente de `supabase.auth.getUser()`.
3. Gera caminho imprevisível `${authenticatedUserId}/${crypto.randomUUID()}.${ext}`.
4. Envia ao bucket `avatars` (`upsert: false`, `contentType` validado).
5. Obtém a URL pública via `getPublicUrl(objectPath)` e verifica prefixo `https://`.
6. Atualiza `public.profiles.avatar_url` (+ demais campos do formulário) usando `updateOwnProfile`.
7. **Em caso de falha na etapa 5 ou 6:** executa rollback `remove([objectPath])` para evitar arquivo órfão e preserva o avatar anterior.
8. **Somente após sucesso na etapa 6:** se `previousAvatarUrl` pertencer ao bucket `avatars` na pasta `${authenticatedUserId}/` (`extractOwnedAvatarStoragePath`), remove o objeto antigo.
