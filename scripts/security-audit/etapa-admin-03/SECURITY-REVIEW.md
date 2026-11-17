# ETAPA 3 — REVISÃO DE SEGURANÇA (`SECURITY-REVIEW.md`)

## Controles Preservados e Verificados

1. **Autorização no Servidor:**
   - `src/app/admin/users/layout.tsx` mantém `requireServerAuthorization("admin")`.
   - `src/proxy.ts` continua exigindo papel `admin` validado no servidor para `/admin/users`.
   - `AdminGuard requireAdmin={true}` preservado na camada visual.
2. **Ausência de Mutações:**
   - Nenhuma chamada de escrita ao Supabase, nenhuma RPC mutável e nenhuma alteração em `profiles` ou contas reais.
   - Botões de alteração de papel e suspensão/reativação estão desabilitados (`disabled`) em modo demonstração.
3. **Minimização de Dados e Sanitização:**
   - Nenhum e-mail, senha ou token é exposto na tabela ou no modal de detalhes.
   - Links públicos (`githubUrl`, `linkedinUrl`) passam por `getSafeExternalUrl()` aceitando exclusivamente `http:` e `https:`.
