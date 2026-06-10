/* Editor de artista (/painel/editar-artista/) — admin. ?slug=X edita; sem slug cria. */
(function () {
  const $ = (s) => document.querySelector(s);
  const els = {
    title: $("#ea-title"), sub: $("#ea-sub"),
    guest: $("#ea-guest"), noadmin: $("#ea-noadmin"), error: $("#ea-error"), errorMsg: $("#ea-error-msg"),
    form: $("#artista-form"),
    name: $("#a-name"), slug: $("#a-slug"), slugPreview: $("#a-slug-preview"),
    email: $("#a-email"), tagline: $("#a-tagline"), bio: $("#a-bio"),
    photo: $("#a-photo"), photoPreview: $("#a-photo-preview"), photoClear: $("#a-photo-clear"),
    roles: $("#a-roles"), links: $("#a-links"), addLink: $("#a-add-link"),
    saveBtn: $("#a-save"), status: $("#ea-status"), tplLink: $("#tpl-link"),
  };
  const state = { slug: new URLSearchParams(location.search).get("slug") || "", photo: "" };
  let uploadPending = false;

  function showOnly(node) {
    [els.guest, els.noadmin, els.error, els.form].forEach((n) => { if (n) n.hidden = true; });
    if (node) node.hidden = false;
  }
  function addLink(linkData) {
    linkData = linkData || {};
    const node = els.tplLink.content.firstElementChild.cloneNode(true);
    node.querySelector(".l-type").value = linkData.type || "";
    node.querySelector(".l-url").value = linkData.url || "";
    node.querySelector(".l-remove").addEventListener("click", () => node.remove());
    els.links.appendChild(node);
  }
  function setRoles(roles) {
    roles = roles || [];
    els.roles.querySelectorAll("input").forEach((i) => { i.checked = roles.indexOf(i.value) !== -1; });
  }
  function collectRoles() { return [...els.roles.querySelectorAll("input:checked")].map((i) => i.value); }
  function collectLinks() {
    return [...els.links.querySelectorAll(".link-row")].map((r) => ({
      type: r.querySelector(".l-type").value.trim(), url: r.querySelector(".l-url").value.trim(),
    })).filter((l) => l.type || l.url);
  }

  function fill(data, body) {
    els.name.value = data.name || "";
    els.slug.value = data.slug || state.slug || "";
    els.slugPreview.textContent = els.slug.value || "slug";
    els.email.value = data.email || "";
    els.tagline.value = data.tagline || "";
    els.bio.value = body || "";
    setRoles(data.roles || []);
    els.links.innerHTML = "";
    (data.links || []).forEach(addLink);
    state.photo = data.photo || "";
    if (state.photo) { els.photoPreview.src = state.photo; els.photoPreview.hidden = false; els.photoClear.hidden = false; }
  }

  function collect() {
    return {
      data: {
        name: els.name.value.trim(),
        slug: els.slug.value.trim().toLowerCase(),
        email: els.email.value.trim().toLowerCase(),
        photo: state.photo,
        tagline: els.tagline.value.trim(),
        roles: collectRoles(),
        links: collectLinks(),
      },
      body: els.bio.value,
      originalSlug: state.slug || "",
    };
  }

  async function onSubmit(e) {
    e.preventDefault();
    if (uploadPending) { els.status.textContent = "Aguarde o envio da foto…"; return; }
    if (!els.name.value.trim()) { els.name.focus(); return; }
    if (!/^[a-z0-9-]+$/.test(els.slug.value.trim().toLowerCase())) {
      els.status.textContent = "Slug inválido: só letras minúsculas, números e hífens."; els.slug.focus(); return;
    }
    els.saveBtn.disabled = true; els.status.textContent = "Salvando…";
    try {
      const res = await window.coletivoAuth.authFetch("/.netlify/functions/save-artista", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(collect()),
      });
      if (!res.ok) throw new Error(await res.text().catch(() => "erro " + res.status));
      els.status.textContent = "Salvo! Redirecionando…";
      setTimeout(() => { location.href = "/painel/"; }, 1200);
    } catch (err) {
      els.status.textContent = "Erro ao salvar: " + (err.message || ""); els.saveBtn.disabled = false;
    }
  }

  function bind() {
    els.slug.addEventListener("input", () => { els.slugPreview.textContent = els.slug.value || "slug"; });
    els.addLink.addEventListener("click", () => addLink(null));
    els.form.addEventListener("submit", onSubmit);
    els.photo.addEventListener("change", async () => {
      const f = els.photo.files && els.photo.files[0];
      if (!f) return;
      uploadPending = true;
      els.saveBtn.disabled = true; els.status.textContent = "Enviando foto…";
      try {
        state.photo = await window.coletivoUpload.uploadImage(f);
        els.photoPreview.src = URL.createObjectURL(f); els.photoPreview.hidden = false; els.photoClear.hidden = false;
        els.status.textContent = "";
      } catch (err) {
        els.photo.value = "";
        els.status.textContent = "Erro no upload: " + (err.message || "");
      }
      uploadPending = false;
      els.saveBtn.disabled = false;
    });
    els.photoClear.addEventListener("click", () => {
      state.photo = ""; els.photo.value = ""; els.photoPreview.hidden = true; els.photoClear.hidden = true;
    });
  }

  async function startEditor() {
    if (state.slug) {
      els.title.textContent = "Editar artista"; els.sub.textContent = "Carregando…";
      try {
        const res = await window.coletivoAuth.authFetch("/.netlify/functions/get-artista?slug=" + encodeURIComponent(state.slug));
        if (res.status === 403) { showOnly(els.noadmin); els.sub.textContent = ""; return; }
        if (res.status === 404) { els.errorMsg.textContent = "Artista não encontrado."; showOnly(els.error); els.sub.textContent = ""; return; }
        if (!res.ok) throw new Error("HTTP " + res.status);
        const d = await res.json();
        fill(d.data || {}, d.body || "");
      } catch (err) {
        els.errorMsg.textContent = "Erro ao carregar: " + (err.message || ""); showOnly(els.error); els.sub.textContent = ""; return;
      }
    } else {
      els.title.textContent = "Novo artista"; setRoles(["artista"]);
    }
    els.sub.textContent = "Preencha os campos e salve.";
    showOnly(els.form);
  }

  let resolved = false;
  async function start(user) {
    resolved = true;
    if (!user) { showOnly(els.guest); els.sub.textContent = ""; return; }
    const { admin } = await window.coletivoAuth.checkAdmin();
    if (!admin) { showOnly(els.noadmin); els.sub.textContent = ""; return; }
    startEditor();
  }

  bind();
  document.addEventListener("identity:ready", (e) => start(e.detail.user));
  document.addEventListener("identity:login", (e) => start(e.detail.user));
  document.addEventListener("identity:logout", () => { resolved = true; showOnly(els.guest); els.sub.textContent = ""; });
  setTimeout(() => { if (!resolved) start(window.coletivoAuth && window.coletivoAuth.current()); }, 2500);
})();
