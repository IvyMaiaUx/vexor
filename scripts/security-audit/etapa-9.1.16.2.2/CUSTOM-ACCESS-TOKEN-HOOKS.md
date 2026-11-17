# Etapa 9.1.16.2.2 — Impacto de Custom Access Token Hooks no Supabase Auth

**Fonte da análise:** Documentação oficial do Supabase Auth (`custom_access_token_hook`) e inspeção do código cliente do Vexor.  
**Restrição observada:** Nenhuma configuração remota do Supabase ou hook PostgreSQL foi inspecionada por escrita ou modificada.

---

## 1. Como Custom Access Token Hooks influenciam as claims JWT

No Supabase Auth, um **Custom Access Token Hook** (função PostgreSQL configurada no painel/Auth do projeto) é executado pelo GoTrue imediatamente antes da emissão de cada Access Token JWT (incluindo login inicial, recuperação de senha e renovação de token).

O hook recebe um objeto `event` (`jsonb`) contendo:
- `user_id`
- `claims` (objeto JWT atual, incluindo `sub`, `exp`, `aal`, `amr`, etc.)
- `authentication_method` (ex.: `"password"`, `"recovery"`, `"token_refresh"`, `"oauth"`, etc.)

O hook retorna o objeto `event` com as `claims` possivelmente modificadas, sujeitas à validação de schema do GoTrue.

---

## 2. Respostas aos Pontos Obrigatórios

1. **Podem modificar `amr`?**  
   **Sim.** Segundo a documentação oficial, `claims` inclui `amr`, e o hook pode inspecionar ou alterar `claims` antes da assinatura do JWT pelo GoTrue.
2. **Podem adicionar ou remover informações relevantes?**  
   **Sim.** Um hook pode adicionar claims personalizadas, remover entradas ou sobrescrever `amr` (por exemplo, se sobrescrever `amr` durante `authentication_method = 'token_refresh'`, a entrada `"recovery"` pode ser perdida no JWT renovado).
3. **Há garantia de integridade da claim `amr` no fluxo padrão?**  
   - **Sem hooks customizados:** O GoTrue emite e assina o JWT diretamente no servidor Supabase; a assinatura é verificada por `supabase.auth.getClaims()`, garantindo que o cliente não possa forjar `amr` no frontend.
   - **Com hooks customizados:** A integridade semântica de `amr` passa a depender também da implementação da função SQL do hook no banco Supabase (fronteira administrativa do servidor).
4. **A implementação atual depende de uma configuração remota específica?**  
   **Não.** O código do Vexor assume apenas o contrato padrão do `@supabase/auth-js` (`getUser()` + `getClaims()` com `sub`, `exp` e `amr` contendo `"recovery"`), sem exigir que exista nenhum Custom Access Token Hook configurado no projeto remoto.

---

## 3. Conclusão

Não assumimos que o projeto remoto possua Custom Access Token Hooks ativos. Caso venha a utilizá-los no futuro, o hook deve preservar a integridade de `amr` em fluxos `recovery` e nunca injetar `recovery` em sessões comuns.
