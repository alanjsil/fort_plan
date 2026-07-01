const supabase = require("../services/supabaseClient");

async function listar() {
  const { data, error } = await supabase
    .from("clientes")
    .select("*, estado:estados(*)")
    .order("nome");

  if (error) throw new Error(error.message);
  return data;
}

async function criar(event, cliente) {
  const { data, error } = await supabase
    .from("clientes")
    .insert({
      nome: cliente.nome,
      cnpj: cliente.cnpj || null,
      contato: cliente.contato || null,
      estado_id: cliente.estado_id || null,
    })
    .select("*, estado:estados(*)")
    .single();

  if (error) throw new Error(error.message);
  return data;
}

async function atualizar(event, { id, ...campos }) {
  const { data, error } = await supabase
    .from("clientes")
    .update({ ...campos, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*, estado:estados(*)")
    .single();

  if (error) throw new Error(error.message);
  return data;
}

async function remover(event, id) {
  const { error } = await supabase
    .from("clientes")
    .delete()
    .eq("id", id);

  if (error) throw new Error(error.message);
  return { ok: true };
}

module.exports = { listar, criar, atualizar, remover };
