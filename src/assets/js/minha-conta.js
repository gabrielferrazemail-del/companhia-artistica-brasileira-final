/* Editor de perfil do artista (/minha-conta/).
 * Pré-preenche via função get-profile e salva via update-profile.
 * O slug do artista NUNCA é enviado pelo cliente — é derivado do token no servidor.
 */
(function () {
  const $ = (sel) => document.querySelector(sel);

  const els = {
    sub: $("#account-sub"),
    guest: $("#account-guest"),
    noslug: $("#account-noslug"),
    error: $("#account-error"),
    errorMsg: $("#account-error-msg"),
    form: $("#account-form"),
    name: $("#f-name"),
    tagline: $("#f-tagline"),
    bio: $("#f-bio"),
    photo: $("#f-photo"),
    photoPreview: $("#f-photo-preview"),
    linksList: $("#links-list"),
    addLink: $("#add-link"),
    saveBtn: $("#save-btn"),
    saveStatus: $("#save-status"),
    viewLink: $("#view-link"),
  };

  let pendingPhoto = null; // { blobSha, name, type }
  let uploadPending = false;

  function showOnly(node) {
    [els.guest, els.noslug, els.error, els.form].forEach((n) => { if (n) n.hidden = true; });
    if (node) node.hidden = false;
  }

  function addLinkRow(link) {
    link = link || { type: "", url: "" };
    const row = document.createElement("div");
    row.className = "link-row";
    row.innerHTML =
      '<input type="text" class="link-type" placeholder="Tipo (ex.: Instagram)">' +
      '<input type="url" class="link-url" placeholder="https://…">' +
      '<button type="button" class="btn-ghost btn-sm link-remove" aria-label="Remover link">×</button>';
    row.querySelector(".link-type").value = link.type || "";
    row.querySelector(".link-url").value = link.url || "";
    row.querySelector(".link-remove").addEventListener("click", () => row.remove());
    els.linksList.appendChild(row);
  }

  function collectLinks() {
    const out = [];
    els.linksList.querySelectorAll(".link-row").forEach((row) => {
      const type = row.querySelector(".link-type").value.trim();
      const url = row.querySelector(".link-url").value.trim();
      if (type || url) out.push({ type: type, url: url });
    });
    return out;
  }

  function fillForm(data) {
    els.name.value = data.name || "";
    els.tagline.value = data.tagline || "";
    els.bio.value = data.bio || "";
    els.linksList.innerHTML = "";
    (data.links || []).forEach(addLinkRow);
    if ((data.links || []).length === 0) addLinkRow();

    if (data.photo) {
      els.photoPreview.src = data.photo;
      els.photoPreview.hidden = false;
    }
    if (data.slug) {
      els.viewLink.href = "/artistas/" + data.slug + "/";
      els.viewLink.hidden = false;
    }
  }

  async function authFetch(path, options) {
    const token = await window.coletivoAuth.token();
    options = options || {};
    options.headers = Object.assign({}, options.headers, {
      Authorization: "Bearer " + token,
    });
    return fetch(path, options);
  }

  async function loadProfile() {
    els.sub.textContent = "Carregando o seu perfil…";
    try {
      const res = await authFetch("/.netlify/functions/get-profile");
      if (res.status === 403) { showOnly(els.noslug); els.sub.textContent = ""; return; }
      if (!res.ok) throw new Error("HTTP " + res.status);
      const profile = await res.json();
      fillForm(profile);
      els.sub.textContent = "Edite os seus dados e salve.";
      showOnly(els.form);
    } catch (err) {
      els.errorMsg.textContent = "Não foi possível carregar o seu perfil. Tente novamente em instantes.";
      showOnly(els.error);
      els.sub.textContent = "";
    }
  }

  async function onSubmit(e) {
    e.preventDefault();
    if (uploadPending) { els.saveStatus.textContent = "Aguarde o envio da foto…"; return; }
    if (!els.name.value.trim()) { els.name.focus(); return; }

    els.saveBtn.disabled = true;
    els.saveStatus.textContent = "Salvando…";

    try {
      const payload = {
        name: els.name.value.trim(),
        tagline: els.tagline.value.trim(),
        bio: els.bio.value,
        links: collectLinks(),
      };
      if (pendingPhoto) {
        payload.photoUpload = pendingPhoto; // { blobSha, name, type }
      }

      const res = await authFetch("/.netlify/functions/update-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const msg = await res.text().catch(() => "");
        throw new Error(msg || ("HTTP " + res.status));
      }

      els.saveStatus.textContent = "Perfil salvo! O site atualiza em alguns minutos.";
      pendingPhoto = null;
    } catch (err) {
      els.saveStatus.textContent = "Erro ao salvar: " + (err.message || "tente novamente");
    } finally {
      els.saveBtn.disabled = false;
    }
  }

  function bind() {
    els.addLink.addEventListener("click", () => addLinkRow());
    els.form.addEventListener("submit", onSubmit);
    els.photo.addEventListener("change", async () => {
      const file = els.photo.files && els.photo.files[0];
      if (!file) { pendingPhoto = null; return; }
      uploadPending = true;
      els.saveBtn.disabled = true; els.saveStatus.textContent = "Enviando foto…";
      try {
        pendingPhoto = await window.coletivoUpload.uploadImage(file);
        els.photoPreview.src = URL.createObjectURL(file);
        els.photoPreview.hidden = false;
        els.saveStatus.textContent = "";
      } catch (err) {
        pendingPhoto = null; els.photo.value = "";
        els.saveStatus.textContent = "Erro no upload: " + (err.message || "");
      }
      uploadPending = false;
      els.saveBtn.disabled = false;
    });
  }

  let resolved = false;
  async function start(user) {
    resolved = true;
    if (!user) { showOnly(els.guest); els.sub.textContent = ""; return; }
    // Slug vem do servidor (whoami), que deriva por e-mail no .md — não de user_metadata.
    const { artistSlug } = await window.coletivoAuth.whoami();
    if (!artistSlug) { showOnly(els.noslug); els.sub.textContent = ""; return; }
    loadProfile();
  }

  bind();
  document.addEventListener("identity:ready", (e) => start(e.detail.user));
  document.addEventListener("identity:login", (e) => start(e.detail.user));
  document.addEventListener("identity:logout", () => { resolved = true; showOnly(els.guest); els.sub.textContent = ""; });

  // Fallback: se o widget de Identity não inicializar (ex.: preview local ou
  // Identity indisponível), não deixa a página presa em "Carregando…".
  setTimeout(function () {
    if (resolved) return;
    const user = (window.coletivoAuth && window.coletivoAuth.current()) || null;
    start(user);
  }, 2500);
})();
