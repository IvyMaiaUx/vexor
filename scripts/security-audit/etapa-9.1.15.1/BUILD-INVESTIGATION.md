# ETAPA 9.1.15.1 — BUILD INVESTIGATION (`EPERM`)

## 1. Evidências Coletadas no Ambiente

- **Processos concorrentes (`Get-Process -Name node`):** Nenhum processo `node.exe` concorrente em execução antes do build.
- **Permissões NTFS / ACL de `.next` (`Get-Acl .next`):**
  ```text
  IdentityReference                            FileSystemRights AccessControlType
  -----------------                            ---------------- -----------------
  DESKTOP-G3BH48T\CodexSandboxUsers ReadAndExecute, Synchronize             Allow
  AUTORIDADE NT\SISTEMA                             FullControl             Allow
  BUILTIN\Administradores                           FullControl             Allow
  DESKTOP-G3BH48T\Ivy Maia                          FullControl             Allow
  ```
- **Causa provável comprovada:** O usuário/grupo de sandbox Windows (`DESKTOP-G3BH48T\CodexSandboxUsers`) possui apenas `ReadAndExecute, Synchronize` sobre `.next` (sem permissão `Write`/`Modify`), provocando `EPERM: operation not permitted, mkdir` quando trabalhadores do Next.js tentam criar subdiretórios em `.next\types\...` ou `.next\server\...` dentro do sandbox.

## 2. Tentativa Controlada de Build (Etapa 9.1.15.1)

- **Comando:** `npx next build --webpack`
- **Exit code:** `1`
- **Fase:** `Creating an optimized production build ...` -> `Failed to compile.`
- **Mensagem completa observada:**
  ```text
  ▲ Next.js 16.4.6 (webpack)
  - Environments: .env.local
  ✓ Running next.config.ts took 377ms

    Creating an optimized production build ...
  Failed to compile.

  Error: EPERM: operation not permitted, mkdir 'C:\Users\Ivy Maia\Desktop\cybersec-community-platform\.next\server\app\cybercrime-research\categories'


  > Build failed because of webpack errors
  ```

## 3. Classificação

**Build classificado como NÃO APROVADO (Pendente de execução fora do sandbox Windows restrito com `exit code 0`).**
