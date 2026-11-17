# Etapa 9.1.17.1.1 — Correção de `PROF-AUD-01` (Modal de Edição de Perfil)

**Arquivo modificado:** `src/features/profile/profile-edit-modal.tsx`

---

## 1. Causa Raiz

Anteriormente, `ProfileEditModal` permanecia montado quando `isOpen === false` (retornando `null` somente após os `useState(profile.*)` iniciais). Com isso, em uma troca de usuário na mesma sessão SPA sem recarregar a página, ou ao fechar e reabrir após atualização externa do perfil, os campos podiam reter valores do mount anterior.

---

## 2. Solução Implementada

`ProfileEditModal` foi separado em um invólucro leve e no formulário interno `ProfileEditModalForm`:

```tsx
export function ProfileEditModal(props: ProfileEditModalProps) {
  if (!props.isOpen) {
    return null;
  }

  return <ProfileEditModalForm key={props.profile.id} {...props} />;
}
```

### Garantias obtidas
1. **Inicialização limpa ao abrir:** Quando `isOpen` passa para `true`, `ProfileEditModalForm` monta do zero inicializando todos os `useState` a partir do `profile` atual.
2. **Isolamento em troca de usuário:** `key={props.profile.id}` força desmontagem/remontagem imediata se o `profile.id` mudar, impedindo que dados da conta anterior permaneçam nos inputs.
3. **Preservação durante a edição:** Enquanto o modal está aberto para o mesmo `profile.id`, re-renderizações em segundo plano (como `refreshSession()`) **não** desmontam `ProfileEditModalForm` nem sobrescrevem o que o usuário está digitando.
4. **Proteção contra descarte acidental:** `handleRequestClose` mantém a checagem de `isDirty` com confirmação antes de fechar; ao confirmar o fechamento (`isOpen` → `false`), o formulário desmonta e descarta alterações não salvas.
5. **Compatibilidade:** Funciona de forma idêntica em modo `supabase` e modo `demo`, sem `setState` síncrono em `useEffect` e sem loops de renderização.
