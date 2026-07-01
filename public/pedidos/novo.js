let clientesCache = [];
let representantesCache = [];
let estadosCacheNovo = [];
let produtosCache = [];
let itensPedido = [];

async function carregarNovoPedido() {
  const div = document.getElementById("tela-pedidos-novo");

  const [clientes, representantes, estados, produtos] = await Promise.all([
    window.electronAPI.listarClientes(),
    window.electronAPI.listarRepresentantes(),
    window.electronAPI.listarEstados(),
    window.electronAPI.listarProdutos(),
  ]);

  clientesCache = clientes;
  representantesCache = representantes;
  estadosCacheNovo = estados;
  produtosCache = produtos.filter((p) => p.ativo);

  div.innerHTML = `
    <h2>Novo Pedido</h2>
    <div class="form-cadastro">
      <div class="linha">
        <div class="campo">
          <label>Cliente</label>
          <select id="ped-cliente">
            <option value="">Selecione...</option>
            ${clientes.map((c) => `<option value="${c.id}">${c.nome}</option>`).join("")}
          </select>
        </div>
        <div class="campo">
          <label>Representante</label>
          <select id="ped-representante">
            <option value="">Selecione...</option>
            ${representantes.map((r) => `<option value="${r.id}" data-estado="${r.estado_id}" data-comissao="${r.comissao_percentual}">${r.nome}</option>`).join("")}
          </select>
        </div>
      </div>
      <div class="linha">
        <div class="campo">
          <label>Estado (preenchido automaticamente)</label>
          <input id="ped-estado" readonly />
        </div>
        <div class="campo">
          <label>ICMS (%)</label>
          <input id="ped-icms" readonly />
        </div>
      </div>
      <div class="campo">
        <label>Observações</label>
        <input id="ped-observacoes" />
      </div>
    </div>

    <h3>Itens do Pedido</h3>
    <div id="lista-itens"></div>
    <button class="btn-secundario" onclick="adicionarItem()" style="margin-top:8px;width:auto">+ Adicionar Item</button>

    <div id="resumo-pedido" class="pedido-resumo oculto"></div>

    <button id="btn-salvar-pedido" class="btn-sucesso oculto" onclick="salvarPedido()" style="margin-top:16px;width:auto">
      Salvar Pedido
    </button>
  `;

  document.getElementById("ped-representante").addEventListener("change", preencherEstado);
  itensPedido = [];
}

function preencherEstado() {
  const sel = document.getElementById("ped-representante");
  const opt = sel.options[sel.selectedIndex];
  if (opt && opt.dataset.estado) {
    const estado = estadosCacheNovo.find((e) => e.id === opt.dataset.estado);
    if (estado) {
      document.getElementById("ped-estado").value = `${estado.nome} (${estado.uf})`;
      document.getElementById("ped-icms").value = `${estado.icms}%`;
    }
  } else {
    document.getElementById("ped-estado").value = "";
    document.getElementById("ped-icms").value = "";
  }
}

function adicionarItem(dados) {
  itensPedido.push({
    produto_id: dados?.produto_id || "",
    quantidade: dados?.quantidade || 1,
    preco_unitario: dados?.preco_unitario || 0,
  });
  renderizarItens();
}

function renderizarItens() {
  const div = document.getElementById("lista-itens");
  div.innerHTML = itensPedido.map((item, idx) => {
    const produto = produtosCache.find((p) => p.id === item.produto_id);
    return `
      <div class="pedido-linha-item">
        <select onchange="alterarItemProduto(${idx}, this.value)" style="min-width:200px">
          <option value="">Selecione...</option>
          ${produtosCache.map((p) => `
            <option value="${p.id}" ${p.id === item.produto_id ? "selected" : ""}>
              ${p.nome} — ${FormatarMoeda(p.preco)}
            </option>
          `).join("")}
        </select>
        <input class="qtd" type="number" min="1" value="${item.quantidade}" onchange="alterarItemQtd(${idx}, this.value)" />
        <input class="preco" type="number" step="0.01" value="${item.preco_unitario}" onchange="alterarItemPreco(${idx}, this.value)" />
        <span class="info-item">
          ${produto ? `Subtotal: ${FormatarMoeda(item.quantidade * item.preco_unitario)}` : ""}
        </span>
        <button class="btn-perigo" onclick="removerItem(${idx})" style="width:auto">X</button>
      </div>
    `;
  }).join("");

  atualizarResumo();
}

function alterarItemProduto(idx, produtoId) {
  itensPedido[idx].produto_id = produtoId;
  const produto = produtosCache.find((p) => p.id === produtoId);
  if (produto) {
    itensPedido[idx].preco_unitario = produto.preco;
  }
  renderizarItens();
}

