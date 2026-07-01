let estadosCacheClientes = [];

async function carregarClientes() {
  const div = document.getElementById("tela-clientes");
  const podeEditar = podeEscrever();

  const [clientes, estados] = await Promise.all([window.electronAPI.listarClientes(), window.electronAPI.listarEstados()]);
  estadosCacheClientes = estados;

  div.innerHTML = `
    <h2>Clientes</h2>
    <div class="barra-ferramentas">
      ${podeEditar ? '<button onclick="abrirFormCliente()">Novo Cliente</button>' : ""}
    </div>
    <div id="form-cliente" class="form-cadastro oculto"></div>
    <table>
      <thead>
        <tr>
          <th>Nome</th>
          <th>CNPJ</th>
          <th>Contato</th>
          <th>Estado</th>
          ${podeEditar ? "<th>Ações</th>" : ""}
        </tr>
      </thead>
      <tbody>
        ${clientes
          .map(
            (c) => `
          <tr>
            <td>${escapeHtml(c.nome)}</td>
            <td>${escapeHtml(c.cnpj || "-")}</td>
            <td>${escapeHtml(c.contato || "-")}</td>
            <td>${escapeHtml(c.estado?.uf || "-")}</td>
            ${
              podeEditar
                ? `
              <td class="acoes">
                <button onclick="editarCliente('${c.id}')">Editar</button>
                <button class="btn-perigo" onclick="removerCliente('${c.id}')">Remover</button>
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

let clienteEditandoId = null;

function abrirFormCliente(dados) {
  clienteEditandoId = dados?.id || null;
  const div = document.getElementById("form-cliente");
  div.classList.remove("oculto");
  div.innerHTML = `
    <h3>${clienteEditandoId ? "Editar" : "Novo"} Cliente</h3>
    <div class="campo">
      <label>Nome</label>
        <input id="cli-nome" value="${escapeHtml(dados?.nome || "")}" />
    </div>
    <div class="linha">
      <div class="campo">
        <label>CNPJ</label>
        <input id="cli-cnpj" value="${escapeHtml(dados?.cnpj || "")}" />
      </div>
      <div class="campo">
        <label>Contato</label>
        <input id="cli-contato" value="${escapeHtml(dados?.contato || "")}" />
      </div>
    </div>
    <div class="campo">
      <label>Estado</label>
      <select id="cli-estado">
        <option value="">Selecione...</option>
        ${estadosCacheClientes
          .map(
            (e) => `
          <option value="${e.id}" ${dados?.estado_id === e.id ? "selected" : ""}>${e.nome} (${e.uf})</option>
        `,
          )
          .join("")}
      </select>
    </div>
    <div class="acoes-form">
      <button onclick="salvarCliente()">Salvar</button>
      <button class="btn-secundario" onclick="fecharFormCliente()">Cancelar</button>
    </div>
  `;
}

function fecharFormCliente() {
  document.getElementById("form-cliente").classList.add("oculto");
  clienteEditandoId = null;
}

async function salvarCliente() {
  const dados = {
    nome: document.getElementById("cli-nome").value,
    cnpj: document.getElementById("cli-cnpj").value || null,
    contato: document.getElementById("cli-contato").value || null,
    estado_id: document.getElementById("cli-estado").value || null,
  };

  if (clienteEditandoId) {
    await window.electronAPI.atualizarCliente({ id: clienteEditandoId, ...dados });
  } else {
    await window.electronAPI.criarCliente(dados);
  }

  fecharFormCliente();
  carregarClientes();
}

async function editarCliente(id) {
  const clientes = await window.electronAPI.listarClientes();
  const c = clientes.find((x) => x.id === id);
  if (c) abrirFormCliente(c);
}

async function removerCliente(id) {
  if (!(await mostrarConfirmacao("Remover cliente?"))) return;
  await window.electronAPI.removerCliente(id);
  carregarClientes();
}
