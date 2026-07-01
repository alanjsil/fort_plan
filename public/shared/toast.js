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
