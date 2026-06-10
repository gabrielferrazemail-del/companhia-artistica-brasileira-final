// POST /.netlify/functions/save-artista  (admin)
// Cria/edita src/artistas/<slug>.md (um commit), com upload de foto.
// Body: { data: { name, slug, photo, tagline, roles[], links[] }, body, originalSlug? }
const gh = require("./utils/github");
const { clean, extFromUpload, isUpload, uploadFileEntry } = require("./utils/site-helpers");

exports.handler = async (event, context) => {
  if (event.httpMethod !== "POST") return gh.text(405, "Método não permitido.");
  const user = gh.getUser(context);
  if (!user) return gh.text(401, "Não autenticado.");
  if (!gh.isAdmin(user)) return gh.text(403, "Acesso restrito à administração.");
  if (!gh.configured()) return gh.text(500, "Função não configurada (GITHUB_REPO/GITHUB_TOKEN).");

  let payload;
  try { payload = JSON.parse(event.body || "{}"); } catch (e) { return gh.text(400, "Corpo inválido."); }
  const data = payload.data || {};
  const slug = clean(data.slug, 80).toLowerCase();
  if (!/^[a-z0-9-]+$/.test(slug)) return gh.text(400, "Slug inválido (letras minúsculas, números e hífens).");
  if (!clean(data.name)) return gh.text(400, "Nome é obrigatório.");

  const files = [];
  let photoPath = "";
  const photo = data.photo;
  if (typeof photo === "string") {
    photoPath = photo;
  } else if (isUpload(photo)) {
    const ext = extFromUpload(photo, "jpg");
    const repoPath = "src/uploads/artistas/" + slug + "-" + Date.now() + "." + ext;
    files.push(uploadFileEntry(photo, repoPath));
    photoPath = "/" + repoPath.replace(/^src\//, "");
  }

  const validRoles = ["artista", "curador", "fotografo"];
  const roles = Array.isArray(data.roles) ? data.roles.filter((r) => validRoles.indexOf(r) !== -1) : [];

  const links = (Array.isArray(data.links) ? data.links : [])
    .map((l) => ({ type: clean(l && l.type, 60), url: clean(l && l.url, 300) }))
    .filter((l) => l.type || l.url)
    .filter((l) => !l.url || /^https?:\/\//i.test(l.url));

  const email = clean(data.email, 254).toLowerCase();

  try {
    const fm = {
      name: clean(data.name, 120),
      slug: slug,
      photo: photoPath,
      tagline: clean(data.tagline, 160),
      roles: roles.length ? roles : ["artista"],
      links: links,
    };
    if (email) fm.email = email;
    const body = "\n" + clean(payload.body, 6000) + "\n";
    const raw = gh.matter.stringify(body, fm);
    files.push({ path: "src/artistas/" + slug + ".md", content: raw });

    const originalSlug = clean(payload.originalSlug, 80);
    const message = (originalSlug ? "Atualiza artista: " : "Cria artista: ") + slug;
    await gh.commitFiles(files, message);

    if (originalSlug && originalSlug !== slug) {
      await gh.deleteFile("src/artistas/" + originalSlug + ".md", "Remove slug antigo: " + originalSlug);
    }
    return gh.json(200, { ok: true, slug: slug });
  } catch (err) {
    return gh.text(502, "Erro ao salvar: " + (err.message || "desconhecido"));
  }
};
