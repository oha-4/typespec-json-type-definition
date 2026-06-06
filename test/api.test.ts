import type { EmitContext } from "@typespec/compiler";
import { resolveVirtualPath } from "@typespec/compiler/testing";
import { describe, expect, it } from "vitest";
import * as api from "../src/index.js";
import type { JsonTypeDefinitionEmitterOptions } from "../src/lib.js";
import { compile } from "./test-host.js";

describe("public api", () => {
  it("exposes the library, emitter, and transform", () => {
    expect(api.$lib.name).toBe("typespec-json-type-definition");
    expect(typeof api.$onEmit).toBe("function");
    expect(typeof api.JtdTransform).toBe("function");
  });
});

describe("$onEmit", () => {
  it("writes nothing during a dry run", async () => {
    const { runner, program } = await compile(`model Foo { a: string; }`);
    program.compilerOptions.dryRun = true;

    const context = {
      program,
      emitterOutputDir: resolveVirtualPath("tsp-output"),
      options: {} as JsonTypeDefinitionEmitterOptions,
    } as unknown as EmitContext<JsonTypeDefinitionEmitterOptions>;
    await api.$onEmit(context);

    const written = [...runner.fs.keys()].filter((k) => k.includes("tsp-output"));
    expect(written).toHaveLength(0);
  });
});
