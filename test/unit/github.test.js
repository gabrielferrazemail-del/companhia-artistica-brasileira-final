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
