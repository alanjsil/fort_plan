async function carregarTela(tela) {
  switch (tela) {
    case "produtos":
      await carregarProdutos();
      break;
    case "representantes":
      await carregarRepresentantes();
      break;
    case "estados":
      await carregarEstados();
      break;
    case "clientes":
      await carregarClientes();
      break;
    case "pedidos-novo":
      await carregarNovoPedido();
      break;
    case "pedidos-lista":
      await carregarListaPedidos();
      break;
  }
}
