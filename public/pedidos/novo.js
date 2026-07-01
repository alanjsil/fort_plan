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

    <button id="btn-salvar-pedido" class="btn-sucesso oculto" onclick="salvarPedido(this)" style="margin-top:16px;width:auto">
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
  div.innerHTML = itensPedido
    .map((item, idx) => {
      const produto = produtosCache.find((p) => p.id === item.produto_id);
      return `
      <div class="pedido-linha-item">
        <select onchange="alterarItemProduto(${idx}, this.value)" style="min-width:200px">
          <option value="">Selecione...</option>
          ${produtosCache
            .map(
              (p) => `
            <option value="${p.id}" ${p.id === item.produto_id ? "selected" : ""}>
              ${p.nome} — ${FormatarMoeda(p.preco)}
            </option>
          `,
            )
            .join("")}
        </select>
        <input class="qtd" type="number" min="1" value="${item.quantidade}" onchange="alterarItemQtd(${idx}, this.value)" />
        <input class="preco" type="text" value="${FormatarMoeda(item.preco_unitario)}" readonly />
        <span class="info-item">
          ${produto ? `Subtotal: ${FormatarMoeda(item.quantidade * item.preco_unitario)}` : ""}
        </span>
        <button class="btn-perigo" onclick="removerItem(${idx})" style="width:auto">X</button>
      </div>
    `;
    })
    .join("");

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
    var produto = produtosCache.find(function (p) { return p.id === item.produto_id; });
    var itemCalc = calcularItem(item.quantidade, item.preco_unitario, icmsPercentual, comissaoPercentual);
    valorTotal += itemCalc.subtotal;

    linhasItens +=
      '<div style="font-size:13px;padding:4px 0;border-bottom:1px solid #eee">' +
        "<strong>" + escapeHtml(produto?.nome || "Produto") + "</strong> \u2014 " +
        item.quantidade + "x " + FormatarMoeda(item.preco_unitario) + " = " +
        FormatarMoeda(itemCalc.subtotal) + " | " +
        "Liq: " + FormatarMoeda(itemCalc.valorLiquido) + " | " +
        "Com: " + FormatarMoeda(itemCalc.comissao) +
      "</div>";
  });

  var totais = calcularTotais(valorTotal, icmsPercentual, comissaoPercentual);

  resumo.innerHTML =
    "<h3>Resumo</h3>" +
    linhasItens +
    '<div class="linha-resumo" style="margin-top:8px">' +
      "<span>Valor Total Bruto:</span>" +
      "<span>" + FormatarMoeda(totais.valorTotal) + "</span>" +
    "</div>" +
    '<div class="linha-resumo">' +
      "<span>ICMS (" + icmsPercentual + "%):</span>" +
      "<span>-" + FormatarMoeda(totais.valorIcms) + "</span>" +
    "</div>" +
    '<div class="linha-resumo">' +
      "<span>Valor Total L\u00EDquido:</span>" +
      "<span>" + FormatarMoeda(totais.valorTotalLiquido) + "</span>" +
    "</div>" +
    '<div class="linha-resumo">' +
      "<span>Comiss\u00E3o (" + comissaoPercentual + "%):</span>" +
      "<span>" + FormatarMoeda(totais.comissaoTotal) + "</span>" +
    "</div>" +
    '<div class="linha-resumo total">' +
      "<span>Total do Pedido:</span>" +
      "<span>" + FormatarMoeda(totais.valorTotal) + "</span>" +
    "</div>";
}

async function salvarPedido(btn) {
  if (btn.dataset.salvando === "true") return;

  btn.dataset.salvando = "true";
  btn.disabled = true;
  btn.textContent = "Salvando...";

  const clienteId = document.getElementById("ped-cliente").value;
  const selRep = document.getElementById("ped-representante");
  const representanteId = selRep.value;
  const optRep = selRep.options[selRep.selectedIndex];
  const estadoId = optRep ? optRep.dataset.estado : null;

  if (!clienteId || !representanteId || !estadoId) {
    btn.dataset.salvando = "false";
    btn.disabled = false;
    btn.textContent = "Salvar Pedido";
    mostrarToast("Preencha cliente e representante", "erro");
    return;
  }

  const itensValidos = itensPedido.filter((i) => i.produto_id && i.quantidade > 0);
  if (itensValidos.length === 0) {
    btn.dataset.salvando = "false";
    btn.disabled = false;
    btn.textContent = "Salvar Pedido";
    mostrarToast("Adicione ao menos 1 item ao pedido", "erro");
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
      })),
    });

    mostrarToast("Pedido criado com sucesso!", "sucesso");
    carregarNovoPedido();
  } catch (err) {
    btn.dataset.salvando = "false";
    btn.disabled = false;
    btn.textContent = "Salvar Pedido";
    mostrarToast("Erro: " + err.message, "erro");
  }
}
