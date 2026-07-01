document.addEventListener("DOMContentLoaded", async () => {
  const form = document.getElementById("form-login");
  const email = document.getElementById("email");
  const senha = document.getElementById("senha");
  const erro = document.getElementById("erro-login");
  const btn = document.getElementById("btn-login");
  const telaLogin = document.getElementById("tela-login");
  const telaPrincipal = document.getElementById("tela-principal");

  // #TODO Falta botão de permanecer conectado
  async function tentarRestaurarSessao() {
    const sessao = await window.electronAPI.getSessao();
    if (sessao) {
      definirPerfil(sessao.perfil);
      mostrarPrincipal(sessao.perfil);
      return true;
    }
    return false;
  }

  function mostrarPrincipal(perfil) {
    telaLogin.classList.add("oculto");
    telaPrincipal.classList.remove("oculto");
    document.getElementById("nav-usuario-nome").textContent = perfil.nome || perfil.email;
    document.getElementById("nav-role").textContent = perfil.role;
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    erro.classList.add("oculto");
    btn.disabled = true;
    btn.textContent = "Entrando...";

    try {
      const resultado = await window.electronAPI.login({
        email: email.value,
        senha: senha.value,
      });
      definirPerfil(resultado.perfil);
      mostrarPrincipal(resultado.perfil);
    } catch (err) {
      erro.textContent = err.message || "Erro ao fazer login";
      erro.classList.remove("oculto");
    } finally {
      btn.disabled = false;
      btn.textContent = "Entrar";
    }
  });

  const sessaoRestaurada = await tentarRestaurarSessao();
  if (!sessaoRestaurada) {
    telaLogin.classList.remove("oculto");
  }
});
