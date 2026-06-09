const { test } = require("node:test");
const assert = require("node:assert");
const { clean, extFromUpload } = require("../../netlify/functions/utils/site-helpers");

test("clean trims a string", () => {
  assert.strictEqual(clean("  hi  "), "hi");
});

test("clean truncates to max length", () => {
  assert.strictEqual(clean("abcdef", 3), "abc");
});

test("clean returns empty for non-strings", () => {
  assert.strictEqual(clean(null), "");
  assert.strictEqual(clean(undefined), "");
  assert.strictEqual(clean(42), "");
});

test("clean without max keeps full trimmed value", () => {
  assert.strictEqual(clean("  long value  "), "long value");
});

test("extFromUpload resolves by file extension (case-insensitive)", () => {
  assert.strictEqual(extFromUpload({ name: "photo.PNG" }), "png");
  assert.strictEqual(extFromUpload({ name: "a.jpeg" }), "jpg");
  assert.strictEqual(extFromUpload({ name: "anim.gif" }), "gif");
});

test("extFromUpload falls back to mime type when name has no extension", () => {
  assert.strictEqual(extFromUpload({ name: "noext", type: "image/webp" }), "webp");
  assert.strictEqual(extFromUpload({ name: "", type: "image/png" }), "png");
});

test("extFromUpload default fallback is png", () => {
  assert.strictEqual(extFromUpload({ name: "", type: "application/octet-stream" }), "png");
});

test("extFromUpload honors fallback override", () => {
  assert.strictEqual(extFromUpload({ name: "", type: "weird" }, "jpg"), "jpg");
});
