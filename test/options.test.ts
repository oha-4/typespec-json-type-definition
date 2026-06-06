import { describe, expect, it } from "vitest";
import { emitJtdFile, emitJtdSchema } from "./test-host.js";

describe("emitter options", () => {
  it("writes to a custom output file", async () => {
    const { schema } = await emitJtdFile(`model Foo { a: string; }`, {
      "output-file": "custom.json",
    });
    expect(schema.definitions?.Foo).toBeDefined();
  });

  it("indents with two spaces and ends with a newline by default", async () => {
    const { content } = await emitJtdFile(`model Foo { a: string; }`);
    expect(content).toContain('\n  "definitions"');
    expect(content.endsWith("\n")).toBe(true);
  });

  it("minifies when indent is 0", async () => {
    const { content } = await emitJtdFile(`model Foo { a: string; }`, { indent: 0 });
    expect(content).not.toContain("\n  ");
  });

  it("adds additionalProperties when requested", async () => {
    const schema = await emitJtdSchema(`model Foo { a: string; }`, {
      "additional-properties": true,
    });
    expect(schema.definitions?.Foo).toMatchObject({ additionalProperties: true });
  });

  it("includes @doc as metadata.description by default", async () => {
    const schema = await emitJtdSchema(`
      @doc("A human being")
      model Person {
        @doc("Their full name")
        name: string;
      }
    `);
    expect(schema.definitions?.Person).toMatchObject({
      metadata: { description: "A human being" },
      properties: { name: { type: "string", metadata: { description: "Their full name" } } },
    });
  });

  it("omits docs when include-doc is false", async () => {
    const schema = await emitJtdSchema(
      `
      @doc("A human being")
      model Person { name: string; }
    `,
      { "include-doc": false },
    );
    expect(schema.definitions?.Person).toEqual({ properties: { name: { type: "string" } } });
  });
});
