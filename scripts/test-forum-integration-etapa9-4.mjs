import assert from "node:assert/strict";
import fs from "node:fs";
import { registerHooks } from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");
const SRC_ROOT = path.join(ROOT, "src");

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "@/lib/supabase/client") {
      return {
        url: "data:text/javascript,export function createClient(){throw new Error('Mock client required');}",
        shortCircuit: true,
      };
    }
    if (specifier.startsWith("@/")) {
      const candidate = path.join(SRC_ROOT, specifier.slice(2));
      for (const ext of [".ts", ".tsx", ".js", ".mjs"]) {
        if (fs.existsSync(candidate + ext)) {
          return nextResolve(pathToFileURL(candidate + ext).href, context);
        }
      }
      if (fs.existsSync(path.join(candidate, "index.ts"))) {
        return nextResolve(
          pathToFileURL(path.join(candidate, "index.ts")).href,
          context
        );
      }
    }
    if (
      (specifier.startsWith("./") || specifier.startsWith("../")) &&
      context.parentURL &&
      !path.extname(specifier)
    ) {
      const parentDir = path.dirname(fileURLToPath(context.parentURL));
      const candidate = path.resolve(parentDir, specifier);
      for (const ext of [".ts", ".tsx", ".js", ".mjs"]) {
        if (fs.existsSync(candidate + ext)) {
          return nextResolve(pathToFileURL(candidate + ext).href, context);
        }
      }
    }
    return nextResolve(specifier, context);
  },
});

const {
  createForumPost,
  createForumTopic,
  fetchForumCategories,
  fetchForumTopicDetail,
  queryForumTopics,
  setAcceptedForumPost,
  togglePostVote,
  updateForumPost,
  updateForumTopic,
} = await import("../src/features/forum/forum-service.ts");

const UUIDS = {
  catWeb: "11111111-1111-4111-8111-111111111111",
  catNet: "22222222-2222-4222-8222-222222222222",
  userA: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  userB: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  topic1: "33333333-3333-4333-8333-333333333331",
  topic2: "33333333-3333-4333-8333-333333333332",
  topicHidden: "33333333-3333-4333-8333-333333333333",
  topicDeleted: "33333333-3333-4333-8333-333333333334",
  topicLocked: "33333333-3333-4333-8333-333333333335",
  post1: "44444444-4444-4444-8444-444444444441",
  post2: "44444444-4444-4444-8444-444444444442",
  postHidden: "44444444-4444-4444-8444-444444444443",
  tagXss: "55555555-5555-4555-8555-555555555551",
};

