/* Netlify Identity — estado de auth em todo o site.
 * - alterna elementos [data-when-loggedin] / [data-when-loggedout]
 * - mostra [data-only-admin] / [data-only-artist] conforme o papel
 * - botões [data-login] / [data-logout]
 * - guard da página /minha-conta/
 * (sem redirect automático: na página /entrar/ a pessoa escolhe pelos botões)
 */
(function () {
  const id = window.netlifyIdentity;
  if (!id) return;

  function isAdmin(user) {
    const roles = (user && user.app_metadata && user.app_metadata.roles) || [];
    return roles.indexOf("admin") !== -1;
  }

  // Cache do resultado do whoami (limpo no logout).
  let _whoamiCache = null;

  async function checkAdmin() {
    const user = id.currentUser();
    if (!user) return { admin: false, artistSlug: null };
    if (_whoamiCache) return _whoamiCache;
    try {
      const token = await user.jwt();
      const res = await fetch("/.netlify/functions/whoami", {
        headers: { Authorization: "Bearer " + token },
      });
      if (res.ok) {
        _whoamiCache = await res.json();
        updateAdminVisibility(_whoamiCache.admin);
        return _whoamiCache;
      }
    } catch (e) { /* ignora erros de rede */ }
    // Fallback local (sem whoami disponível, ex.: preview local)
    const admin = isAdmin(user);
    return { admin, artistSlug: (user.user_metadata || {}).artist_slug || null };
  }

  function updateAdminVisibility(admin) {
    document.querySelectorAll("[data-only-admin]").forEach((el) => { el.hidden = !admin; });
    document.querySelectorAll("[data-only-artist]").forEach((el) => { el.hidden = admin; });
  }

  let stateApplied = false;

  function applyState(user) {
    stateApplied = true;
    const loggedIn = !!user;
    document.querySelectorAll("[data-when-loggedin]").forEach((el) => {
      el.hidden = !loggedIn;
    });
    document.querySelectorAll("[data-when-loggedout]").forEach((el) => {
      el.hidden = loggedIn;
    });

    if (loggedIn) {
      // Aplica visibilidade inicial baseada no JWT local (síncrono).
      const adminLocal = isAdmin(user);
      updateAdminVisibility(adminLocal);
      // Depois confirma/corrige com o servidor (ADMIN_EMAILS).
      checkAdmin();
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

  id.on("init", (user) => {
    bindButtons();
    applyState(user);
    document.dispatchEvent(new CustomEvent("identity:ready", { detail: { user: user } }));
  });

  id.on("login", (user) => {
    applyState(user);
    id.close();
    document.dispatchEvent(new CustomEvent("identity:login", { detail: { user: user } }));
  });

  id.on("logout", () => {
    _whoamiCache = null;
    applyState(null);
    document.dispatchEvent(new CustomEvent("identity:logout"));
    // se estava numa página protegida, manda para o login
    if (window.location.pathname.replace(/\/+$/, "") === "/minha-conta") {
      window.location.href = "/entrar/";
    }
  });

  // Fallback: se o evento "init" não disparar (ex.: prévia local sem Identity),
  // aplica o estado mesmo assim para os botões não ficarem todos visíveis.
  setTimeout(function () {
    if (stateApplied) return;
    bindButtons();
    applyState(id.currentUser());
  }, 2000);

  // expõe helpers para outras páginas
  window.coletivoAuth = {
    isAdmin: isAdmin,
    checkAdmin: checkAdmin,
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
