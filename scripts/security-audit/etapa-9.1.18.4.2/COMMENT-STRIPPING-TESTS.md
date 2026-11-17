# COMMENT STRIPPING TESTS — ETAPA 9.1.18.4.2

Achado corrigido: `BAIXO-03`  
Arquivo: `scripts/test-register-etapa9-1-13.mjs` (Test 11 e Test 12b)

---

## Nova Implementação de `stripComments()`

Substituída a regex simples por um scanner determinístico de máquina de estados sem dependências externas, tratando:

- Strings com aspas simples (`'...'`, incluindo escapes `\'`).
- Strings com aspas duplas (`"..."`, incluindo escapes `\"`).
- Template literals (`` `...` ``, incluindo escapes).
- Comentários de linha (`// ...`) apenas fora de literais.
- Comentários de bloco (`/* ... */`) apenas fora de literais.

## Validação

No Test 12b, o scanner preserva integralmente URLs e textos com `//` dentro de strings (`"https://vexor.local/auth//callback"`, `'http://test//path'`, `` `https://${'host'}//path` ``, `'escaped \' quote // not comment'`) enquanto remove comentários reais contendo `.insert({})` e `.from('profiles')`.
