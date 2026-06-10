// POST /.netlify/functions/save-exposicao  (admin)
// Cria ou edita uma exposição (src/exposicoes/<slug>.md) num único commit,
// incluindo upload de imagens novas (capa, galerias e obras).
//
// Body: { data: {...frontmatter...}, body: "markdown", originalSlug?: "..." }
// Em data, cada campo de imagem é uma STRING (caminho existente) ou um objeto
// { blobSha, name, type } (upload feito antes via upload-image) —
// { dataBase64, name, type } segue aceito por compatibilidade.
const gh = require("./utils/github");
const { clean, extFromUpload, uploadFileEntry } = require("./utils/site-helpers");

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
  if (!/^[a-z0-9-]+$/.test(slug)) return gh.text(400, "Slug inválido (use letras minúsculas, números e hífens).");
  if (!clean(data.title)) return gh.text(400, "Título é obrigatório.");

  const files = [];       // arquivos para o commit único
  let imgCounter = 0;

  function resolveImage(val, prefix) {
    if (!val) return "";
    if (typeof val === "string") return val;            // caminho já existente
    imgCounter += 1;
    const ext = extFromUpload(val, "jpg");
    const repoPath = "src/uploads/exposicoes/" + slug + "/" + prefix + "-" + Date.now() + "-" + imgCounter + "." + ext;
    const entry = uploadFileEntry(val, repoPath);       // { blobSha } ou { dataBase64 }
    if (!entry) return "";
    files.push(entry);
    return "/" + repoPath.replace(/^src\//, "");        // caminho público /uploads/...
  }

  try {
    // monta o frontmatter limpo, resolvendo imagens
    const fm = {
      title: clean(data.title, 160),
      slug: slug,
      status: clean(data.status) || "rascunho",
      cover: resolveImage(data.cover, "capa"),
      summary: clean(data.summary, 400),
      start_date: clean(data.start_date),
      end_date: clean(data.end_date),
      location: {
        name: clean(data.location && data.location.name, 160),
        address: clean(data.location && data.location.address, 240),
      },
      credits: {
        curator: clean(data.credits && data.credits.curator, 160),
        photography: clean(data.credits && data.credits.photography, 160),
      },
      theme: clean(data.theme) || "default",
      influences: clean(data.influences, 8000),
      gallery: (Array.isArray(data.gallery) ? data.gallery : []).map((g, i) => ({
        image: resolveImage(g.image, "g" + (i + 1)),
        alt: clean(g.alt, 200),
        caption: clean(g.caption, 200),
        credit: clean(g.credit, 120),
      })).filter((g) => g.image),
      participations: (Array.isArray(data.participations) ? data.participations : []).map((p, pi) => ({
        artist: clean(p.artist, 80),
        works: (Array.isArray(p.works) ? p.works : []).map((w, wi) => ({
          image: resolveImage(w.image, "obra-" + (pi + 1) + "-" + (wi + 1)),
          title: clean(w.title, 160),
          technique: clean(w.technique, 160),
          dimensions: clean(w.dimensions, 120),
          description: clean(w.description, 600),
        })),
      })).filter((p) => p.artist),
    };

    // Preserva a ordem manual definida no painel (reordenação) ao editar.
    const orderNum = Number(data.order);
    if (Number.isFinite(orderNum) && data.order !== "" && data.order != null) fm.order = orderNum;

    const body = "\n" + clean(payload.body, 12000) + "\n";
    const raw = gh.matter.stringify(body, fm);
    files.push({ path: "src/exposicoes/" + slug + ".md", content: raw });

    const originalSlug = clean(payload.originalSlug, 80);
    const isNew = !originalSlug;
    const message = (isNew ? "Cria exposição: " : "Atualiza exposição: ") + slug;

    await gh.commitFiles(files, message);

    // renomeou o slug -> remove o arquivo antigo
    if (originalSlug && originalSlug !== slug) {
      await gh.deleteFile("src/exposicoes/" + originalSlug + ".md", "Remove slug antigo: " + originalSlug);
    }

    return gh.json(200, { ok: true, slug: slug });
  } catch (err) {
    return gh.text(502, "Erro ao salvar: " + (err.message || "desconhecido"));
  }
};
