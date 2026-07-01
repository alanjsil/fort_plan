-- ============================================================
-- SDD — Sistema de Gestão de Pedidos
-- Schema completo + RLS + Seeds
-- Versão: 1.0
-- ============================================================

-- ============================================================
-- 1. TIPOS
-- ============================================================

create type user_role as enum ('admin', 'gerente', 'user');
create type status_pedido as enum ('aberto', 'faturado', 'cancelado');

-- ============================================================
-- 2. TABELAS
-- ============================================================

-- 2.1 profiles (espelha auth.users via trigger)
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text,
  email text,
  role user_role not null default 'user',
  created_at timestamptz default now()
);

-- 2.2 estados
create table estados (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  uf text not null unique,
  icms numeric(5,2) not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2.3 representantes
create table representantes (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  comissao_percentual numeric(5,2) not null default 0,
  estado_id uuid references estados(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2.4 produtos
create table produtos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  descricao text,
  preco numeric(10,2) not null check (preco >= 0),
  ativo boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2.5 clientes
create table clientes (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  cnpj text,
  contato text,
  estado_id uuid references estados(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2.6 pedidos
create table pedidos (
  id uuid primary key default gen_random_uuid(),
  numero_pedido serial,
  cliente_id uuid references clientes(id),
  representante_id uuid references representantes(id),
  estado_id uuid references estados(id),
  criado_por uuid references profiles(id),
  status status_pedido not null default 'aberto',
  valor_total numeric(10,2) not null default 0,
  observacoes text,
  icms_percentual numeric(5,2),
  comissao_percentual numeric(5,2),
  created_at timestamptz default now()
);

-- 2.7 pedido_itens
create table pedido_itens (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid references pedidos(id) on delete cascade,
  produto_id uuid references produtos(id),
  quantidade integer not null check (quantidade > 0),
  preco_unitario numeric(10,2) not null,
  subtotal numeric(10,2) generated always as (quantidade * preco_unitario) stored
);

-- ============================================================
-- 3. TRIGGER — criar profile automaticamente no signup
-- ============================================================

create function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, nome, role)
  values (new.id, new.email, new.raw_user_meta_data->>'nome', 'user');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- 4. FUNÇÃO AUXILIAR RLS
-- ============================================================

create or replace function public.get_my_role()
returns user_role
language sql stable
security definer
set search_path = public
as $$
  select role from profiles where id = auth.uid();
$$;

-- 4.1 Função RPC — criar pedido + itens de forma atômica (server-side)
create or replace function public.criar_pedido(
  p_cliente_id uuid,
  p_representante_id uuid,
  p_estado_id uuid,
  p_observacoes text,
  p_itens jsonb
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

  insert into pedidos (
    cliente_id, representante_id, estado_id, criado_por,
    valor_total, observacoes, icms_percentual, comissao_percentual
  ) values (
    p_cliente_id, p_representante_id, p_estado_id, auth.uid(),
    0, p_observacoes, v_estado.icms, v_representante.comissao_percentual
  )
  returning * into v_pedido;

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

grant execute on function public.criar_pedido(uuid, uuid, uuid, text, jsonb) to authenticated;

-- ============================================================
-- 5. ROW LEVEL SECURITY
-- ============================================================

alter table profiles enable row level security;
alter table estados enable row level security;
alter table representantes enable row level security;
alter table produtos enable row level security;
alter table clientes enable row level security;
alter table pedidos enable row level security;
alter table pedido_itens enable row level security;

-- 5.1 profiles
create policy "profiles_select_own_or_admin" on profiles
  for select using (
    id = auth.uid() or get_my_role() in ('admin','gerente')
  );

create policy "profiles_update_admin_only" on profiles
  for update using (get_my_role() = 'admin')
  with check (get_my_role() = 'admin');

-- 5.2 estados (leitura livre, escrita admin/gerente)
create policy "estados_select_all" on estados
  for select using (auth.role() = 'authenticated');

create policy "estados_write_admin_gerente" on estados
  for all using (get_my_role() in ('admin','gerente'))
  with check (get_my_role() in ('admin','gerente'));

-- 5.3 representantes
create policy "representantes_select_all" on representantes
  for select using (auth.role() = 'authenticated');

create policy "representantes_write_admin_gerente" on representantes
  for all using (get_my_role() in ('admin','gerente'))
  with check (get_my_role() in ('admin','gerente'));

-- 5.4 produtos
create policy "produtos_select_all" on produtos
  for select using (auth.role() = 'authenticated');

create policy "produtos_write_admin_gerente" on produtos
  for all using (get_my_role() in ('admin','gerente'))
  with check (get_my_role() in ('admin','gerente'));

-- 5.5 clientes
create policy "clientes_select_all" on clientes
  for select using (auth.role() = 'authenticated');

create policy "clientes_write_admin_gerente" on clientes
  for all using (get_my_role() in ('admin','gerente'))
  with check (get_my_role() in ('admin','gerente'));

-- 5.6 pedidos
create policy "pedidos_select_all" on pedidos
  for select using (auth.role() = 'authenticated');

create policy "pedidos_insert_own" on pedidos
  for insert with check (criado_por = auth.uid());

create policy "pedidos_update_own_or_gestor" on pedidos
  for update using (
    (criado_por = auth.uid() and status = 'aberto')
    or get_my_role() in ('admin','gerente')
  );

create policy "pedidos_delete_gestor_only" on pedidos
  for delete using (get_my_role() in ('admin','gerente'));

-- 5.7 pedido_itens
create policy "pedido_itens_select_all" on pedido_itens
  for select using (auth.role() = 'authenticated');

create policy "pedido_itens_insert_own_pedido" on pedido_itens
  for insert with check (
    exists (
      select 1 from pedidos p
      where p.id = pedido_id and p.criado_por = auth.uid()
    )
  );

create policy "pedido_itens_write_gestor_or_owner" on pedido_itens
  for all using (
    get_my_role() in ('admin','gerente')
    or exists (
      select 1 from pedidos p
      where p.id = pedido_id and p.criado_por = auth.uid() and p.status = 'aberto'
    )
  );

-- ============================================================
-- 6. SEEDS
-- ============================================================

insert into estados (nome, uf, icms) values
  ('Acre', 'AC', 17.00),
  ('Alagoas', 'AL', 17.00),
  ('Amapá', 'AP', 17.00),
  ('Amazonas', 'AM', 17.00),
  ('Bahia', 'BA', 17.00),
  ('Ceará', 'CE', 17.00),
  ('Distrito Federal', 'DF', 17.00),
  ('Espírito Santo', 'ES', 17.00),
  ('Goiás', 'GO', 17.00),
  ('Maranhão', 'MA', 17.00),
  ('Mato Grosso', 'MT', 17.00),
  ('Mato Grosso do Sul', 'MS', 17.00),
  ('Minas Gerais', 'MG', 17.00),
  ('Pará', 'PA', 17.00),
  ('Paraíba', 'PB', 17.00),
  ('Paraná', 'PR', 18.00),
  ('Pernambuco', 'PE', 17.00),
  ('Piauí', 'PI', 17.00),
  ('Rio de Janeiro', 'RJ', 18.00),
  ('Rio Grande do Norte', 'RN', 17.00),
  ('Rio Grande do Sul', 'RS', 17.00),
  ('Rondônia', 'RO', 17.00),
  ('Roraima', 'RR', 17.00),
  ('Santa Catarina', 'SC', 17.00),
  ('São Paulo', 'SP', 18.00),
  ('Sergipe', 'SE', 17.00),
  ('Tocantins', 'TO', 17.00);
