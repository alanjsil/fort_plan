let estadosCache = [];

async function carregarRepresentantes() {
  const div = document.getElementById("tela-representantes");
  const podeEditar = podeEscrever();

  const [representantes, estados] = await Promise.all([window.electronAPI.listarRepresentantes(), window.electronAPI.listarEstados()]);
  estadosCache = estados;

  div.innerHTML = `
    <h2>Representantes</h2>
    <div class="barra-ferramentas">
      ${podeEditar ? '<button onclick="abrirFormRepresentante()">Novo Representante</button>' : ""}
    </div>
    <div id="form-representante" class="form-cadastro oculto"></div>
    <table>
      <thead>
        <tr>
          <th>Nome</th>
          <th>Comissão</th>
          <th>Estado</th>
          ${podeEditar ? "<th>Ações</th>" : ""}
        </tr>
      </thead>
      <tbody>
        ${representantes
          .map(
            (r) => `
          <tr>
            <td>${escapeHtml(r.nome)}</td>
            <td>${r.comissao_percentual}%</td>
            <td>${r.estado?.uf || "-"}</td>
            ${
              podeEditar
                ? `
              <td class="acoes">
                <button onclick="editarRepresentante('${r.id}')">Editar</button>
                <button class="btn-perigo" onclick="removerRepresentante('${r.id}')">Remover</button>
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

let representanteEditandoId = null;

function abrirFormRepresentante(dados) {
  representanteEditandoId = dados?.id || null;
  const div = document.getElementById("form-representante");
  div.classList.remove("oculto");
  div.innerHTML = `
    <h3>${representanteEditandoId ? "Editar" : "Novo"} Representante</h3>
    <div class="linha">
      <div class="campo">
        <label>Nome</label>
        <input id="rep-nome" value="${escapeHtml(dados?.nome || "")}" />
      </div>
      <div class="campo">
        <label>Comissão (%)</label>
        <input id="rep-comissao" type="number" step="0.01" value="${escapeHtml(dados?.comissao_percentual ?? "")}" />
      </div>
    </div>
    <div class="campo">
      <label>Estado</label>
      <select id="rep-estado">
        <option value="">Selecione...</option>
        ${estadosCache
          .map(
            (e) => `
          <option value="${e.id}" ${dados?.estado_id === e.id ? "selected" : ""}>${e.nome} (${e.uf})</option>
        `,
          )
          .join("")}
      </select>
    </div>
    <div class="acoes-form">
      <button onclick="salvarRepresentante()">Salvar</button>
      <button class="btn-secundario" onclick="fecharFormRepresentante()">Cancelar</button>
    </div>
  `;
}

function fecharFormRepresentante() {
  document.getElementById("form-representante").classList.add("oculto");
  representanteEditandoId = null;
}

async function salvarRepresentante() {
  const dados = {
    nome: document.getElementById("rep-nome").value,
    comissao_percentual: parseFloat(document.getElementById("rep-comissao").value),
    estado_id: document.getElementById("rep-estado").value,
  };

  if (representanteEditandoId) {
    await window.electronAPI.atualizarRepresentante({ id: representanteEditandoId, ...dados });
  } else {
    await window.electronAPI.criarRepresentante(dados);
  }

  fecharFormRepresentante();
  carregarRepresentantes();
}

async function editarRepresentante(id) {
  const representantes = await window.electronAPI.listarRepresentantes();
  const r = representantes.find((x) => x.id === id);
  if (r) abrirFormRepresentante(r);
}

async function removerRepresentante(id) {
  if (!(await mostrarConfirmacao("Remover representante?"))) return;
  await window.electronAPI.removerRepresentante(id);
  carregarRepresentantes();
}