function createMockDatabase() {
  return {
    categories: [
      {
        id: UUIDS.catWeb,
        slug: "web-appsec",
        name_en: "Web AppSec",
        name_pt: "Segurança Web",
        description_en: "Web security",
        description_pt: "Segurança web",
        scope: "both",
        sort_order: 1,
        is_active: true,
      },
      {
        id: UUIDS.catNet,
        slug: "network-sec",
        name_en: "Network Security",
        name_pt: "Redes",
        description_en: "Network",
        description_pt: "Redes",
        scope: "forum",
        sort_order: 2,
        is_active: true,
      },
    ],
    public_profiles: [
      {
        id: UUIDS.userA,
        username: "alice_sec",
        display_name: "Alice",
        avatar_url: null,
      },
      {
        id: UUIDS.userB,
        username: "bob_blue",
        display_name: "Bob",
        avatar_url: null,
      },
    ],
    topics: [
      {
        id: UUIDS.topic1,
        author_id: UUIDS.userA,
        category_id: UUIDS.catWeb,
        title: "Mitigando XSS armazenado em SPAs React",
        body: "Discussão técnica sobre sanitização de URLs e CSP estrita.",
        status: "published",
        is_pinned: true,
        is_locked: false,
        accepted_post_id: UUIDS.post1,
        last_activity_at: "2026-11-15T12:00:00Z",
        created_at: "2026-11-14T10:00:00Z",
        updated_at: "2026-11-15T12:00:00Z",
      },
      {
        id: UUIDS.topic2,
        author_id: UUIDS.userB,
        category_id: UUIDS.catNet,
        title: "Hardening de SSH e chaves Ed25519",
        body: "Boas práticas de configuração de sshd_config em produção.",
        status: "published",
        is_pinned: false,
        is_locked: false,
        accepted_post_id: null,
        last_activity_at: "2026-11-15T11:00:00Z",
        created_at: "2026-11-15T09:00:00Z",
        updated_at: "2026-11-15T09:00:00Z",
      },
      {
        id: UUIDS.topicHidden,
        author_id: UUIDS.userA,
        category_id: UUIDS.catWeb,
        title: "Tópico oculto por moderação",
        body: "Conteúdo oculto que não deve aparecer na listagem pública.",
        status: "hidden",
        is_pinned: false,
        is_locked: false,
        accepted_post_id: null,
        last_activity_at: "2026-11-15T13:00:00Z",
        created_at: "2026-11-15T13:00:00Z",
        updated_at: "2026-11-15T13:00:00Z",
      },
      {
        id: UUIDS.topicDeleted,
        author_id: UUIDS.userA,
        category_id: UUIDS.catWeb,
        title: "Tópico excluído",
        body: "Conteúdo excluído que não deve aparecer.",
        status: "deleted",
        is_pinned: false,
        is_locked: false,
        accepted_post_id: null,
        last_activity_at: "2026-11-15T14:00:00Z",
        created_at: "2026-11-15T14:00:00Z",
        updated_at: "2026-11-15T14:00:00Z",
      },
      {
        id: UUIDS.topicLocked,
        author_id: UUIDS.userA,
        category_id: UUIDS.catWeb,
        title: "Tópico bloqueado para discussão",
        body: "Discussão encerrada pela moderação.",
        status: "published",
        is_pinned: false,
        is_locked: true,
        accepted_post_id: null,
        last_activity_at: "2026-11-13T10:00:00Z",
        created_at: "2026-11-13T10:00:00Z",
        updated_at: "2026-11-13T10:00:00Z",
      },
    ],
    posts: [
      {
        id: UUIDS.post1,
        topic_id: UUIDS.topic1,
        author_id: UUIDS.userB,
        body: "Use `getSafeExternalHref` e nunca injete `dangerouslySetInnerHTML`.",
        status: "published",
        vote_count: 3,
        created_at: "2026-11-15T10:00:00Z",
        updated_at: "2026-11-15T10:00:00Z",
      },
      {
        id: UUIDS.postHidden,
        topic_id: UUIDS.topic1,
        author_id: UUIDS.userA,
        body: "Resposta ocultada pela moderação.",
        status: "hidden",
        vote_count: 0,
        created_at: "2026-11-15T10:30:00Z",
        updated_at: "2026-11-15T10:30:00Z",
      },
    ],
    tags: [
      {
        id: UUIDS.tagXss,
        slug: "xss",
        name: "xss",
        created_at: "2026-11-10T00:00:00Z",
      },
    ],
    topic_tags: [
      {
        topic_id: UUIDS.topic1,
        tag_id: UUIDS.tagXss,
      },
    ],
    votes: [],
  };
}

