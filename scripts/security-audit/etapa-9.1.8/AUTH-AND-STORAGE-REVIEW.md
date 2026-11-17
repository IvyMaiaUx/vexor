# VEXOR — ETAPA 9.1.8: REVISÃO DE AUTH E STORAGE (FASE B.4 / B.5)

## 1. Supabase Auth
- **Configuração local (`supabase/config.toml`):** `[auth]` habilitado (`enabled = true`, `enable_signup = true`, `jwt_expiry = 3600`, `site_url = "http://localhost:3000"`).
- **Dependências nas migrations:**
  - `auth.users(id)` referenciado por `public.profiles(id) ON DELETE CASCADE` (`20261110000001_schema.sql`).
  - Trigger `on_auth_user_created` (`AFTER INSERT ON auth.users`) executando `public.handle_new_user()` (`20261110000002_functions_triggers.sql`).
  - Funções `auth.uid()` e `auth.role()` usadas nas RLS policies e RPCs `SECURITY DEFINER`.
- **Estado remoto efetivo do schema `auth` (`auth.users`, `auth.uid()`, `auth.role()`):** `NÃO VERIFICADO` (sem conexão SQL direta ao banco remoto).

## 2. Supabase Storage
- **Configuração local (`supabase/config.toml`):** `[storage]` habilitado (`enabled = true`, `file_size_limit = "50MiB"`).
- **Definição na Migration 3 (`20261110000003_rls_and_grants.sql`):**
  - Cria bucket `avatars` (`public = true`, `file_size_limit = 2097152` [2 MiB], `allowed_mime_types = ['image/png', 'image/jpeg', 'image/webp']`, `ON CONFLICT (id) DO NOTHING`).
  - Policies em `storage.objects`: leitura pública para `avatars`, escrita/atualização/exclusão restrita ao próprio usuário autenticado (`(storage.foldername(name))[1] = (select auth.uid())::text`).
- **Estado remoto efetivo de `storage.buckets` e `storage.objects`:** `NÃO VERIFICADO` (sem conexão SQL direta ao banco remoto).
