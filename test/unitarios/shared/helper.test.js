import { describe, it, expect } from "vitest";

function escapeHtml(str) {
  if (str == null) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function FormatarMoeda(valor) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valor);
}

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

describe("calcularItem", () => {
  it("deve calcular subtotal, valorLiquido e comissao corretamente", () => {
    var result = calcularItem(10, 50, 7, 5);
    expect(result.subtotal).toBe(500);
    expect(result.valorLiquido).toBe(465);
    expect(result.comissao).toBe(25);
  });

  it("deve retornar subtotal zero quando quantidade for zero", () => {
    var result = calcularItem(0, 50, 7, 5);
    expect(result.subtotal).toBe(0);
    expect(result.valorLiquido).toBe(0);
    expect(result.comissao).toBe(0);
  });

  it("deve retornar subtotal zero quando preco for zero", () => {
    var result = calcularItem(10, 0, 7, 5);
    expect(result.subtotal).toBe(0);
    expect(result.valorLiquido).toBe(0);
    expect(result.comissao).toBe(0);
  });

  it("deve funcionar com icms e comissao zerados", () => {
    var result = calcularItem(10, 50, 0, 0);
    expect(result.subtotal).toBe(500);
    expect(result.valorLiquido).toBe(500);
    expect(result.comissao).toBe(0);
  });

  it("deve funcionar com quantidade fracionada", () => {
    var result = calcularItem(2.5, 100, 7, 5);
    expect(result.subtotal).toBe(250);
    expect(result.valorLiquido).toBe(232.5);
    expect(result.comissao).toBe(12.5);
  });

  it("deve funcionar com valores altos", () => {
    var result = calcularItem(1000, 999.99, 12, 8);
    expect(result.subtotal).toBe(999990);
    expect(result.valorLiquido).toBe(879991.2);
    expect(result.comissao).toBe(79999.2);
  });

  it("deve funcionar com icms e comissao altos (100%)", () => {
    var result = calcularItem(10, 100, 100, 100);
    expect(result.subtotal).toBe(1000);
    expect(result.valorLiquido).toBe(0);
    expect(result.comissao).toBe(1000);
  });
});

describe("calcularTotais", () => {
  it("deve calcular valorIcms, valorTotalLiquido e comissaoTotal corretamente", () => {
    var result = calcularTotais(1000, 7, 5);
    expect(result.valorTotal).toBe(1000);
    expect(result.valorIcms).toBe(70);
    expect(result.valorTotalLiquido).toBe(930);
    expect(result.comissaoTotal).toBe(50);
  });

  it("deve retornar tudo zero quando valorTotal for zero", () => {
    var result = calcularTotais(0, 7, 5);
    expect(result.valorTotal).toBe(0);
    expect(result.valorIcms).toBe(0);
    expect(result.valorTotalLiquido).toBe(0);
    expect(result.comissaoTotal).toBe(0);
  });

  it("deve funcionar com icms e comissao zerados", () => {
    var result = calcularTotais(1000, 0, 0);
    expect(result.valorTotal).toBe(1000);
    expect(result.valorIcms).toBe(0);
    expect(result.valorTotalLiquido).toBe(1000);
    expect(result.comissaoTotal).toBe(0);
  });

  it("deve funcionar com percentual de 100%", () => {
    var result = calcularTotais(500, 100, 100);
    expect(result.valorIcms).toBe(500);
    expect(result.valorTotalLiquido).toBe(0);
    expect(result.comissaoTotal).toBe(500);
  });
});

describe("escapeHtml", () => {
  it("deve retornar string vazia para null", () => {
    expect(escapeHtml(null)).toBe("");
  });

  it("deve retornar string vazia para undefined", () => {
    expect(escapeHtml(undefined)).toBe("");
  });

  it("deve manter texto normal inalterado", () => {
    expect(escapeHtml("abc123")).toBe("abc123");
    expect(escapeHtml("São Paulo")).toBe("São Paulo");
  });

  it("deve escapar &", () => {
    expect(escapeHtml("a&b")).toBe("a&amp;b");
  });

  it("deve escapar <", () => {
    expect(escapeHtml("<script>")).toBe("&lt;script&gt;");
  });

  it("deve escapar >", () => {
    expect(escapeHtml("10 > 5")).toBe("10 &gt; 5");
  });

  it("deve escapar aspas duplas", () => {
    expect(escapeHtml('diz "oi"')).toBe("diz &quot;oi&quot;");
  });

  it("deve escapar aspas simples", () => {
    expect(escapeHtml("'teste'")).toBe("&#039;teste&#039;");
  });

  it("deve escapar caracteres mistos", () => {
    expect(escapeHtml("<img src=x onerror='alert(1)' alt=\"y\">")).toBe(
      "&lt;img src=x onerror=&#039;alert(1)&#039; alt=&quot;y&quot;&gt;",
    );
  });
});

describe("FormatarMoeda", () => {
  it("deve formatar valor inteiro", () => {
    expect(FormatarMoeda(10)).toMatch(/^R\$\s10,00$/);
  });

  it("deve formatar valor com centavos", () => {
    expect(FormatarMoeda(1234.56)).toMatch(/^R\$\s1\.234,56$/);
  });

  it("deve formatar valor zerado", () => {
    expect(FormatarMoeda(0)).toMatch(/^R\$\s0,00$/);
  });

  it("deve formatar valor negativo", () => {
    expect(FormatarMoeda(-50)).toMatch(/^-R\$\s50,00$/);
  });
});
