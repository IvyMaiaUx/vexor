# VEXOR — Etapa 9.2: Revisão de Segurança

## 1. Conformidade com Policies RLS do Storage

- O caminho gerado por `buildAvatarObjectPath` é sempre `${user.id}/${uuid}.${ext}`, atendendo estritamente à policy `(storage.foldername(name))[1] = (select auth.uid())::text`.
- O `user.id` é obtido exclusivamente de `supabase.auth.getUser()`, nunca de parâmetro arbitrário do cliente.
- Usuários suspensos bloqueados por `public.is_active_member()` no PostgreSQL recebem tratamento explícito (`upload_rls_denied` / `rls_denied`) sem vazar detalhes internos.

## 2. Proteções Contra Vetores de Ataque

- **Bloqueio de SVG (XSS armazenado):** rejeita `image/svg+xml`, `.svg`, `.svgz` e cabeçalhos `<svg` / `<?xml` detectados nos magic bytes mesmo quando renomeados para `.png`.
- **Validação multi-camada:** tamanho `<= 2 MB` (`2097152` bytes), MIME type (`image/png`, `image/jpeg`, `image/webp`), correspondência MIME/extensão e inspeção binária de assinatura (PNG, JPEG, WEBP).
- **Prevenção de nomes previsíveis / colisão:** uso de `crypto.randomUUID()` e `upsert: false`.
- **Exclusão restrita:** `extractOwnedAvatarStoragePath` valida que a URL aponta para `/storage/v1/object/public/avatars/<userId>/<arquivo>` sem `..` ou subpastas, impedindo exclusão indiscriminada ou em pastas de terceiros.
- **Zero privilégios elevados:** nenhum uso de `service_role`, nenhuma alteração de migrations, policies, buckets ou `.env*`.
