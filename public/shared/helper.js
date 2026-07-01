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

var perfilAtual = null;

function definirPerfil(perfil) {
  perfilAtual = perfil;
}

function getPerfilAtual() {
  return perfilAtual;
}

function podeEscrever() {
  return perfilAtual && ["admin", "gerente"].includes(perfilAtual.role);
}

function ehAdmin() {
  return perfilAtual && perfilAtual.role === "admin";
}

function mostrarToast(mensagem, tipo, duracao) {
  if (tipo === undefined) tipo = "info";
  if (duracao === undefined) duracao = 3000;

  var container = document.getElementById("toast-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "toast-container";
    document.body.appendChild(container);
  }

  var el = document.createElement("div");
  el.className = "toast toast-" + tipo;
  el.textContent = mensagem;
  container.appendChild(el);

  setTimeout(function () {
    if (el.parentNode) el.remove();
  }, duracao + 300);
}

function mostrarConfirmacao(mensagem) {
  return new Promise(function (resolve) {
    var overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.innerHTML =
      '<div class="modal-caixa">' +
      "<h3>Confirma\u00E7\u00E3o</h3>" +
      "<p>" + mensagem + "</p>" +
      '<div class="modal-acoes">' +
      '<button class="btn-secundario" data-acao="cancelar">Cancelar</button>' +
      '<button class="btn-perigo" data-acao="confirmar">Confirmar</button>' +
      "</div>" +
      "</div>";

    overlay.querySelector("[data-acao='cancelar']").addEventListener("click", function () {
      overlay.remove();
      resolve(false);
    });

    overlay.querySelector("[data-acao='confirmar']").addEventListener("click", function () {
      overlay.remove();
      resolve(true);
    });

    overlay.addEventListener("click", function (e) {
      if (e.target === overlay) {
        overlay.remove();
        resolve(false);
      }
    });

    document.body.appendChild(overlay);
  });
}