function createMockSupabase({
  db,
  currentUserId = null,
  forceErrorTable = null,
  recordedPayloads = [],
} = {}) {
  const client = {
    auth: {
      async getUser() {
        return {
          data: { user: currentUserId ? { id: currentUserId } : null },
          error: null,
        };
      },
    },
    async rpc(fnName, args) {
      recordedPayloads.push({ rpc: fnName, args });
      if (fnName === "set_accepted_post") {
        if (!currentUserId) {
          return { error: { code: "42501", message: "forbidden" } };
        }
        const topic = db.topics.find((t) => t.id === args.p_topic_id);
        if (!topic) {
          return { error: { code: "P0002", message: "topic not found" } };
        }
        if (topic.is_locked) {
          return { error: { code: "22023", message: "topic is locked" } };
        }
        if (topic.author_id !== currentUserId) {
          return { error: { code: "42501", message: "forbidden" } };
        }
        topic.accepted_post_id = args.p_post_id ?? null;
        return { data: null, error: null };
      }
      return { error: { message: "unknown rpc" } };
    },
    from(table) {
      const state = {
        op: "select",
        filters: [],
        orders: [],
        range: null,
        countMode: null,
        payload: null,
        singleMode: null,
      };

      const execute = () => {
        if (forceErrorTable === table) {
          return {
            data: null,
            count: null,
            error: { message: `Simulated database failure on ${table}` },
          };
        }

        if (state.op === "insert") {
          recordedPayloads.push({ table, op: "insert", payload: state.payload });
          if (table === "topics") {
            if (!currentUserId) {
              return { data: null, error: { code: "42501", message: "RLS denied" } };
            }
            const newId = `33333333-3333-4333-8333-${String(db.topics.length + 100).padStart(12, "0")}`;
            const now = new Date().toISOString();
            const row = {
              id: newId,
              author_id: currentUserId,
              category_id: state.payload.category_id,
              title: state.payload.title,
              body: state.payload.body,
              status: "published",
              is_pinned: false,
              is_locked: false,
              accepted_post_id: null,
              last_activity_at: now,
              created_at: now,
              updated_at: now,
            };
            db.topics.push(row);
            return { data: row, error: null };
          }
          if (table === "posts") {
            if (!currentUserId) {
              return { data: null, error: { code: "42501", message: "RLS denied" } };
            }
            const topic = db.topics.find((t) => t.id === state.payload.topic_id);
            if (!topic || topic.is_locked || topic.status !== "published") {
              return { data: null, error: { code: "42501", message: "topic locked or invalid" } };
            }
            const newId = `44444444-4444-4444-8444-${String(db.posts.length + 100).padStart(12, "0")}`;
            const now = new Date().toISOString();
            const row = {
              id: newId,
              topic_id: state.payload.topic_id,
              author_id: currentUserId,
              body: state.payload.body,
              status: "published",
              vote_count: 0,
              created_at: now,
              updated_at: now,
            };
            db.posts.push(row);
            return { data: row, error: null };
          }
          if (table === "tags") {
            const existing = db.tags.find((t) => t.slug === state.payload.slug);
            if (existing) {
              return { data: null, error: { code: "23505", message: "duplicate tag" } };
            }
            const row = {
              id: `55555555-5555-4555-8555-${String(db.tags.length + 100).padStart(12, "0")}`,
              slug: state.payload.slug,
              name: state.payload.name,
              created_at: new Date().toISOString(),
            };
            db.tags.push(row);
            return { data: row, error: null };
          }
          if (table === "topic_tags") {
            const items = Array.isArray(state.payload) ? state.payload : [state.payload];
            for (const item of items) {
              db.topic_tags.push(item);
            }
            return { data: items, error: null };
          }
          if (table === "votes") {
            if (!currentUserId) {
              return { data: null, error: { code: "42501", message: "RLS denied" } };
            }
            const post = db.posts.find((p) => p.id === state.payload.post_id);
            if (!post || post.status !== "published" || post.author_id === currentUserId) {
              return {
                data: null,
                error: { code: "42501", message: "cannot vote on own or non-published post" },
              };
            }
            const dup = db.votes.find(
              (v) => v.user_id === currentUserId && v.post_id === state.payload.post_id
            );
            if (dup) {
              return { data: null, error: { code: "23505", message: "duplicate vote" } };
            }
            db.votes.push({
              user_id: currentUserId,
              post_id: state.payload.post_id,
              created_at: new Date().toISOString(),
            });
            post.vote_count += 1;
            return { data: null, error: null };
          }
        }

        if (state.op === "update") {
          recordedPayloads.push({ table, op: "update", payload: state.payload, filters: state.filters });
          let rows = [...(db[table] ?? [])];
          for (const f of state.filters) {
            rows = rows.filter((r) => (f.type === "eq" ? r[f.col] === f.val : true));
          }
          if (rows.length === 0) {
            return { data: null, error: null };
          }
          const target = rows[0];
          if (table === "topics" && (target.author_id !== currentUserId || target.is_locked)) {
            return { data: null, error: { code: "42501", message: "RLS update denied" } };
          }
          Object.assign(target, state.payload, { updated_at: new Date().toISOString() });
          return { data: target, error: null };
        }

        if (state.op === "delete") {
          if (table === "votes") {
            const postIdFilter = state.filters.find((f) => f.col === "post_id")?.val;
            const userIdFilter = state.filters.find((f) => f.col === "user_id")?.val;
            const idx = db.votes.findIndex(
              (v) => v.post_id === postIdFilter && v.user_id === userIdFilter
            );
            if (idx !== -1) {
              db.votes.splice(idx, 1);
              const post = db.posts.find((p) => p.id === postIdFilter);
              if (post) {
                post.vote_count = Math.max(0, post.vote_count - 1);
              }
            }
            return { data: null, error: null };
          }
        }

        // SELECT
        let rows = [...(db[table] ?? [])];
        for (const f of state.filters) {
          if (f.type === "eq") {
            rows = rows.filter((r) => r[f.col] === f.val);
          } else if (f.type === "in") {
            rows = rows.filter((r) => f.val.includes(r[f.col]));
          } else if (f.type === "not_is_null") {
            rows = rows.filter((r) => r[f.col] !== null && r[f.col] !== undefined);
          } else if (f.type === "not_in") {
            rows = rows.filter((r) => !f.val.includes(r[f.col]));
          } else if (f.type === "or_ilike") {
            const q = f.term.toLowerCase();
            rows = rows.filter(
              (r) =>
                String(r.title ?? "").toLowerCase().includes(q) ||
                String(r.body ?? "").toLowerCase().includes(q)
            );
          }
        }

        for (let i = state.orders.length - 1; i >= 0; i -= 1) {
          const o = state.orders[i];
          rows.sort((a, b) => {
            const av = a[o.col];
            const bv = b[o.col];
            if (av === bv) return 0;
            if (typeof av === "boolean" && typeof bv === "boolean") {
              return o.ascending ? Number(av) - Number(bv) : Number(bv) - Number(av);
            }
            return o.ascending
              ? String(av).localeCompare(String(bv))
              : String(bv).localeCompare(String(av));
          });
        }

        const totalCount = rows.length;
        if (state.range) {
          rows = rows.slice(state.range.from, state.range.to + 1);
        }

        if (state.singleMode === "maybeSingle") {
          return { data: rows[0] ?? null, count: totalCount, error: null };
        }
        if (state.singleMode === "single") {
          return rows[0]
            ? { data: rows[0], count: totalCount, error: null }
            : { data: null, count: totalCount, error: { code: "PGRST116", message: "not found" } };
        }
        return { data: rows, count: totalCount, error: null };
      };

      const builder = {
        select(_cols, opts) {
          if (opts?.count) state.countMode = opts.count;
          return builder;
        },
        insert(payload) {
          state.op = "insert";
          state.payload = payload;
          return builder;
        },
        update(payload) {
          state.op = "update";
          state.payload = payload;
          return builder;
        },
        delete() {
          state.op = "delete";
          return builder;
        },
        eq(col, val) {
          state.filters.push({ type: "eq", col, val });
          return builder;
        },
        in(col, val) {
          state.filters.push({ type: "in", col, val });
          return builder;
        },
        not(col, op, val) {
          if (op === "is" && val === null) {
            state.filters.push({ type: "not_is_null", col });
          } else if (op === "in") {
            const ids = String(val)
              .replace(/^\(|\)$/g, "")
              .split(",")
              .filter(Boolean);
            state.filters.push({ type: "not_in", col, val: ids });
          }
          return builder;
        },
        or(expr) {
          const m = String(expr).match(/ilike\.%([^%]+)%/);
          if (m) {
            state.filters.push({ type: "or_ilike", term: m[1] });
          }
          return builder;
        },
        order(col, opts) {
          state.orders.push({ col, ascending: opts?.ascending ?? true });
          return builder;
        },
        range(from, to) {
          state.range = { from, to };
          return builder;
        },
        maybeSingle() {
          state.singleMode = "maybeSingle";
          return Promise.resolve(execute());
        },
        single() {
          state.singleMode = "single";
          return Promise.resolve(execute());
        },
        then(resolve, reject) {
          return Promise.resolve(execute()).then(resolve, reject);
        },
      };

      return builder;
    },
  };

  return client;
}

