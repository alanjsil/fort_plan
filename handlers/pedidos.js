const supabase = require("../services/supabaseClient");

async function criar(event, dados) {
  const { cliente_id, representante_id, estado_id, observacoes, itens } = dados;

  if (!itens || itens.length === 0) {
    throw new Error("Pedido precisa de ao menos 1 item");
  }

  const itensParaRpc = itens.map((item) => ({
    produto_id: item.produto_id,
    quantidade: item.quantidade,
  }));

  const { data: pedido, error } = await supabase.rpc("criar_pedido", {
    p_cliente_id: cliente_id,
    p_representante_id: representante_id,
    p_estado_id: estado_id,
    p_observacoes: observacoes || null,
    p_itens: itensParaRpc,
  });

  if (error) throw new Error(error.message);
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
  const { data, error } = await supabase.from("pedidos").update({ status }).eq("id", id).select().single();

  if (error) throw new Error(error.message);
  return data;
}

module.exports = { criar, listar, buscarPorId, atualizarStatus };
