// POST /.netlify/functions/delete-artista  (admin)  Body: { slug }
const gh = require("./utils/github");

exports.handler = async (event, context) => {
  if (event.httpMethod !== "POST") return gh.text(405, "Método não permitido.");
  const user = gh.getUser(context);
  if (!user) return gh.text(401, "Não autenticado.");
  if (!gh.isAdmin(user)) return gh.text(403, "Acesso restrito à administração.");
  if (!gh.configured()) return gh.text(500, "Função não configurada (GITHUB_REPO/GITHUB_TOKEN).");

  let payload;
  try { payload = JSON.parse(event.body || "{}"); } catch (e) { return gh.text(400, "Corpo inválido."); }
  const slug = String(payload.slug || "").trim();
  if (!/^[a-z0-9-]+$/.test(slug)) return gh.text(400, "Slug inválido.");

  try {
    await gh.deleteFile("src/artistas/" + slug + ".md", "Remove artista: " + slug);
    return gh.json(200, { ok: true });
  } catch (err) {
    return gh.text(502, "Erro ao excluir: " + (err.message || "desconhecido"));
  }
};
