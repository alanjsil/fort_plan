-- ============================================================
-- Migração: congelar ICMS/comissão no pedido + RPC criar_pedido
-- Resolve: preço confiado no client, ICMS/comissão não congelados,
--          criação de pedido não atômica.
-- ============================================================

-- 1. Novas colunas em pedidos: percentuais congelados no momento da criação
alter table pedidos
  add column if not exists icms_percentual numeric(5,2),
  add column if not exists comissao_percentual numeric(5,2);

-- Pedidos já existentes: preenche com o valor atual do estado/representante
-- (aproximação razoável, já que não temos o histórico exato)
update pedidos p
set icms_percentual = e.icms
from estados e
where p.estado_id = e.id and p.icms_percentual is null;

update pedidos p
set comissao_percentual = r.comissao_percentual
from representantes r
where p.representante_id = r.id and p.comissao_percentual is null;

-- ============================================================
-- 2. Função RPC — cria pedido + itens de forma atômica,
--    buscando preço/ICMS/comissão SEMPRE server-side (nunca do client)
-- ============================================================

create or replace function public.criar_pedido(
  p_cliente_id uuid,
  p_representante_id uuid,
  p_estado_id uuid,
  p_observacoes text,
  p_itens jsonb  -- formato: [{"produto_id": "uuid", "quantidade": 2}, ...]
)
returns pedidos
language plpgsql
as $$
declare
  v_representante representantes%rowtype;
  v_estado         estados%rowtype;
  v_pedido         pedidos%rowtype;
  v_item           jsonb;
  v_produto        produtos%rowtype;
  v_quantidade     integer;
  v_valor_total    numeric(10,2) := 0;
begin
  if p_itens is null or jsonb_array_length(p_itens) = 0 then
    raise exception 'Pedido precisa de ao menos 1 item';
  end if;

  select * into v_representante from representantes where id = p_representante_id;
  if not found then
    raise exception 'Representante não encontrado';
  end if;

  select * into v_estado from estados where id = p_estado_id;
  if not found then
    raise exception 'Estado não encontrado';
  end if;

  -- Cria o pedido já com os percentuais CONGELADOS (não vêm do client)
  insert into pedidos (
    cliente_id, representante_id, estado_id, criado_por,
    valor_total, observacoes, icms_percentual, comissao_percentual
  ) values (
    p_cliente_id, p_representante_id, p_estado_id, auth.uid(),
    0, p_observacoes, v_estado.icms, v_representante.comissao_percentual
  )
  returning * into v_pedido;

  -- Itera os itens: preço vem SEMPRE da tabela produtos, nunca do client
  for v_item in select * from jsonb_array_elements(p_itens)
  loop
    v_quantidade := (v_item->>'quantidade')::integer;

    if v_quantidade is null or v_quantidade <= 0 then
      raise exception 'Quantidade inválida para o item';
    end if;

    select * into v_produto from produtos where id = (v_item->>'produto_id')::uuid;
    if not found then
      raise exception 'Produto não encontrado: %', v_item->>'produto_id';
    end if;

    v_valor_total := v_valor_total + (v_quantidade * v_produto.preco);

    insert into pedido_itens (pedido_id, produto_id, quantidade, preco_unitario)
    values (v_pedido.id, v_produto.id, v_quantidade, v_produto.preco);
  end loop;

  update pedidos
  set valor_total = v_valor_total
  where id = v_pedido.id
  returning * into v_pedido;

  return v_pedido;
end;
$$;

-- A função roda como SECURITY INVOKER (padrão) de propósito: ela usa o
-- JWT de quem chamou, então as policies de RLS já existentes
-- (pedidos_insert_own, pedido_itens_insert_own_pedido) continuam valendo
-- normalmente. Não precisa de SECURITY DEFINER nem de novas policies.

grant execute on function public.criar_pedido(uuid, uuid, uuid, text, jsonb) to authenticated;
