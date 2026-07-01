const supabase = require("../services/supabaseClient");

async function listar() {
  const { data, error } = await supabase
    .from("representantes")
    .select("*, estado:estados(*)")
    .order("nome");

  if (error) throw new Error(error.message);
  return data;
}

async function criar(event, representante) {
  const { data, error } = await supabase
    .from("representantes")
    .insert({
      nome: representante.nome,
      comissao_percentual: representante.comissao_percentual,
      estado_id: representante.estado_id,
    })
    .select("*, estado:estados(*)")
    .single();

  if (error) throw new Error(error.message);
  return data;
}

async function atualizar(event, { id, ...campos }) {
  const { data, error } = await supabase
    .from("representantes")
    .update(campos)
    .eq("id", id)
    .select("*, estado:estados(*)")
    .single();

  if (error) throw new Error(error.message);
  return data;
}

async function remover(event, id) {
  const { error } = await supabase
    .from("representantes")
    .delete()
    .eq("id", id);

  if (error) throw new Error(error.message);
  return { ok: true };
}

module.exports = { listar, criar, atualizar, remover };
