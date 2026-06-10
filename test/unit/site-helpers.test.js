const { test } = require("node:test");
const assert = require("node:assert");
const { clean, extFromUpload, isUpload, uploadFileEntry } = require("../../netlify/functions/utils/site-helpers");

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

const SHA40 = "a".repeat(40);

test("isUpload detects dataBase64 and blobSha uploads", () => {
  assert.strictEqual(isUpload({ dataBase64: "QUJD" }), true);
  assert.strictEqual(isUpload({ blobSha: SHA40 }), true);
});

test("isUpload is false for strings, null and empty objects", () => {
  assert.strictEqual(isUpload("/uploads/x.jpg"), false);
  assert.strictEqual(isUpload(null), false);
  assert.strictEqual(isUpload({}), false);
});

test("uploadFileEntry prefers a valid blobSha", () => {
  assert.deepStrictEqual(
    uploadFileEntry({ blobSha: SHA40 }, "src/uploads/a.gif"),
    { path: "src/uploads/a.gif", blobSha: SHA40 }
  );
});

test("uploadFileEntry rejects malformed blobSha but accepts dataBase64", () => {
  assert.deepStrictEqual(
    uploadFileEntry({ blobSha: "nope", dataBase64: "QUJD" }, "src/uploads/a.jpg"),
    { path: "src/uploads/a.jpg", contentBase64: "QUJD" }
  );
});

test("uploadFileEntry returns null for non-uploads", () => {
  assert.strictEqual(uploadFileEntry("/uploads/x.jpg", "p"), null);
  assert.strictEqual(uploadFileEntry(null, "p"), null);
  assert.strictEqual(uploadFileEntry({}, "p"), null);
});
