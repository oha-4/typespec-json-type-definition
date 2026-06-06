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
});

describe("empty programs", () => {
  it("omits definitions when there is nothing to emit", async () => {
    const schema = await emitJtdSchema(`alias Ignored = string;`);
    expect(schema).toEqual({});
  });
});
