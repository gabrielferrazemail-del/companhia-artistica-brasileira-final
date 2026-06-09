/* Netlify Identity — controlador único de auth do site.
 * Fonte da verdade do papel = função whoami (servidor): { loggedIn, admin, artistSlug }.
 * - alterna [data-when-loggedin] / [data-when-loggedout]
 * - visibilidade por papel: [data-only-admin] (admin) e [data-only-artist] (tem artistSlug)
 * - botões [data-login] / [data-logout]
 * - eventos identity:ready|login|logout com detail { user, role }
 * (sem redirect automático aqui: o roteamento pós-login fica em entrar.js)
 */
(function () {
  const id = window.netlifyIdentity;
  if (!id) return;

  function isAdminLocal(user) {
    const roles = (user && user.app_metadata && user.app_metadata.roles) || [];
    return roles.indexOf("admin") !== -1;
  }

  // Cache do whoami (limpo no logout). Promise para coalescer chamadas concorrentes.
  let _whoamiPromise = null;

  async function fetchWhoami() {
    const user = id.currentUser();
    if (!user) return { loggedIn: false, admin: false, artistSlug: null };
    try {
      const token = await user.jwt();
      const res = await fetch("/.netlify/functions/whoami", {
        headers: { Authorization: "Bearer " + token },
      });
      if (res.ok) return await res.json();
    } catch (e) { /* rede indisponível: cai no fallback local */ }
    // Fallback local (ex.: preview sem Functions): usa só o JWT.
    return {
      loggedIn: true,
      admin: isAdminLocal(user),
      artistSlug: (user.user_metadata || {}).artist_slug || null,
    };
  }

  // Retorna o whoami cacheado (busca uma vez por sessão de login).
  function whoami() {
    if (!_whoamiPromise) _whoamiPromise = fetchWhoami();
    return _whoamiPromise;
  }

  function roleOf(w) {
    if (!w || !w.loggedIn) return "guest";
    if (w.admin) return "admin";
    if (w.artistSlug) return "artist";
    return "guest";
  }

  function updateRoleVisibility(w) {
    const admin = !!(w && w.admin);
    const artist = !!(w && w.artistSlug);
    document.querySelectorAll("[data-only-admin]").forEach((el) => { el.hidden = !admin; });
    document.querySelectorAll("[data-only-artist]").forEach((el) => { el.hidden = !artist; });
  }

  let stateApplied = false;

  function applyState(user) {
    stateApplied = true;
    const loggedIn = !!user;
    document.querySelectorAll("[data-when-loggedin]").forEach((el) => { el.hidden = !loggedIn; });
    document.querySelectorAll("[data-when-loggedout]").forEach((el) => { el.hidden = loggedIn; });

    if (loggedIn) {
      // Esconde elementos de papel até o whoami confirmar (evita flash de link errado).
      updateRoleVisibility(null);
      whoami().then(updateRoleVisibility);
    } else {
      updateRoleVisibility(null);
    }
  }

  function bindButtons() {
    document.querySelectorAll("[data-login]").forEach((btn) => {
      btn.addEventListener("click", (e) => { e.preventDefault(); id.open("login"); });
    });
    document.querySelectorAll("[data-logout]").forEach((btn) => {
      btn.addEventListener("click", (e) => { e.preventDefault(); id.logout(); });
    });
  }

  async function emit(name, user) {
    const w = user ? await whoami() : { loggedIn: false, admin: false, artistSlug: null };
    document.dispatchEvent(new CustomEvent(name, { detail: { user: user, role: roleOf(w), whoami: w } }));
  }

  id.on("init", (user) => {
    bindButtons();
    applyState(user);
    emit("identity:ready", user);
  });

  id.on("login", (user) => {
    _whoamiPromise = null; // novo login: refaz o whoami
    applyState(user);
    id.close();
    emit("identity:login", user);
  });

  id.on("logout", () => {
    _whoamiPromise = null;
    applyState(null);
    document.dispatchEvent(new CustomEvent("identity:logout"));
    // se estava numa página protegida, manda para o login
    if (window.location.pathname.replace(/\/+$/, "") === "/minha-conta") {
      window.location.href = "/entrar/";
    }
  });

  // Fallback: se "init" não disparar (ex.: prévia local sem Identity),
  // aplica o estado mesmo assim para os botões não ficarem todos visíveis.
  setTimeout(function () {
    if (stateApplied) return;
    bindButtons();
    const user = id.currentUser();
    applyState(user);
    emit("identity:ready", user);
  }, 2000);

  // API pública usada por outras páginas.
  window.coletivoAuth = {
    isAdmin: isAdminLocal,
    whoami: whoami,
    role: async function () { return roleOf(await whoami()); },
    // checkAdmin mantido por compatibilidade com painel.js.
    checkAdmin: async function () {
      const w = await whoami();
      return { admin: !!w.admin, artistSlug: w.artistSlug || null };
    },
    current: function () { return id.currentUser(); },
    token: function () {
      const u = id.currentUser();
      return u ? u.jwt() : Promise.reject(new Error("not-authenticated"));
    },
    authFetch: async function (path, options) {
      const u = id.currentUser();
      if (!u) throw new Error("not-authenticated");
      const token = await u.jwt();
      options = options || {};
      options.headers = Object.assign({}, options.headers, { Authorization: "Bearer " + token });
      return fetch(path, options);
    },
  };
})();
