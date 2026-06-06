import { describe, expect, it } from "vitest";
import { emitJtdSchema } from "./test-host.js";

describe("models", () => {
  it("separates required and optional properties", async () => {
    const schema = await emitJtdSchema(`
      model Person {
        name: string;
        nickname?: string;
      }
    `);
    expect(schema.definitions?.Person).toEqual({
      properties: { name: { type: "string" } },
      optionalProperties: { nickname: { type: "string" } },
    });
  });

  it("emits the elements form for arrays", async () => {
    const schema = await emitJtdSchema(`
      model Bag { items: string[]; }
    `);
    expect((schema.definitions?.Bag as any).properties.items).toEqual({
      elements: { type: "string" },
    });
  });

  it("emits the values form for records", async () => {
    const schema = await emitJtdSchema(`
      model Config { settings: Record<int32>; }
    `);
    expect((schema.definitions?.Config as any).properties.settings).toEqual({
      values: { type: "int32" },
    });
  });

  it("references named models via the ref form", async () => {
    const schema = await emitJtdSchema(`
      model Address { street: string; }
      model User { home: Address; }
    `);
    expect((schema.definitions?.User as any).properties.home).toEqual({ ref: "Address" });
    expect(schema.definitions?.Address).toEqual({ properties: { street: { type: "string" } } });
  });

  it("references named models inside arrays", async () => {
    const schema = await emitJtdSchema(`
      model Tag { name: string; }
      model Post { tags: Tag[]; }
    `);
    expect((schema.definitions?.Post as any).properties.tags).toEqual({
      elements: { ref: "Tag" },
    });
  });

  it("flattens inherited properties from extends", async () => {
    const schema = await emitJtdSchema(`
      model Animal { name: string; }
      model Dog extends Animal { breed: string; }
    `);
    expect(schema.definitions?.Dog).toEqual({
      properties: {
        name: { type: "string" },
        breed: { type: "string" },
      },
    });
  });

  it("does not create definitions for anonymous or built-in models", async () => {
    const schema = await emitJtdSchema(`
      model Outer { items: string[]; map: Record<string>; }
    `);
    expect(Object.keys(schema.definitions ?? {})).toEqual(["Outer"]);
  });
});
