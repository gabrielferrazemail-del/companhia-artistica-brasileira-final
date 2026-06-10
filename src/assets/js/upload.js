/* Upload de imagem compartilhado do painel/minha-conta.
 *
 * Cada imagem é comprimida no cliente (canvas) e enviada SOZINHA para a
 * função upload-image, que cria um blob no GitHub e devolve { blobSha }.
 * O save final só envia referências — nunca estoura o limite de 6 MB do
 * body das Netlify Functions, não importa quantas fotos a galeria tenha.
 *
 * GIF e SVG passam intactos (canvas mataria a animação/vetor).
 * Expõe window.coletivoUpload = { readFileAsBase64, compressImage, uploadImage }.
 */
(function () {
  const MAX_DIMENSION = 2000;          // lado maior, px, após compressão
  const QUALITY = 0.85;                // jpeg/webp
  const MAX_BASE64 = 5 * 1024 * 1024;  // espelho do limite do upload-image

  function readFileAsBase64(file) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => { const s = String(r.result); const c = s.indexOf(","); resolve(c >= 0 ? s.slice(c + 1) : s); };
      r.onerror = reject;
      r.readAsDataURL(file);
    });
  }

  function isPassthrough(file) {
    return /image\/(gif|svg)/.test(file.type || "") || /\.(gif|svg)$/i.test(file.name || "");
  }

  async function decode(file) {
    try { return await createImageBitmap(file, { imageOrientation: "from-image" }); }
    catch (e) { /* opção não suportada ou formato indecodificável */ }
    try { return await createImageBitmap(file); }
    catch (e) { return null; }
  }

  // Reduz dimensão e re-encoda (png mantém png p/ preservar transparência).
  // Devolve o arquivo original se não der para comprimir ou se não ajudar.
  async function compressImage(file) {
    if (isPassthrough(file)) return file;
    const bitmap = await decode(file);
    if (!bitmap) return file;
    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w; canvas.height = h;
    canvas.getContext("2d").drawImage(bitmap, 0, 0, w, h);
    const outType = file.type === "image/png" ? "image/png" : "image/jpeg";
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, outType, QUALITY));
    if (!blob || blob.size >= file.size) return file;
    const base = (file.name || "imagem").replace(/\.[^.]+$/, "");
    const ext = outType === "image/png" ? ".png" : ".jpg";
    return new File([blob], base + ext, { type: outType });
  }

  // Comprime, envia para upload-image e devolve { blobSha, name, type }.
  // Lança Error com mensagem amigável em caso de falha.
  async function uploadImage(file) {
    const prepared = await compressImage(file);
    const dataBase64 = await readFileAsBase64(prepared);
    if (dataBase64.length > MAX_BASE64) {
      throw new Error("Arquivo muito grande (máx. ~3,5 MB). Reduza a imagem/GIF e tente de novo.");
    }
    const res = await window.coletivoAuth.authFetch("/.netlify/functions/upload-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dataBase64: dataBase64, name: prepared.name, type: prepared.type }),
    });
    if (!res.ok) throw new Error(await res.text().catch(() => "erro " + res.status));
    const out = await res.json();
    if (!out || !out.blobSha) throw new Error("resposta inválida do upload");
    return { blobSha: out.blobSha, name: prepared.name, type: prepared.type };
  }

  window.coletivoUpload = { readFileAsBase64: readFileAsBase64, compressImage: compressImage, uploadImage: uploadImage };
})();
