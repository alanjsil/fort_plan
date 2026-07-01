const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const auth = require("./handlers/auth");
const produtos = require("./handlers/produtos");
const representantes = require("./handlers/representantes");
const estados = require("./handlers/estados");
const clientes = require("./handlers/clientes");
const pedidos = require("./handlers/pedidos");

let mainWindow;

function registrarHandlers() {
  // Auth
  ipcMain.handle("auth:login", auth.login);
  ipcMain.handle("auth:logout", auth.logout);
  ipcMain.handle("auth:getSessao", auth.getSessao);
  ipcMain.handle("auth:getPerfil", auth.getPerfil);

  // Produtos
  ipcMain.handle("produtos:listar", produtos.listar);
  ipcMain.handle("produtos:criar", produtos.criar);
  ipcMain.handle("produtos:atualizar", produtos.atualizar);
  ipcMain.handle("produtos:remover", produtos.remover);

  // Representantes
  ipcMain.handle("representantes:listar", representantes.listar);
  ipcMain.handle("representantes:criar", representantes.criar);
  ipcMain.handle("representantes:atualizar", representantes.atualizar);
  ipcMain.handle("representantes:remover", representantes.remover);

  // Estados
  ipcMain.handle("estados:listar", estados.listar);
  ipcMain.handle("estados:criar", estados.criar);
  ipcMain.handle("estados:atualizar", estados.atualizar);
  ipcMain.handle("estados:remover", estados.remover);

  // Clientes
  ipcMain.handle("clientes:listar", clientes.listar);
  ipcMain.handle("clientes:criar", clientes.criar);
  ipcMain.handle("clientes:atualizar", clientes.atualizar);
  ipcMain.handle("clientes:remover", clientes.remover);

  // Pedidos
  ipcMain.handle("pedidos:criar", pedidos.criar);
  ipcMain.handle("pedidos:listar", pedidos.listar);
  ipcMain.handle("pedidos:buscarPorId", pedidos.buscarPorId);
  ipcMain.handle("pedidos:atualizarStatus", pedidos.atualizarStatus);
}

function criarJanela() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, "public", "index.html"));

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  registrarHandlers();
  criarJanela();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      criarJanela();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
