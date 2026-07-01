# SDD — Sistema de Gestão de Pedidos, Produtos e Representantes

**Versão:** 1.0
**Data:** 01/07/2026
**Stack:** Electron + Node.js + JavaScript
**Backend/Dados:** Supabase (PostgreSQL + Auth + RLS)
**Uso:** Aplicação interna, ~5 usuários simultâneos

---

## 1. Visão Geral

Aplicação desktop (Electron) para controle de produtos, representantes comerciais, estados (com ICMS) e pedidos de venda. O acesso é restrito por login (Supabase Auth) e por papéis (roles), com regras de escrita/leitura aplicadas via Row Level Security (RLS) no banco — não apenas na interface.

### 1.1 Objetivos

- Centralizar cadastro de produtos, representantes e estados.
- Permitir o registro de pedidos consultando preço direto da tabela de produtos.
- Listar o histórico de pedidos.
- Restringir alterações sensíveis (produtos, representantes, estados) a `admin` e `gerente`.
- Garantir que a regra de permissão não dependa só do front-end (Electron pode ser inspecionado/modificado), e sim do banco via RLS.

### 1.2 Fora de escopo (v1)

- Emissão de nota fiscal / integração fiscal real.
- Múltiplas empresas/tenants.
- Relatórios avançados/dashboards (pode entrar em v2).
- App mobile.

---

## 2. Papéis (Roles)

| Role      | Produtos        | Representantes  | Estados         | Pedidos             |
| --------- | --------------- | --------------- | --------------- | ------------------- |
| `admin`   | CRUD            | CRUD            | CRUD            | CRUD (todos)        |
| `gerente` | CRUD            | CRUD            | CRUD            | CRUD (todos)        |
| `user`    | somente leitura | somente leitura | somente leitura | criar + ver (todos) |

> `admin` e `gerente` têm, na prática, o mesmo nível de permissão neste escopo. Mantive os dois porque você citou ambos — se não houver diferença real de uso, dá para simplificar para um único role `gestor` e reduzir complexidade. Fica como decisão sua.

---

## 3. Arquitetura

```
┌──────────────────────────────────────────────┐
│                Electron App                  │
│                                              │
│  ┌────────────────┐        ┌────────────────┐│
│  │  Main Process  │◄──IPC─►│ Renderer (UI)  ││
│  │  (Node.js)     │        │  (HTML/JS/CSS) ││
│  └───────┬────────┘        └────────────────┘│
│          │  contextBridge (preload.js)       │
└──────────┼───────────────────────────────────┘
           │
           ▼
   ┌───────────────────┐
   │   Supabase JS SDK │
   └────────┬──────────┘
            │ HTTPS
            ▼
   ┌───────────────────────────────┐
   │  Supabase (Postgres + Auth)   │
   │  - Auth (login/sessão)        │
   │  - RLS policies               │
   │  - Realtime (opcional)        │
   └───────────────────────────────┘
```

### 3.1 Decisões de arquitetura

- **`contextIsolation: true`, `nodeIntegration: false`** no `BrowserWindow`. Toda comunicação entre renderer e Node passa por `preload.js` com `contextBridge`.
- O client do Supabase (`supabase-js`) pode rodar tanto no **main process** quanto no **renderer**. Recomendo rodar no **main process** e expor funções específicas via IPC (ex.: `pedidos:criar`, `produtos:listar`). Isso evita expor a lógica de chamadas diretamente no DOM e centraliza tratamento de erros/sessão em um único lugar.
- Usar somente a **chave `anon`** do Supabase no app (nunca a `service_role`). A segurança real fica por conta do RLS — a `anon key` pode ser vista por qualquer pessoa com acesso ao binário do Electron, então isso é obrigatório, não opcional.
- Sessão (JWT) persistida localmente via `electron-store` (com `encryptionKey`) ou `keytar`, para não pedir login toda vez.

---

## 4. Modelo de Dados

### 4.1 Diagrama (simplificado)

```
profiles ──┐
           │ (1 profile = 1 auth.users)
           ▼
        auth.users

estados 1───N representantes
estados 1───N pedidos
representantes 1───N pedidos
produtos 1───N pedido_itens
pedidos 1───N pedido_itens
profiles 1───N pedidos (criado_por)
```

### 4.2 Tabelas

#### `profiles`

Espelha `auth.users`, guarda o role. Populada automaticamente via trigger no `signup`.