async function run() {
  console.log("=== ETAPA 9.4 — FORUM SUPABASE INTEGRATION TESTS ===");

  // 1 & 17. Public listing excludes hidden/deleted
  {
    const db = createMockDatabase();
    const client = createMockSupabase({ db });
    const cats = await fetchForumCategories({ client });
    assert.equal(cats.status, "success");
    assert.equal(cats.categories.length, 2);

    const res = await queryForumTopics({}, { categories: cats.categories, client });
    assert.equal(res.status, "success");
    assert.equal(res.items.length, 3);
    assert.ok(res.items.every((t) => t.status === "published"));
    assert.equal(res.items[0].id, UUIDS.topic1); // pinned first
    console.log("  ✓ 1 & 17. Listagem publicada exclui hidden e deleted");
  }

  // 2. Search topic & fetch detail
  {
    const db = createMockDatabase();
    const client = createMockSupabase({ db });
    const res = await queryForumTopics({ search: "Ed25519" }, { client });
    assert.equal(res.status, "success");
    assert.equal(res.items.length, 1);
    assert.equal(res.items[0].id, UUIDS.topic2);

    const hiddenDetail = await fetchForumTopicDetail(UUIDS.topicHidden, { client });
    assert.equal(hiddenDetail.status, "not_found");
    console.log("  ✓ 2 & 17. Busca de tópico e bloqueio de detalhe hidden/deleted");
  }

  // 3. Pagination
  {
    const db = createMockDatabase();
    const client = createMockSupabase({ db });
    const page1 = await queryForumTopics({ page: 1, pageSize: 2 }, { client });
    const page2 = await queryForumTopics({ page: 2, pageSize: 2 }, { client });
    assert.equal(page1.items.length, 2);
    assert.equal(page2.items.length, 1);
    assert.equal(page1.totalCount, 3);
    assert.equal(page1.totalPages, 2);
    console.log("  ✓ 3. Paginação real via count e range");
  }

  // 4. Filter by tag
  {
    const db = createMockDatabase();
    const client = createMockSupabase({ db });
    const tagged = await queryForumTopics({ tag: "xss" }, { client });
    assert.equal(tagged.status, "success");
    assert.equal(tagged.items.length, 1);
    assert.equal(tagged.items[0].id, UUIDS.topic1);
    console.log("  ✓ 4. Filtro por tag via tags/topic_tags");
  }

  // 5 & 6. Create topic authenticated vs unauthenticated
  {
    const db = createMockDatabase();
    const anonClient = createMockSupabase({ db, currentUserId: null });
    const unauthRes = await createForumTopic(
      {
        title: "Novo tópico sem sessão",
        body: "Corpo com mais de dez caracteres.",
        categoryId: UUIDS.catWeb,
        tags: ["appsec"],
      },
      { client: anonClient }
    );
    assert.equal(unauthRes.status, "error");
    assert.equal(unauthRes.errorCode, "unauthenticated");

    const recorded = [];
    const authClient = createMockSupabase({
      db,
      currentUserId: UUIDS.userA,
      recordedPayloads: recorded,
    });
    const authRes = await createForumTopic(
      {
        title: "Novo tópico autenticado",
        body: "Corpo válido com mais de dez caracteres para teste.",
        categoryId: UUIDS.catWeb,
        tags: ["appsec", "xss"],
      },
      { client: authClient }
    );
    assert.equal(authRes.status, "success");
    const topicInsert = recorded.find((r) => r.table === "topics" && r.op === "insert");
    assert.deepEqual(Object.keys(topicInsert.payload).sort(), [
      "body",
      "category_id",
      "title",
    ]);
    console.log("  ✓ 5 & 6. Criação autenticada (3 colunas) e bloqueio anônimo");
  }

  // 7 & 8. Edit own topic vs third-party topic
  {
    const db = createMockDatabase();
    const clientB = createMockSupabase({ db, currentUserId: UUIDS.userB });
    const thirdPartyRes = await updateForumTopic(
      UUIDS.topic1,
      {
        title: "Tentativa IDOR em tópico alheio",
        body: "Não deveria conseguir editar.",
        categoryId: UUIDS.catWeb,
      },
      { client: clientB }
    );
    assert.equal(thirdPartyRes.status, "error");
    assert.equal(thirdPartyRes.errorCode, "rls_denied");

    const clientA = createMockSupabase({ db, currentUserId: UUIDS.userA });
    const ownRes = await updateForumTopic(
      UUIDS.topic1,
      {
        title: "Título atualizado pelo autor",
        body: "Corpo atualizado com sucesso pelo autor original.",
        categoryId: UUIDS.catWeb,
      },
      { client: clientA }
    );
    assert.equal(ownRes.status, "success");
    assert.equal(ownRes.topic.title, "Título atualizado pelo autor");
    console.log("  ✓ 7 & 8. Edição do próprio tópico e bloqueio de terceiro (IDOR)");
  }

  // 9, 10 & 11. Create reply, block authorship manipulation, list published replies
  {
    const db = createMockDatabase();
    const recorded = [];
    const clientB = createMockSupabase({
      db,
      currentUserId: UUIDS.userB,
      recordedPayloads: recorded,
    });

    const spoofed = await createForumTopic(
      {
        title: "Tentativa de spoof",
        body: "Tentando enviar author_id arbitrário.",
        categoryId: UUIDS.catWeb,
        author_id: UUIDS.userA,
      },
      { client: clientB }
    );
    assert.equal(spoofed.status, "error");
    assert.equal(spoofed.errorCode, "validation_error");

    const spoofedPost = await createForumPost(
      {
        topicId: UUIDS.topic1,
        body: "Resposta tentando manipular vote_count.",
        vote_count: 999,
      },
      { client: clientB }
    );
    assert.equal(spoofedPost.status, "error");
    assert.equal(spoofedPost.errorCode, "validation_error");

    const validReply = await createForumPost(
      {
        topicId: UUIDS.topic1,
        body: "Excelente abordagem com sanitização estrita.",
      },
      { client: clientB }
    );
    assert.equal(validReply.status, "success");

    const editPostRes = await updateForumPost(
      validReply.post.id,
      { body: "Resposta editada pelo autor." },
      { client: clientB }
    );
    assert.equal(editPostRes.status, "success");

    const detail = await fetchForumTopicDetail(UUIDS.topic1, { client: clientB });
    assert.equal(detail.status, "found");
    assert.equal(detail.posts.length, 2); // excludes postHidden
    assert.ok(detail.posts.every((p) => p.status === "published"));
    console.log("  ✓ 9, 10 & 11. Criação/edição de resposta, listagem publicada e bloqueio de autoria");
  }

  // 12, 13 & 14. Post votes: add, duplicate/self-vote prevention, remove
  {
    const db = createMockDatabase();
    const recorded = [];
    const clientA = createMockSupabase({
      db,
      currentUserId: UUIDS.userA,
      recordedPayloads: recorded,
    });

    // userA votes on post1 (authored by userB, initial vote_count=3)
    const voteAdd = await togglePostVote(UUIDS.post1, false, { client: clientA });
    assert.equal(voteAdd.status, "success");
    assert.equal(voteAdd.voted, true);
    assert.equal(voteAdd.voteCount, 4);

    const voteInsert = recorded.find((r) => r.table === "votes" && r.op === "insert");
    assert.deepEqual(Object.keys(voteInsert.payload), ["post_id"]);

    // Duplicate vote attempt handled idempotently (23505)
    const voteDup = await togglePostVote(UUIDS.post1, false, { client: clientA });
    assert.equal(voteDup.status, "success");
    assert.equal(voteDup.voted, true);
    assert.equal(voteDup.voteCount, 4);

    // Remove vote
    const voteRemove = await togglePostVote(UUIDS.post1, true, { client: clientA });
    assert.equal(voteRemove.status, "success");
    assert.equal(voteRemove.voted, false);
    assert.equal(voteRemove.voteCount, 3);

    // Self-vote blocked by RLS (userB voting on own post1)
    const clientB = createMockSupabase({ db, currentUserId: UUIDS.userB });
    const selfVote = await togglePostVote(UUIDS.post1, false, { client: clientB });
    assert.equal(selfVote.status, "error");
    assert.equal(selfVote.errorCode, "rls_denied");
    console.log("  ✓ 12, 13 & 14. Voto em post, remoção, idempotência 23505 e bloqueio de auto-voto");
  }

  // 15 & 16. Accepted post RPC (authorized vs unauthorized vs locked)
  {
    const db = createMockDatabase();
    const clientB = createMockSupabase({ db, currentUserId: UUIDS.userB });
    const unauthAccept = await setAcceptedForumPost(UUIDS.topic1, UUIDS.post1, {
      client: clientB,
    });
    assert.equal(unauthAccept.status, "error");
    assert.equal(unauthAccept.errorCode, "rls_denied");

    const clientA = createMockSupabase({ db, currentUserId: UUIDS.userA });
    const unmarkRes = await setAcceptedForumPost(UUIDS.topic1, null, {
      client: clientA,
    });
    assert.equal(unmarkRes.status, "success");
    assert.equal(unmarkRes.acceptedPostId, null);

    const markRes = await setAcceptedForumPost(UUIDS.topic1, UUIDS.post1, {
      client: clientA,
    });
    assert.equal(markRes.status, "success");
    assert.equal(markRes.acceptedPostId, UUIDS.post1);

    const lockedRes = await setAcceptedForumPost(UUIDS.topicLocked, UUIDS.post1, {
      client: clientA,
    });
    assert.equal(lockedRes.status, "error");
    assert.equal(lockedRes.errorCode, "locked");
    console.log("  ✓ 15 & 16. RPC set_accepted_post autorizada, bloqueio de terceiro e tópico bloqueado");
  }

  // 18 & 19. Supabase error handling & empty state
  {
    const db = createMockDatabase();
    const errClient = createMockSupabase({ db, forceErrorTable: "topics" });
    const errRes = await queryForumTopics({}, { client: errClient });
    assert.equal(errRes.status, "error");
    assert.ok(errRes.errorMessage);

    const okClient = createMockSupabase({ db });
    const emptyRes = await queryForumTopics(
      { search: "termo-inexistente-xyz" },
      { client: okClient }
    );
    assert.equal(emptyRes.status, "success");
    assert.equal(emptyRes.items.length, 0);
    console.log("  ✓ 18 & 19. Tratamento de erros do Supabase e estado vazio");
  }

  // 20. Isolation from INITIAL_TOPICS / INITIAL_POSTS / localStorage
  {
    const filesToCheck = [
      "src/features/forum/forum-service.ts",
      "src/features/forum/use-forum-store.ts",
      "src/app/forum/page.tsx",
      "src/app/forum/new/page.tsx",
      "src/app/forum/[id]/page.tsx",
      "src/app/page.tsx",
    ];
    for (const rel of filesToCheck) {
      const content = fs.readFileSync(path.join(ROOT, rel), "utf8");
      assert.ok(
        !content.includes("INITIAL_TOPICS") &&
          !content.includes("INITIAL_POSTS") &&
          !content.includes("FEATURED_TOPICS") &&
          !content.includes("cybersec_forum_user_"),
        `Demo seed/localStorage leakage detected in ${rel}`
      );
    }
    console.log("  ✓ 20. Separação estrita entre dados reais e demonstrativos");
  }

  console.log("=== ALL ETAPA 9.4 FORUM INTEGRATION TESTS PASSED ===");
}

run().catch((err) => {
  console.error("ETAPA 9.4 TEST FAILED:", err);
  process.exit(1);
});
