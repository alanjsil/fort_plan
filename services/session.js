const Store = require("electron-store");

const store = new Store({
  name: "sessao",
  encryptionKey: "fort-planilha-sessao-key-v1",
});

function salvarSessao(sessao) {
  store.set("supabase_sessao", sessao);
}

function carregarSessao() {
  return store.get("supabase_sessao", null);
}

function limparSessao() {
  store.delete("supabase_sessao");
}

module.exports = { salvarSessao, carregarSessao, limparSessao };