| Coluna       | Tipo                                  | Observação       |
| ------------ | ------------------------------------- | ---------------- |
| `id`         | uuid (PK, FK → auth.users.id)         |                  |
| `nome`       | text                                  |                  |
| `email`      | text                                  |                  |
| `role`       | text (`admin` \| `gerente` \| `user`) | default `'user'` |
| `created_at` | timestamptz                           | default `now()`  |

#### `estados`

| Coluna                      | Tipo         | Observação                  |
| --------------------------- | ------------ | --------------------------- |
| `id`                        | uuid (PK)    | default `gen_random_uuid()` |
| `nome`                      | text         | ex: "Rio Grande do Sul"     |
| `uf`                        | text(2)      | ex: "RS"                    |
| `icms`                      | numeric(5,2) | percentual                  |
| `created_at` / `updated_at` | timestamptz  |                             |

> "Representante daquele estado" não é uma coluna aqui — é obtido via `SELECT * FROM representantes WHERE estado_id = :estado_id`. Se um estado puder ter mais de um representante no futuro, esse modelo já suporta sem alterações.

#### `representantes`

| Coluna                      | Tipo                   | Observação |
| --------------------------- | ---------------------- | ---------- |
| `id`                        | uuid (PK)              |            |
| `nome`                      | text                   |            |
| `comissao_percentual`       | numeric(5,2)           | ex: 5.00   |
| `estado_id`                 | uuid (FK → estados.id) |            |
| `created_at` / `updated_at` | timestamptz            |            |

#### `produtos`

| Coluna                      | Tipo          | Observação                                                |
| --------------------------- | ------------- | --------------------------------------------------------- |
| `id`                        | uuid (PK)     |                                                           |
| `nome`                      | text          |                                                           |
| `descricao`                 | text          |                                                           |
| `preco`                     | numeric(10,2) |                                                           |
| `ativo`                     | boolean       | default `true` (permite "desativar" sem apagar histórico) |
| `created_at` / `updated_at` | timestamptz   |                                                           |

#### `pedidos`

| Coluna             | Tipo                          | Observação                                   |
| ------------------ | ----------------------------- | -------------------------------------------- |
| `id`               | uuid (PK)                     |                                              |
| `numero_pedido`    | serial / text                 | numeração amigável                           |
| `representante_id` | uuid (FK → representantes.id) |                                              |
| `estado_id`        | uuid (FK → estados.id)        | usado para puxar o ICMS no momento do pedido |
| `criado_por`       | uuid (FK → profiles.id)       | quem lançou o pedido                         |
| `status`           | text                          | `aberto`, `faturado`, `cancelado` (sugestão) |
| `valor_total`      | numeric(10,2)                 | calculado a partir dos itens                 |
| `observacoes`      | text                          | opcional                                     |
| `created_at`       | timestamptz                   |                                              |

#### `pedido_itens`

| Coluna           | Tipo                                        | Observação                                                                                                                |
| ---------------- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `id`             | uuid (PK)                                   |                                                                                                                           |
| `pedido_id`      | uuid (FK → pedidos.id, `ON DELETE CASCADE`) |                                                                                                                           |
| `produto_id`     | uuid (FK → produtos.id)                     |                                                                                                                           |
| `quantidade`     | integer                                     |                                                                                                                           |
| `preco_unitario` | numeric(10,2)                               | **cópia** do preço do produto no momento do pedido (importante: preço muda depois e o pedido antigo não pode mudar junto) |
| `subtotal`       | numeric(10,2)                               | `quantidade * preco_unitario`                                                                                             |

> Ponto de atenção: `preco_unitario` precisa ser **congelado** no momento da criação do pedido (copiado da tabela `produtos`), não referenciado dinamicamente. Senão, se o preço de um produto mudar amanhã, todos os pedidos antigos "mudam de valor" retroativamente — o que normalmente não é o comportamento desejado.

### 4.3 SQL de criação (resumo)

```sql
create type user_role as enum ('admin', 'gerente', 'user');

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text,
  email text,
  role user_role not null default 'user',
  created_at timestamptz default now()
);

create table estados (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  uf text not null,
  icms numeric(5,2) not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table representantes (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  comissao_percentual numeric(5,2) not null default 0,
  estado_id uuid references estados(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table produtos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  descricao text,
  preco numeric(10,2) not null,
  ativo boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table pedidos (
  id uuid primary key default gen_random_uuid(),
  numero_pedido serial,
  representante_id uuid references representantes(id),
  estado_id uuid references estados(id),
  criado_por uuid references profiles(id),
  status text not null default 'aberto',
  valor_total numeric(10,2) not null default 0,
  observacoes text,
  created_at timestamptz default now()
);

create table pedido_itens (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid references pedidos(id) on delete cascade,
  produto_id uuid references produtos(id),
  quantidade integer not null check (quantidade > 0),
  preco_unitario numeric(10,2) not null,
  subtotal numeric(10,2) generated always as (quantidade * preco_unitario) stored
);
```

