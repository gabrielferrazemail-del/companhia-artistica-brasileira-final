/* Contatos e redes sociais (/painel/contatos/) — admin.
 * Tela focada: edita só contato + redes, mas preserva o resto de site.json
 * (nome, tagline, sobre, logo, SEO) ao salvar via a função save-site.
 */
(function () {
  const $ = (s) => document.querySelector(s);
  const els = {
    sub: $("#ct-sub"),
    guest: $("#ct-guest"), noadmin: $("#ct-noadmin"), error: $("#ct-error"), errorMsg: $("#ct-error-msg"),
    form: $("#contatos-form"),
    email: $("#ct-email"), whatsapp: $("#ct-whatsapp"),
    social: $("#ct-social"), addSocial: $("#ct-add-social"),
    saveBtn: $("#ct-save"), status: $("#ct-status"), tplSocial: $("#tpl-social"),
  };
  // Guarda o site.json inteiro para preservar os campos que esta tela não edita.
  const state = { site: {} };

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

  function fill(d) {
    state.site = d || {};
    els.email.value = (d.contact && d.contact.email) || "";
    els.whatsapp.value = (d.contact && d.contact.whatsapp) || "";
    els.social.innerHTML = "";
    (d.social || []).forEach(addSocial);
    if (!(d.social || []).length) addSocial({});
  }

  // Merge: mantém tudo de site.json e troca só contact/social.
  function collect() {
    return Object.assign({}, state.site, {
      contact: { email: els.email.value.trim(), whatsapp: els.whatsapp.value.trim() },
      social: collectSocial(),
    });
  }

  async function onSubmit(e) {
    e.preventDefault();
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
  }

  async function startCt() {
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
    startCt();
  }

  bind();
  document.addEventListener("identity:ready", (e) => start(e.detail.user));
  document.addEventListener("identity:login", (e) => start(e.detail.user));
  document.addEventListener("identity:logout", () => { resolved = true; showOnly(els.guest); els.sub.textContent = ""; });
  setTimeout(() => { if (!resolved) start(window.coletivoAuth && window.coletivoAuth.current()); }, 2500);
})();
