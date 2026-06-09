// Helpers compartilhados de acesso ao GitHub + auth (usados pelas functions do painel).
const matter = require("gray-matter");

const REPO = process.env.GITHUB_REPO;        // ex.: "usuario/coletivo-site"
const BRANCH = process.env.GITHUB_BRANCH || "main";
const TOKEN = process.env.GITHUB_TOKEN;
const API = "https://api.github.com/repos/" + REPO;

function configured() {
  return !!(REPO && TOKEN);
}

function headers() {
  return {
    Authorization: "token " + TOKEN,
    Accept: "application/vnd.github+json",
    "User-Agent": "coletivo-site",
    "Content-Type": "application/json",
  };
}

async function gh(method, path, body) {
  const res = await fetch(API + path, {
    method,
    headers: headers(),
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 404) return { _notFound: true };
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(method + " " + path + " -> " + res.status + " " + txt);
  }
  return res.json();
}

// ---- Auth ----
function getUser(context) {
  return (context && context.clientContext && context.clientContext.user) || null;
}
function isAdmin(user) {
  if (!user) return false;
  const roles = (user.app_metadata && user.app_metadata.roles) || [];
  if (roles.indexOf("admin") !== -1) return true;
  // Comparação de e-mail case-insensitive (evita falha boba de configuração).
  const adminEmails = (process.env.ADMIN_EMAILS || "")
    .split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  const email = (user.email || (user.user_metadata && user.user_metadata.email) || "").trim().toLowerCase();
  return !!(email && adminEmails.indexOf(email) !== -1);
}

// Resolve o slug do artista logado: primeiro pelo campo email nos .md, depois por user_metadata.
async function artistSlugForUser(user) {
  const email = (user && (user.email || (user.user_metadata && user.user_metadata.email))) || "";
  if (email) {
    try {
      const files = await listDir("src/artistas");
      for (const f of files) {
        if (!f.name.endsWith(".md")) continue;
        const raw = await readFile("src/artistas/" + f.name);
        if (!raw) continue;
        const parsed = matter(raw);
        if (parsed.data && parsed.data.email === email) {
          return parsed.data.slug || f.name.replace(/\.md$/, "");
        }
      }
    } catch (e) { /* continua para o fallback */ }
  }
  return (user && user.user_metadata && user.user_metadata.artist_slug) || null;
}

// ---- Contents API (leitura/listagem/exclusão) ----
function encodePath(p) {
  return encodeURIComponent(p).replace(/%2F/g, "/");
}

async function getFile(path) {
  const r = await gh("GET", "/contents/" + encodePath(path) + "?ref=" + encodeURIComponent(BRANCH));
  if (r._notFound) return null;
  return r; // { content (base64), sha, ... }
}

async function readFile(path) {
  const f = await getFile(path);
  if (!f) return null;
  return Buffer.from(f.content, "base64").toString("utf8");
}

async function listDir(path) {
  const r = await gh("GET", "/contents/" + encodePath(path) + "?ref=" + encodeURIComponent(BRANCH));
  if (r._notFound) return [];
  return Array.isArray(r) ? r : [];
}

async function deleteFile(path, message) {
  const f = await getFile(path);
  if (!f) return { ok: true, missing: true };
  await gh("DELETE", "/contents/" + encodePath(path), { message, sha: f.sha, branch: BRANCH });
  return { ok: true };
}

// ---- Git Data API: commit único com vários arquivos ----
// files: [{ path, content?:string(utf8), contentBase64?:string }]
async function commitFiles(files, message) {
  const ref = await gh("GET", "/git/ref/heads/" + encodeURIComponent(BRANCH));
  if (ref._notFound) throw new Error("branch não encontrado: " + BRANCH);
  const headSha = ref.object.sha;
  const baseCommit = await gh("GET", "/git/commits/" + headSha);
  const baseTreeSha = baseCommit.tree.sha;

  const tree = [];
  for (const f of files) {
    let blobSha;
    if (f.contentBase64 != null) {
      const blob = await gh("POST", "/git/blobs", { content: f.contentBase64, encoding: "base64" });
      blobSha = blob.sha;
    } else {
      const blob = await gh("POST", "/git/blobs", { content: f.content || "", encoding: "utf-8" });
      blobSha = blob.sha;
    }
    tree.push({ path: f.path, mode: "100644", type: "blob", sha: blobSha });
  }

  const newTree = await gh("POST", "/git/trees", { base_tree: baseTreeSha, tree });
  const commit = await gh("POST", "/git/commits", { message, tree: newTree.sha, parents: [headSha] });
  await gh("PATCH", "/git/refs/heads/" + encodeURIComponent(BRANCH), { sha: commit.sha });
  return commit.sha;
}

// ---- Respostas HTTP ----
function json(statusCode, obj) {
  return { statusCode, headers: { "Content-Type": "application/json" }, body: JSON.stringify(obj) };
}
function text(statusCode, msg) {
  return { statusCode, body: msg };
}

module.exports = {
  REPO, BRANCH, configured, matter,
  getUser, isAdmin, artistSlugForUser,
  getFile, readFile, listDir, deleteFile, commitFiles,
  json, text,
};
