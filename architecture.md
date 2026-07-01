# Arquitetura — Fort Planilha

## 1. Visão Geral

Sistema desktop de gestão de pedidos, produtos, clientes, representantes e
estados. Construído com **Electron** no frontend desktop e **Supabase**
(PostgreSQL) como backend.

---

## 2. Stack

| Camada       | Tecnologia                           |
| ------------ | ------------------------------------ |
| Desktop      | Electron 43                          |
| Main process | Node.js (CJS)                        |
| Renderer     | HTML + CSS + JS puro (sem framework) |
| Banco        | Supabase (PostgreSQL)                |
| Autenticação | Supabase Auth                        |
| Sessão local | electron-store (criptografado)       |
| Testes       | Vitest                               |
| Linter       | ESLint 8                             |

---

## 3. Estrutura de Diretórios

```
/
├── main.js                 # Entrypoint Electron (main process)
├── preload.js              # Bridge contextBridge (main → renderer)
├── architecture.md         # Este documento
├── AGENTS.md               # Instruções para IA
│
├── handlers/               # IPC handlers (CJS)
│   ├── auth.js             #   Login/logout/sessão
│   ├── produtos.js         #   CRUD produtos
│   ├── representantes.js   #   CRUD representantes
│   ├── estados.js          #   CRUD estados
│   ├── clientes.js         #   CRUD clientes
│   └── pedidos.js          #   CRUD pedidos + itens
│
├── services/               # Serviços compartilhados do main process (CJS)
│   ├── supabaseClient.js   #   Cliente Supabase centralizado
│   ├── session.js          #   Sessão persistida (electron-store)
│   └── state.js            #   Estado em memória (usuário / perfil)
│
├── public/                 # Renderer (scripts globais via <script>)
│   ├── index.html          #   Página principal
│   ├── roteador.js         #   Navegação entre telas (switch tela → função)
│   │
│   ├── shared/
│   │   ├── estilos.css     #   Estilos globais
│   │   ├── toast.css       #   Estilos dos toasts/modais
│   │   ├── helper.js       #   Funções globais (formatação, cálculo, toast, role)
│   │   └── navbar.js       #   Barra de navegação + toggle de telas
│   │
│   ├── login/
│   │   └── login.js        #   Tela de login
│   ├── produtos/
│   │   └── produtos.js     #   CRUD produtos (front)
│   ├── representantes/
│   │   └── representantes.js
│   ├── estados/
│   │   └── estados.js
│   ├── clientes/
│   │   └── clientes.js
│   └── pedidos/
│       ├── novo.js         #   Criação de pedido
│       ├── lista.js        #   Listagem de pedidos
│       └── detalhe.js      #   Detalhes + alteração de status
│
├── scripts/                # Scripts utilitários (ESM .mjs)
│   └── aplicar-schema.mjs  #   Aplica schema.sql ao Supabase
│
├── test/                   # Testes unitários (vitest)
│   └── unitarios/
│       ├── handlers/
│       │   └── auth.test.js
│       └── services/
│           ├── session.test.js
│           └── state.test.js
│
├── DOCS/
│   └── schema.sql          # DDL completo do banco
│
├── .env                    # SUPABASE_URL + SUPABASE_ANON_KEY
├── .eslintrc.json          # Configuração do ESLint
├── .eslintignore           # Arquivos ignorados pelo ESLint
├── vitest.config.js        # Configuração do Vitest
└── package.json
```

---

## 4. Fluxo de Dados

```
Usuário
  │
  ▼
Renderer (public/*.js)
  │  Funções globais declaradas em <script>
  │  (helper.js carregado primeiro)
  │
  ▼
window.electronAPI.*      ← preload.js (contextBridge)
  │  Ex: electronAPI.listarProdutos()
  │
  ▼
ipcMain.handle(...)       ← main.js registra handlers
  │  Roteia para o handler correto
  │
  ▼
handlers/*.js             ← Lógica de negócio
  │  Ex: produtos.listar()
  │
  ▼
services/supabaseClient.js ← Query no Supabase
  │
  ▼
Supabase (PostgreSQL)
  │
  ▼
Resposta percorre o caminho inverso até o renderer
```

### Exemplo concreto — listar produtos

1. `produtos.js` chama `window.electronAPI.listarProdutos()`
2. `preload.js` faz `ipcRenderer.invoke("produtos:listar")`
3. `main.js` roteia para `produtos.listar`
4. `handlers/produtos.js` executa `supabase.from("produtos").select("*")`
5. Resposta volta pelo mesmo caminho até o `await` no renderer

---

## 5. Módulo do Sistema

Cada escopo do projeto usa um sistema de módulos diferente:

| Escopo       | Sistema         | Arquivos                                            |
| ------------ | --------------- | --------------------------------------------------- |
| Main process | CJS (`require`) | `main.js`, `preload.js`, `handlers/*`, `services/*` |
| Renderer     | Script globais  | `public/**/*.js` (via `<script src>`)               |
| Scripts      | ESM (`import`)  | `scripts/*.mjs`                                     |
| Testes       | ESM (`import`)  | `test/**/*.js`                                      |

**Renderer** não usa `import`/`export`. As funções são declaradas no escopo
global e compartilhadas via tags `<script>` na ordem correta em `index.html`:

```html
<script src="shared/helper.js"></script>
<!-- 1º: utilitários -->
<script src="login/login.js"></script>
<!-- 2º: telas -->
<script src="shared/navbar.js"></script>
<!-- 3º: navegação -->
<script src="produtos/produtos.js"></script>
<!-- 4º: páginas -->
...
```

---

## 6. Segurança

| Medida                   | Onde                                                       |
| ------------------------ | ---------------------------------------------------------- |
| `contextIsolation: true` | `main.js` — Renderer do Node                               |
| `nodeIntegration: false` | `main.js` — desliga require no browser                     |
| `sandbox: false`         | `main.js` — necessário para preload                        |
| `contextBridge`          | `preload.js` — API controlada pro renderer                 |
| Sessão criptografada     | `services/session.js` — electron-store com `encryptionKey` |
| RLS policies             | Supabase — nível de linha por role                         |
| Role guard (renderer)    | `helper.js` — `podeEscrever()` / `ehAdmin()`               |

---

## 7. Banco de Dados

- **Provider:** Supabase (PostgreSQL)
- **Cliente centralizado:** `services/supabaseClient.js`
- **Queries distribuídas nos handlers** (cada handler faz suas próprias queries)
- **Schema completo:** `DOCS/schema.sql`

### Tabelas

| Tabela           | Finalidade                     |
| ---------------- | ------------------------------ |
| `profiles`       | Perfil do usuário (role, nome) |
| `produtos`       | Catálogo de produtos           |
| `representantes` | Representantes comerciais      |
| `estados`        | Estados (UF)                   |
| `clientes`       | Clientes                       |
| `pedidos`        | Pedidos (cabeçalho)            |
| `pedido_itens`   | Itens do pedido                |

---

## 8. Testes

- **Framework:** Vitest
- **Alvo:** Testes unitários (handlers + services)
- **Comando:** `npm test` / `npx vitest`
- **Globais:** `globals: true` no `vitest.config.js`
- **Arquivos:** `test/unitarios/**/*.test.js`

---

## 9. Lint

- **Linter:** ESLint 8 (configuração `.eslintrc.json`)
- **Comando:** `npm run lint`
- **Overrides por escopo:** main process (CJS/Node), renderer (browser), scripts (ESM), testes (ESM/vitest)
