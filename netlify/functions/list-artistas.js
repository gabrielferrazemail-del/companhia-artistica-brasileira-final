// GET /.netlify/functions/list-artistas  (admin)
const gh = require("./utils/github");

exports.handler = async (event, context) => {
  const user = gh.getUser(context);
  if (!user) return gh.text(401, "Não autenticado.");
  if (!gh.isAdmin(user)) return gh.text(403, "Acesso restrito à administração.");
  if (!gh.configured()) return gh.text(500, "Função não configurada (GITHUB_REPO/GITHUB_TOKEN).");

  try {
    const entries = await gh.listDir("src/artistas");
    const mdFiles = entries.filter((e) => e.type === "file" && e.name.endsWith(".md"));
    const list = [];
    for (const f of mdFiles) {
      const raw = await gh.readFile("src/artistas/" + f.name);
      if (!raw) continue;
      const d = gh.matter(raw).data || {};
      list.push({
        slug: d.slug || f.name.replace(/\.md$/, ""),
        name: d.name || f.name,
        roles: d.roles || [],
        tagline: d.tagline || "",
      });
    }
    list.sort((a, b) => String(a.name).localeCompare(String(b.name), "pt-BR"));
    return gh.json(200, { artistas: list });
  } catch (err) {
    return gh.text(502, "Erro ao listar: " + (err.message || "desconhecido"));
  }
};
