import { describe, it, expect, beforeEach } from "vitest";

describe("State", () => {
  beforeEach(() => {
    delete require.cache[require.resolve("../../../services/state.js")];
  });

  it("deve iniciar com valores nulos", () => {
    const { state } = require("../../../services/state.js");
    expect(state.usuario).toBeNull();
    expect(state.perfil).toBeNull();
  });

  it("deve setar usuario e perfil", () => {
    const { state, setUsuario } = require("../../../services/state.js");
    const usuario = { id: "123", email: "a@b.com" };
    const perfil = { id: "123", nome: "Teste", role: "admin" };

    setUsuario(usuario, perfil);

    expect(state.usuario).toEqual(usuario);
    expect(state.perfil).toEqual(perfil);
  });

  it("deve retornar role correta", () => {
    const { setUsuario, getRole } = require("../../../services/state.js");
    setUsuario({ id: "123" }, { id: "123", role: "gerente" });

    expect(getRole()).toBe("gerente");
  });

  it("deve retornar null se não houver perfil", () => {
    const { getRole } = require("../../../services/state.js");
    expect(getRole()).toBeNull();
  });

  it("deve limpar estado corretamente", () => {
    const { state, setUsuario, limpar } = require("../../../services/state.js");
    setUsuario({ id: "1" }, { role: "user" });
    limpar();
    expect(state.usuario).toBeNull();
    expect(state.perfil).toBeNull();
  });
});
