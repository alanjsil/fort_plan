import { describe, it, expect } from "vitest";
import Store from "electron-store";

const store = new Store({ name: "test-sessao" });

describe("Session", () => {
  it("deve salvar e recuperar sessao", () => {
    const sessaoFake = {
      access_token: "token123",
      refresh_token: "refresh456",
      user: { id: "abc", email: "teste@teste.com" },
    };

    store.set("supabase_sessao", sessaoFake);
    const recuperada = store.get("supabase_sessao");

    expect(recuperada).toEqual(sessaoFake);
  });

  it("deve retornar undefined se não houver sessao salva", () => {
    store.delete("supabase_sessao");
    const recuperada = store.get("supabase_sessao");
    expect(recuperada).toBeUndefined();
  });

  it("deve limpar sessao corretamente", () => {
    store.set("supabase_sessao", { token: "x" });
    store.delete("supabase_sessao");
    expect(store.get("supabase_sessao")).toBeUndefined();
  });
});
