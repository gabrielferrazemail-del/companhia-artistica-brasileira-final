// POST /.netlify/functions/save-site  (admin) — grava src/_data/site.json (commit único)
// Body: { name, tagline, about, logo, contact{email,whatsapp}, social[], seo{...} }
// logo e seo.shareImage: string (caminho) ou { dataBase64, name, type } (upload novo).
const gh = require("./utils/github");

function clean(s, max) {
  if (typeof s !== "string") return "";
  const t = s.trim();
  return max ? t.slice(0, max) : t;
}
function extFromUpload(up) {
  const byName = (up.name || "").split(".").pop().toLowerCase();
  if (/^(jpg|jpeg|png|webp|gif|svg)$/.test(byName)) return byName === "jpeg" ? "jpg" : byName;
  const map = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif", "image/svg+xml": "svg" };
  return map[up.type] || "png";
}

exports.handler = async (event, context) => {
  if (event.httpMethod !== "POST") return gh.text(405, "Método não permitido.");
  const user = gh.getUser(context);
  if (!user) return gh.text(401, "Não autenticado.");
  if (!gh.isAdmin(user)) return gh.text(403, "Acesso restrito à administração.");
  if (!gh.configured()) return gh.text(500, "Função não configurada (GITHUB_REPO/GITHUB_TOKEN).");

  let p;
  try { p = JSON.parse(event.body || "{}"); } catch (e) { return gh.text(400, "Corpo inválido."); }
  if (!clean(p.name)) return gh.text(400, "Nome do site é obrigatório.");

  const files = [];
  let imgN = 0;
  function resolveImage(val, prefix) {
    if (!val) return "";
    if (typeof val === "string") return val;
    if (val.dataBase64) {
      imgN += 1;
      const ext = extFromUpload(val);
      const repoPath = "src/uploads/site/" + prefix + "-" + Date.now() + "-" + imgN + "." + ext;
      files.push({ path: repoPath, contentBase64: val.dataBase64 });
      return "/" + repoPath.replace(/^src\//, "");
    }
    return "";
  }

  try {
    const site = {
      name: clean(p.name, 160),
      tagline: clean(p.tagline, 200),
      about: clean(p.about, 4000),
      logo: resolveImage(p.logo, "logo"),
      home_hero: {
        image: resolveImage(p.home_hero && p.home_hero.image, "hero"),
        heading: clean(p.home_hero && p.home_hero.heading, 160),
        subheading: clean(p.home_hero && p.home_hero.subheading, 200),
        cta_label: clean(p.home_hero && p.home_hero.cta_label, 60) || "Ver exposições",
      },
      contact: {
        email: clean(p.contact && p.contact.email, 160),
        whatsapp: clean(p.contact && p.contact.whatsapp, 60),
      },
      social: (Array.isArray(p.social) ? p.social : [])
        .map((s) => ({ platform: clean(s && s.platform, 60), url: clean(s && s.url, 300) }))
        .filter((s) => s.platform || s.url)
        .filter((s) => !s.url || /^https?:\/\//i.test(s.url)),
      seo: {
        defaultTitle: clean(p.seo && p.seo.defaultTitle, 160) || clean(p.name, 160),
        description: clean(p.seo && p.seo.description, 300),
        shareImage: resolveImage(p.seo && p.seo.shareImage, "og"),
      },
    };

    files.push({ path: "src/_data/site.json", content: JSON.stringify(site, null, 2) + "\n" });
    await gh.commitFiles(files, "Atualiza configurações do site");
    return gh.json(200, { ok: true });
  } catch (err) {
    return gh.text(502, "Erro ao salvar: " + (err.message || "desconhecido"));
  }
};