function alterarItemQtd(idx, valor) {
  itensPedido[idx].quantidade = parseInt(valor) || 0;
  renderizarItens();
}

function alterarItemPreco(idx, valor) {
  itensPedido[idx].preco_unitario = parseFloat(valor) || 0;
  renderizarItens();
}

function removerItem(idx) {
  itensPedido.splice(idx, 1);
  renderizarItens();
}

function atualizarResumo() {
  const selRep = document.getElementById("ped-representante");
  const optRep = selRep.options[selRep.selectedIndex];
  const comissaoPercentual = optRep ? parseFloat(optRep.dataset.comissao || 0) : 0;

  const selEstado = document.getElementById("ped-representante");
  const optEstado = selEstado.options[selEstado.selectedIndex];
  const estadoId = optEstado ? optEstado.dataset.estado : null;
  const estado = estadosCacheNovo.find((e) => e.id === estadoId);
  const icmsPercentual = estado ? estado.icms : 0;

  const resumo = document.getElementById("resumo-pedido");
  const btnSalvar = document.getElementById("btn-salvar-pedido");

  const itemsValidos = itensPedido.filter((i) => i.produto_id && i.quantidade > 0);

  if (itemsValidos.length === 0) {
    resumo.classList.add("oculto");
    btnSalvar.classList.add("oculto");
    return;
  }

  resumo.classList.remove("oculto");
  btnSalvar.classList.remove("oculto");

  let valorTotal = 0;
  let linhasItens = "";

  itemsValidos.forEach((item) => {
    const produto = produtosCache.find((p) => p.id === item.produto_id);
    const subtotal = item.quantidade * item.preco_unitario;
    const valorLiquido = subtotal - (subtotal * icmsPercentual / 100);
    const comissao = subtotal * comissaoPercentual / 100;
    valorTotal += subtotal;

    linhasItens += `
      <div style="font-size:13px;padding:4px 0;border-bottom:1px solid #eee">
        <strong>${produto?.nome || "Produto"}</strong> —
        ${item.quantidade}x ${FormatarMoeda(item.preco_unitario)} =
        ${FormatarMoeda(subtotal)} |
        Liq: ${FormatarMoeda(valorLiquido)} |
        Com: ${FormatarMoeda(comissao)}
      </div>
    `;
  });

  const valorTotalLiquido = valorTotal - (valorTotal * icmsPercentual / 100);
  const comissaoTotal = valorTotal * comissaoPercentual / 100;

  resumo.innerHTML = `
    <h3>Resumo</h3>
    ${linhasItens}
    <div class="linha-resumo" style="margin-top:8px">
      <span>Valor Total Bruto:</span>
      <span>${FormatarMoeda(valorTotal)}</span>
    </div>
    <div class="linha-resumo">
      <span>ICMS (${icmsPercentual}%):</span>
      <span>-${FormatarMoeda(valorTotal * icmsPercentual / 100)}</span>
    </div>
    <div class="linha-resumo">
      <span>Valor Total Líquido:</span>
      <span>${FormatarMoeda(valorTotalLiquido)}</span>
    </div>
    <div class="linha-resumo">
      <span>Comissão (${comissaoPercentual}%):</span>
      <span>${FormatarMoeda(comissaoTotal)}</span>
    </div>
    <div class="linha-resumo total">
      <span>Total do Pedido:</span>
      <span>${FormatarMoeda(valorTotal)}</span>
    </div>
  `;
}

async function salvarPedido() {
  const clienteId = document.getElementById("ped-cliente").value;
  const selRep = document.getElementById("ped-representante");
  const representanteId = selRep.value;
  const optRep = selRep.options[selRep.selectedIndex];
  const estadoId = optRep ? optRep.dataset.estado : null;

  if (!clienteId || !representanteId || !estadoId) {
    alert("Preencha cliente e representante");
    return;
  }

  const itensValidos = itensPedido.filter((i) => i.produto_id && i.quantidade > 0);
  if (itensValidos.length === 0) {
    alert("Adicione ao menos 1 item ao pedido");
    return;
  }

  try {
    await window.electronAPI.criarPedido({
      cliente_id: clienteId,
      representante_id: representanteId,
      estado_id: estadoId,
      observacoes: document.getElementById("ped-observacoes").value,
      itens: itensValidos.map((i) => ({
        produto_id: i.produto_id,
        quantidade: i.quantidade,
        preco_unitario: i.preco_unitario,
      })),
    });

    alert("Pedido criado com sucesso!");
    carregarNovoPedido();
  } catch (err) {
    alert("Erro: " + err.message);
  }
}
