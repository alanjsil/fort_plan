# AGENTS.md

## Language

- Sempre responder em PT-BR
- Nomenclatura de funções sempre em PT-BR
- Números no formato brasileiro **`R$10,00`**

## Stack

- **Electron** (vanilla JS, CJS via `require`/`module.exports`): `main.js`, `preload.js`, `handlers/*.js`
- **Services** (CJS): `services/*.js`
- **Renderer** (scripts globais via `<script>`): `public/`
- **Scripts** (ESM `.mjs`): `scripts/`
- **Supabase** (PostgreSQL), **dotenv**, **electron-store**

## Module System

| Escopo        | Sistema        | Arquivos                                           |
|---------------|----------------|----------------------------------------------------|
| Main process  | CJS (`require`) | `main.js`, `preload.js`, `handlers/*.js`, `services/*.js` |
| Renderer      | Script globais  | `public/**/*.js` (carregados via `<script src>`)    |
| Scripts       | ESM (`import`)  | `scripts/*.mjs`                                     |

## Commands

| Command                                                     | O quê                                                 |
| ----------------------------------------------------------- | ----------------------------------------------------- |
| `npm start`                                                 | `electron .`                                          |
| `npm test`                                                  | `vitest run` — **testes unitários** (3 arquivos)      |
| `npx vitest`                                                | watch mode                                            |
| `npx vitest run test/unitarios/services/session.test.js`    | arquivo específico                                    |

## Supabase

- `.env`: `SUPABASE_URL` + `SUPABASE_ANON_KEY` required for the app
- Cliente centralizado em `services/supabaseClient.js`
- Queries distribuídas nos `handlers/`
- RLS enabled
- MCP remote configured in `opencode.json` (project ref `wpdgftyaoeflfdsfnncg`)
