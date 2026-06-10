// Helpers puros compartilhados pelas functions (save-site, save-exposicao,
// save-artista, update-profile, upload-image). Sem I/O — fáceis de testar.

// Normaliza string: retorna "" para não-string; trim; corta em `max` se informado.
function clean(s, max) {
  if (typeof s !== "string") return "";
  const t = s.trim();
  return max ? t.slice(0, max) : t;
}

// Extensão de um upload { name, type }: primeiro pelo nome, depois pelo mime,
// por fim o fallback (padrão "png").
function extFromUpload(up, fallback) {
  up = up || {};
  const byName = String(up.name || "").split(".").pop().toLowerCase();
  if (/^(jpg|jpeg|png|webp|gif|svg)$/.test(byName)) return byName === "jpeg" ? "jpg" : byName;
  const map = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
    "image/svg+xml": "svg",
  };
  return map[up.type] || fallback || "png";
}

// Upload de imagem vindo do cliente: { dataBase64 } (conteúdo embutido) ou
// { blobSha } (blob já criado no GitHub via upload-image).
function isUpload(up) {
  return !!(up && typeof up === "object" && (up.dataBase64 || up.blobSha));
}

// Monta a entrada de arquivo p/ commitFiles a partir de um upload.
// Retorna null se o valor não for um upload válido.
function uploadFileEntry(up, repoPath) {
  if (!up || typeof up !== "object") return null;
  if (typeof up.blobSha === "string" && /^[0-9a-f]{40}$/i.test(up.blobSha)) {
    return { path: repoPath, blobSha: up.blobSha };
  }
  if (typeof up.dataBase64 === "string" && up.dataBase64) {
    return { path: repoPath, contentBase64: up.dataBase64 };
  }
  return null;
}

module.exports = { clean, extFromUpload, isUpload, uploadFileEntry };
