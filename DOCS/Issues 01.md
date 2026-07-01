# 🔴 Crítico — resolver já

## 1. Senha do banco hardcoded em scripts/aplicar-schema.mjs (CORRIGIDO)

```
DB_PASSWORD = "LZGStdKBygR6NMrqA5A5TA_sPVOe2Hq";
```

Isso está no código-fonte, não em .env. Se esse repo for versionado (git) ou compartilhado, a senha do Postgres vaza junto. Recomendo:

- Rotacionar essa senha agora no painel Supabase (Settings → Database).
- Mover para .env / .env.test e ler via process.env.DB_PASSWORD.
- Conferir se esse arquivo já foi commitado — se sim, a senha antiga precisa ser considerada comprometida mesmo depois de trocada no código.

## 2. Preco_unitario do pedido confia 100% no client (CORRIGIDO)

Em handlers/pedidos.js, o valor que vai pra pedido_itens vem direto do que o renderer mandou (item.preco_unitario), sem validar contra a tabela produtos. Como a anon key fica no binário do Electron, alguém com um pouco de curiosidade técnica consegue interceptar a chamada IPC/HTTP e mandar um preço diferente do real. RLS não protege isso — RLS controla quem pode escrever, não o valor que está sendo escrito. <br/>
Correção simples: no handler, buscar o preço em produtos pelo produto_id e ignorar o que veio do client:

```
{ data: produto } = await supabase.from("produtos").select("preco").eq("id", item.produto_id).single();
// usar produto.preco, não item.preco_unitario
```

Melhor ainda a médio prazo (já está no seu roadmap): uma função `rpc criar_pedido(...)` que faz tudo isso no Postgres.

# 🟠 Importante

## 3. ICMS e comissão não são "congelados" no pedido — só o preço é (CORRIGIDO)

Vocês já se preocuparam corretamente em congelar preco_unitario, mas detalhe.js calcula ICMS e comissão usando pedido.estado?.icms e pedido.representante?.comissao_percentual ao vivo, via join. Se o ICMS de um estado ou a comissão de um representante mudar no futuro, todo o histórico de pedidos antigos muda de valor retroativamente — exatamente o problema que vocês já resolveram para o preço, mas não para esses dois campos. <br/>
Sugestão: adicionar icms_percentual e comissao_percentual na tabela pedidos, preenchidos na criação (cópia do valor do estado/representante naquele momento), e usar esses campos no detalhe em vez do join.

## 4. Criação de pedido não é atômica (CORRIGIDO)

criar() faz insert em pedidos e depois insert em pedido_itens como duas chamadas separadas. Se a segunda falhar (rede caiu, RLS rejeitou, etc.), sobra um pedido "fantasma" sem itens. Vale resolver junto com o ponto 2 e 3 numa função rpc única no Postgres — resolve os três problemas de uma vez (atomicidade + preço/percentuais server-side).

## 5. AGENTS.md está descrevendo um projeto diferente (CORRIGIDO)

Esse arquivo menciona: stack TypeScript (main.ts, services/\*.ts), domínio de "finanças" (categorias, subcategorias, financas.db SQLite), testes Playwright específicos desse outro app. Nada disso bate com o projeto atual (JS puro, domínio de pedidos/produtos/representantes, sem SQLite). Isso parece ter sido copiado de outro repo. Como esse arquivo normalmente é lido por assistentes de IA (inclusive eu) pra entender convenções do projeto, ele vai gerar confusão e decisões erradas se não for reescrito para refletir a stack real.
Relacionado: o AGENTS.md referencia npm run test:e2e, npm run lint, npm run build, npm run cover, npm run conecta — nenhum desses scripts existe no package.json atual (só tem start e test).

# 🟡 Vale limpar

## 6. Inconsistência de módulos no renderer

AGENTS.md diz que o renderer usa ESM (script type="module"), mas public/index.html carrega os scripts sem type="module", e os arquivos (formatarMoeda.js, roleGuard.js, etc.) declaram funções globais em vez de export/import. Ou o documento está desatualizado, ou o código precisa migrar — hoje os dois não batem.

## 7. Duplicação da fórmula de cálculo (ICMS/comissão/subtotal)

A mesma lógica de subtotal - (subtotal _ icms/100) e subtotal _ comissao/100 está copiada em public/pedidos/novo.js e public/pedidos/detalhe.js. Se a regra de negócio mudar (ex: ICMS passa a entrar diferente no cálculo), é fácil esquecer de atualizar um dos dois lugares. Vale extrair para public/shared/calculoPedido.js.

## 8. encryptionKey do electron-store fixo no código

```
jsencryptionKey: "fort-planilha-sessao-key-v1"
```

Isso não é uma vulnerabilidade grave (é só ofuscação, o electron-store já é assim por natureza), mas vale documentar que isso não protege contra alguém com acesso ao binário — só evita leitura casual do arquivo de sessão. Se quiser proteção real, a chave deveria vir do keychain do SO (keytar), não do código-fonte.

## 9. numero_pedido como serial (CORRIGIDO)

Funciona, mas gera "buracos" na numeração se um pedido for deletado (só admin/gerente deletam, então baixo risco, mas fica o registro).
