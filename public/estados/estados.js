async function carregarEstados() {
  const div = document.getElementById("tela-estados");
  const podeEditar = podeEscrever();

  const estados = await window.electronAPI.listarEstados();

  div.innerHTML = `
    <h2>Estados (ICMS)</h2>
    <div class="barra-ferramentas">
      ${podeEditar ? '<button onclick="abrirFormEstado()">Novo Estado</button>' : ""}
    </div>
    <div id="form-estado" class="form-cadastro oculto"></div>
    <table>
      <thead>
        <tr>
          <th>UF</th>
          <th>Nome</th>
          <th>ICMS</th>
          ${podeEditar ? "<th>Ações</th>" : ""}
        </tr>
      </thead>
      <tbody>
        ${estados.map((e) => `
          <tr>
            <td><strong>${e.uf}</strong></td>
            <td>${e.nome}</td>
            <td>${e.icms}%</td>
            ${podeEditar ? `
              <td class="acoes">
                <button onclick="editarEstado('${e.id}')">Editar</button>
                <button class="btn-perigo" onclick="removerEstado('${e.id}')">Remover</button>
              </td>
            ` : ""}
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

let estadoEditandoId = null;

function abrirFormEstado(dados) {
  estadoEditandoId = dados?.id || null;
  const div = document.getElementById("form-estado");
  div.classList.remove("oculto");
  div.innerHTML = `
    <h3>${estadoEditandoId ? "Editar" : "Novo"} Estado</h3>
    <div class="linha">
      <div class="campo">
        <label>Nome</label>
        <input id="est-nome" value="${dados?.nome || ""}" />
      </div>
      <div class="campo">
        <label>UF</label>
        <input id="est-uf" maxlength="2" style="text-transform:uppercase" value="${dados?.uf || ""}" />
      </div>
    </div>
    <div class="campo">
      <label>ICMS (%)</label>
      <input id="est-icms" type="number" step="0.01" value="${dados?.icms || ""}" />
    </div>
    <div class="acoes-form">
      <button onclick="salvarEstado()">Salvar</button>
      <button class="btn-secundario" onclick="fecharFormEstado()">Cancelar</button>
    </div>
  `;
}

function fecharFormEstado() {
  document.getElementById("form-estado").classList.add("oculto");
  estadoEditandoId = null;
}

async function salvarEstado() {
  const dados = {
    nome: document.getElementById("est-nome").value,
    uf: document.getElementById("est-uf").value.toUpperCase(),
    icms: parseFloat(document.getElementById("est-icms").value),
  };

  if (estadoEditandoId) {
    await window.electronAPI.atualizarEstado({ id: estadoEditandoId, ...dados });
  } else {
    await window.electronAPI.criarEstado(dados);
  }

  fecharFormEstado();
  carregarEstados();
}

async function editarEstado(id) {
  const estados = await window.electronAPI.listarEstados();
  const e = estados.find((x) => x.id === id);
  if (e) abrirFormEstado(e);
}

async function removerEstado(id) {
  if (!confirm("Remover estado?")) return;
  await window.electronAPI.removerEstado(id);
  carregarEstados();
}
