function calcularItem(quantidade, precoUnitario, icmsPct, comissaoPct) {
  var subtotal = quantidade * precoUnitario;
  return {
    subtotal: subtotal,
    valorLiquido: subtotal - (subtotal * icmsPct) / 100,
    comissao: (subtotal * comissaoPct) / 100,
  };
}

function calcularTotais(valorTotal, icmsPct, comissaoPct) {
  var valorIcms = (valorTotal * icmsPct) / 100;
  return {
    valorTotal: valorTotal,
    valorIcms: valorIcms,
    valorTotalLiquido: valorTotal - valorIcms,
    comissaoTotal: (valorTotal * comissaoPct) / 100,
  };
}
