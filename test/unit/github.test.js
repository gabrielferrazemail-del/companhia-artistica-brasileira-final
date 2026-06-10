const { test, beforeEach } = require("node:test");
const assert = require("node:assert");
const gh = require("../../netlify/functions/utils/github");

beforeEach(() => { delete process.env.ADMIN_EMAILS; });

test("isAdmin is false for null user", () => {
  assert.strictEqual(gh.isAdmin(null), false);
});

test("isAdmin is true when user has the admin role", () => {
  assert.strictEqual(gh.isAdmin({ app_metadata: { roles: ["admin"] } }), true);
});

test("isAdmin matches an exact email in ADMIN_EMAILS", () => {
  process.env.ADMIN_EMAILS = "boss@x.com";
  assert.strictEqual(gh.isAdmin({ email: "boss@x.com" }), true);
});

test("isAdmin compares emails case-insensitively and trims whitespace", () => {
  process.env.ADMIN_EMAILS = " Boss@X.com , other@y.com ";
  assert.strictEqual(gh.isAdmin({ email: "BOSS@x.COM" }), true);
});

test("isAdmin reads the email from user_metadata as a fallback", () => {
  process.env.ADMIN_EMAILS = "boss@x.com";
  assert.strictEqual(gh.isAdmin({ user_metadata: { email: "boss@x.com" } }), true);
});

test("isAdmin is false when the email is not listed", () => {
  process.env.ADMIN_EMAILS = "boss@x.com";
  assert.strictEqual(gh.isAdmin({ email: "nope@x.com" }), false);
});

test("isAdmin is false when ADMIN_EMAILS is unset and no role", () => {
  assert.strictEqual(gh.isAdmin({ email: "someone@x.com" }), false);
});

// ---- Git Data API (fetch mockado) ----
const SHA40 = "f".repeat(40);

function mockFetch(calls) {
  return async (url, opts) => {
    const call = { url: String(url), method: opts.method, body: opts.body ? JSON.parse(opts.body) : null };
    calls.push(call);
    const ok = (json) => ({ ok: true, status: 200, json: async () => json, text: async () => "" });
    if (call.url.includes("/git/ref/heads/")) return ok({ object: { sha: "headsha" } });
    if (call.method === "GET" && call.url.includes("/git/commits/")) return ok({ tree: { sha: "basetree" } });
    if (call.url.endsWith("/git/blobs")) return ok({ sha: "createdblobsha" });
    if (call.url.endsWith("/git/trees")) return ok({ sha: "newtreesha" });
    if (call.url.endsWith("/git/commits")) return ok({ sha: "newcommitsha" });
    if (call.url.includes("/git/refs/heads/")) return ok({});
    return ok({});
  };
}

test("createBlob posts base64 content and returns the sha", async () => {
  const calls = [];
  const realFetch = global.fetch;
  global.fetch = mockFetch(calls);
  try {
    const sha = await gh.createBlob("QUJD");
    assert.strictEqual(sha, "createdblobsha");
    const post = calls.find((c) => c.url.endsWith("/git/blobs"));
    assert.deepStrictEqual(post.body, { content: "QUJD", encoding: "base64" });
  } finally {
    global.fetch = realFetch;
  }
});

test("commitFiles reuses blobSha entries without creating new blobs", async () => {
  const calls = [];
  const realFetch = global.fetch;
  global.fetch = mockFetch(calls);
  try {
    const sha = await gh.commitFiles([
      { path: "src/uploads/exposicoes/x/g1.gif", blobSha: SHA40 },
      { path: "src/_data/site.json", content: "{}" },
    ], "msg");
    assert.strictEqual(sha, "newcommitsha");
    // só o arquivo inline cria blob; o gif reusa o sha do upload-image
    const blobPosts = calls.filter((c) => c.method === "POST" && c.url.endsWith("/git/blobs"));
    assert.strictEqual(blobPosts.length, 1);
    const treePost = calls.find((c) => c.url.endsWith("/git/trees"));
    const gifEntry = treePost.body.tree.find((t) => t.path === "src/uploads/exposicoes/x/g1.gif");
    assert.strictEqual(gifEntry.sha, SHA40);
  } finally {
    global.fetch = realFetch;
  }
});
