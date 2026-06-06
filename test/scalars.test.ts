import { describe, expect, it } from "vitest";
import { emitJtd, emitJtdSchema } from "./test-host.js";

async function propSchema(tspType: string) {
  const schema = await emitJtdSchema(`model Holder { value: ${tspType}; }`);
  return (schema.definitions?.Holder as { properties: Record<string, unknown> }).properties.value;
}

describe("scalar mapping", () => {
  it.each([
    ["boolean", "boolean"],
    ["string", "string"],
    ["url", "string"],
    ["bytes", "string"],
    ["int8", "int8"],
    ["int16", "int16"],
    ["int32", "int32"],
    ["uint8", "uint8"],
    ["uint16", "uint16"],
    ["uint32", "uint32"],
    ["float32", "float32"],
    ["float64", "float64"],
    ["utcDateTime", "timestamp"],
    ["offsetDateTime", "timestamp"],
    ["plainDate", "string"],
    ["plainTime", "string"],
    ["duration", "string"],
  ])("maps %s -> %s", async (tsp, jtd) => {
    expect(await propSchema(tsp)).toEqual({ type: jtd });
  });

  it("follows custom scalars to their built-in base", async () => {
    const schema = await emitJtdSchema(`
      scalar Email extends string;
      model Holder { value: Email; }
    `);
    expect((schema.definitions?.Holder as any).properties.value).toEqual({ type: "string" });
  });

  it("warns and falls back to string for int64", async () => {
    const { schema, diagnostics } = await emitJtd(`model Holder { value: int64; }`);
    expect((schema.definitions?.Holder as any).properties.value).toEqual({ type: "string" });
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]?.code).toBe("typespec-json-type-definition/unsupported-scalar");
  });

  it("targets the using property, not the built-in scalar declaration", async () => {
    const { diagnostics } = await emitJtd(`model Holder { value: int64; }`);
    const target = diagnostics[0]?.target as { kind?: string; name?: unknown } | undefined;
    expect(target?.kind).toBe("ModelProperty");
    expect(target?.name).toBe("value");
  });

  it("warns through arrays and records, pointing at the property", async () => {
    const { schema, diagnostics } = await emitJtd(`
      model Holder { many: decimal[]; lookup: Record<int64>; }
    `);
    expect((schema.definitions?.Holder as any).properties.many).toEqual({
      elements: { type: "string" },
    });
    expect((schema.definitions?.Holder as any).properties.lookup).toEqual({
      values: { type: "string" },
    });
    expect(diagnostics.map((d) => (d.target as any).name).sort()).toEqual(["lookup", "many"]);
  });

  it("warns for an unknown root scalar", async () => {
    const { diagnostics } = await emitJtd(`
      scalar weird;
      model Holder { value: weird; }
    `);
    expect(diagnostics.map((d) => d.code)).toContain(
      "typespec-json-type-definition/unsupported-scalar",
    );
  });
});
