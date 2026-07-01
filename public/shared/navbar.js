document.addEventListener("DOMContentLoaded", () => {
  const links = document.querySelectorAll(".nav-links a");
  const paginas = document.querySelectorAll(".pagina");
  const btnLogout = document.getElementById("btn-logout");

  function navegarPara(telaId) {
    paginas.forEach((p) => p.classList.add("oculto"));
    const alvo = document.getElementById(`tela-${telaId}`);
    if (alvo) alvo.classList.remove("oculto");

    links.forEach((l) => l.classList.remove("ativo"));
    const linkAtivo = document.querySelector(`.nav-links a[data-tela="${telaId}"]`);
    if (linkAtivo) linkAtivo.classList.add("ativo");
  }

  links.forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const tela = link.dataset.tela;
      navegarPara(tela);

      if (typeof carregarTela === "function") {
        carregarTela(tela);
      }
    });
  });

  btnLogout.addEventListener("click", async () => {
    await window.electronAPI.logout();
    location.reload();
  });

  window.navegarPara = navegarPara;
});
