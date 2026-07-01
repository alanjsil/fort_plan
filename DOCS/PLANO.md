# Plano de Implementação — Sistema de Gestão de Pedidos

**Baseado em:** SDD-sistema-pedidos.md v1.0
**Decisões:** 01/07/2026

## Estrutura do Projeto

```
main.js              # Electron entrypoint
preload.js           # contextBridge → electronAPI.*
services/
  supabaseClient.js  # Client Supabase (anon key)
  session.js         # Sessão criptografada (electron-store)
  state.js           # Fonte da verdade
handlers/
  auth.js            # login, logout, getSession, getProfile
  produtos.js        # CRUD produtos
  representantes.js  # CRUD representantes
  estados.js         # CRUD estados
  clientes.js        # CRUD clientes
  pedidos.js         # criar (com itens), listar, detalhe, status
public/
  index.html
  home.html
  login/
  produtos/
  representantes/
  estados/
  clientes/
  pedidos/           (novo, lista, detalhe)
  shared/            (navbar, roleGuard, formatarMoeda)
scripts/             # Scripts auxiliares (.mjs)
schema.sql           # Schema do banco
PLANO.md             # Este arquivo
```

## Fases

### Fase 1 — Setup do projeto
- `npm init -y`
- Instalar: `electron`, `@supabase/supabase-js`, `electron-store`
- Criar pastas: `services/`, `handlers/`, `public/`, `scripts/`
- Configurar `package.json` (`main`, `start` script)
- Atualizar `.gitignore`
- **Commit:** `"setup: estrutura inicial do projeto"`

### Fase 2 — Banco de dados
- Executar `schema.sql` no Supabase (via SQL editor ou MCP)
- Verificar tabelas criadas
- **Commit:** `"db: schema completo + RLS + seeds"`

### Fase 3 — Main process
- `services/supabaseClient.js` — cliente Supabase
- `services/session.js` — electron-store com encryptionKey
- `services/state.js` — estado global
- `handlers/` — IPC handlers (auth, produtos, representantes, estados, clientes, pedidos)
- `main.js` — criação da janela, registro dos handlers
- `preload.js` — contextBridge
- **Commit:** `"feat: main process completo com IPC handlers"`

### Fase 4 — Renderer (UI)
- `public/index.html` — estrutura base + CSS global
- `public/login/` — tela de login
- `public/shared/` — navbar, roleGuard, formatarMoeda
- `public/produtos/` — listagem + CRUD
- `public/representantes/` — listagem + CRUD
- `public/estados/` — listagem + CRUD
- `public/clientes/` — listagem + CRUD
- `public/pedidos/novo.html` — fluxo: representante → estado → produtos → totais
- `public/pedidos/lista.html` — tabela com filtros
- `public/pedidos/detalhe.html` — visualização + ações
- **Commit:** `"feat: interface completa do renderer"`

### Fase 5 — Testes
- Configurar Vitest
- Testes unitários para `services/`
- Testes para `handlers/`
- **Commit:** `"test: testes unitários e de handler"`

## Regras de Negócio (resumo)

| Regra | Definição |
|---|---|
| ICMS | Valor Líquido = Valor − (Valor × ICMS%); exibido por item |
| Comissão | Calculada sobre o **Valor Original** do item |
| Pedidos | Todos autenticados veem todos os pedidos |
| Edição | `user` edita só pedidos próprios com status `aberto` |
| Admin/Gerente | Mesmas permissões (CRUD tudo) |
| Preço | Congelado no momento da criação do pedido |
| Cliente | `nome`, `cnpj`, `contato`, `estado_id` (FK) |
| Num. Pedido | Serial auto-incremento |
