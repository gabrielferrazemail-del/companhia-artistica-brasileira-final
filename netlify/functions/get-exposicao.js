// GET /.netlify/functions/get-exposicao?slug=<slug>  (admin)
// Retorna o frontmatter + corpo (markdown) de uma exposição.
const gh = require("./utils/github");

exports.handler = async (event, context) => {
  const user = gh.getUser(context);
  if (!user) return gh.text(401, "Não autenticado.");
  if (!gh.isAdmin(user)) return gh.text(403, "Acesso restrito à administração.");
  if (!gh.configured()) return gh.text(500, "Função não configurada (GITHUB_REPO/GITHUB_TOKEN).");

  const slug = (event.queryStringParameters && event.queryStringParameters.slug) || "";
  if (!/^[a-z0-9-]+$/.test(slug)) return gh.text(400, "Slug inválido.");

  try {
    const raw = await gh.readFile("src/exposicoes/" + slug + ".md");
    if (raw === null) return gh.text(404, "Exposição não encontrada.");
    const parsed = gh.matter(raw);
    return gh.json(200, { data: parsed.data || {}, body: (parsed.content || "").trim() });
  } catch (err) {
    return gh.text(502, "Erro ao ler: " + (err.message || "desconhecido"));
  }
};
