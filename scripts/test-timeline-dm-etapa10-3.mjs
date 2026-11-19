import assert from "node:assert/strict";
import fs from "node:fs";
import { registerHooks } from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const srcRoot = path.join(rootDir, "src");

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "@/lib/supabase/server") {
      return {
        url: "data:text/javascript,export async function createClient(){return{};}",
        shortCircuit: true,
      };
    }
    if (specifier.startsWith("@/")) {
      const rel = specifier.slice(2);
      for (const candidate of [
        path.join(srcRoot, `${rel}.ts`),
        path.join(srcRoot, `${rel}.tsx`),
        path.join(srcRoot, rel, "index.ts"),
      ]) {
        if (fs.existsSync(candidate)) {
          return { url: pathToFileURL(candidate).href, shortCircuit: true };
        }
      }
    }
    if ((specifier.startsWith("./") || specifier.startsWith("../")) && !path.extname(specifier) && context.parentURL) {
      const parentDir = path.dirname(fileURLToPath(context.parentURL));
      for (const candidate of [
        path.resolve(parentDir, `${specifier}.ts`),
        path.resolve(parentDir, `${specifier}.tsx`),
        path.resolve(parentDir, specifier, "index.ts"),
      ]) {
        if (fs.existsSync(candidate)) {
          return { url: pathToFileURL(candidate).href, shortCircuit: true };
        }
      }
    }
    return nextResolve(specifier, context);
  },
});

const { isProtectedAppRoute } = await import("../src/lib/supabase/auth.ts");
const { createTimelinePost, fetchTimelineFeed, toggleTimelineTopicVote } = await import(
  "../src/features/timeline/timeline-service.ts"
);
const { validateTimelinePost } = await import("../src/features/timeline/validation.ts");
const { blockUser, isUserBlockedByMe, unblockUser } = await import(
  "../src/features/messages/block-service.ts"
);
const {
  editDirectMessage,
  fetchDmConversationDetail,
  fetchDmConversations,
  getOrCreateDmConversation,
  markDmConversationRead,
  reportDirectMessage,
  sendDirectMessage,
  setDmConversationArchived,
} = await import("../src/features/messages/dm-service.ts");
const { buildNotificationTargetHref } = await import(
  "../src/features/notifications/notification-service.ts"
);

const USER_A = "11111111-1111-4111-8111-111111111111";
const USER_B = "22222222-2222-4222-8222-222222222222";
const USER_C = "33333333-3333-4333-8333-333333333333";
const CONV_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const CAT_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

function makeCategories() {
  return [
    {
      id: CAT_ID,
      slug: "blue-team",
      code: "DEF-01",
      name_pt: "Blue Team",
      name_en: "Blue Team",
      description_pt: "Defesa",
      description_en: "Defense",
      accent: "cyan",
      sortOrder: 1,
    },
  ];
}

function createQueryChain(rowsFn) {
  const state = { filters: {}, single: false, limit: null };
  const chain = {
    select() { return chain; },
    eq(k, v) { state.filters[k] = v; return chain; },
    neq() { return chain; },
    in() { return chain; },
    or() { return chain; },
    ilike() { return chain; },
    order() { return chain; },
    limit(n) { state.limit = n; return chain; },
    range() { return chain; },
    maybeSingle() {
      const res = rowsFn(state);
      const data = Array.isArray(res.data) ? (res.data[0] ?? null) : res.data;
      return Promise.resolve({ data, error: res.error ?? null });
    },
    single() {
      const res = rowsFn(state);
      const data = Array.isArray(res.data) ? (res.data[0] ?? null) : res.data;
      return Promise.resolve({ data, error: res.error ?? null });
    },
    then(resolve) {
      return Promise.resolve(rowsFn(state)).then(resolve);
    },
  };
  return chain;
}

