let perfilAtual = null;

function definirPerfil(perfil) {
  perfilAtual = perfil;
}

function getPerfilAtual() {
  return perfilAtual;
}

function podeEscrever() {
  return perfilAtual && ["admin", "gerente"].includes(perfilAtual.role);
}

function ehAdmin() {
  return perfilAtual && perfilAtual.role === "admin";
}
