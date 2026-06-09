// Helpers puros compartilhados pelas functions (save-site, update-profile).
// Sem I/O — fáceis de testar isoladamente.

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

module.exports = { clean, extFromUpload };
