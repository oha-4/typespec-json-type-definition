import type { LinterRuleDefinition } from "@typespec/compiler";
import {
  createLinterRuleTester,
  createTestHost,
  createTestWrapper,
  type LinterRuleTester,
} from "@typespec/compiler/testing";
import { describe, expect, it } from "vitest";
import { libraryName } from "../src/lib.js";
import { noIgnoredConstraintsRule } from "../src/linter/rules/no-ignored-constraints.js";
import { noIgnoredMetadataRule } from "../src/linter/rules/no-ignored-metadata.js";
import { noNumericEnumRule } from "../src/linter/rules/no-numeric-enum.js";
import { noOperationsRule } from "../src/linter/rules/no-operations.js";
import { noTupleRule } from "../src/linter/rules/no-tuple.js";
import { noUnsupportedScalarRule } from "../src/linter/rules/no-unsupported-scalar.js";
import { noUnsupportedUnionRule } from "../src/linter/rules/no-unsupported-union.js";
import { $linter } from "../src/linter.js";

async function tester(
  rule: LinterRuleDefinition<string, Record<string, any>>,
): Promise<LinterRuleTester> {
  const host = await createTestHost();
  const runner = createTestWrapper(host);
  return createLinterRuleTester(runner, rule, libraryName);
}

const code = (name: string) => `${libraryName}/${name}`;

describe("no-unsupported-scalar", () => {
  it("warns on a degraded scalar", async () => {
    const t = await tester(noUnsupportedScalarRule);
    await t
      .expect(`model M { value: int64; }`)
      .toEmitDiagnostics({ code: code("no-unsupported-scalar"), severity: "warning" });
  });

  it("warns through arrays and records", async () => {
    const t = await tester(noUnsupportedScalarRule);
    await t
      .expect(`model M { values: decimal[]; lookup: Record<int64>; }`)
      .toEmitDiagnostics([
        { code: code("no-unsupported-scalar") },
        { code: code("no-unsupported-scalar") },
      ]);
  });

  it("warns on a custom scalar with no built-in base", async () => {
    const t = await tester(noUnsupportedScalarRule);
    await t
      .expect(`scalar weird; model M { value: weird; }`)
      .toEmitDiagnostics({ code: code("no-unsupported-scalar"), severity: "warning" });
  });

  it("accepts cleanly mapped and custom scalars, and non-scalar properties", async () => {
    const t = await tester(noUnsupportedScalarRule);
    await t
      .expect(
        `scalar Email extends string; model Inner { a: string; }
         model M { a: string; b: int32; c: Email; nested: Inner; }`,
      )
      .toBeValid();
  });
});

describe("no-unsupported-union", () => {
  it("warns on a heterogeneous union", async () => {
    const t = await tester(noUnsupportedUnionRule);
    await t
      .expect(`model M { value: string | int32; }`)
      .toEmitDiagnostics({ code: code("no-unsupported-union"), severity: "warning" });
  });

  it("accepts nullable, string-literal, and discriminated unions", async () => {
    const t = await tester(noUnsupportedUnionRule);
    await t
      .expect(
        `
        model M { nullable: string | null; }
        union Status { "a", "b" }
        model Cat { kind: "cat"; }
        model Dog { kind: "dog"; }
        @discriminated(#{ envelope: "none" })
        union Pet { cat: Cat, dog: Dog }
      `,
      )
      .toBeValid();
  });
});

describe("no-tuple", () => {
  it("warns on a tuple", async () => {
    const t = await tester(noTupleRule);
    await t
      .expect(`model M { pair: [string, int32]; }`)
      .toEmitDiagnostics({ code: code("no-tuple"), severity: "warning" });
  });

  it("accepts a homogeneous array", async () => {
    const t = await tester(noTupleRule);
    await t.expect(`model M { items: string[]; }`).toBeValid();
  });
});

