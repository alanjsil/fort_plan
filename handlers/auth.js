const supabase = require("../services/supabaseClient");
const { salvarSessao, carregarSessao, limparSessao } = require("../services/session");
const { setUsuario, limpar } = require("../services/state");

async function login(event, { email, senha }) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password: senha,
  });

  if (error) throw new Error(error.message);

  salvarSessao(data.session);

  const { data: perfil } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", data.user.id)
    .single();

  setUsuario(data.user, perfil);

  return { usuario: data.user, perfil };
}

async function logout() {
  await supabase.auth.signOut();
  limpar();
  limparSessao();
  return { ok: true };
}

async function getSessao() {
  const sessao = carregarSessao();
  if (!sessao) return null;

  const { data, error } = await supabase.auth.setSession(sessao);
  if (error || !data.session) {
    limpar();
    limparSessao();
    return null;
  }

  const { data: perfil } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", data.user.id)
    .single();

  setUsuario(data.user, perfil);
  return { usuario: data.user, perfil };
}

async function getPerfil() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: perfil } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return perfil;
}

module.exports = { login, logout, getSessao, getPerfil };
