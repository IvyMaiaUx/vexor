# BUILD-INVESTIGATION — Etapa 9.1.15.2 (FINDING-06)

## 1. Execução do Build na Etapa 9.1.15.2
- **Comando:** `Set-Location "c:\Users\Ivy Maia\Desktop\cybersec-community-platform"; npx next build --webpack`
- **Exit code:** `1`
- **Saída observada:**
```text
▲ Next.js 16.4.6 (webpack)
- Environments: .env.local
✓ Running next.config.ts took 250ms

  Creating an optimized production build ...
Failed to compile.

Error: EPERM: operation not permitted, mkdir 'C:\Users\Ivy Maia\Desktop\cybersec-community-platform\.next\static\chunks\app\admin\catalog'


> Build failed because of webpack errors
```

## 2. Causa Raiz Ambiental Identificada (Sem Alteração de ACLs)
Conforme evidência coletada via `Get-Acl .next` e `Get-Process -Name node` na auditoria 9.1.15.1:
- Não havia processos `node.exe` concorrentes travando o diretório.
- A conta/grupo `DESKTOP-G3BH48T\CodexSandboxUsers` possui apenas permissões `ReadAndExecute, Synchronize` sobre `.next` (sem permissão `Write`), impedindo `mkdir` dentro de `.next` durante a execução no sandbox.

## 3. Decisão e Status
- Conforme regra obrigatória desta etapa, **nenhuma permissão do Windows (ACL) foi alterada** automaticamente em `.next`.
- O build de produção **não** é declarado aprovado enquanto não retornar exit code `0` em ambiente com permissão de escrita em `.next` (ou fora do sandbox restrito).
