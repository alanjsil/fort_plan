async function carregarDetalhePedido(id) {
  const div = document.getElementById("tela-pedidos-detalhe");
  const podeEditar = podeEscrever();

  const pedido = await window.electronAPI.buscarPedido(id);
  if (!pedido) {
    div.innerHTML = "<p>Pedido não encontrado.</p>";
    return;
  }

  const icms = pedido.icms_percentual ?? 0;
  const comissao = pedido.comissao_percentual ?? 0;

  div.innerHTML = `
    <div class="detalhe-pedido">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
        <h2>Pedido #${pedido.numero_pedido}</h2>
        <span class="status status-${pedido.status}">${pedido.status}</span>
      </div>

      <div class="detalhe-cabecalho">
        <div class="detalhe-info">
          <strong>Cliente:</strong> ${pedido.cliente?.nome || "-"}<br />
          <strong>CNPJ:</strong> ${pedido.cliente?.cnpj || "-"}<br />
          <strong>Contato:</strong> ${pedido.cliente?.contato || "-"}<br />
          <strong>UF Cliente:</strong> ${pedido.cliente?.estado?.uf || "-"}
        </div>
        <div class="detalhe-info">
          <strong>Representante:</strong> ${pedido.representante?.nome || "-"}<br />
          <strong>Estado:</strong> ${pedido.estado?.nome || "-"} (${pedido.estado?.uf || "-"})<br />
          <strong>ICMS:</strong> ${icms}%<br />
          <strong>Comissão:</strong> ${comissao}%
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>Produto</th>
            <th>Qtd</th>
            <th>Preço Unit.</th>
            <th>Subtotal</th>
            <th>Valor Líquido</th>
            <th>Comissão</th>
          </tr>
        </thead>
        <tbody>
          ${pedido.itens
            .map((item) => {
              const subtotal = item.quantidade * item.preco_unitario;
              const valorLiquido = subtotal - (subtotal * icms) / 100;
              const comissaoItem = (subtotal * comissao) / 100;
              return `
              <tr>
                <td>${item.produto?.nome || "-"}</td>
                <td>${item.quantidade}</td>
                <td>${FormatarMoeda(item.preco_unitario)}</td>
                <td>${FormatarMoeda(subtotal)}</td>
                <td>${FormatarMoeda(valorLiquido)}</td>
                <td>${FormatarMoeda(comissaoItem)}</td>
              </tr>
            `;
            })
            .join("")}
        </tbody>
      </table>

      <div class="pedido-resumo" style="margin-top:16px">
        <div class="linha-resumo">
          <span>Valor Total Bruto:</span>
          <span>${FormatarMoeda(pedido.valor_total)}</span>
        </div>
        <div class="linha-resumo">
          <span>ICMS (${icms}%):</span>
          <span>-${FormatarMoeda((pedido.valor_total * icms) / 100)}</span>
        </div>
        <div class="linha-resumo">
          <span>Valor Total Líquido:</span>
          <span>${FormatarMoeda(pedido.valor_total - (pedido.valor_total * icms) / 100)}</span>
        </div>
        <div class="linha-resumo">
          <span>Comissão (${comissao}%):</span>
          <span>${FormatarMoeda((pedido.valor_total * comissao) / 100)}</span>
        </div>
        <div class="linha-resumo total">
          <span>Total do Pedido:</span>
          <span>${FormatarMoeda(pedido.valor_total)}</span>
        </div>
      </div>

      ${pedido.observacoes ? `<div style="margin-top:12px"><strong>Observações:</strong> ${pedido.observacoes}</div>` : ""}

      <div class="acoes" style="margin-top:20px">
        ${
          pedido.status === "aberto"
            ? `
          <button class="btn-sucesso" onclick="alterarStatusPedido('${pedido.id}', 'faturado')">Faturar</button>
        `
            : ""
        }
        ${
          pedido.status !== "cancelado"
            ? `
          <button class="btn-perigo" onclick="alterarStatusPedido('${pedido.id}', 'cancelado')">Cancelar</button>
        `
            : ""
        }
        <button class="btn-secundario" onclick="window.navegarPara('pedidos-lista')">Voltar</button>
      </div>
    </div>
  `;
}

async function alterarStatusPedido(id, novoStatus) {
  if (!confirm(`Alterar status para "${novoStatus}"?`)) return;
  try {
    await window.electronAPI.atualizarStatusPedido({ id, status: novoStatus });
    carregarDetalhePedido(id);
  } catch (err) {
    alert("Erro: " + err.message);
  }
}