function makeTimelineClient({
  userId = USER_A,
  topics = [],
  insertError = null,
  voteError = null,
} = {}) {
  const insertedTopics = [];
  const votes = new Set();

  return {
    insertedTopics,
    votes,
    auth: {
      getUser: async () => ({
        data: { user: userId ? { id: userId } : null },
        error: null,
      }),
    },
    from(table) {
      if (table === "topics") {
        return {
          select() {
            return createQueryChain((st) => {
              let out = [...topics];
              if (st.filters.kind) {
                out = out.filter((t) => t.kind === st.filters.kind);
              }
              return { data: st.limit ? out.slice(0, st.limit) : out, error: null };
            });
          },
          insert(payload) {
            return {
              select() {
                return {
                  single: async () => {
                    if (insertError) return { data: null, error: insertError };
                    const created = {
                      id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
                      author_id: userId,
                      category_id: payload.category_id,
                      title: payload.title,
                      body: payload.body,
                      status: "published",
                      is_pinned: false,
                      is_locked: false,
                      accepted_post_id: null,
                      last_activity_at: "2026-11-19T12:00:00Z",
                      created_at: "2026-11-19T12:00:00Z",
                      kind: payload.kind,
                      shared_url: payload.shared_url ?? null,
                      resource_id: payload.resource_id ?? null,
                      vote_count: 0,
                    };
                    insertedTopics.push(created);
                    return { data: created, error: null };
                  },
                };
              },
            };
          },
        };
      }
      if (table === "topic_votes") {
        return {
          select() {
            return createQueryChain(() => ({
              data: Array.from(votes).map((id) => ({ topic_id: id })),
              error: null,
            }));
          },
          insert: async ({ topic_id }) => {
            if (voteError) return { error: voteError };
            votes.add(topic_id);
            return { error: null };
          },
          delete() {
            return {
              eq() { return this; },
              then(resolve) {
                votes.clear();
                return Promise.resolve({ error: voteError }).then(resolve);
              },
            };
          },
        };
      }
      if (table === "profiles") {
        return {
          select() {
            return createQueryChain(() => ({
              data: [{ id: USER_A, username: "ivymaia", display_name: "Ivy", avatar_url: null }],
              error: null,
            }));
          },
        };
      }
      if (table === "tags") {
        return {
          select() {
            return createQueryChain(() => ({ data: [{ id: "tag-1", slug: "osint" }], error: null }));
          },
          insert() {
            return {
              select() {
                return {
                  maybeSingle: async () => ({ data: { id: "tag-1" }, error: null }),
                };
              },
            };
          },
        };
      }
      return {
        select() { return createQueryChain(() => ({ data: [], error: null })); },
        insert: async () => ({ error: null }),
      };
    },
  };
}

