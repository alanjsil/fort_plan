async function carregarListaPedidos() {
  const div = document.getElementById("tela-pedidos-lista");

  const pedidos = await window.electronAPI.listarPedidos({});

  div.innerHTML = `
    <h2>Pedidos</h2>
    <div class="barra-ferramentas">
      <div></div>
      <div class="filtros">
        <select id="filtro-status" onchange="filtrarPedidos()">
          <option value="">Todos os status</option>
          <option value="aberto">Aberto</option>
          <option value="faturado">Faturado</option>
          <option value="cancelado">Cancelado</option>
        </select>
      </div>
    </div>
    <table>
      <thead>
        <tr>
          <th>Nº</th>
          <th>Cliente</th>
          <th>Representante</th>
          <th>Valor Total</th>
          <th>Status</th>
          <th>Data</th>
          <th>Ações</th>
        </tr>
      </thead>
      <tbody>
        ${pedidos
          .map(
            (p) => `
          <tr>
            <td><strong>${p.numero_pedido}</strong></td>
            <td>${escapeHtml(p.cliente?.nome || "-")}</td>
            <td>${escapeHtml(p.representante?.nome || "-")}</td>
            <td>${FormatarMoeda(p.valor_total)}</td>
            <td><span class="status status-${p.status}">${p.status}</span></td>
            <td>${new Date(p.created_at).toLocaleDateString("pt-BR")}</td>
            <td class="acoes">
              <button onclick="verDetalhePedido('${p.id}')">Detalhe</button>
            </td>
          </tr>
        `,
          )
          .join("")}
      </tbody>
    </table>
  `;
}

async function filtrarPedidos() {
  const status = document.getElementById("filtro-status").value;
  const pedidos = await window.electronAPI.listarPedidos(status ? { status } : {});
  const tbody = document.querySelector("#tela-pedidos-lista table tbody");
  if (tbody) {
    tbody.innerHTML = pedidos
      .map(
        (p) => `
      <tr>
        <td><strong>${p.numero_pedido}</strong></td>
        <td>${escapeHtml(p.cliente?.nome || "-")}</td>
        <td>${escapeHtml(p.representante?.nome || "-")}</td>
        <td>${FormatarMoeda(p.valor_total)}</td>
        <td><span class="status status-${p.status}">${p.status}</span></td>
        <td>${new Date(p.created_at).toLocaleDateString("pt-BR")}</td>
        <td class="acoes">
          <button onclick="verDetalhePedido('${p.id}')">Detalhe</button>
        </td>
      </tr>
    `,
      )
      .join("");
  }
}

async function verDetalhePedido(id) {
  window.navegarPara("pedidos-detalhe");
  carregarDetalhePedido(id);
}
