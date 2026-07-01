const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  // Auth
  login: (dados) => ipcRenderer.invoke("auth:login", dados),
  logout: () => ipcRenderer.invoke("auth:logout"),
  getSessao: () => ipcRenderer.invoke("auth:getSessao"),
  getPerfil: () => ipcRenderer.invoke("auth:getPerfil"),

  // Produtos
  listarProdutos: () => ipcRenderer.invoke("produtos:listar"),
  criarProduto: (dados) => ipcRenderer.invoke("produtos:criar", dados),
  atualizarProduto: (dados) => ipcRenderer.invoke("produtos:atualizar", dados),
  removerProduto: (id) => ipcRenderer.invoke("produtos:remover", id),

  // Representantes
  listarRepresentantes: () => ipcRenderer.invoke("representantes:listar"),
  criarRepresentante: (dados) => ipcRenderer.invoke("representantes:criar", dados),
  atualizarRepresentante: (dados) => ipcRenderer.invoke("representantes:atualizar", dados),
  removerRepresentante: (id) => ipcRenderer.invoke("representantes:remover", id),

  // Estados
  listarEstados: () => ipcRenderer.invoke("estados:listar"),
  criarEstado: (dados) => ipcRenderer.invoke("estados:criar", dados),
  atualizarEstado: (dados) => ipcRenderer.invoke("estados:atualizar", dados),
  removerEstado: (id) => ipcRenderer.invoke("estados:remover", id),

  // Clientes
  listarClientes: () => ipcRenderer.invoke("clientes:listar"),
  criarCliente: (dados) => ipcRenderer.invoke("clientes:criar", dados),
  atualizarCliente: (dados) => ipcRenderer.invoke("clientes:atualizar", dados),
  removerCliente: (id) => ipcRenderer.invoke("clientes:remover", id),

  // Pedidos
  criarPedido: (dados) => ipcRenderer.invoke("pedidos:criar", dados),
  listarPedidos: (filtros) => ipcRenderer.invoke("pedidos:listar", filtros),
  buscarPedido: (id) => ipcRenderer.invoke("pedidos:buscarPorId", id),
  atualizarStatusPedido: (dados) => ipcRenderer.invoke("pedidos:atualizarStatus", dados),
});
