const state = {
  usuario: null,
  perfil: null,
};

function setUsuario(usuario, perfil) {
  state.usuario = usuario;
  state.perfil = perfil;
}

function limpar() {
  state.usuario = null;
  state.perfil = null;
}

function getRole() {
  return state.perfil?.role || null;
}

module.exports = { state, setUsuario, limpar, getRole };
