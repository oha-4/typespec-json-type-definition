import { describe, expect, it } from "vitest";
import { emitJtd, emitJtdSchema } from "./test-host.js";

describe("enums", () => {
  it("uses member names when there are no explicit values", async () => {
    const schema = await emitJtdSchema(`
      enum Direction { North, South, East, West }
    `);
    expect(schema.definitions?.Direction).toEqual({
      enum: ["North", "South", "East", "West"],
    });
  });

  it("uses string values when present", async () => {
    const schema = await emitJtdSchema(`
      enum Color { Red: "red", Green: "green" }
    `);
    expect(schema.definitions?.Color).toEqual({ enum: ["red", "green"] });
  });

  it("warns for numeric enums and falls back to member names", async () => {
    const { schema, diagnostics } = await emitJtd(`
      enum Level { Low: 1, High: 10 }
    `);
    expect(schema.definitions?.Level).toEqual({ enum: ["Low", "High"] });
    expect(diagnostics.map((d) => d.code)).toContain(
      "typespec-json-type-definition/non-string-enum",
    );
  });
});

describe("unions", () => {
  it("turns a string-literal union into an enum", async () => {
    const schema = await emitJtdSchema(`
      union Status { "active", "inactive", "pending" }
    `);
    expect(schema.definitions?.Status).toEqual({
      enum: ["active", "inactive", "pending"],
    });
  });

  it("collapses 'T | null' to a nullable schema", async () => {
    const schema = await emitJtdSchema(`
      model Holder { value: string | null; }
    `);
    expect((schema.definitions?.Holder as any).properties.value).toEqual({
      type: "string",
      nullable: true,
    });
  });

  it("emits a discriminator form for @discriminator model inheritance", async () => {
    const schema = await emitJtdSchema(`
      @discriminator("kind")
      model Pet { kind: string; }
      model Cat extends Pet { kind: "cat"; meow: boolean; }
      model Dog extends Pet { kind: "dog"; bark: boolean; }
    `);
    expect(schema.definitions?.Pet).toEqual({
      discriminator: "kind",
      mapping: {
        cat: { properties: { meow: { type: "boolean" } } },
        dog: { properties: { bark: { type: "boolean" } } },
      },
    });
  });

  it("emits a discriminator form for @discriminated unions (envelope: none)", async () => {
    const schema = await emitJtdSchema(`
      model Cat { kind: "cat"; meow: boolean; }
      model Dog { kind: "dog"; bark: boolean; }

      @discriminated(#{ envelope: "none" })
      union Pet { cat: Cat, dog: Dog }
    `);
    expect(schema.definitions?.Pet).toEqual({
      discriminator: "kind",
      mapping: {
        cat: { properties: { meow: { type: "boolean" } } },
        dog: { properties: { bark: { type: "boolean" } } },
      },
    });
  });

  it("wraps variants under the envelope property by default", async () => {
    const schema = await emitJtdSchema(`
      model Cat { meow: boolean; }
      model Dog { bark: boolean; }

      @discriminated
      union Pet { cat: Cat, dog: Dog }
    `);
    expect(schema.definitions?.Pet).toEqual({
      discriminator: "kind",
      mapping: {
        cat: { properties: { value: { ref: "Cat" } } },
        dog: { properties: { value: { ref: "Dog" } } },
      },
    });
  });

  it("warns for unions that cannot be represented", async () => {
    const { schema, diagnostics } = await emitJtd(`
      model A { a: string; }
      union Mixed { string, int32, A }
    `);
    expect(schema.definitions?.Mixed).toEqual({});
    expect(diagnostics.map((d) => d.code)).toContain(
      "typespec-json-type-definition/unsupported-union",
    );
  });
});
