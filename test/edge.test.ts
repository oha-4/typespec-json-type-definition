import { describe, expect, it } from "vitest";
import { emitJtd, emitJtdSchema } from "./test-host.js";

describe("literal types", () => {
  it("maps string, numeric, and boolean literals", async () => {
    const schema = await emitJtdSchema(`
      model Flags {
        tag: "fixed";
        count: 42;
        ratio: 1.5;
        active: true;
      }
    `);
    expect(schema.definitions?.Flags).toEqual({
      properties: {
        tag: { type: "string" },
        count: { type: "int32" },
        ratio: { type: "float64" },
        active: { type: "boolean" },
      },
    });
  });
});

describe("unsupported types", () => {
  it("emits an empty schema and warns for unknown", async () => {
    const { schema, diagnostics } = await emitJtd(`model Holder { value: unknown; }`);
    expect((schema.definitions?.Holder as any).properties.value).toEqual({});
    expect(diagnostics.map((d) => d.code)).toContain(
      "typespec-json-type-definition/unsupported-type",
    );
  });

  it("emits an empty schema and warns for a tuple in value position", async () => {
    const { schema, diagnostics } = await emitJtd(`model Holder { pair: [string, int32]; }`);
    expect((schema.definitions?.Holder as any).properties.pair).toEqual({});
    const unsupported = diagnostics.filter(
      (d) => d.code === "typespec-json-type-definition/unsupported-type",
    );
    expect(unsupported).toHaveLength(1);
    expect((unsupported[0]?.target as any).name).toBe("pair");
  });

  it("treats a bare `null` property as a nullable schema", async () => {
    const schema = await emitJtdSchema(`model Holder { value: null; }`);
    expect((schema.definitions?.Holder as any).properties.value).toEqual({ nullable: true });
  });
});

describe("empty programs", () => {
  it("omits definitions when there is nothing to emit", async () => {
    const schema = await emitJtdSchema(`alias Ignored = string;`);
    expect(schema).toEqual({});
  });
});
