// GET /.netlify/functions/list-exposicoes  (admin)
// Lista as exposições (campos-chave) lendo direto do reppositório.
const gh = require("./utils/github");

exports.handler = async (event, context) => {
  const user = gh.getUser(context);
  if (!user) return gh.text(401, "Não autenticado.");
  if (!gh.isAdmin(user)) return gh.text(403, "Acesso restrito à administração.");
  if (!gh.configured()) return gh.text(500, "Função não configurada (GITHUB_REPO/GITHUB_TOKEN).");

  try {
    const entries = await gh.listDir("src/exposicoes");
    const mdFiles = entries.filter((e) => e.type === "file" && e.name.endsWith(".md"));

    const list = [];
    for (const f of mdFiles) {
      const raw = await gh.readFile("src/exposicoes/" + f.name);
      if (!raw) continue;
      const d = (gh.matter(raw).data) || {};
      list.push({
        slug: d.slug || f.name.replace(/\.md$/, ""),
        title: d.title || f.name,
        status: d.status || "",
        start_date: d.start_date || "",
        end_date: d.end_date || "",
        theme: d.theme || "default",
        order: (d.order != null && d.order !== "") ? Number(d.order) : "",
      });
    }
    list.sort((a, b) => String(b.start_date).localeCompare(String(a.start_date)));
    return gh.json(200, { exposicoes: list });
  } catch (err) {
    return gh.text(502, "Erro ao listar: " + (err.message || "desconhecido"));
  }
};
