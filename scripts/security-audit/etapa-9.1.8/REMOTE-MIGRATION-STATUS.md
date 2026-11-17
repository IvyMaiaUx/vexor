# VEXOR — ETAPA 9.1.8: STATUS DE MIGRATIONS REMOTAS (FASE B.2)

- **Consulta executada:** `npx supabase migration list` (somente leitura).
- **Resultado observado:** `Target: local stack (127.0.0.1:54322)` — `DbConnectError` (projeto não está vinculado ao remoto via `supabase link`, `linked: false` confirmado em `npx supabase projects list`).
- **Existência de `supabase_migrations.schema_migrations` no remoto:** `NÃO VERIFICADO`
- **Lista de migrations aplicadas no remoto:** `NÃO VERIFICADO`
- **Divergências entre histórico remoto e os 4 arquivos locais:** `NÃO VERIFICADO`

> **Ação necessária antes da aplicação futura:** executar `supabase link --project-ref zcjudcbckcxwnfnrjfte` (com autorização explícita e senha do banco informada pelo responsável no momento da operação) seguido de `npx supabase migration list --linked` (somente leitura) para confirmar se o remoto está vazio ou se já possui migrations aplicadas.
