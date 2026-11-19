# Inventário de Conteúdo Demonstrativo do Fórum — VEXOR

## 1. Objetivo
Documentar todos os arquivos, constantes, stores e registros remotos inspecionados durante a limpeza de conteúdo demonstrativo/fictício do módulo de fórum.

## 2. Conteúdo Demonstrativo Identificado no Código

| Item | Localização | Conteúdo Encontrado | Risco / Impacto |
| :--- | :--- | :--- | :--- |
| `seed-topics.ts` | `src/features/forum/seed-topics.ts` (11.186 bytes) | 4 tópicos fictícios (`topic-1` a `topic-4`), 11 respostas simuladas (`INITIAL_POSTS`), autores fictícios (`sec_analyst_br`, `ir_responder`, `cloud_sec_eng`, `appsec_lead`) e contadores/votos inventados | Fixture morta importada apenas pelo simulador legado `admin-service.ts` |
| `FEATURED_TOPICS` | `src/config/site.ts` (linhas 460–506) | Array hardcoded com 3 tópicos demonstrativos (`topic-1` a `topic-3`) com títulos PT/EN, tags, autores fictícios e contagens simuladas (`replyCount`, `voteCount`) | Risco de exibição de publicações simuladas caso algum consumidor leia `FEATURED_TOPICS` |
| `INITIAL_ACTIVITIES` | `src/features/activity/use-activity-store.ts` | 6 eventos de atividade simulados, incluindo links para `/forum/topic-2` e `/forum/topic-1` | Exibia atividades falsas do fórum no perfil quando `localStorage` estava vazio ou ausente |
| Import legado em `admin-service.ts` | `src/features/admin/services/admin-service.ts` (linha 25) | `import { INITIAL_POSTS, INITIAL_TOPICS } from "@/features/forum/seed-topics";` | Dependência direta da fixture de tópicos/respostas fictícias na camada simulada |

## 3. Verificação do Banco Remoto (Supabase — `zcjudcbckcxwnfnrjfte`)
Inspeção read-only via `npx supabase inspect db table-stats --linked`:
- `public.topics`: `estimated_row_count: "0"`
- `public.posts`: `estimated_row_count: "0"`
- `public.votes`: `estimated_row_count: "0"`
- `public.notifications`: `estimated_row_count: "0"`
- `public.profiles`: `estimated_row_count: "1"` (conta real)
- `public.categories`: `estimated_row_count: "12"` (categorias oficiais da plataforma)

**Conclusão remota:** Nenhum tópico, resposta, voto ou notificação demonstrativa foi encontrado no Supabase de produção. Nenhuma operação de escrita ou exclusão remota foi executada.

## 4. Itens Preservados
- `forum-service.ts`, `use-forum-store.ts`, `/forum`, `/forum/new` e `/forum/[id]`: já integrados exclusivamente ao Supabase real, sem fallbacks simulados.
- `FEATURED_RESOURCES` / catálogo real: preservado integralmente.
- Categorias oficiais em `public.categories`: preservadas integralmente.
