import type { LinterRuleDefinition } from "@typespec/compiler";
import {
  createLinterRuleTester,
  createTestHost,
  createTestWrapper,
  type LinterRuleTester,
} from "@typespec/compiler/testing";
import { describe, expect, it } from "vitest";
import { libraryName } from "../src/lib.js";
import { noNumericEnumRule } from "../src/linter/rules/no-numeric-enum.js";
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

  it("accepts cleanly mapped and custom scalars", async () => {
    const t = await tester(noUnsupportedScalarRule);
    await t
      .expect(`scalar Email extends string; model M { a: string; b: int32; c: Email; }`)
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

describe("$linter ruleset", () => {
  it("exposes a recommended ruleset enabling every rule", () => {
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
});
