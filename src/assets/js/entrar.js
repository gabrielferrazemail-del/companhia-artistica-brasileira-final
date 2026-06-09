/* Roteamento pós-login (/entrar/).
 * admin -> /painel/ ; artista vinculado -> /minha-conta/ ; sem papel -> fica com aviso.
 */
(function () {
  const status = document.getElementById("entrar-status");
  let routed = false;

  function route(w) {
    if (routed) return;
    if (!w || !w.loggedIn) return; // deslogado: nada a fazer
    if (w.admin) { routed = true; location.href = "/painel/"; return; }
    if (w.artistSlug) { routed = true; location.href = "/minha-conta/"; return; }
    // Logado, mas sem papel reconhecido.
    if (status) {
      status.textContent =
        "Você entrou, mas a sua conta ainda não está vinculada a um perfil. " +
        "Fale com a administração do coletivo.";
    }
  }

  async function handle(detail) {
    const w = (detail && detail.whoami) || (window.coletivoAuth && await window.coletivoAuth.whoami());
    route(w);
  }

  document.addEventListener("identity:login", (e) => handle(e.detail));
  document.addEventListener("identity:ready", (e) => handle(e.detail));
})();
