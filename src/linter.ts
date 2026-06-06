import { defineLinter } from "@typespec/compiler";
import { libraryName } from "./lib.js";
import { noNumericEnumRule } from "./linter/rules/no-numeric-enum.js";
import { noTupleRule } from "./linter/rules/no-tuple.js";
import { noUnsupportedScalarRule } from "./linter/rules/no-unsupported-scalar.js";
import { noUnsupportedUnionRule } from "./linter/rules/no-unsupported-union.js";

const rules = [noUnsupportedScalarRule, noUnsupportedUnionRule, noTupleRule, noNumericEnumRule];

/**
 * Linter discovered by the TypeSpec language server. Enable it in tspconfig.yaml
 * to get live editor warnings for constructs JTD cannot represent:
 *
 * ```yaml
 * linter:
 *   extends:
 *     - typespec-json-type-definition/recommended
 * ```
 */
export const $linter = defineLinter({
  rules,
  ruleSets: {
    recommended: {
      enable: {
        [`${libraryName}/${noUnsupportedScalarRule.name}`]: true,
        [`${libraryName}/${noUnsupportedUnionRule.name}`]: true,
        [`${libraryName}/${noTupleRule.name}`]: true,
        [`${libraryName}/${noNumericEnumRule.name}`]: true,
      },
    },
  },
});
