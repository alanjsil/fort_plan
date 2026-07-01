const supabase = require("../services/supabaseClient");

async function criar(event, dados) {
  const { cliente_id, representante_id, estado_id, observacoes, itens } = dados;

  if (!itens || itens.length === 0) {
    throw new Error("Pedido precisa de ao menos 1 item");
  }

  const { data: representante } = await supabase
    .from("representantes")
    .select("comissao_percentual")
    .eq("id", representante_id)
    .single();

  if (!representante) throw new Error("Representante não encontrado");

  const { data: estado } = await supabase
    .from("estados")
    .select("icms")
    .eq("id", estado_id)
    .single();

  if (!estado) throw new Error("Estado não encontrado");

  const itensFormatados = itens.map((item) => ({
    produto_id: item.produto_id,
    quantidade: item.quantidade,
    preco_unitario: item.preco_unitario,
  }));

  const valorTotalItens = itensFormatados.reduce(
    (acc, item) => acc + item.quantidade * item.preco_unitario,
    0
  );

  const { data: { user } } = await supabase.auth.getUser();

  const { data: pedido, error: erroPedido } = await supabase
    .from("pedidos")
    .insert({
      cliente_id,
      representante_id,
      estado_id,
      criado_por: user.id,
      valor_total: valorTotalItens,
      observacoes: observacoes || null,
    })
    .select()
    .single();

  if (erroPedido) throw new Error(erroPedido.message);

  const itensInserir = itensFormatados.map((item) => ({
    ...item,
    pedido_id: pedido.id,
  }));

  const { error: erroItens } = await supabase
    .from("pedido_itens")
    .insert(itensInserir);

  if (erroItens) throw new Error(erroItens.message);

  return pedido;
}

async function listar(event, filtros) {
  let query = supabase
    .from("pedidos")
    .select("*, cliente:clientes(*), representante:representantes(*), estado:estados(*), itens:pedido_itens(*, produto:produtos(*))")
    .order("created_at", { ascending: false });

  if (filtros?.status) {
    query = query.eq("status", filtros.status);
  }
  if (filtros?.representante_id) {
    query = query.eq("representante_id", filtros.representante_id);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data;
}

async function buscarPorId(event, id) {
  const { data, error } = await supabase
    .from("pedidos")
    .select("*, cliente:clientes(*), representante:representantes(*), estado:estados(*), itens:pedido_itens(*, produto:produtos(*))")
    .eq("id", id)
    .single();

  if (error) throw new Error(error.message);
  return data;
}

async function atualizarStatus(event, { id, status }) {
  const { data, error } = await supabase
    .from("pedidos")
    .update({ status })
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

module.exports = { criar, listar, buscarPorId, atualizarStatus };
