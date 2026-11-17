# CSV-INJECTION-PROTECTION — ETAPA 5

## 1. Regra de Neutralização (`escapeCsvCell`)

Em `src/features/admin/utils/audit-export.ts`:
```ts
const FORMULA_INJECTION_REGEX =
  /^[\s\u0000-\u001F\u007F]*[=+\-@]|^[\u0000-\u001F\u007F]/;
```
Qualquer célula que inicie com `=`, `+`, `-`, `@`, `\t`, `\r`, `\n`, caractere de controle ASCII (`\u0000-\u001F`, `\u007F`) ou qualquer combinação precedida por espaços em branco é prefixada com apóstrofo simples (`'`) antes do escapamento RFC 4180 (aspas duplas duplicadas e encapsulamento entre `"..."`).

## 2. Casos Testados em `scripts/test-admin-etapa5.mjs`

- Fórmulas diretas (`=cmd|...`, `+1+1`, `-2+3`, `@SUM(1+1)`)
- Tabulação, retorno de carro e retorno de linha (`\t=1+1`, `\r=1+1`, `\n=1+1`)
- Fórmulas precedidas por espaços e tabulações (`"   =HYPERLINK(...)"`, `" \t +cmd|..."`)
- Caracteres de controle (`\u0000=1+1`)
- Aspas internas, vírgulas, quebras de linha, acentos (UTF-8 BOM `\uFEFF`), `null`/`undefined` e metadados circulares/malformados.