describe("no-numeric-enum", () => {
  it("warns on numeric enum members", async () => {
    const t = await tester(noNumericEnumRule);
    await t
      .expect(`enum Level { Low: 1, High: 10 }`)
      .toEmitDiagnostics({ code: code("no-numeric-enum"), severity: "warning" });
  });

  it("accepts string enums", async () => {
    const t = await tester(noNumericEnumRule);
    await t.expect(`enum Color { Red: "red", Green: "green" }`).toBeValid();
  });
});

describe("no-ignored-constraints", () => {
  it("warns on a property constraint", async () => {
    const t = await tester(noIgnoredConstraintsRule);
    await t
      .expect(`model M { @maxLength(10) name: string; }`)
      .toEmitDiagnostics({ code: code("no-ignored-constraints"), severity: "warning" });
  });

  it("warns on a scalar constraint", async () => {
    const t = await tester(noIgnoredConstraintsRule);
    await t
      .expect(`@minValue(1) scalar Positive extends int32; model M { n: Positive; }`)
      .toEmitDiagnostics({ code: code("no-ignored-constraints") });
  });

  it("warns on a default value", async () => {
    const t = await tester(noIgnoredConstraintsRule);
    await t
      .expect(`model M { name?: string = "anon"; }`)
      .toEmitDiagnostics({ code: code("no-ignored-constraints") });
  });

  it("accepts unconstrained properties", async () => {
    const t = await tester(noIgnoredConstraintsRule);
    await t.expect(`model M { name: string; count: int32; }`).toBeValid();
  });
});

describe("no-operations", () => {
  it("warns on an operation", async () => {
    const t = await tester(noOperationsRule);
    await t
      .expect(`op ping(): void;`)
      .toEmitDiagnostics({ code: code("no-operations"), severity: "warning" });
  });

  it("accepts data-only specs", async () => {
    const t = await tester(noOperationsRule);
    await t.expect(`model M { a: string; }`).toBeValid();
  });
});

describe("no-ignored-metadata", () => {
  it("warns on a @secret property", async () => {
    const t = await tester(noIgnoredMetadataRule);
    await t
      .expect(`model M { @secret token: string; }`)
      .toEmitDiagnostics({ code: code("no-ignored-metadata"), severity: "warning" });
  });

  it("warns on a #deprecated directive that has no decorator node", async () => {
    const t = await tester(noIgnoredMetadataRule);
    await t
      .expect(`#deprecated "use V2"\nmodel M { a: string; }`)
      .toEmitDiagnostics({ code: code("no-ignored-metadata"), severity: "warning" });
  });

  it("accepts plain models", async () => {
    const t = await tester(noIgnoredMetadataRule);
    await t.expect(`model M { token: string; }`).toBeValid();
  });
});

describe("$linter rulesets", () => {
  it("recommended enables only the degradation rules", () => {
    const enabled = $linter.ruleSets?.recommended?.enable ?? {};
    expect(Object.keys(enabled).sort()).toEqual(
      [
        code("no-numeric-enum"),
        code("no-tuple"),
        code("no-unsupported-scalar"),
        code("no-unsupported-union"),
      ].sort(),
    );
    expect(Object.values(enabled).every((v) => v === true)).toBe(true);
  });

  it("all extends recommended and adds the informational rules", () => {
    const all = $linter.ruleSets?.all;
    expect(all?.extends).toEqual([code("recommended")]);
    expect(Object.keys(all?.enable ?? {}).sort()).toEqual(
      [code("no-ignored-constraints"), code("no-ignored-metadata"), code("no-operations")].sort(),
    );
  });

  it("registers every rule exactly once", () => {
    expect($linter.rules.map((r) => r.name).sort()).toEqual(
      [
        "no-ignored-constraints",
        "no-ignored-metadata",
        "no-numeric-enum",
        "no-operations",
        "no-tuple",
        "no-unsupported-scalar",
        "no-unsupported-union",
      ].sort(),
    );
  });
});
