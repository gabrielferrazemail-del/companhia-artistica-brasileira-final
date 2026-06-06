/* GET /.netlify/functions/get-profile
 * Retorna o perfil do artista DONO do token.
 * Resolve o slug pelo campo email no .md; fallback para user_metadata.artist_slug.
 */
const gh = require("./utils/github");

exports.handler = async (event, context) => {
  const user = gh.getUser(context);
  if (!user) return gh.text(401, "Não autenticado.");
  if (!gh.configured()) return gh.text(500, "Função não configurada (GITHUB_REPO/GITHUB_TOKEN).");

  const slug = await gh.artistSlugForUser(user);
  if (!slug) return gh.text(403, "Conta sem perfil de artista vinculado.");

  try {
    const raw = await gh.readFile("src/artistas/" + slug + ".md");
    if (raw === null) return gh.text(404, "Perfil não encontrado.");
    const parsed = gh.matter(raw);
    const d = parsed.data || {};
    return gh.json(200, {
      slug: d.slug || slug,
      name: d.name || "",
      tagline: d.tagline || "",
      photo: d.photo || "",
      roles: d.roles || [],
      links: d.links || [],
      bio: parsed.content.trim(),
    });
  } catch (err) {
    return gh.text(500, "Erro interno: " + (err.message || "desconhecido"));
  }
};
