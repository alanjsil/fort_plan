import { describe, it, expect } from "vitest";

describe("Auth Handler", () => {
  it("deve exportar funcoes esperadas", async () => {
    const auth = await import("../../../handlers/auth.js");
    expect(auth.login).toBeInstanceOf(Function);
    expect(auth.logout).toBeInstanceOf(Function);
    expect(auth.getSessao).toBeInstanceOf(Function);
    expect(auth.getPerfil).toBeInstanceOf(Function);
  });
});
