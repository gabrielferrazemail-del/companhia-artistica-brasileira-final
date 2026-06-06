// GET /.netlify/functions/get-site  (admin) — lê src/_data/site.json
const gh = require("./utils/github");

exports.handler = async (event, context) => {
  const user = gh.getUser(context);
  if (!user) return gh.text(401, "Não autenticado.");
  if (!gh.isAdmin(user)) return gh.text(403, "Acesso restrito à administração.");
  if (!gh.configured()) return gh.text(500, "Função não configurada (GITHUB_REPO/GITHUB_TOKEN).");

  try {
    const raw = await gh.readFile("src/_data/site.json");
    if (raw === null) return gh.json(200, {});
    return gh.json(200, JSON.parse(raw));
  } catch (err) {
    return gh.text(502, "Erro ao ler configurações: " + (err.message || "desconhecido"));
  }
};
