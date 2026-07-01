async function carregarProdutos() {
  const div = document.getElementById("tela-produtos");
  const podeEditar = podeEscrever();

  const produtos = await window.electronAPI.listarProdutos();

  div.innerHTML = `
    <h2>Produtos</h2>
    <div class="barra-ferramentas">
      ${podeEditar ? '<button onclick="abrirFormProduto()">Novo Produto</button>' : ""}
    </div>
    <div id="form-produto" class="form-cadastro oculto"></div>
    <table>
      <thead>
        <tr>
          <th>Código</th>
          <th>Descrição</th>
          <th>Preço</th>
          <th>Ativo</th>
          ${podeEditar ? "<th>Ações</th>" : ""}
        </tr>
      </thead>
      <tbody>
        ${produtos
          .map(
            (p) => `
          <tr>
            <td>${escapeHtml(p.nome)}</td>
            <td>${escapeHtml(p.descricao)}</td>
            <td>${FormatarMoeda(p.preco)}</td>
            <td>${p.ativo ? "Sim" : "Não"}</td>
            ${
              podeEditar
                ? `
              <td class="acoes">
                <button onclick="editarProduto('${p.id}')">Editar</button>
                <button class="btn-perigo" onclick="removerProduto('${p.id}')">Remover</button>
              </td>
            `
                : ""
            }
          </tr>
        `,
          )
          .join("")}
      </tbody>
    </table>
  `;
}

let produtoEditandoId = null;

function abrirFormProduto(dados) {
  produtoEditandoId = dados?.id || null;
  const div = document.getElementById("form-produto");
  div.classList.remove("oculto");
  div.innerHTML = `
    <h3>${produtoEditandoId ? "Editar" : "Novo"} Produto</h3>
    <div class="linha">
      <div class="campo">
        <label>Código</label>
        <input id="prod-nome" value="${escapeHtml(dados?.nome || "")}" />
      </div>
      <div class="campo">
        <label>Preço</label>
        <input id="prod-preco" type="number" step="0.01" value="${escapeHtml(dados?.preco ?? "")}" />
      </div>
    </div>
    <div class="campo">
      <label>Descrição</label>
      <input id="prod-descricao" value="${escapeHtml(dados?.descricao || "")}" />
    </div>
    <div class="campo">
      <label><input type="checkbox" id="prod-ativo" ${dados?.ativo !== false ? "checked" : ""} /> Ativo</label>
    </div>
    <div class="acoes-form">
      <button onclick="salvarProduto()">Salvar</button>
      <button class="btn-secundario" onclick="fecharFormProduto()">Cancelar</button>
    </div>
  `;
}

function fecharFormProduto() {
  document.getElementById("form-produto").classList.add("oculto");
  produtoEditandoId = null;
}

async function salvarProduto() {
  const dados = {
    nome: document.getElementById("prod-nome").value,
    preco: parseFloat(document.getElementById("prod-preco").value),
    descricao: document.getElementById("prod-descricao").value,
    ativo: document.getElementById("prod-ativo").checked,
  };

  if (produtoEditandoId) {
    await window.electronAPI.atualizarProduto({ id: produtoEditandoId, ...dados });
  } else {
    await window.electronAPI.criarProduto(dados);
  }

  fecharFormProduto();
  carregarProdutos();
}

async function editarProduto(id) {
  const produtos = await window.electronAPI.listarProdutos();
  const produto = produtos.find((p) => p.id === id);
  if (produto) abrirFormProduto(produto);
}

async function removerProduto(id) {
  if (!(await mostrarConfirmacao("Remover produto?"))) return;
  await window.electronAPI.removerProduto(id);
  carregarProdutos();
}