async function run() {
  console.log("=== ETAPA 10.3 — TIMELINE SOCIAL & PRIVATE MESSAGES TESTS ===");

  // 1. Validation tests (types, note auto-title, URL safety)
  const noteVal = validateTimelinePost(
    { kind: "note", categoryId: CAT_ID, title: "", body: "Descoberta interessante sobre DNS tunneling.", sharedUrl: "javascript:alert(1)" },
    "pt-BR"
  );
  assert.equal(noteVal.valid, false);

  const validNote = validateTimelinePost(
    { kind: "note", categoryId: CAT_ID, title: "", body: "Dica rápida de OSINT com crt.sh", tagsInput: "osint, dns" },
    "pt-BR"
  );
  assert.equal(validNote.valid, true);
  assert.ok(validNote.normalizedTitle.length >= 5);
  assert.deepEqual(validNote.tags, ["osint", "dns"]);
  console.log("  ✓ 1. Validação de publicação, nota curta e sanitização de URL");

  // 2. Unauthenticated user blocked from feed & post creation
  const anonClient = makeTimelineClient({ userId: null });
  const anonFeed = await fetchTimelineFeed({}, { categories: makeCategories(), client: anonClient });
  assert.equal(anonFeed.status, "unauthenticated");
  const anonCreate = await createTimelinePost(
    { kind: "discussion", categoryId: CAT_ID, title: "Teste", body: "Conteúdo válido para teste." },
    "pt-BR",
    { categories: makeCategories(), client: anonClient }
  );
  assert.equal(anonCreate.status, "error");
  assert.equal(anonCreate.errorCode, "unauthenticated");
  console.log("  ✓ 2. Usuário não autenticado bloqueado no feed e criação");

  // 3. Create post + Feed filter + Pagination + UP toggle
  const sampleTopics = Array.from({ length: 4 }, (_, i) => ({
    id: `00000000-0000-4000-8000-00000000000${i + 1}`,
    author_id: USER_A,
    category_id: CAT_ID,
    title: `Tópico ${i + 1}`,
    body: "Conteúdo técnico de exemplo",
    status: "published",
    is_pinned: false,
    is_locked: false,
    accepted_post_id: null,
    last_activity_at: "2026-11-19T12:00:00Z",
    created_at: `2026-11-19T12:0${i}:00Z`,
    kind: i % 2 === 0 ? "question" : "tool_share",
    shared_url: null,
    resource_id: null,
    vote_count: i,
  }));

  const tlClient = makeTimelineClient({ topics: sampleTopics });
  const created = await createTimelinePost(
    { kind: "tool_share", categoryId: CAT_ID, title: "CyberChef Guide", body: "Excelente ferramenta de decoding.", sharedUrl: "https://gchq.github.io/CyberChef/", tagsInput: "osint" },
    "pt-BR",
    { categories: makeCategories(), client: tlClient }
  );
  assert.equal(created.status, "success");
  assert.equal(created.data.kind, "tool_share");

  const page1 = await fetchTimelineFeed({ kind: "all", sortBy: "newest", pageSize: 2 }, { categories: makeCategories(), client: tlClient });
  assert.equal(page1.status, "success");
  assert.equal(page1.items.length, 2);
  assert.equal(page1.hasMore, true);
  assert.ok(page1.nextCursor);

  const filtered = await fetchTimelineFeed({ kind: "question", pageSize: 10 }, { categories: makeCategories(), client: tlClient });
  assert.equal(filtered.items.every((t) => t.kind === "question"), true);

  const upRes = await toggleTimelineTopicVote(sampleTopics[0].id, false, "pt-BR", { client: tlClient });
  assert.equal(upRes.status, "success");
  assert.equal(upRes.data.voted, true);
  console.log("  ✓ 3. Timeline: criação, filtro por tipo, cursor pagination e UP");

  // 4. Protected routes check (/messages)
  assert.equal(isProtectedAppRoute("/messages"), true);
  assert.equal(isProtectedAppRoute(`/messages/${CONV_ID}`), true);
  console.log("  ✓ 4. Rotas /messages e /messages/[conversationId] protegidas em isProtectedAppRoute");

  // 5. Private Messages: start, send, rate limit (42901), block/suspended (42501), non-participant isolation
  const dmClient = {
    auth: { getUser: async () => ({ data: { user: { id: USER_A } }, error: null }) },
    rpc: async (fn, args) => {
      if (fn === "get_or_create_dm_conversation") {
        if (args.p_other_user_id === USER_C) return { data: null, error: { code: "42501", message: "blocked" } };
        return { data: CONV_ID, error: null };
      }
      if (fn === "send_direct_message") {
        if (args.p_body === "RATE_LIMIT") return { data: null, error: { code: "42901", message: "rate_limit" } };
        if (args.p_body === "BLOCKED") return { data: null, error: { code: "42501", message: "blocked" } };
        return { data: "dddddddd-dddd-4ddd-8ddd-dddddddddddd", error: null };
      }
      if (fn === "mark_dm_conversation_read") {
        return { data: "2026-11-19T12:05:00Z", error: null };
      }
      if (fn === "report_direct_message") {
        if (args.p_details === "DUP") return { data: null, error: { code: "23505", message: "duplicate" } };
        return { data: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee", error: null };
      }
      if (fn === "set_dm_conversation_archive" || fn === "edit_direct_message") {
        return { data: null, error: { code: "PGRST202", message: "Could not find the function" } };
      }
      return { data: null, error: null };
    },
    from(table) {
      if (table === "direct_conversations") {
        return {
          select() {
            return createQueryChain((st) => {
              if (st.filters.id && st.filters.id !== CONV_ID) return { data: [], error: null };
              return {
                data: [{
                  id: CONV_ID,
                  participant_low: USER_A,
                  participant_high: USER_B,
                  last_message_at: "2026-11-19T12:00:00Z",
                  created_at: "2026-11-19T11:00:00Z",
                }],
                error: null,
              };
            });
          },
        };
      }
      if (table === "direct_messages") {
        return {
          select() {
            return createQueryChain(() => ({
              data: [
                { id: "m-2", conversation_id: CONV_ID, sender_id: USER_B, body: "Olá!", status: "published", created_at: "2026-11-19T12:00:00Z", edited_at: null },
                { id: "m-1", conversation_id: CONV_ID, sender_id: USER_A, body: "Oi!", status: "published", created_at: "2026-11-19T11:59:00Z", edited_at: null },
              ],
              error: null,
            }));
          },
        };
      }
      if (table === "user_blocks") {
        return {
          select() { return createQueryChain(() => ({ data: [], error: null })); },
          insert: async () => ({ error: null }),
          delete() { return { eq() { return this; }, then(r) { return Promise.resolve({ error: null }).then(r); } }; },
        };
      }
      return {
        select() { return createQueryChain(() => ({ data: [{ id: USER_B, username: "peer_sec", display_name: "Peer" }], error: null })); },
      };
    },
  };

  const convOpen = await getOrCreateDmConversation(USER_B, "pt-BR", { client: dmClient });
  assert.equal(convOpen.status, "success");
  assert.equal(convOpen.data.conversationId, CONV_ID);

  const blockedOpen = await getOrCreateDmConversation(USER_C, "pt-BR", { client: dmClient });
  assert.equal(blockedOpen.status, "error");
  assert.equal(blockedOpen.errorCode, "blocked_or_suspended");

  const inbox = await fetchDmConversations({ client: dmClient });
  assert.equal(inbox.status, "success");
  assert.equal(inbox.items.length, 1);
  assert.equal(inbox.unreadConversationCount, 1);

  const detail = await fetchDmConversationDetail(CONV_ID, { client: dmClient });
  assert.equal(detail.status, "success");
  assert.equal(detail.messages.length, 2);

  // Non-participant / tampered URL conversation ID
  const tampered = await fetchDmConversationDetail("99999999-9999-4999-8999-999999999999", { client: dmClient });
  assert.equal(tampered.status, "not_found");

  const sentOk = await sendDirectMessage(CONV_ID, "Mensagem segura", "pt-BR", { client: dmClient });
  assert.equal(sentOk.status, "success");

  const rateLimited = await sendDirectMessage(CONV_ID, "RATE_LIMIT", "pt-BR", { client: dmClient });
  assert.equal(rateLimited.status, "error");
  assert.equal(rateLimited.errorCode, "rate_limited");

  const readOk = await markDmConversationRead(CONV_ID, "pt-BR", { client: dmClient });
  assert.equal(readOk.status, "success");

  const dupReport = await reportDirectMessage("m-2", "spam", "DUP", "pt-BR", { client: dmClient });
  assert.equal(dupReport.status, "error");
  assert.equal(dupReport.errorCode, "duplicate_report");

  const pendingRpc = await setDmConversationArchived(CONV_ID, true, "pt-BR", { client: dmClient });
  assert.equal(pendingRpc.status, "error");
  assert.equal(pendingRpc.errorCode, "migration_pending");

  const editPending = await editDirectMessage("m-1", "Novo texto", "en", { client: dmClient });
  assert.equal(editPending.status, "error");
  assert.equal(editPending.errorCode, "migration_pending");

  const blk = await blockUser(USER_C, "pt-BR", { client: dmClient });
  assert.equal(blk.status, "success");
  const unblk = await unblockUser(USER_C, "pt-BR", { client: dmClient });
  assert.equal(unblk.status, "success");
  await isUserBlockedByMe(USER_C, { client: dmClient });
  console.log("  ✓ 5. Mensagens Privadas: conversa, envio, rate limit 42901, bloqueio 42501, isolamento de URL e RPCs");

  // 6. Notification routing for direct_message (privacy: no DM body exposed)
  const dmHref = buildNotificationTargetHref(
    {
      id: "n-1",
      user_id: USER_A,
      type: "direct_message",
      actor_id: USER_B,
      topic_id: null,
      post_id: null,
      resource_id: null,
      conversation_id: CONV_ID,
      message_id: null,
      warning_id: null,
      read_at: null,
      created_at: "2026-11-19T12:00:00Z",
    },
    new Map()
  );
  assert.equal(dmHref, `/messages/${CONV_ID}`);
  console.log("  ✓ 6. Notificações de DM roteiam para /messages/[conversationId] sem expor conteúdo");

  // 7. Static check: no service_role in new timeline/messages files
  for (const rel of [
    "src/features/timeline/timeline-service.ts",
    "src/features/messages/dm-service.ts",
    "src/features/messages/block-service.ts",
  ]) {
    const content = fs.readFileSync(path.join(process.cwd(), rel), "utf8");
    assert.equal(content.includes("service_role"), false, `${rel} must not use service_role`);
  }
  console.log("  ✓ 7. Verificação estática: zero uso de service_role");

  console.log("=== ALL ETAPA 10.3 TIMELINE & DM TESTS PASSED ===");
}

run().catch((err) => {
  console.error("TEST FAILED:", err);
  process.exit(1);
});