---

## 5. Autenticação

- Login via `supabase.auth.signInWithPassword({ email, senha })`.
- Como são só 5 usuários fixos, os usuários podem ser **criados manualmente pelo admin** direto no painel do Supabase (Auth → Users) — não precisa de tela de "cadastro público" no app.
- Ao criar um usuário no Supabase Auth, uma **trigger** cria automaticamente a linha correspondente em `profiles` com `role = 'user'` por padrão. O `admin` depois ajusta o role manualmente (via painel Supabase ou uma tela simples de gestão de usuários, se quiser incluir).

```sql
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
```

---

## 6. Row Level Security (RLS)

### 6.1 Função auxiliar (evita repetir subquery em toda policy)

```sql
create or replace function public.get_my_role()
returns user_role
language sql stable
security definer
set search_path = public
as $$
  select role from profiles where id = auth.uid();
$$;
```

### 6.2 Habilitar RLS em todas as tabelas

```sql
alter table profiles enable row level security;
alter table estados enable row level security;
alter table representantes enable row level security;
alter table produtos enable row level security;
alter table pedidos enable row level security;
alter table pedido_itens enable row level security;
```

### 6.3 Policies — leitura liberada para todo autenticado, escrita restrita

```sql
-- PRODUTOS
create policy "produtos_select_all" on produtos
  for select using (auth.role() = 'authenticated');

create policy "produtos_write_admin_gerente" on produtos
  for all using (get_my_role() in ('admin','gerente'))
  with check (get_my_role() in ('admin','gerente'));

-- REPRESENTANTES
create policy "representantes_select_all" on representantes
  for select using (auth.role() = 'authenticated');

create policy "representantes_write_admin_gerente" on representantes
  for all using (get_my_role() in ('admin','gerente'))
  with check (get_my_role() in ('admin','gerente'));

-- ESTADOS
create policy "estados_select_all" on estados
  for select using (auth.role() = 'authenticated');

create policy "estados_write_admin_gerente" on estados
  for all using (get_my_role() in ('admin','gerente'))
  with check (get_my_role() in ('admin','gerente'));
```

### 6.4 Policies — profiles

```sql
create policy "profiles_select_own_or_admin" on profiles
  for select using (
    id = auth.uid() or get_my_role() in ('admin','gerente')
  );

create policy "profiles_update_admin_only" on profiles
  for update using (get_my_role() = 'admin')
  with check (get_my_role() = 'admin');
```

### 6.5 Policies — pedidos e pedido_itens

Aqui existe uma decisão de negócio que você precisa confirmar: **um `user` pode ver os pedidos de todo mundo, ou só os que ele mesmo lançou?**

Você disse "uma tela onde lista todos os pedidos já feitos" — vou assumir que **todos autenticados podem ver todos os pedidos** (útil para controle geral), mas só **quem criou o pedido (ou admin/gerente) pode editar/cancelar**. Se quiser restringir a visualização também, é só trocar a policy de `select`.

```sql
-- Leitura: todos autenticados veem todos os pedidos
create policy "pedidos_select_all" on pedidos
  for select using (auth.role() = 'authenticated');

-- Inserção: qualquer autenticado pode criar pedido, desde que seja "dono" dele
create policy "pedidos_insert_own" on pedidos
  for insert with check (criado_por = auth.uid());

-- Update/Delete: só quem criou (ainda 'aberto') ou admin/gerente
create policy "pedidos_update_own_or_gestor" on pedidos
  for update using (
    (criado_por = auth.uid() and status = 'aberto')
    or get_my_role() in ('admin','gerente')
  );

create policy "pedidos_delete_gestor_only" on pedidos
  for delete using (get_my_role() in ('admin','gerente'));

-- pedido_itens segue a mesma regra do pedido pai
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
```

> **Importante:** como o `preco_unitario` do pedido é copiado do produto no momento da criação, e a leitura de `produtos` já é liberada para todos autenticados, o app pode simplesmente buscar o preço no client antes de montar o `insert`. Não precisa de RPC/função no banco para isso — mas se quiser blindar 100% contra manipulação do valor pelo client (ex: alguém interceptar a chamada e mandar `preco_unitario` diferente do real), o ideal a médio prazo é criar uma função `rpc criar_pedido(...)` no Postgres que busca o preço server-side. Deixo isso como **melhoria recomendada para v2**, não bloqueante para v1 dado que são 5 usuários internos de confiança.

