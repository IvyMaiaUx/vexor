# SECURITY-REVIEW — ETAPA 4

## 1. Proteções de Autorização

- **Server-side:** `src/app/admin/users/layout.tsx` mantém `requireServerAuthorization("admin")`, redirecionando não autenticados para `/login?next=%2Fadmin%2Fusers` e não-administradores para `/admin`.
- **Client-side:** `<AdminGuard requireAdmin={true}>` envolve a página.
- **Service-layer:** `SimulatedAdminUsersService` valida `hasAdminAccess(actor)` e rejeita `moderator` ou conta suspensa com erro `42501`, sem depender apenas de botões desabilitados na UI.
- **Proteções críticas:** auto-rebaixamento (`42501`), auto-suspensão (`42501`), rebaixamento/suspensão do último administrador ativo (`42501`), justificativa inferior a 5 caracteres (`22023`) e transições redundantes de estado (`22023`).

## 2. Conformidade com Restrições da Etapa

- Nenhuma migration SQL, tabela, ENUM, política RLS, RPC ou `GRANT` foi alterada.
- Nenhuma chamada de escrita ao Supabase (`.insert`, `.update`, `.upsert`, `.delete`, `.rpc`) foi introduzida.
- Nenhum uso de `service_role`, nenhuma modificação em `.env*` e nenhuma alteração na conta administrativa real do banco remoto.
- Nenhum dado privado (e-mail, token, senha) é exibido nos modais ou no histórico de auditoria; metadados passam por `sanitizeAuditMetadata()`.
