// POST /.netlify/functions/upload-image  (admin OU artista vinculado)
// Recebe UMA imagem { dataBase64, name, type } e cria um blob solto no GitHub.
// Devolve { blobSha }; o save posterior (save-exposicao/save-site/...) referencia
// o sha e o commitFiles monta a árvore sem reenviar o conteúdo. Assim cada
// imagem viaja num POST próprio e o save nunca estoura o limite de 6 MB do
// body das Functions — fotos/GIFs ilimitados por exposição.
const gh = require("./utils/github");
const { extFromUpload } = require("./utils/site-helpers");

// ~5 MB de base64 ≈ 3,7 MB binários; acima disso o próprio gateway da Netlify
// derrubaria o request (limite 6 MB) com um erro críptico — falha clara antes.
const MAX_BASE64_LENGTH = 5 * 1024 * 1024;

exports.handler = async (event, context) => {
  if (event.httpMethod !== "POST") return gh.text(405, "Método não permitido.");
  const user = gh.getUser(context);
  if (!user) return gh.text(401, "Não autenticado.");
  if (!gh.configured()) return gh.text(500, "Função não configurada (GITHUB_REPO/GITHUB_TOKEN).");
  if (!gh.isAdmin(user)) {
    const slug = await gh.artistSlugForUser(user);
    if (!slug) return gh.text(403, "Acesso restrito.");
  }

  let p;
  try { p = JSON.parse(event.body || "{}"); } catch (e) { return gh.text(400, "Corpo inválido."); }
  if (typeof p.dataBase64 !== "string" || !p.dataBase64) return gh.text(400, "Imagem ausente.");
  if (p.dataBase64.length > MAX_BASE64_LENGTH) {
    return gh.text(413, "Arquivo muito grande (máx. ~3,5 MB). Reduza a imagem/GIF e tente de novo.");
  }
  if (!extFromUpload(p, "")) {
    return gh.text(400, "Tipo de arquivo não suportado (use jpg, png, webp, gif ou svg).");
  }

  try {
    const blobSha = await gh.createBlob(p.dataBase64);
    return gh.json(200, { ok: true, blobSha: blobSha });
  } catch (err) {
    return gh.text(502, "Erro no upload: " + (err.message || "desconhecido"));
  }
};
