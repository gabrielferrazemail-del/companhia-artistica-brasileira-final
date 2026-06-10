/* Configurações do site (/painel/configuracoes/) — admin. */
(function () {
  const $ = (s) => document.querySelector(s);
  const els = {
    sub: $("#cfg-sub"),
    guest: $("#cfg-guest"), noadmin: $("#cfg-noadmin"), error: $("#cfg-error"), errorMsg: $("#cfg-error-msg"),
    form: $("#config-form"),
    name: $("#c-name"), tagline: $("#c-tagline"), about: $("#c-about"),
    email: $("#c-email"), whatsapp: $("#c-whatsapp"),
    social: $("#c-social"), addSocial: $("#c-add-social"),
    seoTitle: $("#c-seo-title"), seoDesc: $("#c-seo-desc"),
    logo: $("#c-logo"), logoPreview: $("#c-logo-preview"), logoClear: $("#c-logo-clear"),
    og: $("#c-og"), ogPreview: $("#c-og-preview"), ogClear: $("#c-og-clear"),
    hero: $("#c-hero"), heroPreview: $("#c-hero-preview"), heroClear: $("#c-hero-clear"),
    heroHeading: $("#c-hero-heading"), heroSub: $("#c-hero-sub"), heroCta: $("#c-hero-cta"),
    saveBtn: $("#c-save"), status: $("#cfg-status"), tplSocial: $("#tpl-social"),
  };
  const state = { logo: "", shareImage: "", heroImage: "" };

  function showOnly(node) {
    [els.guest, els.noadmin, els.error, els.form].forEach((n) => { if (n) n.hidden = true; });
    if (node) node.hidden = false;
  }
  function addSocial(item) {
    item = item || {};
    const node = els.tplSocial.content.firstElementChild.cloneNode(true);
    node.querySelector(".so-platform").value = item.platform || "";
    node.querySelector(".so-url").value = item.url || "";
    node.querySelector(".so-remove").addEventListener("click", () => node.remove());
    els.social.appendChild(node);
  }
  function collectSocial() {
    return [...els.social.querySelectorAll(".link-row")].map((r) => ({
      platform: r.querySelector(".so-platform").value.trim(), url: r.querySelector(".so-url").value.trim(),
    })).filter((s) => s.platform || s.url);
  }

  // Upload imediato via window.coletivoUpload (1 imagem por request; GIF passa intacto).
  let uploadsPending = 0;
  function setupImage(fileEl, previewEl, clearEl, key) {
    fileEl.addEventListener("change", async () => {
      const f = fileEl.files && fileEl.files[0];
      if (!f) return;
      uploadsPending += 1;
      els.saveBtn.disabled = true; els.status.textContent = "Enviando imagem…";
      try {
        state[key] = await window.coletivoUpload.uploadImage(f);
        previewEl.src = URL.createObjectURL(f); previewEl.hidden = false; clearEl.hidden = false;
        if (els.status.textContent === "Enviando imagem…") els.status.textContent = "";
      } catch (err) {
        fileEl.value = "";
        els.status.textContent = "Erro no upload: " + (err.message || "");
      } finally {
        uploadsPending -= 1;
        if (!uploadsPending) els.saveBtn.disabled = false;
      }
    });
    clearEl.addEventListener("click", () => {
      state[key] = ""; fileEl.value = ""; previewEl.hidden = true; clearEl.hidden = true;
    });
  }

  function fill(d) {
    d = d || {};
    els.name.value = d.name || "";
    els.tagline.value = d.tagline || "";
    els.about.value = d.about || "";
    els.email.value = (d.contact && d.contact.email) || "";
    els.whatsapp.value = (d.contact && d.contact.whatsapp) || "";
    els.seoTitle.value = (d.seo && d.seo.defaultTitle) || "";
    els.seoDesc.value = (d.seo && d.seo.description) || "";
    els.social.innerHTML = "";
    (d.social || []).forEach(addSocial);
    if (!(d.social || []).length) addSocial({});
    state.logo = d.logo || "";
    if (state.logo) { els.logoPreview.src = state.logo; els.logoPreview.hidden = false; els.logoClear.hidden = false; }
    state.shareImage = (d.seo && d.seo.shareImage) || "";
    if (state.shareImage) { els.ogPreview.src = state.shareImage; els.ogPreview.hidden = false; els.ogClear.hidden = false; }
    const hero = d.home_hero || {};
    els.heroHeading.value = hero.heading || "";
    els.heroSub.value = hero.subheading || "";
    els.heroCta.value = hero.cta_label || "";
    state.heroImage = hero.image || "";
    if (state.heroImage) { els.heroPreview.src = state.heroImage; els.heroPreview.hidden = false; els.heroClear.hidden = false; }
  }

  function collect() {
    return {
      name: els.name.value.trim(),
      tagline: els.tagline.value.trim(),
      about: els.about.value,
      logo: state.logo,
      home_hero: {
        image: state.heroImage,
        heading: els.heroHeading.value.trim(),
        subheading: els.heroSub.value.trim(),
        cta_label: els.heroCta.value.trim(),
      },
      contact: { email: els.email.value.trim(), whatsapp: els.whatsapp.value.trim() },
      social: collectSocial(),
      seo: {
        defaultTitle: els.seoTitle.value.trim(),
        description: els.seoDesc.value.trim(),
        shareImage: state.shareImage,
      },
    };
  }

  async function onSubmit(e) {
    e.preventDefault();
    if (uploadsPending) { els.status.textContent = "Aguarde o envio das imagens…"; return; }
    if (!els.name.value.trim()) { els.name.focus(); return; }
    els.saveBtn.disabled = true; els.status.textContent = "Salvando…";
    try {
      const res = await window.coletivoAuth.authFetch("/.netlify/functions/save-site", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(collect()),
      });
      if (!res.ok) throw new Error(await res.text().catch(() => "erro " + res.status));
      els.status.textContent = "Salvo! O site publica em alguns minutos. Redirecionando…";
      setTimeout(() => { location.href = "/painel/"; }, 1400);
    } catch (err) {
      els.status.textContent = "Erro ao salvar: " + (err.message || ""); els.saveBtn.disabled = false;
    }
  }

  function bind() {
    els.addSocial.addEventListener("click", () => addSocial({}));
    els.form.addEventListener("submit", onSubmit);
    setupImage(els.logo, els.logoPreview, els.logoClear, "logo");
    setupImage(els.og, els.ogPreview, els.ogClear, "shareImage");
    setupImage(els.hero, els.heroPreview, els.heroClear, "heroImage");
  }

  async function startCfg() {
    els.sub.textContent = "Carregando…";
    try {
      const res = await window.coletivoAuth.authFetch("/.netlify/functions/get-site");
      if (res.status === 403) { showOnly(els.noadmin); els.sub.textContent = ""; return; }
      if (!res.ok) throw new Error("HTTP " + res.status);
      fill(await res.json());
    } catch (err) {
      els.errorMsg.textContent = "Erro ao carregar: " + (err.message || ""); showOnly(els.error); els.sub.textContent = ""; return;
    }
    els.sub.textContent = "Edite e salve.";
    showOnly(els.form);
  }

  let resolved = false;
  async function start(user) {
    resolved = true;
    if (!user) { showOnly(els.guest); els.sub.textContent = ""; return; }
    const { admin } = await window.coletivoAuth.checkAdmin();
    if (!admin) { showOnly(els.noadmin); els.sub.textContent = ""; return; }
    startCfg();
  }

  bind();
  document.addEventListener("identity:ready", (e) => start(e.detail.user));
  document.addEventListener("identity:login", (e) => start(e.detail.user));
  document.addEventListener("identity:logout", () => { resolved = true; showOnly(els.guest); els.sub.textContent = ""; });
  setTimeout(() => { if (!resolved) start(window.coletivoAuth && window.coletivoAuth.current()); }, 2500);
})();
