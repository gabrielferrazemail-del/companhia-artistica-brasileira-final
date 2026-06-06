// POST /.netlify/functions/reorder-exposicoes  (admin)
// Define o campo `order` de várias exposições num único commit (1 rebuild).
// Body: { items: [{ slug, order }] }  — `order` é a posição (número) na lista.
const gh = require("./utils/github");

exports.handler = async (event, context) => {
  if (event.httpMethod !== "POST") return gh.text(405, "Método não permitido.");
  const user = gh.getUser(context);
  if (!user) return gh.text(401, "Não autenticado.");
  if (!gh.isAdmin(user)) return gh.text(403, "Acesso restrito à administração.");
  if (!gh.configured()) return gh.text(500, "Função não configurada (GITHUB_REPO/GITHUB_TOKEN).");

  let payload;
  try { payload = JSON.parse(event.body || "{}"); } catch (e) { return gh.text(400, "Corpo inválido."); }
  const items = Array.isArray(payload.items) ? payload.items : [];
  if (!items.length) return gh.text(400, "Nada para reordenar.");

  try {
    const files = [];
    for (const it of items) {
      const slug = String((it && it.slug) || "").trim();
      if (!/^[a-z0-9-]+$/.test(slug)) continue;
      const order = Number(it.order);
      if (!Number.isFinite(order)) continue;
      const raw = await gh.readFile("src/exposicoes/" + slug + ".md");
      if (!raw) continue;
      const parsed = gh.matter(raw);
      parsed.data.order = order;
      const out = gh.matter.stringify(parsed.content, parsed.data);
      files.push({ path: "src/exposicoes/" + slug + ".md", content: out });
    }
    if (!files.length) return gh.text(400, "Nenhuma exposição válida para reordenar.");
    await gh.commitFiles(files, "Reordena exposições");
    return gh.json(200, { ok: true, count: files.length });
  } catch (err) {
    return gh.text(502, "Erro ao reordenar: " + (err.message || "desconhecido"));
  }
};
