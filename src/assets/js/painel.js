/* Painel de controle (/painel/) — listas de exposições e artistas (admin). */
(function () {
  const $ = (s) => document.querySelector(s);
  const els = {
    sub: $("#painel-sub"),
    guest: $("#painel-guest"), noadmin: $("#painel-noadmin"),
    error: $("#painel-error"), errorMsg: $("#painel-error-msg"),
    content: $("#painel-content"),
    expoList: $("#expo-list"), artistaList: $("#artista-list"),
    saveOrder: $("#save-order"),
  };

  function showOnly(node) {
    [els.guest, els.noadmin, els.error, els.content].forEach((n) => { if (n) n.hidden = true; });
    if (node) node.hidden = false;
  }

  const STATUS_LABEL = { "em-breve": "em breve", "em-cartaz": "em cartaz", "encerrada": "encerrada", "rascunho": "rascunho" };
  const GROUP_ORDER = ["em-cartaz", "em-breve", "encerrada", "rascunho"];
  const GROUP_LABEL = { "em-cartaz": "Em cartaz", "em-breve": "Em breve", "encerrada": "Encerradas", "rascunho": "Rascunhos (ocultas no site)" };
  const RANK = { "em-cartaz": 0, "em-breve": 1, "encerrada": 2, "rascunho": 3 };

  let expoItems = [];      // lista de trabalho, já na ordem de exibição
  let orderDirty = false;  // true quando o admin mexeu na ordem e ainda não salvou

  function orderValue(v) {
    const n = Number(v);
    return Number.isFinite(n) && v !== "" && v != null ? n : Infinity;
  }

  function effectiveStatus(e) {
    if (e.status === "rascunho") return "rascunho";
    if (!e.start_date) return e.status || "em-cartaz";
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const start = new Date(e.start_date); start.setHours(0, 0, 0, 0);
    const end = new Date(e.end_date || e.start_date); end.setHours(0, 0, 0, 0);
    if (today < start) return "em-breve";
    if (today > end) return "encerrada";
    return "em-cartaz";
  }
  function fmtDate(d) {
    if (!d) return "—";
    try { return new Date(d).toLocaleDateString("pt-BR", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }); }
    catch (e) { return d; }
  }

  function rowEl(title, metaHtml, editHref, onDel) {
    const row = document.createElement("div");
    row.className = "painel-row";
    row.innerHTML =
      '<div class="painel-row-main"><span class="painel-row-title"></span><span class="painel-row-meta"></span></div>' +
      '<div class="painel-row-actions">' +
      '  <a class="btn-ghost btn-sm" href="' + editHref + '">Editar</a>' +
      '  <button type="button" class="btn-ghost btn-sm danger">Excluir</button>' +
      "</div>";
    row.querySelector(".painel-row-title").textContent = title;
    row.querySelector(".painel-row-meta").innerHTML = metaHtml;
    row.querySelector("button.danger").addEventListener("click", onDel);
    return row;
  }

  // Ordena a lista vinda do servidor: por grupo de status e, dentro do grupo,
  // pela ordem manual (campo `order`) e por data (mais recente primeiro).
  function sortInitial(list) {
    return list.slice().sort((a, b) => {
      const ra = RANK[effectiveStatus(a)] ?? 9;
      const rb = RANK[effectiveStatus(b)] ?? 9;
      if (ra !== rb) return ra - rb;
      const oa = orderValue(a.order), ob = orderValue(b.order);
      if (oa !== ob) return oa - ob;
      return String(b.start_date || "").localeCompare(String(a.start_date || ""));
    });
  }

  function expoRow(e, idx) {
    const st = effectiveStatus(e);
    const row = document.createElement("div");
    row.className = "painel-row";
    row.innerHTML =
      '<div class="painel-row-main"><span class="painel-row-title"></span><span class="painel-row-meta"></span></div>' +
      '<div class="painel-row-actions">' +
      '  <button type="button" class="btn-ghost btn-sm reorder reorder-up" aria-label="Mover para cima" title="Mover para cima">↑</button>' +
      '  <button type="button" class="btn-ghost btn-sm reorder reorder-down" aria-label="Mover para baixo" title="Mover para baixo">↓</button>' +
      '  <a class="btn-ghost btn-sm" href="/painel/editar/?slug=' + encodeURIComponent(e.slug) + '">Editar</a>' +
      '  <button type="button" class="btn-ghost btn-sm danger">Excluir</button>' +
      "</div>";
    row.querySelector(".painel-row-title").textContent = e.title;
    row.querySelector(".painel-row-meta").innerHTML =
      '<span class="status-pill status-' + st + '">' + (STATUS_LABEL[st] || st) + "</span> " + fmtDate(e.start_date);
    const prev = expoItems[idx - 1], next = expoItems[idx + 1];
    const up = row.querySelector(".reorder-up"), down = row.querySelector(".reorder-down");
    if (!prev || effectiveStatus(prev) !== st) up.disabled = true;
    if (!next || effectiveStatus(next) !== st) down.disabled = true;
    up.addEventListener("click", () => move(idx, -1));
    down.addEventListener("click", () => move(idx, 1));
    row.querySelector("button.danger").addEventListener("click", () => onDelete("exposicao", e));
    return row;
  }

  function move(idx, dir) {
    const j = idx + dir;
    if (j < 0 || j >= expoItems.length) return;
    const tmp = expoItems[idx]; expoItems[idx] = expoItems[j]; expoItems[j] = tmp;
    orderDirty = true;
    drawExposicoes();
  }

  function drawExposicoes() {
    els.expoList.innerHTML = "";
    if (!expoItems.length) {
      els.expoList.innerHTML = '<p class="painel-empty">Nenhuma exposição ainda.</p>';
      if (els.saveOrder) els.saveOrder.hidden = true;
      return;
    }
    let lastGroup = null;
    expoItems.forEach((e, idx) => {
      const st = effectiveStatus(e);
      if (st !== lastGroup) {
        const label = document.createElement("p");
        label.className = "painel-group-label";
        label.textContent = GROUP_LABEL[st] || st;
        els.expoList.appendChild(label);
        lastGroup = st;
      }
      els.expoList.appendChild(expoRow(e, idx));
    });
    if (els.saveOrder) els.saveOrder.hidden = !orderDirty;
  }

  function renderExposicoes(list) {
    expoItems = sortInitial(list);
    orderDirty = false;
    drawExposicoes();
  }

  async function saveOrder() {
    const items = expoItems.map((e, i) => ({ slug: e.slug, order: i + 1 }));
    els.saveOrder.disabled = true; els.saveOrder.textContent = "Salvando…";
    try {
      const res = await window.coletivoAuth.authFetch("/.netlify/functions/reorder-exposicoes", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items }),
      });
      if (!res.ok) throw new Error(await res.text().catch(() => "erro"));
      orderDirty = false;
      els.saveOrder.textContent = "Ordem salva!";
      setTimeout(() => { els.saveOrder.textContent = "Salvar ordem"; els.saveOrder.disabled = false; loadAll(); }, 1300);
    } catch (err) {
      alert("Erro ao salvar a ordem: " + (err.message || ""));
      els.saveOrder.disabled = false; els.saveOrder.textContent = "Salvar ordem";
    }
  }

  function renderArtistas(list) {
    els.artistaList.innerHTML = "";
    if (!list.length) { els.artistaList.innerHTML = '<p class="painel-empty">Nenhum artista ainda.</p>'; return; }
    list.forEach((a) => {
      const meta = (a.roles || []).join(" · ") || "artista";
      els.artistaList.appendChild(rowEl(a.name, meta, "/painel/editar-artista/?slug=" + encodeURIComponent(a.slug), () => onDelete("artista", a)));
    });
  }

  async function load(fnName, key, render, errLabel) {
    try {
      const res = await window.coletivoAuth.authFetch("/.netlify/functions/" + fnName);
      if (res.status === 403) { showOnly(els.noadmin); els.sub.textContent = ""; return false; }
      if (!res.ok) throw new Error("HTTP " + res.status);
      const data = await res.json();
      render(data[key] || []);
      return true;
    } catch (err) {
      els.errorMsg.textContent = "Não foi possível carregar " + errLabel + ". " + (err.message || "");
      showOnly(els.error); els.sub.textContent = "";
      return false;
    }
  }

  async function loadAll() {
    els.sub.textContent = "Gerencie o conteúdo do site.";
    showOnly(els.content);
    const ok = await load("list-exposicoes", "exposicoes", renderExposicoes, "as exposições");
    if (ok) await load("list-artistas", "artistas", renderArtistas, "os artistas");
  }

  async function onDelete(kind, item) {
    const label = kind === "exposicao" ? "a exposição" : "o artista";
    if (!confirm("Excluir " + label + ' "' + (item.title || item.name) + '"? Esta ação não pode ser desfeita.')) return;
    try {
      const res = await window.coletivoAuth.authFetch("/.netlify/functions/delete-" + (kind === "exposicao" ? "exposicao" : "artista"), {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug: item.slug }),
      });
      if (!res.ok) throw new Error(await res.text().catch(() => "erro"));
      loadAll();
    } catch (err) { alert("Erro ao excluir: " + (err.message || "")); }
  }

  if (els.saveOrder) els.saveOrder.addEventListener("click", saveOrder);

  let resolved = false;
  async function start(user) {
    resolved = true;
    if (!user) { showOnly(els.guest); els.sub.textContent = ""; return; }
    const { admin } = await window.coletivoAuth.checkAdmin();
    if (!admin) { showOnly(els.noadmin); els.sub.textContent = ""; return; }
    loadAll();
  }

  document.addEventListener("identity:ready", (e) => start(e.detail.user));
  document.addEventListener("identity:login", (e) => start(e.detail.user));
  document.addEventListener("identity:logout", () => { resolved = true; showOnly(els.guest); els.sub.textContent = ""; });
  setTimeout(() => { if (!resolved) start(window.coletivoAuth && window.coletivoAuth.current()); }, 2500);
})();