---

## 7. Telas (UI)

| Tela                 | Acesso                             | Conteúdo                                                                                                                                                          |
| -------------------- | ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Login**            | Todos                              | Email + senha, via Supabase Auth                                                                                                                                  |
| **Produtos**         | Ver: todos / Editar: admin+gerente | Lista + form (nome, descrição, preço, ativo)                                                                                                                      |
| **Representantes**   | Ver: todos / Editar: admin+gerente | Lista + form (nome, comissão %, estado)                                                                                                                           |
| **Estados**          | Ver: todos / Editar: admin+gerente | Lista + form (nome, UF, ICMS) — exibe representante vinculado                                                                                                     |
| **Novo Pedido**      | Todos                              | Seleciona representante → estado é sugerido automaticamente (pelo `estado_id` do representante) → adiciona produtos (busca preço automaticamente) → calcula total |
| **Lista de Pedidos** | Todos (ver seção 6.5)              | Tabela com filtros (data, representante, status), clique abre detalhe do pedido                                                                                   |

### 7.1 Fluxo de "Novo Pedido" (UX)

1. Usuário seleciona o **representante**.
2. Sistema preenche automaticamente o **estado** (e o ICMS correspondente), pois cada representante está ligado a um estado.
3. Usuário adiciona um ou mais **produtos** (busca de produto → preço vem preenchido automaticamente, mas pode ajustar quantidade).
4. Sistema calcula `subtotal` por item e `valor_total` do pedido (com ICMS exibido informativamente, se aplicável ao cálculo — a definir se o ICMS entra no valor final ou é só informativo/comissão).
5. Salvar → grava `pedidos` + `pedido_itens` numa transação.

> Pergunta em aberto para você: **o ICMS afeta o valor final cobrado do cliente, ou é só uma informação de referência/relatório?** Isso muda a fórmula de cálculo do total. Fica marcado como pendência de regra de negócio.

---

## 8. Estrutura de pastas sugerida

```
app/
├── main/
│   ├── main.js              # entrypoint do Electron
│   ├── preload.js           # contextBridge (IPC seguro)
│   ├── supabaseClient.js    # client supabase-js (anon key)
│   └── handlers/
│       ├── auth.js
│       ├── produtos.js
│       ├── representantes.js
│       ├── estados.js
│       └── pedidos.js
├── renderer/
│   ├── index.html
│   ├── login/
│   ├── produtos/
│   ├── representantes/
│   ├── estados/
│   ├── pedidos/
│   └── shared/ (componentes, guards de role no front)
├── .env                      # SUPABASE_URL, SUPABASE_ANON_KEY
├── package.json
└── electron-builder.yml
```

---

## 9. Segurança — checklist

- [ ] RLS habilitado em **todas** as tabelas (nunca deixar tabela sem RLS achando que "o front já valida").
- [ ] Somente `anon key` no app; `service_role key` nunca sai do painel Supabase.
- [ ] `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true` no Electron.
- [ ] Sessão local criptografada (não salvar JWT em texto puro em disco).
- [ ] Front-end também esconde botões/telas de edição para `user` (UX), mas a regra "de verdade" é a RLS — nunca confiar só na UI.
- [ ] Validar inputs no client antes de enviar (evitar `quantidade <= 0`, preço negativo, etc. — já reforçado com `check` no banco).

---

## 10. Pendências / decisões que faltam confirmar

1. `admin` e `gerente` têm exatamente as mesmas permissões neste escopo — mantém os dois roles ou simplifica para um só?

- Não serão diferentes

2. `user` pode ver pedidos de **todos** ou só os **próprios**? (assumido: todos)

- Todos

3. O ICMS entra no cálculo do valor total do pedido ou é apenas informativo?

- A tela com o pedido devera apresentar
  | Item | Valor(cadastrado) | Valor Liquido (valor-icms) | Comissão (valor\*comissão) |

4. Pedido tem dados de cliente (nome/CNPJ) ou é só produto + quantidade + representante?

- Dados do Cliente (precisamos ter a tela de cadastro de cliente)

5. Existe necessidade de editar/cancelar pedido depois de "faturado", ou trava totalmente?

- Existe necessidade

---

## 11. Roadmap sugerido (fora do v1)

- RPC `criar_pedido` server-side para blindar preço/total contra manipulação no client.
- Tela de gestão de usuários/roles dentro do próprio app (hoje seria feita manual no painel Supabase).
- Exportação de pedidos (PDF/Excel).
- Dashboard de comissão por representante.
