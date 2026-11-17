# Avaliação de Riscos — Etapa 9.1.18.6.1

1. **Ausência de conta `member` dedicada no banco remoto:**
   - A única conta existente hoje é `admin` (`zcjudcbckcxwnfnrjfte`). Usá-la em T1–T3 invalidaria o teste de usuário comum e exporia o único administrador ativo a risco operacional.
2. **Risco de envio de e-mails e rate limit em T4:**
   - `signUp` real dispara e-mail de confirmação e pode sofrer bloqueio temporário por rate limit (`429`). Deve permanecer separado e desabilitado por padrão (`E2E_ALLOW_EMAILS=false`).
3. **Risco de contaminação de estado em T3:**
   - Se a restauração em `finally` falhar, a conta `member` manterá dados temporários de teste. Exige leitura pós-restauração para confirmação.
4. **Risco de confusão entre erro de rede/auth e bloqueio RLS/SQL:**
   - Testes negativos (T1/T2) devem validar explicitamente `42501` / `permission denied`, e T3 deve confirmar que a mesma sessão consegue gravar colunas permitidas.
5. **Risco de exposição de segredos em logs ou relatórios:**
   - `.env.local` e futuro `.env.e2e.local` devem permanecer ignorados pelo Git e nunca ter tokens, senhas ou e-mails registrados em relatórios.
