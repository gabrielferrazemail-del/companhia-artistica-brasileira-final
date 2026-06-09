/* POST /.netlify/functions/update-profile
 * Grava o perfil do artista DONO do token.
 *
 * SEGURANÇA:
 *  - exige usuário autenticado;
 *  - slug resolvido no servidor (email → .md ou user_metadata), NUNCA do corpo;
 *  - só grava src/artistas/<slug>.md;
 *  - slug, roles e email são preservados do arquivo atual (não editáveis pelo artista);
 *  - campos editáveis: name, tagline, photo (upload), links, bio.
 */
const gh = require("./utils/github");
const { clean, extFromUpload } = require("./utils/site-helpers");

function cleanLinks(links) {
  if (!Array.isArray(links)) return [];
  return links
    .map((l) => ({ type: clean(l && l.type, 60), url: clean(l && l.url, 300) }))
    .filter((l) => l.type || l.url)
    .filter((l) => !l.url || /^https?:\/\//i.test(l.url))
    .slice(0, 12);
}

exports.handler = async (event, context) => {
  if (event.httpMethod !== "POST") return gh.text(405, "Método não permitido.");
  const user = gh.getUser(context);
  if (!user) return gh.text(401, "Não autenticado.");
  if (!gh.configured()) return gh.text(500, "Função não configurada (GITHUB_REPO/GITHUB_TOKEN).");

  const slug = await gh.artistSlugForUser(user);
  if (!slug || !/^[a-z0-9-]+$/.test(slug)) return gh.text(403, "Conta sem perfil de artista vinculado.");

  let payload;
  try { payload = JSON.parse(event.body || "{}"); }
  catch (e) { return gh.text(400, "Corpo inválido."); }

  const mdPath = "src/artistas/" + slug + ".md";

  try {
    const existing = await gh.getFile(mdPath);
    if (!existing) return gh.text(404, "Perfil não encontrado.");
    const raw = Buffer.from(existing.content, "base64").toString("utf8");
    const parsed = gh.matter(raw);
    const current = parsed.data || {};

    const files = [];

    // Foto: upload se enviada, senão mantém a atual.
    let photoPath = current.photo || "";
    if (payload.photoUpload && payload.photoUpload.dataBase64) {
      const ext = extFromUpload(payload.photoUpload, "jpg");
      const photoRepoPath = "src/uploads/artistas/" + slug + "-" + Date.now() + "." + ext;
      files.push({ path: photoRepoPath, contentBase64: payload.photoUpload.dataBase64 });
      photoPath = "/" + photoRepoPath.replace(/^src\//, "");
    }

    // slug, roles e email travados no servidor.
    const newData = {
      name: clean(payload.name, 120) || current.name || slug,
      slug: current.slug || slug,
      photo: photoPath,
      tagline: clean(payload.tagline, 160),
      roles: current.roles || ["artista"],
      links: cleanLinks(payload.links),
    };
    if (current.email) newData.email = current.email;

    const newBody = "\n" + clean(payload.bio, 8000) + "\n";
    files.push({ path: mdPath, content: gh.matter.stringify(newBody, newData) });

    await gh.commitFiles(files, "Atualiza perfil: " + slug);

    return gh.json(200, { ok: true, slug, photo: photoPath });
  } catch (err) {
    return gh.text(502, "Erro ao salvar: " + (err.message || "desconhecido"));
  }
};
