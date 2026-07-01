const supabase = require("../services/supabaseClient");

async function listar() {
  const { data, error } = await supabase.from("produtos").select("*").order("nome");

  if (error) throw new Error(error.message);
  return data;
}

async function criar(event, produto) {
  const { data, error } = await supabase
    .from("produtos")
    .insert({
      nome: produto.nome,
      descricao: produto.descricao || null,
      preco: produto.preco,
      ativo: produto.ativo !== false,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

async function atualizar(event, { id, ...campos }) {
  const { data, error } = await supabase.from("produtos").update(campos).eq("id", id).select().single();

  if (error) throw new Error(error.message);
  return data;
}

async function remover(event, id) {
  const { error } = await supabase.from("produtos").delete().eq("id", id);

  if (error) throw new Error(error.message);
  return { ok: true };
}

module.exports = { listar, criar, atualizar, remover };
