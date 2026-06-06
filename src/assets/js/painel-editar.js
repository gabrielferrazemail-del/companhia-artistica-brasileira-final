/* Editor de exposição (/painel/editar/) — admin.
 * ?slug=X edita; sem slug cria nova.
 * Preserva works/galerias existentes (não editados nesta tela) ao salvar.
 */
(function () {
  const $ = (s) => document.querySelector(s);
  const els = {
    title: $("#editor-title"), sub: $("#editor-sub"),
    guest: $("#editor-guest"), noadmin: $("#editor-noadmin"),
    error: $("#editor-error"), errorMsg: $("#editor-error-msg"),
    form: $("#expo-form"),
    fTitle: $("#f-title"), fSlug: $("#f-slug"), slugPreview: $("#slug-preview"),
    fStatus: $("#f-status"), fTheme: $("#f-theme"),
    fStart: $("#f-start"), fEnd: $("#f-end"),
    fLocName: $("#f-loc-name"), fLocAddr: $("#f-loc-addr"), fPhoto: $("#f-photo"),
    fSummary: $("#f-summary"), fBody: $("#f-body"), fInfluences: $("#f-influences"),
    fCover: $("#f-cover"), fCoverPreview: $("#f-cover-preview"), fCoverClear: $("#f-cover-clear"),
    fCurator: $("#f-curator"),
    artistsList: $("#artists-list"), addArtist: $("#add-artist"),
    galleryList: $("#gallery-list"), addPhoto: $("#add-photo"),
    saveBtn: $("#save-expo"), status: $("#editor-status"),
    tplPart: $("#tpl-part"), tplWork: $("#tpl-work"), tplPhoto: $("#tpl-photo"),
  };

  const state = {
    artists: [],
    original: null,     // dados originais (para preservar works/galerias)
    slug: new URLSearchParams(location.search).get("slug") || "",
    cover: "",          // string (caminho) ou {dataBase64,name,type}
  };

  function showOnly(node) {
    [els.guest, els.noadmin, els.error, els.form].forEach((n) => { if (n) n.hidden = true; });
    if (node) node.hidden = false;
  }
  function toDateInput(v) { return v ? String(v).slice(0, 10) : ""; }

  function readFileAsBase64(file) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => { const s = String(r.result); const c = s.indexOf(","); resolve(c >= 0 ? s.slice(c + 1) : s); };
      r.onerror = reject;
      r.readAsDataURL(file);
    });
  }

  // ---- artistas (para selects e curadoria) ----
  async function loadArtists() {
    try { const r = await fetch("/api/artistas.json"); state.artists = await r.json(); }
    catch (e) { state.artists = []; }
  }
  function artistName(slug) { const a = state.artists.find((x) => x.slug === slug); return a ? a.name : slug; }

  function fillArtistSelect(sel, selected) {
    sel.innerHTML = '<option value="">— escolher artista —</option>';
    state.artists.forEach((a) => {
      const o = document.createElement("option");
      o.value = a.slug; o.textContent = a.name;
      if (a.slug === selected) o.selected = true;
      sel.appendChild(o);
    });
  }

  // ---- galeria de fotos ----
  function addPhoto(photoData) {
    photoData = photoData || {};
    const node = els.tplPhoto.content.firstElementChild.cloneNode(true);
    node._image = photoData.image || "";   // string (caminho) ou {dataBase64,...}
    node.querySelector(".ph-alt").value = photoData.alt || "";
    node.querySelector(".ph-caption").value = photoData.caption || "";
    node.querySelector(".ph-credit").value = photoData.credit || "";
    const preview = node.querySelector(".ph-preview");
    if (typeof node._image === "string" && node._image) { preview.src = node._image; preview.hidden = false; }
    node.querySelector(".ph-file").addEventListener("change", async (e) => {
      const f = e.target.files && e.target.files[0];
      if (!f) return;
      node._image = { dataBase64: await readFileAsBase64(f), name: f.name, type: f.type };
      preview.src = URL.createObjectURL(f); preview.hidden = false;
    });
    node.querySelector(".ph-remove").addEventListener("click", () => node.remove());
    els.galleryList.appendChild(node);
  }

  // ---- sessões / participações / obras ----
  function addWork(listEl, workData) {
    workData = workData || {};
    const node = els.tplWork.content.firstElementChild.cloneNode(true);
    node._image = workData.image || "";   // string (caminho) ou {dataBase64,...}
    node.querySelector(".w-title").value = workData.title || "";
    node.querySelector(".w-technique").value = workData.technique || "";
    node.querySelector(".w-dimensions").value = workData.dimensions || "";
    node.querySelector(".w-description").value = workData.description || "";
    const preview = node.querySelector(".w-preview");
    if (typeof node._image === "string" && node._image) { preview.src = node._image; preview.hidden = false; }
    node.querySelector(".w-file").addEventListener("change", async (e) => {
      const f = e.target.files && e.target.files[0];
      if (!f) return;
      node._image = { dataBase64: await readFileAsBase64(f), name: f.name, type: f.type };
      preview.src = URL.createObjectURL(f); preview.hidden = false;
    });
    node.querySelector(".w-remove").addEventListener("click", () => node.remove());
    listEl.appendChild(node);
  }

  function addParticipation(listEl, partData) {
    partData = partData || {};
    const node = els.tplPart.content.firstElementChild.cloneNode(true);
    fillArtistSelect(node.querySelector(".p-artist"), partData.artist);
    const worksList = node.querySelector(".works-list");
    (partData.works || []).forEach((w) => addWork(worksList, w));
    node.querySelector(".add-work").addEventListener("click", () => addWork(worksList, null));
    node.querySelector(".p-remove").addEventListener("click", () => node.remove());
    listEl.appendChild(node);
  }

  // ---- carregar dados ----
  function fill(data, body) {
    state.original = data || {};
    els.fTitle.value = data.title || "";
    els.fSlug.value = data.slug || state.slug || "";
    els.slugPreview.textContent = els.fSlug.value || "slug";
    els.fStatus.value = (data.status === "rascunho" || !data.status) ? (data.status || "rascunho") : "em-cartaz";
    els.fTheme.value = data.theme || "default";
    els.fStart.value = toDateInput(data.start_date);
    els.fEnd.value = toDateInput(data.end_date);
    els.fLocName.value = (data.location && data.location.name) || "";
    els.fLocAddr.value = (data.location && data.location.address) || "";
    els.fPhoto.value = (data.credits && data.credits.photography) || "";
    els.fSummary.value = data.summary || "";
    els.fBody.value = body || "";
    els.fInfluences.value = data.influences || "";

    state.cover = data.cover || "";
    if (state.cover) { els.fCoverPreview.src = state.cover; els.fCoverPreview.hidden = false; els.fCoverClear.hidden = false; }

    els.fCurator.value = (data.credits && data.credits.curator) || "";

    els.artistsList.innerHTML = "";
    const parts = Array.isArray(data.participations)
      ? data.participations
      : (data.sessions || []).reduce((acc, s) => acc.concat(s.participations || []), []);
    parts.forEach((p) => addParticipation(els.artistsList, p));

    els.galleryList.innerHTML = "";
    (data.gallery || []).forEach((g) => addPhoto(g));
  }

  // ---- montar payload (artistas e galeria vêm da UI) ----
  function collect() {
    const participations = [...els.artistsList.querySelectorAll(".part-row")].map((row) => {
      const artist = row.querySelector(".p-artist").value;
      if (!artist) return null;
      const works = [...row.querySelectorAll(".works-list .work-row")].map((wr) => ({
        image: wr._image || "",
        title: wr.querySelector(".w-title").value.trim(),
        technique: wr.querySelector(".w-technique").value.trim(),
        dimensions: wr.querySelector(".w-dimensions").value.trim(),
        description: wr.querySelector(".w-description").value.trim(),
      })).filter((w) => w.image || w.title || w.technique || w.dimensions || w.description);
      return { artist: artist, works: works };
    }).filter(Boolean);

    const gallery = [...els.galleryList.querySelectorAll(".photo-item")].map((row) => ({
      image: row._image || "",
      alt: row.querySelector(".ph-alt").value.trim(),
      caption: row.querySelector(".ph-caption").value.trim(),
      credit: row.querySelector(".ph-credit").value.trim(),
    })).filter((g) => g.image);

    return {
      data: {
        title: els.fTitle.value.trim(),
        slug: els.fSlug.value.trim().toLowerCase(),
        status: els.fStatus.value,
        cover: state.cover,
        summary: els.fSummary.value.trim(),
        start_date: els.fStart.value || "",
        end_date: els.fEnd.value || "",
        location: { name: els.fLocName.value.trim(), address: els.fLocAddr.value.trim() },
        credits: { curator: els.fCurator.value.trim(), photography: els.fPhoto.value.trim() },
        theme: els.fTheme.value,
        influences: els.fInfluences.value,
        order: (state.original && state.original.order != null) ? state.original.order : "",
        gallery: gallery,
        participations: participations,
      },
      body: els.fBody.value,
      originalSlug: state.slug || "",
    };
  }

  async function onSubmit(e) {
    e.preventDefault();
    if (!els.fTitle.value.trim()) { els.fTitle.focus(); return; }
    if (!/^[a-z0-9-]+$/.test(els.fSlug.value.trim().toLowerCase())) {
      els.status.textContent = "Slug inválido: use só letras minúsculas, números e hífens."; els.fSlug.focus(); return;
    }
    els.saveBtn.disabled = true; els.status.textContent = "Salvando…";
    try {
      const res = await window.coletivoAuth.authFetch("/.netlify/functions/save-exposicao", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(collect()),
      });
      if (!res.ok) throw new Error(await res.text().catch(() => "erro " + res.status));
      els.status.textContent = "Salvo! O site publica em alguns minutos. Redirecionando…";
      setTimeout(() => { location.href = "/painel/"; }, 1400);
    } catch (err) {
      els.status.textContent = "Erro ao salvar: " + (err.message || "");
      els.saveBtn.disabled = false;
    }
  }

  function bind() {
    els.fSlug.addEventListener("input", () => { els.slugPreview.textContent = els.fSlug.value || "slug"; });
    els.addArtist.addEventListener("click", () => addParticipation(els.artistsList, null));
    els.addPhoto.addEventListener("click", () => addPhoto(null));
    els.form.addEventListener("submit", onSubmit);
    els.fCover.addEventListener("change", async () => {
      const f = els.fCover.files && els.fCover.files[0];
      if (!f) return;
      state.cover = { dataBase64: await readFileAsBase64(f), name: f.name, type: f.type };
      els.fCoverPreview.src = URL.createObjectURL(f); els.fCoverPreview.hidden = false; els.fCoverClear.hidden = false;
    });
    els.fCoverClear.addEventListener("click", () => {
      state.cover = ""; els.fCover.value = ""; els.fCoverPreview.hidden = true; els.fCoverClear.hidden = true;
    });
  }

  async function startEditor() {
    await loadArtists();
    if (state.slug) {
      els.title.textContent = "Editar exposição";
      els.sub.textContent = "Carregando dados…";
      try {
        const res = await window.coletivoAuth.authFetch("/.netlify/functions/get-exposicao?slug=" + encodeURIComponent(state.slug));
        if (res.status === 403) { showOnly(els.noadmin); els.sub.textContent = ""; return; }
        if (res.status === 404) { els.errorMsg.textContent = "Exposição não encontrada."; showOnly(els.error); els.sub.textContent = ""; return; }
        if (!res.ok) throw new Error("HTTP " + res.status);
        const d = await res.json();
        fill(d.data || {}, d.body || "");
      } catch (err) {
        els.errorMsg.textContent = "Erro ao carregar: " + (err.message || ""); showOnly(els.error); els.sub.textContent = ""; return;
      }
    } else {
      els.title.textContent = "Nova exposição";
      els.fStatus.value = "rascunho";
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
