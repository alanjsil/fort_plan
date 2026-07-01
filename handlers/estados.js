const supabase = require("../services/supabaseClient");

async function listar() {
  const { data, error } = await supabase.from("estados").select("*").order("nome");

  if (error) throw new Error(error.message);
  return data;
}

async function criar(event, estado) {
  const { data, error } = await supabase
    .from("estados")
    .insert({
      nome: estado.nome,
      uf: estado.uf,
      icms: estado.icms,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

async function atualizar(event, { id, ...campos }) {
  const { data, error } = await supabase
    .from("estados")
    .update({ ...campos, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

async function remover(event, id) {
  const { error } = await supabase.from("estados").delete().eq("id", id);

  if (error) throw new Error(error.message);
  return { ok: true };
}

module.exports = { listar, criar, atualizar, remover };
