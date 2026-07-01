async function carregarDetalhePedido(id) {
  const div = document.getElementById("tela-pedidos-detalhe");

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
            .map(function (item) {
              var itemCalc = calcularItem(item.quantidade, item.preco_unitario, icms, comissao);
              return (
                "<tr>" +
                "<td>" +
                (item.produto?.nome || "-") +
                "</td>" +
                "<td>" +
                item.quantidade +
                "</td>" +
                "<td>" +
                FormatarMoeda(item.preco_unitario) +
                "</td>" +
                "<td>" +
                FormatarMoeda(itemCalc.subtotal) +
                "</td>" +
                "<td>" +
                FormatarMoeda(itemCalc.valorLiquido) +
                "</td>" +
                "<td>" +
                FormatarMoeda(itemCalc.comissao) +
                "</td>" +
                "</tr>"
              );
            })
            .join("")}
        </tbody>
      </table>

      ${(function () {
        var totais = calcularTotais(pedido.valor_total, icms, comissao);
        return (
          '<div class="pedido-resumo" style="margin-top:16px">' +
          '<div class="linha-resumo">' +
          "<span>Valor Total Bruto:</span>" +
          "<span>" +
          FormatarMoeda(totais.valorTotal) +
          "</span>" +
          "</div>" +
          '<div class="linha-resumo">' +
          "<span>ICMS (" +
          icms +
          "%):</span>" +
          "<span>-" +
          FormatarMoeda(totais.valorIcms) +
          "</span>" +
          "</div>" +
          '<div class="linha-resumo">' +
          "<span>Valor Total L\u00EDquido:</span>" +
          "<span>" +
          FormatarMoeda(totais.valorTotalLiquido) +
          "</span>" +
          "</div>" +
          '<div class="linha-resumo">' +
          "<span>Comiss\u00E3o (" +
          comissao +
          "%):</span>" +
          "<span>" +
          FormatarMoeda(totais.comissaoTotal) +
          "</span>" +
          "</div>" +
          '<div class="linha-resumo total">' +
          "<span>Total do Pedido:</span>" +
          "<span>" +
          FormatarMoeda(totais.valorTotal) +
          "</span>" +
          "</div>" +
          "</div>"
        );
      })()}

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
  if (!(await mostrarConfirmacao(`Alterar status para "${novoStatus}"?`))) return;
  try {
    await window.electronAPI.atualizarStatusPedido({ id, status: novoStatus });
    carregarDetalhePedido(id);
  } catch (err) {
    mostrarToast("Erro: " + err.message, "erro");
  }
}
